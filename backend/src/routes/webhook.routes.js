const express     = require('express');
const paymentCtrl = require('../controllers/payment.controller');

const router = express.Router();

router.post('/stripe',      paymentCtrl.stripeWebhook);
router.post('/mercadopago', paymentCtrl.mercadopagoWebhook);

module.exports = router;
