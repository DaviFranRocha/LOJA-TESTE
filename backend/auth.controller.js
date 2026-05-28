// Francisco Store — Auth Controller
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../lib/prisma');
const AppError   = require('../utils/AppError');
const { generateTokens, setRefreshCookie, clearAuthCookies } = require('../middleware/auth');
const { auditLog } = require('../utils/audit');
const emailService = require('../services/email.service');

// ── Register ───────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check existing
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return next(new AppError('Email já cadastrado', 409));

    // Hash password
    const hashed = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));

    // Email verify token
    const emailVerifyToken = uuidv4();

    const user = await prisma.user.create({
      data: { name, email, password: hashed, phone, emailVerifyToken },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    // Send verification email (async, don't block response)
    emailService.sendVerificationEmail(user.email, user.name, emailVerifyToken).catch(console.error);

    const { accessToken, refreshToken } = generateTokens(user.id, user.role);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    setRefreshCookie(res, refreshToken);
    await auditLog({ userId: user.id, action: 'REGISTER', entity: 'User', entityId: user.id, req });

    // Notificar admin de novo cadastro
    try { await emailService.sendNewAccountNotification(user.name, user.email); } catch {}

    res.status(201).json({
      success: true,
      message: 'Conta criada! Verifique seu email.',
      data: { user, accessToken },
    });
  } catch (err) { next(err); }
};

// ── Login ──────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return next(new AppError('Email ou senha incorretos', 401));

    // Check lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remaining = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return next(new AppError(`Conta bloqueada. Tente em ${remaining} minutos.`, 403));
    }

    if (!user.isActive) return next(new AppError('Conta desativada', 403));

    // Check password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const attempts = user.loginAttempts + 1;
      const lockUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;

      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: attempts, lockedUntil: lockUntil },
      });

      return next(new AppError(
        attempts >= 5
          ? 'Conta bloqueada por 30 minutos devido a muitas tentativas'
          : `Email ou senha incorretos (${5 - attempts} tentativas restantes)`,
        401
      ));
    }

    // Reset attempts
    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null, lastLogin: new Date() },
    });

    const { accessToken, refreshToken } = generateTokens(user.id, user.role);

    // Revoke old refresh tokens (keep last 5)
    const oldTokens = await prisma.refreshToken.findMany({
      where: { userId: user.id, isRevoked: false },
      orderBy: { createdAt: 'desc' },
      skip: 4,
    });
    if (oldTokens.length > 0) {
      await prisma.refreshToken.updateMany({
        where: { id: { in: oldTokens.map(t => t.id) } },
        data: { isRevoked: true },
      });
    }

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    setRefreshCookie(res, refreshToken);
    await auditLog({ userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id, req });

    const { password: _, ...safeUser } = user;

    res.json({
      success: true,
      data: { user: safeUser, accessToken },
    });
  } catch (err) { next(err); }
};

// ── Refresh Token ──────────────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) return next(new AppError('Refresh token não fornecido', 401));

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return next(new AppError('Refresh token inválido ou expirado', 401));
    }

    // Check DB
    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      return next(new AppError('Refresh token revogado ou expirado', 401));
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    if (!user?.isActive) return next(new AppError('Usuário inativo', 401));

    // Rotate tokens
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } });

    const { accessToken, refreshToken: newRefresh } = generateTokens(user.id, user.role);

    await prisma.refreshToken.create({
      data: {
        token: newRefresh,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    setRefreshCookie(res, newRefresh);

    res.json({ success: true, data: { accessToken } });
  } catch (err) { next(err); }
};

// ── Logout ─────────────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await prisma.refreshToken.updateMany({
        where: { token },
        data: { isRevoked: true },
      });
    }
    clearAuthCookies(res);
    res.json({ success: true, message: 'Logout realizado' });
  } catch (err) { next(err); }
};

// ── Forgot Password ────────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond OK (don't reveal if email exists)
    if (user) {
      const token = uuidv4();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: token,
          passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1h
        },
      });
      await emailService.sendPasswordResetEmail(user.email, user.name, token);
    }

    res.json({
      success: true,
      message: 'Se o email existir, você receberá instruções de recuperação.',
    });
  } catch (err) { next(err); }
};

// ── Reset Password ─────────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    });
    if (!user) return next(new AppError('Token inválido ou expirado', 400));

    const hashed = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        passwordResetToken: null,
        passwordResetExpires: null,
        loginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true },
    });

    clearAuthCookies(res);
    res.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (err) { next(err); }
};

// ── Get Me ─────────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true, phone: true, cpf: true,
        avatarUrl: true, role: true, isEmailVerified: true,
        createdAt: true, lastLogin: true,
      },
    });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// ── Verify Email ───────────────────────────────────────────────
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    const user = await prisma.user.findFirst({ where: { emailVerifyToken: token } });
    if (!user) return next(new AppError('Token inválido', 400));

    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerifyToken: null },
    });

    res.json({ success: true, message: 'Email verificado com sucesso!' });
  } catch (err) { next(err); }
};