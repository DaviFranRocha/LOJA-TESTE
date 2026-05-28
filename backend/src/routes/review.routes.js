const express  = require('express');
const { prisma } = require('../lib/prisma');
const AppError   = require('../utils/AppError');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/product/:productId', async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where:   { productId: req.params.productId, isApproved: true },
      include: { user: { select: { name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    res.json({ success: true, data: { reviews, avgRating: avg.toFixed(1), total: reviews.length } });
  } catch (err) { next(err); }
});

router.post('/', protect, async (req, res, next) => {
  try {
    const { productId, rating, title, body: reviewBody } = req.body;
    if (rating < 1 || rating > 5) return next(new AppError('Rating deve ser entre 1 e 5', 400));

    const review = await prisma.review.upsert({
      where:  { productId_userId: { productId, userId: req.user.id } },
      update: { rating, title, body: reviewBody },
      create: { productId, userId: req.user.id, rating, title, body: reviewBody },
      include: { user: { select: { name: true, avatarUrl: true } } },
    });

    const stats = await prisma.review.aggregate({
      where:  { productId, isApproved: true },
      _avg:   { rating: true },
      _count: { id: true },
    });
    await prisma.product.update({
      where: { id: productId },
      data:  { avgRating: stats._avg.rating || 0, totalReviews: stats._count.id },
    });

    res.status(201).json({ success: true, data: review });
  } catch (err) { next(err); }
});

module.exports = router;
