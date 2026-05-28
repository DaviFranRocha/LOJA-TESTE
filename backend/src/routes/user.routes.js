const express    = require('express');
const { prisma } = require('../lib/prisma');
const AppError   = require('../utils/AppError');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/profile', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: { id: true, name: true, email: true, phone: true, cpf: true, avatarUrl: true, createdAt: true },
    });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

router.patch('/profile', async (req, res, next) => {
  try {
    const { name, phone, cpf, avatarUrl } = req.body;

    // Build update object with only provided fields
    const updateData = {};
    if (name      !== undefined) updateData.name      = name;
    if (phone     !== undefined) updateData.phone     = phone;
    if (cpf       !== undefined) updateData.cpf       = cpf;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    const user = await prisma.user.update({
      where:  { id: req.user.id },
      data:   updateData,
      select: { id: true, name: true, email: true, phone: true, cpf: true, avatarUrl: true },
    });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

router.get('/addresses', async (req, res, next) => {
  try {
    const addrs = await prisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: { isDefault: 'desc' },
    });
    res.json({ success: true, data: addrs });
  } catch (err) { next(err); }
});

router.post('/addresses', async (req, res, next) => {
  try {
    if (req.body.isDefault) {
      await prisma.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
    }
    const addr = await prisma.address.create({ data: { ...req.body, userId: req.user.id } });
    res.status(201).json({ success: true, data: addr });
  } catch (err) { next(err); }
});

router.put('/addresses/:id', async (req, res, next) => {
  try {
    const addr = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!addr) return next(new AppError('Endereço não encontrado', 404));
    if (req.body.isDefault) {
      await prisma.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
    }
    const updated = await prisma.address.update({ where: { id: addr.id }, data: req.body });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

router.delete('/addresses/:id', async (req, res, next) => {
  try {
    await prisma.address.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
