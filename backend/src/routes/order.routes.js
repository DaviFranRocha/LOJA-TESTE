const express    = require('express');
const orderCtrl  = require('../controllers/order.controller');
const { prisma } = require('../lib/prisma');
const AppError   = require('../utils/AppError');
const { protect, restrictTo } = require('../middleware/auth');

const STAFF = ['GERENTE','ADMIN','SUPER_ADMIN'];

const router = express.Router();
router.use(protect);

router.get('/',    orderCtrl.getMyOrders);
router.post('/',   orderCtrl.createOrder);
router.get('/all', restrictTo(...STAFF), orderCtrl.getAllOrders);

// DELETE — before /:id to avoid conflict
router.delete('/:id', restrictTo('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return next(new AppError('Pedido não encontrado', 404));
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: id } });
    await prisma.payment.deleteMany({ where: { orderId: id } });
    await prisma.orderItem.deleteMany({ where: { orderId: id } });
    await prisma.order.delete({ where: { id } });
    res.json({ success: true, message: 'Pedido excluído com sucesso' });
  } catch (err) { next(err); }
});

router.get('/:id',          orderCtrl.getOrder);
router.patch('/:id/status', restrictTo(...STAFF), orderCtrl.updateOrderStatus);
router.post('/:id/cancel',  orderCtrl.cancelOrder);

module.exports = router;
