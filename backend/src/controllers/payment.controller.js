// Francis Store — Payment Controller
const { prisma }   = require('../lib/prisma');
const AppError     = require('../utils/AppError');
const { auditLog } = require('../utils/audit');
const notifService = require('../services/notification.service');
const emailService = require('../services/email.service');

// PIX configuration — use env vars or defaults
const PIX_KEY  = process.env.PIX_KEY  || '7d66afd4-4f70-428f-908b-ad5c2eae982c'; // Chave PIX fixa
const PIX_NAME = process.env.PIX_NAME || 'FRANCIS STORE';
const PIX_CITY = process.env.PIX_CITY || 'SAO PAULO';

// ── Generate PIX EMV payload (BR.GOV.BCB.PIX standard) ─────────
function buildPixPayload(amount, txId, description) {
  const pixKey = PIX_KEY;
  const name   = PIX_NAME.substring(0, 25).toUpperCase().replace(/[^A-Z0-9 ]/g, '');
  const city   = PIX_CITY.substring(0, 15).toUpperCase().replace(/[^A-Z0-9 ]/g, '');
  const amtStr = Number(amount).toFixed(2);
  const desc   = (description || 'Francis Store').substring(0, 25);
  const tid    = (txId || 'FRANCISSTORE').replace(/[^A-Z0-9]/gi, '').substring(0, 25).toUpperCase();

  const fmt = (id, val) => {
    const s = String(val);
    return `${id}${String(s.length).padStart(2, '0')}${s}`;
  };

  // Build merchant account info (ID 26)
  const pixKeyField  = fmt('01', pixKey);
  const descField    = fmt('02', desc);
  const merchantAcct = fmt('26', fmt('00', 'BR.GOV.BCB.PIX') + pixKeyField + descField);

  // Build additional data field (ID 62) — txId reference
  const txIdField = fmt('62', fmt('05', tid));

  const payload =
    fmt('00', '01') +      // payload format indicator
    fmt('01', '12') +      // point of initiation (12 = dynamic)
    merchantAcct +
    fmt('52', '0000') +    // merchant category code
    fmt('53', '986') +     // transaction currency (BRL)
    fmt('54', amtStr) +    // transaction amount
    fmt('58', 'BR') +      // country code
    fmt('59', name) +      // merchant name
    fmt('60', city) +      // merchant city
    txIdField +
    '6304';                // CRC placeholder

  // CRC-16 CCITT (x^16 + x^12 + x^5 + 1) polynomial 0x1021
  let crc = 0xFFFF;
  for (const ch of payload) {
    crc ^= ch.charCodeAt(0) << 8;
    for (let i = 0; i < 8; i++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
    }
    crc &= 0xFFFF;
  }

  return payload + crc.toString(16).toUpperCase().padStart(4, '0');
}

// ── Create Payment ──────────────────────────────────────────────
exports.createPayment = async (req, res, next) => {
  try {
    const { orderId, method } = req.body;
    const userId = req.user.id;

    const order = await prisma.order.findFirst({
      where:   { id: orderId, userId },
      include: { user: { select: { name: true, email: true, cpf: true } } },
    });
    if (!order) return next(new AppError('Pedido não encontrado', 404));
    if (!['PENDING', 'PAYMENT_PENDING'].includes(order.status)) {
      return next(new AppError('Pedido não aguarda pagamento', 400));
    }

    const existing = await prisma.payment.findUnique({ where: { orderId } });
    if (existing?.status === 'APPROVED') return next(new AppError('Pedido já foi pago', 400));

    const amount = parseFloat(order.total);
    let paymentData = {};

    // ── PIX ─────────────────────────────────────────────────────
    if (method === 'PIX') {
      const txId    = `FS${order.orderNumber.replace(/[^A-Z0-9]/gi, '')}`.substring(0, 25);
      const pixCode = buildPixPayload(amount, txId, `Pedido ${order.orderNumber}`);

      paymentData = {
        method:      'PIX',
        status:      'PENDING',
        amount,
        gatewayId:   txId,
        pixCode,
        gatewayData: { txId, name: PIX_NAME, pixKeyType: 'EVP' },
      };
    }

    // ── Boleto ──────────────────────────────────────────────────
    else if (method === 'BOLETO') {
      paymentData = {
        method:      'BOLETO',
        status:      'PENDING',
        amount,
        gatewayId:   `BOLETO-${order.orderNumber}`,
        gatewayData: { instructions: 'Entre em contato para boleto personalizado.' },
      };
    }

    // ── Stripe/Card ─────────────────────────────────────────────
    else if (method === 'STRIPE' || method === 'CREDIT_CARD') {
      paymentData = {
        method:      'STRIPE',
        status:      'PENDING',
        amount,
        gatewayId:   `STRIPE-${order.orderNumber}`,
        gatewayData: { message: 'Aguardando confirmação do cartão.' },
      };
    }

    else {
      return next(new AppError('Método de pagamento inválido', 400));
    }

    const saved = existing
      ? await prisma.payment.update({ where: { orderId }, data: paymentData })
      : await prisma.payment.create({ data: { orderId, ...paymentData } });

    await prisma.order.update({
      where: { id: orderId },
      data:  { status: 'PAYMENT_PENDING' },
    });

    await auditLog({ userId, action: 'CREATE_PAYMENT', entity: 'Payment', entityId: saved.id, req });

    res.status(201).json({ success: true, data: saved });
  } catch (err) { next(err); }
};

// ── Get Payment (used by polling) ──────────────────────────────
exports.getPayment = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const payment = await prisma.payment.findFirst({
      where: {
        orderId,
        order: req.user.role === 'CUSTOMER' ? { userId: req.user.id } : {},
      },
    });
    if (!payment) return next(new AppError('Pagamento não encontrado', 404));

    // Strip sensitive data
    const safe = { ...payment };
    if (safe.gatewayData && typeof safe.gatewayData === 'object') {
      delete safe.gatewayData.pixKey;
    }

    res.json({ success: true, data: safe });
  } catch (err) { next(err); }
};

// ── Stripe Webhook ─────────────────────────────────────────────
exports.stripeWebhook = async (req, res) => {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const sig    = req.headers['stripe-signature'];

  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_test_sua')) {
    return res.json({ received: true, note: 'Stripe não configurado' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Stripe Webhook] Assinatura inválida:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const intent  = event.data.object;
      const orderId = intent.metadata?.orderId;
      if (orderId) {
        const existing = await prisma.payment.findUnique({ where: { orderId } });
        if (existing && existing.status !== 'APPROVED') {
          await prisma.$transaction([
            prisma.payment.update({
              where: { orderId },
              data:  { status: 'APPROVED', paidAt: new Date(), gatewayId: intent.id },
            }),
            prisma.order.update({
              where: { id: orderId },
              data:  {
                status: 'PAID',
                statusHistory: { create: { status: 'PAID', comment: 'Pagamento confirmado via Stripe' } },
              },
            }),
          ]);
          await processConfirmedPayment(orderId);
        }
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent  = event.data.object;
      const orderId = intent.metadata?.orderId;
      if (orderId) {
        await prisma.payment.updateMany({
          where: { orderId, status: { not: 'APPROVED' } },
          data:  { status: 'REJECTED' },
        });
      }
    }
  } catch (err) {
    console.error('[Stripe Webhook] Erro ao processar evento:', err.message);
  }

  res.json({ received: true });
};

// ── MercadoPago Webhook ─────────────────────────────────────────
exports.mercadopagoWebhook = async (req, res) => {
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN.startsWith('APP_USR-sua')) {
    return res.sendStatus(200);
  }

  try {
    const { type, data } = req.body;

    if (type === 'payment') {
      const paymentId = data?.id;
      if (!paymentId) return res.sendStatus(200);

      // Fetch payment details from MercadoPago API
      const fetch = require('node-fetch').default || globalThis.fetch;
      const mpRes  = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
      });
      const mpData = await mpRes.json();

      const orderId = mpData?.external_reference;
      if (!orderId) return res.sendStatus(200);

      const statusMap = {
        approved:   'APPROVED',
        rejected:   'REJECTED',
        cancelled:  'CANCELLED',
        refunded:   'REFUNDED',
        in_process: 'PROCESSING',
      };

      const newStatus = statusMap[mpData.status];
      if (!newStatus) return res.sendStatus(200);

      const existing = await prisma.payment.findUnique({ where: { orderId } });
      if (!existing || existing.status === 'APPROVED') return res.sendStatus(200);

      await prisma.payment.update({
        where: { orderId },
        data:  { status: newStatus, paidAt: newStatus === 'APPROVED' ? new Date() : null, gatewayId: String(paymentId) },
      });

      if (newStatus === 'APPROVED') {
        await prisma.order.update({
          where: { id: orderId },
          data:  {
            status: 'PAID',
            statusHistory: { create: { status: 'PAID', comment: 'Pagamento confirmado via MercadoPago' } },
          },
        });
        await processConfirmedPayment(orderId);
      }
    }
  } catch (err) {
    console.error('[MP Webhook] Erro:', err.message);
  }

  res.sendStatus(200);
};

// ── Shared: process confirmed payment (send email + set access) ──
async function processConfirmedPayment(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { name: true, email: true } },
      items: {
        include: {
          product: { select: { name: true, downloadUrl: true, accessDays: true } },
        },
      },
    },
  });
  if (!order) return;

  // Set accessExpiresAt on items
  await Promise.all(order.items.map(item => {
    if (item.accessExpiresAt) return Promise.resolve();
    const days    = item.product?.accessDays || 5;
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    return prisma.orderItem.update({ where: { id: item.id }, data: { accessExpiresAt: expires } });
  }));

  // Send email
  if (order.user?.email) {
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
  }
}

// ── Admin: confirm payment manually ────────────────────────────
exports.confirmPayment = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const payment = await prisma.payment.findUnique({ where: { orderId } });
    if (!payment) return next(new AppError('Pagamento não encontrado', 404));

    await prisma.$transaction([
      prisma.payment.update({ where: { orderId }, data: { status: 'APPROVED', paidAt: new Date() } }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: 'PAID', statusHistory: { create: { status: 'PAID', comment: 'Pagamento confirmado' } } },
      }),
    ]);

    // Process access + send email
    try { await processConfirmedPayment(orderId); }
    catch (e) { console.error('Email/access error:', e.message); }

    res.json({ success: true, message: 'Pagamento confirmado! Acesso liberado.' });
  } catch (err) { next(err); }
};