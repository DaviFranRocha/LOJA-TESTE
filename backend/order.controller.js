// Francisco Store — Order Controller
const { prisma }   = require('../lib/prisma');
const AppError     = require('../utils/AppError');
const { auditLog } = require('../utils/audit');
const emailService = require('../services/email.service');
const notifService = require('../services/notification.service');

// ── Generate Order Number ──────────────────────────────────────
const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random    = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `FS-${timestamp}-${random}`;
};

// ── Create Order ───────────────────────────────────────────────
exports.createOrder = async (req, res, next) => {
  try {
    const { addressId, couponCode, items, notes, shipping = 0 } = req.body;
    const userId = req.user.id;

    if (!items?.length) return next(new AppError('Nenhum item no pedido', 400));

    // Validate products and calculate subtotal
    let subtotal  = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { images: { take: 1 } },
      });

      if (!product) return next(new AppError(`Produto ${item.productId} não encontrado`, 404));
      if (product.status === 'DISCONTINUED') return next(new AppError(`${product.name} não está mais disponível`, 400));
      if (product.stock < item.quantity) {
        return next(new AppError(`Estoque insuficiente para ${product.name}. Disponível: ${product.stock}`, 400));
      }

      const unitPrice = parseFloat(product.price);
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        productId:   product.id,
        productName: product.name,
        productImg:  product.images[0]?.url,
        quantity:    item.quantity,
        unitPrice,
        totalPrice,
        variantInfo: item.variantInfo || null,
      });
    }

    // Apply coupon
    let discount = 0;
    let couponId = null;

    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          code:     { equals: couponCode, mode: 'insensitive' },
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          AND: [
            { OR: [{ usageLimit: null }, { usageCount: { lt: 99999 } }] },
          ],
        },
      });

      if (!coupon) return next(new AppError('Cupom inválido ou expirado', 400));
      if (coupon.minOrderValue && subtotal < parseFloat(coupon.minOrderValue)) {
        return next(new AppError(`Pedido mínimo de R$ ${coupon.minOrderValue} para este cupom`, 400));
      }

      if (coupon.discountType === 'PERCENTAGE') {
        discount = subtotal * (parseFloat(coupon.discountValue) / 100);
        if (coupon.maxDiscount) discount = Math.min(discount, parseFloat(coupon.maxDiscount));
      } else {
        discount = parseFloat(coupon.discountValue);
      }

      couponId = coupon.id;
    }

    const total = Math.max(0, subtotal - discount + parseFloat(shipping));

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          addressId:   addressId || null,
          couponId,
          subtotal,
          discount,
          shipping:    parseFloat(shipping),
          total,
          notes,
          items: { create: orderItems },
          statusHistory: {
            create: { status: 'PENDING', comment: 'Pedido criado' },
          },
        },
        include: {
          items:   { include: { product: { include: { images: { take: 1 } } } } },
          address: true,
          coupon:  true,
          user:    { select: { name: true, email: true } },
        },
      });

      // Decrease stock
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data:  { stock: { decrement: item.quantity } },
        });
      }

      // Update coupon usage
      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data:  { usageCount: { increment: 1 } },
        });
      }

      return o;
    });

    // Async: send email + notification
    emailService.sendOrderConfirmation(order).catch(console.error);
    notifService.create({
      userId,
      type:    'ORDER_PLACED',
      title:   'Pedido recebido!',
      message: `Seu pedido ${order.orderNumber} foi recebido.`,
      data:    { orderId: order.id, orderNumber: order.orderNumber },
    }).catch(console.error);

    await auditLog({ userId, action: 'CREATE_ORDER', entity: 'Order', entityId: order.id, req });

    res.status(201).json({ success: true, data: order });
  } catch (err) { next(err); }
};

// ── Get My Orders ──────────────────────────────────────────────
exports.getMyOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const where = { userId: req.user.id };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items:   { include: { product: { include: { images: { take: 1 } } } } },
          payment: { select: { status: true, method: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip:    (parseInt(page) - 1) * parseInt(limit),
        take:    parseInt(limit),
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ success: true, data: orders, pagination: { page: parseInt(page), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

// ── Get Order ──────────────────────────────────────────────────
exports.getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findFirst({
      where: {
        id,
        ...(req.user.role === 'CUSTOMER' ? { userId: req.user.id } : {}),
      },
      include: {
        items:         { include: { product: { include: { images: { take: 1 } } } } },
        address:       true,
        coupon:        { select: { code: true, discountType: true, discountValue: true } },
        payment:       true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        user:          { select: { name: true, email: true, phone: true } },
      },
    });

    if (!order) return next(new AppError('Pedido não encontrado', 404));
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
};

// ── Update Order Status (Admin) ────────────────────────────────
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, comment, trackingCode, trackingUrl, estimatedDelivery } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!order) return next(new AppError('Pedido não encontrado', 404));

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status,
        trackingCode:      trackingCode  || order.trackingCode,
        trackingUrl:       trackingUrl   || order.trackingUrl,
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : order.estimatedDelivery,
        deliveredAt:       status === 'DELIVERED' ? new Date() : order.deliveredAt,
        cancelledAt:       status === 'CANCELLED' ? new Date() : order.cancelledAt,
        statusHistory: {
          create: { status, comment: comment || `Status atualizado para ${status}` },
        },
      },
    });

    // Notify customer
    const notifMap = {
      PAID:      { type: 'ORDER_PAID',      title: 'Pagamento confirmado!' },
      SHIPPED:   { type: 'ORDER_SHIPPED',   title: 'Pedido enviado!' },
      DELIVERED: { type: 'ORDER_DELIVERED', title: 'Pedido entregue!' },
    };
    if (notifMap[status]) {
      notifService.create({
        userId:  order.userId,
        ...notifMap[status],
        message: `Seu pedido ${order.orderNumber} foi atualizado.`,
        data:    { orderId: id, orderNumber: order.orderNumber },
      }).catch(console.error);
    }

    await auditLog({ userId: req.user.id, action: 'UPDATE_ORDER_STATUS', entity: 'Order', entityId: id, newData: { status }, req });

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

// ── Cancel Order ───────────────────────────────────────────────
exports.cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await prisma.order.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!order) return next(new AppError('Pedido não encontrado', 404));

    const cancellable = ['PENDING', 'PAYMENT_PENDING'];
    if (!cancellable.includes(order.status)) {
      return next(new AppError('Este pedido não pode ser cancelado', 400));
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          status:       'CANCELLED',
          cancelledAt:  new Date(),
          cancelReason: reason,
          statusHistory: { create: { status: 'CANCELLED', comment: reason || 'Cancelado pelo cliente' } },
        },
      });

      // Restore stock
      const items = await tx.orderItem.findMany({ where: { orderId: id } });
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data:  { stock: { increment: item.quantity } },
        });
      }
    });

    res.json({ success: true, message: 'Pedido cancelado' });
  } catch (err) { next(err); }
};

// ── Admin: Get All Orders ──────────────────────────────────────
exports.getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search, dateFrom, dateTo } = req.query;
    const where = {};

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo)   where.createdAt.lte = new Date(dateTo);
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user:    { select: { name: true, email: true } },
          payment: { select: { status: true, method: true } },
          _count:  { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip:    (parseInt(page) - 1) * parseInt(limit),
        take:    parseInt(limit),
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ success: true, data: orders, pagination: { page: parseInt(page), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};