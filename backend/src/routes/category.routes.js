const express    = require('express');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const { prisma } = require('../lib/prisma');
const AppError   = require('../utils/AppError');
const { protect, restrictTo } = require('../middleware/auth');

// Setup uploads dir
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg','image/jpg','image/png','image/webp'].includes(file.mimetype);
    cb(ok ? null : new AppError('Formato inválido', 400), ok);
  },
});

const router = express.Router();

// GET all categories
// ?all=true  → retorna apenas ativas (loja)
// ?admin=true → retorna todas existentes no banco (painel admin)
router.get('/', async (req, res, next) => {
  try {
    const isAdmin = req.query.admin === 'true';
    const cats = await prisma.category.findMany({
      where:   isAdmin ? {} : { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    res.json({ success: true, data: cats });
  } catch (err) { next(err); }
});

// GET category with products
router.get('/:slug', async (req, res, next) => {
  try {
    const cat = await prisma.category.findUnique({
      where:   { slug: req.params.slug },
      include: {
        children: true,
        products: {
          where:   { status: 'ACTIVE' },
          include: { images: { take: 1 } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!cat) return next(new AppError('Categoria não encontrada', 404));
    res.json({ success: true, data: cat });
  } catch (err) { next(err); }
});

// POST create category
router.post('/', protect, restrictTo('ADMIN', 'SUPER_ADMIN'), upload.single('image'), async (req, res, next) => {
  try {
    const { name, description, sortOrder, parentId } = req.body;
    let { imageUrl } = req.body;

    // Handle file upload
    if (req.file) {
      const ext      = path.extname(req.file.originalname || '.jpg').toLowerCase() || '.jpg';
      const filename = `cat-${Date.now()}${ext}`;
      fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
      const host = `${req.protocol}://${req.get('host')}`;
      imageUrl = `${host}/api/upload/files/${filename}`;
    }

    const slug = name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const cat = await prisma.category.create({
      data: {
        name, slug, description: description || null,
        imageUrl: imageUrl || null,
        sortOrder: parseInt(sortOrder) || 0,
        parentId: parentId || null,
      },
    });
    res.status(201).json({ success: true, data: cat });
  } catch (err) { next(err); }
});

// PUT update category
router.put('/:id', protect, restrictTo('ADMIN', 'SUPER_ADMIN'), upload.single('image'), async (req, res, next) => {
  try {
    let { name, description, imageUrl, isActive, sortOrder } = req.body;

    if (req.file) {
      const ext      = path.extname(req.file.originalname || '.jpg').toLowerCase() || '.jpg';
      const filename = `cat-${Date.now()}${ext}`;
      fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
      const host = `${req.protocol}://${req.get('host')}`;
      imageUrl = `${host}/api/upload/files/${filename}`;
    }

    const updateData = {};
    if (name !== undefined) {
      updateData.name = name;
      updateData.slug = name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    if (description !== undefined) updateData.description = description;
    if (imageUrl    !== undefined) updateData.imageUrl    = imageUrl;
    if (isActive    !== undefined) updateData.isActive    = isActive === 'true' || isActive === true;
    if (sortOrder   !== undefined) updateData.sortOrder   = parseInt(sortOrder) || 0;

    const cat = await prisma.category.update({ where: { id: req.params.id }, data: updateData });
    res.json({ success: true, data: cat });
  } catch (err) { next(err); }
});

// DELETE category — categorias fixas da navbar não podem ser removidas
const PROTECTED_SLUGS = ['produtos', 'ebooks', 'cursos', 'jogos'];

router.delete('/:id', protect, restrictTo('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const cat = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!cat) return next(new AppError('Categoria não encontrada', 404));
    if (PROTECTED_SLUGS.includes(cat.slug)) {
      return next(new AppError(`A categoria "${cat.name}" é fixa e não pode ser removida`, 400));
    }
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Categoria removida' });
  } catch (err) { next(err); }
});

module.exports = router;