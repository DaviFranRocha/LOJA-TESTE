const express  = require('express');
const { body } = require('express-validator');
const authCtrl = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const passwordRules = [
  body('password')
    .isLength({ min: 8 }).withMessage('Senha deve ter no mínimo 8 caracteres')
    .matches(/[A-Z]/).withMessage('Senha deve conter letra maiúscula')
    .matches(/[0-9]/).withMessage('Senha deve conter número')
    .matches(/[^A-Za-z0-9]/).withMessage('Senha deve conter caractere especial'),
];

router.post('/register',
  body('name').trim().isLength({ min: 2 }).withMessage('Nome muito curto'),
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  ...passwordRules,
  validate,
  authCtrl.register
);
router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
  authCtrl.login
);
router.post('/refresh',         authCtrl.refreshToken);
router.post('/logout',          authCtrl.logout);
router.post('/forgot-password', body('email').isEmail(), validate, authCtrl.forgotPassword);
router.post('/reset-password',  ...passwordRules, validate, authCtrl.resetPassword);
router.get('/me',               protect, authCtrl.getMe);
router.get('/verify/:token',    authCtrl.verifyEmail);

module.exports = router;
