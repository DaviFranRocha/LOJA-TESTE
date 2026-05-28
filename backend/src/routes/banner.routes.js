const express    = require('express');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const { prisma } = require('../lib/prisma');
const AppError   = require('../utils/AppError');
const { protect, restrictTo } = require('../middleware/auth');

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg','image/jpg','image/png','image/webp','image/gif','video/mp4','video/webm'];
    cb(allowed.includes(file.mimetype) ? null : new AppError('Formato não suportado', 400), allowed.includes(file.mimetype));
  },
});

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const banners = await prisma.banner.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
      },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: banners });
  } catch (err) { next(err); }
});

router.get('/all', protect, restrictTo('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const banners = await prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json({ success: true, data: banners });
  } catch (err) { next(err); }
});

const saveBanner = async (req, res, next, id) => {
  try {
    const { title, subtitle, linkUrl, buttonText, sortOrder, status } = req.body;
    let { imageUrl } = req.body;
    let mediaType = 'image';

    if (req.file) {
      const ext      = path.extname(req.file.originalname || '').toLowerCase() || '.jpg';
      const filename = `banner-${Date.now()}${ext}`;
      fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
      const host = `${req.protocol}://${req.get('host')}`;
      imageUrl  = `${host}/api/upload/files/${filename}`;
      mediaType = req.file.mimetype.startsWith('video/') ? 'video'
        : req.file.mimetype === 'image/gif' ? 'gif' : 'image';
    }

    const data = {
      title,
      subtitle:  subtitle   || null,
      imageUrl:  imageUrl   || '',
      mediaType: mediaType  || 'image',
      linkUrl:   linkUrl    || null,
      buttonText: buttonText || null,
      sortOrder: parseInt(sortOrder) || 0,
      status:    status     || 'ACTIVE',
    };

    let banner;
    if (id) banner = await prisma.banner.update({ where: { id }, data });
    else    banner = await prisma.banner.create({ data });

    res.status(id ? 200 : 201).json({ success: true, data: banner });
  } catch (err) { next(err); }
};

router.post('/',    protect, restrictTo('ADMIN','SUPER_ADMIN'), upload.single('media'), (req,res,next) => saveBanner(req,res,next,null));
router.put('/:id',  protect, restrictTo('ADMIN','SUPER_ADMIN'), upload.single('media'), (req,res,next) => saveBanner(req,res,next,req.params.id));
router.delete('/:id', protect, restrictTo('ADMIN','SUPER_ADMIN'), async (req, res, next) => {
  try {
    await prisma.banner.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;