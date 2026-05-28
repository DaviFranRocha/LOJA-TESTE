require('dotenv').config();

const express       = require('express');
const helmet        = require('helmet');
const cors          = require('cors');
const compression   = require('compression');
const morgan        = require('morgan');
const cookieParser  = require('cookie-parser');
const hpp           = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const { v4: uuidv4 } = require('uuid');

const logger       = require('./utils/logger');
const { prisma }   = require('./lib/prisma');
const errorHandler = require('./middleware/errorHandler');
const notFound     = require('./middleware/notFound');

const authRoutes         = require('./routes/auth.routes');
const userRoutes         = require('./routes/user.routes');
const productRoutes      = require('./routes/product.routes');
const categoryRoutes     = require('./routes/category.routes');
const orderRoutes        = require('./routes/order.routes');
const cartRoutes         = require('./routes/cart.routes');
const wishlistRoutes     = require('./routes/wishlist.routes');
const paymentRoutes      = require('./routes/payment.routes');
const webhookRoutes      = require('./routes/webhook.routes');
const reviewRoutes       = require('./routes/review.routes');
const couponRoutes       = require('./routes/coupon.routes');
const bannerRoutes       = require('./routes/banner.routes');
const notificationRoutes = require('./routes/notification.routes');
const adminRoutes        = require('./routes/admin.routes');
const uploadRoutes       = require('./routes/upload.routes');
const accessRoutes       = require('./routes/access.routes');

const app  = express();
const PORT = process.env.PORT || 4000;

app.set('trust proxy', 1);

app.use((req, _res, next) => { req.id = uuidv4(); next(); });

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:', 'https:', 'http:', 'blob:'],
      connectSrc: ["'self'", 'https://api.stripe.com'],
      frameSrc:   ['https://js.stripe.com'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3001',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
}));

app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use('/api/webhooks', webhookRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression({
  filter: (req, res) => {
    // Never compress SSE streams — it breaks real-time delivery
    if (req.path.includes('/stream')) return false;
    return compression.filter(req, res);
  },
}));
app.use(mongoSanitize());
app.use(hpp());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: msg => logger.http(msg.trim()) },
    skip: (req) => req.path === '/api/health',
  }));
}

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0', service: 'Francisco Store API' });
  } catch (e) {
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});

app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/products',      productRoutes);
app.use('/api/categories',    categoryRoutes);
app.use('/api/orders',        orderRoutes);
app.use('/api/cart',          cartRoutes);
app.use('/api/wishlist',      wishlistRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/reviews',       reviewRoutes);
app.use('/api/coupons',       couponRoutes);
app.use('/api/banners',       bannerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/upload',        uploadRoutes);
app.use('/api/access',        accessRoutes);

app.get('/api/docs', (req, res) => {
  res.json({
    name: 'Francisco Store API', version: '1.0.0',
    endpoints: {
      auth: '/api/auth', users: '/api/users', products: '/api/products',
      categories: '/api/categories', orders: '/api/orders', cart: '/api/cart',
      wishlist: '/api/wishlist', payments: '/api/payments', reviews: '/api/reviews',
      coupons: '/api/coupons', banners: '/api/banners', notifications: '/api/notifications',
      admin: '/api/admin', upload: '/api/upload', webhooks: '/api/webhooks',
    },
  });
});

app.use(notFound);
app.use(errorHandler);

async function start() {
  try {
    await prisma.$connect();
    logger.info('✔ Database connected');
    app.listen(PORT, () => {
      logger.info(`✔ Francisco Store API running on port ${PORT}`);
      logger.info(`  Environment: ${process.env.NODE_ENV}`);
      logger.info(`  Docs: http://localhost:${PORT}/api/docs`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0); });
process.on('SIGINT',  async () => { await prisma.$disconnect(); process.exit(0); });

start();
module.exports = app;