// Francis Store — Product Access Route
// After payment, user gets access to product download for N days
const express    = require('express');
const { prisma } = require('../lib/prisma');
const AppError   = require('../utils/AppError');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/access — list all active product accesses for the user
router.get('/', async (req, res, next) => {
  try {
    const now = new Date();

    const items = await prisma.orderItem.findMany({
      where: {
        order: {
          userId: req.user.id,
          status: { in: ['PAID', 'PROCESSING', 'DELIVERED'] },
        },
        OR: [
          { accessExpiresAt: null },
          { accessExpiresAt: { gt: now } },
        ],
      },
      include: {
        order: { select: { id: true, orderNumber: true, createdAt: true, status: true } },
        product: {
          select: {
            id: true, name: true, slug: true, description: true, shortDesc: true,
            downloadUrl: true, accessDays: true,
            images: { take: 1, select: { url: true } },
          },
        },
      },
      orderBy: { order: { createdAt: 'desc' } },
    });

    // Calculate remaining days for each item
    const accesses = items.map(item => {
      const paidAt    = item.accessExpiresAt
        ? new Date(item.accessExpiresAt.getTime() - (item.product.accessDays || 5) * 86400000)
        : item.order.createdAt;
      const expiresAt = item.accessExpiresAt || (() => {
        const d = new Date(item.order.createdAt);
        d.setDate(d.getDate() + (item.product.accessDays || 5));
        return d;
      })();
      const msLeft   = expiresAt.getTime() - now.getTime();
      const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
      const hoursLeft= Math.max(0, Math.ceil(msLeft / 3600000));

      return {
        orderItemId:   item.id,
        orderId:       item.order.id,
        orderNumber:   item.order.orderNumber,
        paidAt:        paidAt.toISOString(),
        expiresAt:     expiresAt.toISOString(),
        daysLeft,
        hoursLeft:     hoursLeft > 24 ? null : hoursLeft,
        isExpired:     daysLeft === 0,
        product:       item.product,
        quantity:      item.quantity,
      };
    }).filter(a => !a.isExpired);

    res.json({ success: true, data: accesses });
  } catch (err) { next(err); }
});

// POST /api/access/confirm/:orderId — called after payment confirmed, sets accessExpiresAt + sends email
router.post('/confirm/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const emailService = require('../services/email.service');

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: req.user.id, status: { in: ['PAID','PROCESSING','DELIVERED'] } },
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: { product: { select: { name: true, downloadUrl: true, accessDays: true } } },
        },
      },
    });

    if (!order) return next(new AppError('Pedido não encontrado ou não pago', 404));

    // Set accessExpiresAt for each item if not set yet
    await Promise.all(order.items.map(item => {
      if (item.accessExpiresAt) return Promise.resolve();
      const days    = item.product?.accessDays || 5;
      const expires = new Date();
      expires.setDate(expires.getDate() + days);
      return prisma.orderItem.update({
        where: { id: item.id },
        data:  { accessExpiresAt: expires },
      });
    }));

    // Send email to client + admin (only once — check if already sent)
    const payment = await prisma.payment.findUnique({ where: { orderId } });
    if (payment && !payment.emailSent) {
      try {
        const items = order.items.map(i => ({
          productName: i.productName || i.product?.name || 'Produto',
          quantity:    i.quantity,
          totalPrice:  i.totalPrice,
          downloadUrl: i.product?.downloadUrl || null,
          accessDays:  i.product?.accessDays  || 5,
        }));
        await emailService.sendPurchaseEmail(
          order.user.email,
          order.user.name,
          { orderNumber: order.orderNumber, total: order.total },
          items
        );
        // Mark email as sent
        await prisma.payment.update({ where: { orderId }, data: { emailSent: true } }).catch(() => {});
      } catch (e) {
        console.error('Email error (non-fatal):', e.message);
      }
    }

    res.json({ success: true, message: 'Acesso liberado!' });
  } catch (err) { next(err); }
});

module.exports = router;