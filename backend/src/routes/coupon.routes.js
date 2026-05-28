const express  = require('express');
const { prisma } = require('../lib/prisma');
const AppError   = require('../utils/AppError');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.post('/validate', async (req, res, next) => {
  try {
    const { code, orderValue } = req.body;
    const coupon = await prisma.coupon.findFirst({
      where: {
        code:     { equals: code, mode: 'insensitive' },
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (!coupon) return next(new AppError('Cupom inválido ou expirado', 404));
    if (coupon.minOrderValue && parseFloat(orderValue) < parseFloat(coupon.minOrderValue)) {
      return next(new AppError(`Valor mínimo: R$ ${coupon.minOrderValue}`, 400));
    }

    let discount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discount = parseFloat(orderValue) * (parseFloat(coupon.discountValue) / 100);
      if (coupon.maxDiscount) discount = Math.min(discount, parseFloat(coupon.maxDiscount));
    } else {
      discount = parseFloat(coupon.discountValue);
    }

    res.json({ success: true, data: { ...coupon, discount } });
  } catch (err) { next(err); }
});

router.get('/', restrictTo('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: coupons });
  } catch (err) { next(err); }
});

router.post('/', restrictTo('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const coupon = await prisma.coupon.create({ data: req.body });
    res.status(201).json({ success: true, data: coupon });
  } catch (err) { next(err); }
});

module.exports = router;
