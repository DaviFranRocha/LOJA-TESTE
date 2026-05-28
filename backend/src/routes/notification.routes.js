const express    = require('express');
const jwt        = require('jsonwebtoken');
const { prisma } = require('../lib/prisma');
const { protect, restrictTo } = require('../middleware/auth');
const { clients, pushToUser, pushToAdmins } = require('../lib/sseClients');

const router = express.Router();

// ── GET /notifications/stream — SSE (auth via query token) ───────
router.get('/stream', async (req, res) => {
  let user = null;
  try {
    const token = req.query.token || (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).end();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    user = await prisma.user.findUnique({ where: { id: decoded.sub || decoded.id }, select: { id: true, role: true, name: true } });
  } catch { return res.status(401).end(); }
  if (!user) return res.status(401).end();

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Transfer-Encoding', 'chunked');
  // Disable compression for this response
  res.removeHeader('Content-Encoding');
  res.flushHeaders();

  const uid = String(user.id);
  clients.set(uid, res);
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', userId: uid })}\n\n`);

  const hb = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { clearInterval(hb); }
  }, 20000);

  req.on('close', () => {
    clearInterval(hb);
    clients.delete(uid);
  });
});

// ── All routes below require auth header ─────────────────────────
router.use(protect);

// ── GET /notifications ───────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const notifs = await prisma.notification.findMany({
      where:   { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take:    60,
    });
    res.json({ success: true, data: { notifications: notifs, unread: notifs.filter(n => !n.isRead).length } });
  } catch (err) { next(err); }
});

// ── PATCH /notifications/read-all ───────────────────────────────
router.patch('/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data:  { isRead: true, readAt: new Date() },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── PATCH /notifications/:id/read ───────────────────────────────
router.patch('/:id/read', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data:  { isRead: true, readAt: new Date() },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── POST /notifications/send — Admin broadcast ───────────────────
router.post('/send', restrictTo('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { title, message, type = 'INFO', userId } = req.body;
    if (!title || !message) return res.status(400).json({ success: false, message: 'title e message obrigatórios' });

    const targets = userId && userId !== 'all'
      ? [{ id: userId }]
      : await prisma.user.findMany({ where: { role: 'CUSTOMER' }, select: { id: true } });

    const created = await Promise.all(targets.map(u =>
      prisma.notification.create({
        data: { userId: u.id, type, title, message, data: { from: 'admin', senderId: req.user.id, senderName: req.user.name } },
      })
    ));

    // Save a copy for admin's own history (so it appears in Histórico tab)
    // Only when sending to a specific client (not broadcast)
    if (userId && userId !== 'all') {
      await prisma.notification.create({
        data: {
          userId:  req.user.id,
          type:    'ADMIN_SENT',
          title:   `Para: ${targets[0]?.name || userId}`,
          message,
          data:    { from: 'admin_sent', toId: userId, adminId: req.user.id, adminName: req.user.name },
        },
      });
    }

    // Push SSE in real-time
    created.forEach(n => pushToUser(n.userId, { type: 'NEW_NOTIFICATION', notification: n }));

    console.log(`[SSE] Sent to ${created.length} users. Online: ${clients.size}`);
    res.json({ success: true, sent: created.length });
  } catch (err) { next(err); }
});

// ── POST /notifications/reply — Client reply ────────────────────
router.post('/reply', async (req, res, next) => {
  try {
    const { message, replyToId } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Mensagem obrigatória' });

    const user = req.user;
    const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } }, select: { id: true } });

    const created = await Promise.all(admins.map(a =>
      prisma.notification.create({
        data: {
          userId:  a.id,
          type:    'REPLY',
          title:   `Resposta de ${user.name}`,
          message: message.trim(),
          data:    { from: 'client', senderId: user.id, senderName: user.name, senderEmail: user.email, replyToId },
        },
      })
    ));

    // Push SSE to admins in real-time
    created.forEach(n => pushToUser(n.userId, { type: 'NEW_NOTIFICATION', notification: n }));

    console.log(`[SSE] Reply from ${user.name} pushed to ${created.length} admins`);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── DELETE /notifications/history — cliente apaga seu histórico ──
router.delete('/history', async (req, res, next) => {
  try {
    await prisma.notification.deleteMany({ where: { userId: req.user.id } });
    res.json({ success: true, message: 'Histórico apagado' });
  } catch (err) { next(err); }
});

// ── DELETE /notifications/admin-history — admin apaga histórico de um cliente ──
router.delete('/admin-history/:clientId', restrictTo('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { clientId } = req.params;
    // Delete client's notifications + admin's REPLY notifications from that client
    await prisma.notification.deleteMany({ where: { userId: clientId } });
    await prisma.notification.deleteMany({
      where: {
        userId: req.user.id,
        type: 'REPLY',
        data: { path: ['senderId'], equals: clientId },
      },
    });
    res.json({ success: true, message: 'Histórico do cliente apagado' });
  } catch (err) { next(err); }
});

module.exports = router;

// ── GET /notifications/conversations — histórico por cliente ──────
router.get('/conversations', restrictTo('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    // Get all REPLY notifications + admin sent messages
    const replies = await prisma.notification.findMany({
      where: { type: { in: ['REPLY', 'ADMIN_SENT'] }, userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Get all INFO/PROMO/WARNING sent by admin to clients
    const sent = await prisma.notification.findMany({
      where: {
        type: { in: ['INFO', 'PROMO', 'WARNING'] },
        data: { path: ['senderId'], equals: req.user.id },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Group by client
    const map = {};

    replies.forEach((n) => {
      const d = n.data;
      if (n.type === 'REPLY') {
        const cid = d?.senderId;
        if (!cid) return;
        if (!map[cid]) map[cid] = { clientId: cid, clientName: d.senderName || 'Cliente', clientEmail: d.senderEmail || '', messages: [], unread: 0 };
        map[cid].messages.push({ ...n, direction: 'incoming' });
        if (!n.isRead) map[cid].unread++;
      } else if (n.type === 'ADMIN_SENT') {
        const cid = d?.toId;
        if (!cid) return;
        if (!map[cid]) map[cid] = { clientId: cid, clientName: d.toName || 'Cliente', clientEmail: '', messages: [], unread: 0 };
        map[cid].messages.push({ ...n, direction: 'outgoing' });
      }
    });

    sent.forEach((n) => {
      const d = n.data;
      // sent to specific user
      if (n.userId && n.userId !== req.user.id) {
        const cid = n.userId;
        if (!map[cid]) map[cid] = { clientId: cid, clientName: 'Cliente', clientEmail: '', messages: [], unread: 0 };
        map[cid].messages.push({ ...n, direction: 'outgoing' });
      }
    });

    // Sort messages within each conversation
    Object.values(map).forEach((conv) => {
      conv.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      conv.lastMessage = conv.messages[conv.messages.length - 1];
    });

    const conversations = Object.values(map).sort((a, b) =>
      new Date(b.lastMessage?.createdAt || 0).getTime() - new Date(a.lastMessage?.createdAt || 0).getTime()
    );

    res.json({ success: true, data: conversations });
  } catch (err) { next(err); }
});

// ── GET /notifications/my-history — histórico do cliente com admin ─
router.get('/my-history', async (req, res, next) => {
  try {
    const notifs = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.json({ success: true, data: notifs });
  } catch (err) { next(err); }
});