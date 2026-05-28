const express  = require('express');
const { prisma } = require('../lib/prisma');
const AppError   = require('../utils/AppError');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const items = await prisma.cartItem.findMany({
      where:   { userId: req.user.id },
      include: { product: { include: { images: { take: 1 } } } },
    });
    const total = items.reduce((s, i) => s + parseFloat(i.product.price) * i.quantity, 0);
    res.json({ success: true, data: { items, total } });
  } catch (err) { next(err); }
});

router.post('/add', async (req, res, next) => {
  try {
    const { productId, quantity = 1, variantId } = req.body;
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== 'ACTIVE') return next(new AppError('Produto indisponível', 404));
    if (product.stock < quantity) return next(new AppError('Estoque insuficiente', 400));

    const item = await prisma.cartItem.upsert({
      where:  { userId_productId_variantId: { userId: req.user.id, productId, variantId: variantId || null } },
      update: { quantity: { increment: quantity } },
      create: { userId: req.user.id, productId, quantity, variantId: variantId || null },
      include: { product: { include: { images: { take: 1 } } } },
    });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const item = await prisma.cartItem.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!item) return next(new AppError('Item não encontrado', 404));
    const { quantity } = req.body;
    if (quantity < 1) {
      await prisma.cartItem.delete({ where: { id: item.id } });
      return res.json({ success: true, message: 'Item removido' });
    }
    const updated = await prisma.cartItem.update({ where: { id: item.id }, data: { quantity }, include: { product: true } });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.cartItem.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
    res.json({ success: true, message: 'Item removido' });
  } catch (err) { next(err); }
});

router.delete('/', async (req, res, next) => {
  try {
    await prisma.cartItem.deleteMany({ where: { userId: req.user.id } });
    res.json({ success: true, message: 'Carrinho limpo' });
  } catch (err) { next(err); }
});

module.exports = router;
