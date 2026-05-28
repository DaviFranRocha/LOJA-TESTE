const express  = require('express');
const { prisma } = require('../lib/prisma');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where:   { userId: req.user.id },
      include: { product: { include: { images: { take: 1 } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
});

router.post('/toggle', async (req, res, next) => {
  try {
    const { productId } = req.body;
    const exists = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId: req.user.id, productId } },
    });
    if (exists) {
      await prisma.wishlistItem.delete({ where: { id: exists.id } });
      return res.json({ success: true, inWishlist: false });
    }
    await prisma.wishlistItem.create({ data: { userId: req.user.id, productId } });
    res.json({ success: true, inWishlist: true });
  } catch (err) { next(err); }
});

module.exports = router;
