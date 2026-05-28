const express              = require('express');
const paymentCtrl          = require('../controllers/payment.controller');
const { protect, restrictTo } = require('../middleware/auth');
const { prisma }           = require('../lib/prisma');

const router = express.Router();

// All payment routes require authentication
router.use(protect);

router.post('/',        paymentCtrl.createPayment);
router.get('/:orderId', paymentCtrl.getPayment);

// Admin: confirm payment manually (protect already applied via router.use above)
router.post('/:orderId/confirm', restrictTo('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    await prisma.payment.update({
      where: { orderId: req.params.orderId },
      data:  { status: 'APPROVED', paidAt: new Date() },
    });
    await prisma.order.update({
      where: { id: req.params.orderId },
      data:  {
        status: 'PAID',
        statusHistory: { create: { status: 'PAID', comment: 'Confirmado manualmente pelo admin' } },
      },
    });
    res.json({ success: true, message: 'Pagamento confirmado' });
  } catch (err) { next(err); }
});

module.exports = router;
