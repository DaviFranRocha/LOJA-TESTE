const jwt    = require('jsonwebtoken');
const { prisma } = require('../lib/prisma');
const AppError   = require('../utils/AppError');

// ── Hierarquia final: SUPER_ADMIN > ADMIN > GERENTE > CUSTOMER
const ROLE_LEVEL = {
  CUSTOMER:    0,
  GERENTE:     1,
  ADMIN:       2,
  SUPER_ADMIN: 3,
};

const ADMIN_ROLES      = ['GERENTE', 'ADMIN', 'SUPER_ADMIN'];
const MANAGEMENT_ROLES = ['SUPER_ADMIN'];

const PERMISSIONS = {
  CUSTOMER: [],
  GERENTE: [
    'orders.view', 'orders.update_status',
    'products.view', 'stock.view', 'stock.update', 'dashboard.view',
  ],
  ADMIN: [
    'orders.view', 'orders.update_status', 'orders.manage',
    'products.view', 'products.create', 'products.edit', 'products.delete',
    'categories.manage', 'banners.manage', 'coupons.manage',
    'stock.view', 'stock.update', 'customers.view', 'reviews.manage',
    'notifications.send', 'dashboard.view', 'dashboard.advanced',
    'reports.view', 'payments.view', 'payments.confirm',
  ],
  SUPER_ADMIN: [
    'orders.view', 'orders.update_status', 'orders.manage', 'orders.delete',
    'products.view', 'products.create', 'products.edit', 'products.delete',
    'categories.manage', 'banners.manage', 'coupons.manage',
    'stock.view', 'stock.update', 'customers.view', 'reviews.manage',
    'notifications.send', 'dashboard.view', 'dashboard.advanced',
    'reports.view', 'reports.financial',
    'users.view', 'users.manage', 'users.deactivate', 'users.delete',
    'roles.manage', 'logs.view',
    'config.view', 'config.edit', 'config.critical',
    'payments.view', 'payments.confirm', 'payments.refund',
    'system.full_control',
  ],
};

const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { sub: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { sub: userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
};

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }
    if (!token) return next(new AppError('Autenticação necessária', 401));

    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
    catch (err) {
      if (err.name === 'TokenExpiredError') return next(new AppError('Token expirado', 401));
      return next(new AppError('Token inválido', 401));
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, email: true, name: true, role: true, isActive: true, lockedUntil: true },
    });
    if (!user)          return next(new AppError('Usuário não encontrado', 401));
    if (!user.isActive) return next(new AppError('Conta desativada', 403));
    if (user.lockedUntil && user.lockedUntil > new Date()) return next(new AppError('Conta temporariamente bloqueada', 403));

    // Normalizar roles legados
    if (user.role === 'DIRETOR') user.role = 'ADMIN';
    if (user.role === 'CEO') user.role = 'SUPER_ADMIN'; // legacy

    req.user = user;
    next();
  } catch (err) { next(err); }
};

// SUPER_ADMIN sempre passa
const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError('Autenticação necessária', 401));
  if (req.user.role === 'SUPER_ADMIN') return next();
  if (roles.includes(req.user.role)) return next();
  return next(new AppError('Você não tem permissão para esta ação', 403));
};

const requireLevel = (minRole) => (req, res, next) => {
  if (!req.user) return next(new AppError('Autenticação necessária', 401));
  const userLevel = ROLE_LEVEL[req.user.role] ?? 0;
  const minLevel  = ROLE_LEVEL[minRole] ?? 99;
  if (userLevel < minLevel) return next(new AppError('Nível de acesso insuficiente', 403));
  next();
};

const managementOnly = (req, res, next) => {
  if (!req.user) return next(new AppError('Autenticação necessária', 401));
  if (!MANAGEMENT_ROLES.includes(req.user.role)) {
    return next(new AppError('Apenas Super Admin pode realizar esta ação', 403));
  }
  next();
};

const canManageUser = async (req, res, next) => {
  try {
    if (!MANAGEMENT_ROLES.includes(req.user.role)) {
      return next(new AppError('Sem permissão para gerenciar usuários', 403));
    }
    const targetUser = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, role: true },
    });
    if (!targetUser) return next(new AppError('Usuário não encontrado', 404));
    if (targetUser.id === req.user.id) return next(new AppError('Não pode gerenciar sua própria conta assim', 400));
    req.targetUser = targetUser;
    next();
  } catch (err) { next(err); }
};

const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) token = req.headers.authorization.split(' ')[1];
    else if (req.cookies?.accessToken) token = req.cookies.accessToken;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, email: true, name: true, role: true, isActive: true },
      });
      if (user?.isActive) {
        if (user.role === 'DIRETOR') user.role = 'ADMIN';
        if (user.role === 'CEO') user.role = 'SUPER_ADMIN'; // legacy
        req.user = user;
      }
    }
    next();
  } catch { next(); }
};

const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   7 * 24 * 60 * 60 * 1000,
    path:     '/api/auth/refresh',
  });
};
const clearAuthCookies = (res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
};

module.exports = {
  protect, restrictTo, requireLevel, managementOnly, canManageUser, optionalAuth,
  generateTokens, setRefreshCookie, clearAuthCookies,
  ADMIN_ROLES, ROLE_LEVEL, PERMISSIONS, MANAGEMENT_ROLES,
};
