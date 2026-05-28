// Francisco Store — Admin Controller
const { prisma } = require('../lib/prisma');
const AppError   = require('../utils/AppError');

// ── Dashboard Stats ────────────────────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const now      = new Date();
    const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalRevenue,
      monthRevenue,
      lastMonthRevenue,
      totalOrders,
      pendingOrders,
      totalUsers,
      newUsersToday,
      totalProducts,
      lowStockProducts,
      recentOrders,
      topProducts,
      revenueByDay,
      ordersByStatus,
    ] = await Promise.all([
      // Total revenue (paid orders)
      prisma.order.aggregate({
        where:   { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } },
        _sum:    { total: true },
      }),
      // This month revenue
      prisma.order.aggregate({
        where: {
          status:    { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
          createdAt: { gte: thisMonth },
        },
        _sum: { total: true },
      }),
      // Last month revenue
      prisma.order.aggregate({
        where: {
          status:    { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
          createdAt: { gte: lastMonth, lte: lastMonthEnd },
        },
        _sum: { total: true },
      }),
      // Total orders
      prisma.order.count(),
      // Pending orders
      prisma.order.count({ where: { status: { in: ['PENDING', 'PAYMENT_PENDING', 'PAID', 'PROCESSING'] } } }),
      // Total users
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      // New users today
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      // Total products
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      // Low stock
      prisma.product.count({
        where: {
          status: 'ACTIVE',
          stock:  { lte: 5 },
        },
      }),
      // Recent orders
      prisma.order.findMany({
        take:    10,
        orderBy: { createdAt: 'desc' },
        include: {
          user:    { select: { name: true, email: true } },
          payment: { select: { status: true, method: true } },
          _count:  { select: { items: true } },
        },
      }),
      // Top products by sales
prisma.product.findMany({
  where: { status: 'ACTIVE' },
  orderBy: { totalSold: 'desc' },
  take: 5,
  select: {
    id: true,
    name: true,
    totalSold: true,
    price: true,
    stock: true,
    images: {
      take: 1
    },
  },
}),

      // Revenue by day (last 30 days)
await prisma.$queryRaw`
  SELECT 
    DATE("createdAt") as date,
    SUM(total)::float as revenue,
    COUNT(*)::int as orders
  FROM orders
  WHERE 
    "createdAt" >= NOW() - INTERVAL '30 days'
    AND status IN ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED')
  GROUP BY DATE("createdAt")
  ORDER BY date ASC
`
,
      // Orders by status
      prisma.order.groupBy({
        by:     ['status'],
        _count: { id: true },
      }),
    ]);

    const revenueGrowth = lastMonthRevenue._sum.total
      ? ((parseFloat(monthRevenue._sum.total || 0) - parseFloat(lastMonthRevenue._sum.total)) /
         parseFloat(lastMonthRevenue._sum.total)) * 100
      : 0;

    res.json({
      success: true,
      data: {
        stats: {
          totalRevenue:    parseFloat(totalRevenue._sum.total || 0),
          monthRevenue:    parseFloat(monthRevenue._sum.total || 0),
          revenueGrowth:   parseFloat(revenueGrowth.toFixed(1)),
          totalOrders,
          pendingOrders,
          totalUsers,
          newUsersToday,
          totalProducts,
          lowStockProducts,
        },
        recentOrders,
        topProducts,
        revenueByDay,
        ordersByStatus: ordersByStatus.map(s => ({ status: s.status, count: s._count.id })),
      },
    });
  } catch (err) { next(err); }
};

// ── Get All Users (Admin) ──────────────────────────────────────
exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const where = {};

    if (search) {
      where.OR = [
        { name:  { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, role: true, avatarUrl: true,
          isActive: true, isEmailVerified: true, lastLogin: true,
          createdAt: true, _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip:    (parseInt(page) - 1) * parseInt(limit),
        take:    parseInt(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, data: users, pagination: { page: parseInt(page), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

// ── Toggle User Status (Admin) ─────────────────────────────────
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) return next(new AppError('Não pode desativar sua própria conta', 400));

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return next(new AppError('Usuário não encontrado', 404));

    const updated = await prisma.user.update({
      where: { id },
      data:  { isActive: !user.isActive },
      select: { id: true, name: true, isActive: true },
    });

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

// ── Financial Report ───────────────────────────────────────────
exports.getFinancialReport = async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [revenue, byMethod, refunds, topCategories] = await Promise.all([
      // Revenue over time
      prisma.$queryRaw`
        SELECT 
          DATE(o.created_at) as date,
          SUM(o.total)::float as revenue,
          COUNT(o.id)::int as orders,
          SUM(o.discount)::float as discounts
        FROM orders o
        WHERE o.created_at >= ${from}
          AND o.status IN ('PAID','PROCESSING','SHIPPED','DELIVERED')
        GROUP BY DATE(o.created_at)
        ORDER BY date ASC
      `,
      // Revenue by payment method
      prisma.$queryRaw`
        SELECT 
          p.method,
          COUNT(p.id)::int as count,
          SUM(p.amount)::float as total
        FROM payments p
        WHERE p.paid_at >= ${from} AND p.status = 'APPROVED'
        GROUP BY p.method
      `,
      // Refunds
      prisma.payment.aggregate({
        where:   { status: 'REFUNDED', refundedAt: { gte: from } },
        _sum:    { refundAmount: true },
        _count:  { id: true },
      }),
      // Top categories
      prisma.$queryRaw`
        SELECT 
          c.name as category,
          COUNT(oi.id)::int as items_sold,
          SUM(oi.total_price)::float as revenue
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.created_at >= ${from}
          AND o.status IN ('PAID','PROCESSING','SHIPPED','DELIVERED')
        GROUP BY c.name
        ORDER BY revenue DESC
        LIMIT 5
      `,
    ]);

    res.json({
      success: true,
      data: {
        revenue,
        byMethod,
        refunds: {
          total: parseFloat(refunds._sum.refundAmount || 0),
          count: refunds._count.id,
        },
        topCategories,
      },
    });
  } catch (err) { next(err); }
};

// ── Get System Logs ────────────────────────────────────────────
exports.getSystemLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, entity } = req.query;
    const where = {};
    if (action) where.action = { contains: action };
    if (entity) where.entity = entity;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip:    (parseInt(page) - 1) * parseInt(limit),
        take:    parseInt(limit),
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ success: true, data: logs, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

// ── Store Config ───────────────────────────────────────────────
exports.getConfig = async (req, res, next) => {
  try {
    const configs = await prisma.storeConfig.findMany({ orderBy: { group: 'asc' } });
    const grouped = configs.reduce((acc, c) => {
      if (!acc[c.group]) acc[c.group] = {};
      acc[c.group][c.key] = c.value;
      return acc;
    }, {});
    res.json({ success: true, data: { configs, grouped } });
  } catch (err) { next(err); }
};

exports.updateConfig = async (req, res, next) => {
  try {
    const { key, value } = req.body;
    const config = await prisma.storeConfig.upsert({
      where:  { key },
      update: { value },
      create: { key, value, group: req.body.group || 'general', label: req.body.label },
    });
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
};
// ── Online Users (active in last 5 minutes) ───────────────────
exports.getOnlineUsers = async (req, res, next) => {
  try {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

    const users = await prisma.user.findMany({
      where: { lastLogin: { gte: thirtyMinAgo } },
      select: {
        id: true, name: true, email: true, role: true, avatarUrl: true, lastLogin: true,
      },
      orderBy: { lastLogin: 'desc' },
      take: 50,
    });

    const result = users.map(u => ({
      ...u,
      isOnline: u.lastLogin && u.lastLogin >= fiveMinAgo,
      lastSeen: u.lastLogin
        ? (() => {
            const diff = Math.floor((Date.now() - new Date(u.lastLogin).getTime()) / 1000);
            if (diff < 60)  return `${diff}s atrás`;
            if (diff < 3600) return `${Math.floor(diff/60)}min atrás`;
            return `${Math.floor(diff/3600)}h atrás`;
          })()
        : null,
    }));

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ── Get Logs ──────────────────────────────────────────────────
exports.getSystemLogs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs  = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take:    limit,
      include: {
        user: { select: { name: true, email: true, avatarUrl: true } },
      },
    });
    res.json({ success: true, data: logs });
  } catch (err) { next(err); }
};

// ── Delete Single Log ─────────────────────────────────────────
exports.deleteLog = async (req, res, next) => {
  try {
    await prisma.auditLog.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ── Delete All Logs ───────────────────────────────────────────
exports.clearLogs = async (req, res, next) => {
  try {
    await prisma.auditLog.deleteMany({});
    res.json({ success: true, message: 'Logs limpos!' });
  } catch (err) { next(err); }
};