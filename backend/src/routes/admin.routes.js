const express   = require('express');
const adminCtrl = require('../controllers/admin.controller');
const {
  protect, restrictTo, managementOnly, canManageUser
} = require('../middleware/auth');

const router = express.Router();

// Todos precisam estar autenticados e ter cargo admin
router.use(protect, restrictTo('GERENTE', 'ADMIN', 'SUPER_ADMIN'));

// ── Dashboard — todos os cargos admin ─────────────────────────
router.get('/dashboard', adminCtrl.getDashboard);

// ── Relatórios financeiros — apenas CEO e SUPER_ADMIN ─────────
router.get('/financial-report', restrictTo('SUPER_ADMIN'), adminCtrl.getFinancialReport);

// ── Logs do sistema — apenas CEO e SUPER_ADMIN ────────────────
router.get('/logs', restrictTo('SUPER_ADMIN'), adminCtrl.getSystemLogs);

// ── Configurações — CEO e SUPER_ADMIN podem ver/editar ────────
router.get('/config',  restrictTo('SUPER_ADMIN'), adminCtrl.getConfig);
router.post('/config', restrictTo('SUPER_ADMIN'), adminCtrl.updateConfig);

// ── Usuários — apenas CEO e SUPER_ADMIN ───────────────────────
router.get('/users', managementOnly, adminCtrl.getUsers);

// Desativar/ativar conta — apenas CEO e SUPER_ADMIN, com verificação de hierarquia
router.patch('/users/:id/status', managementOnly, canManageUser, adminCtrl.toggleUserStatus);

// Alterar cargo — apenas CEO e SUPER_ADMIN, com verificação de hierarquia
router.patch('/users/:id/role', managementOnly, canManageUser, async (req, res, next) => {
  try {
    const { prisma } = require('../lib/prisma');
    const AppErr = require('../utils/AppError');
    const { role } = req.body;

    // Cargos válidos (sem DIRETOR)
    const validRoles = ['CUSTOMER', 'GERENTE', 'ADMIN', 'SUPER_ADMIN'];
    if (!validRoles.includes(role)) return next(new AppErr('Cargo inválido', 400));

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data:  { role },
      select: { id: true, name: true, email: true, role: true },
    });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// Deletar conta — apenas SUPER_ADMIN
router.delete('/users/:id', restrictTo('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { prisma } = require('../lib/prisma');
    const AppErr = require('../utils/AppError');
    if (req.params.id === req.user.id) return next(new AppErr('Não pode deletar sua própria conta', 400));
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Conta removida com sucesso' });
  } catch (err) { next(err); }
});

// ── Avaliações — ADMIN, SUPER_ADMIN, CEO ──────────────────────
router.get('/reviews', restrictTo('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { prisma } = require('../lib/prisma');
    const reviews = await prisma.review.findMany({
      include: {
        user:    { select: { name: true } },
        product: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: reviews });
  } catch (err) { next(err); }
});

router.patch('/reviews/:id', restrictTo('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { prisma } = require('../lib/prisma');
    const review = await prisma.review.update({
      where: { id: req.params.id },
      data:  { isApproved: req.body.isApproved },
    });
    res.json({ success: true, data: review });
  } catch (err) { next(err); }
});

// ── Notificações — ADMIN, SUPER_ADMIN, CEO ────────────────────
router.post('/notifications', restrictTo('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { prisma } = require('../lib/prisma');
    const { userId, type, title, message } = req.body;
    if (!userId || !title || !message) {
      return res.status(400).json({ success: false, message: 'userId, title e message são obrigatórios' });
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    const notif = await prisma.notification.create({
      data: { userId, type: type || 'INFO', title, message },
    });
    res.json({ success: true, data: notif });
  } catch (err) { next(err); }
});

// ── Confirmar pagamento — ADMIN, SUPER_ADMIN, CEO ─────────────
router.post('/payments/:orderId/confirm', restrictTo('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { prisma } = require('../lib/prisma');
    const { orderId } = req.params;
    await prisma.payment.update({ where: { orderId }, data: { status: 'APPROVED', paidAt: new Date() } });
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'PAID', statusHistory: { create: { status: 'PAID', comment: 'Confirmado pelo admin' } } },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Endpoint de permissões — retorna permissões do usuário atual
router.get('/my-permissions', (req, res) => {
  const { PERMISSIONS } = require('../middleware/auth');
  const perms = PERMISSIONS[req.user.role] || [];
  res.json({ success: true, data: { role: req.user.role, permissions: perms } });
});

// ── Online Users ──────────────────────────────────────────────
router.get('/online-users', restrictTo('ADMIN', 'SUPER_ADMIN'), adminCtrl.getOnlineUsers);

// ── Logs management ───────────────────────────────────────────
router.delete('/logs/:id', restrictTo('SUPER_ADMIN'), adminCtrl.deleteLog);
router.delete('/logs',     restrictTo('SUPER_ADMIN'), adminCtrl.clearLogs);

module.exports = router;