const express     = require('express');
const productCtrl = require('../controllers/product.controller');
const { prisma }  = require('../lib/prisma');
const { protect, restrictTo, optionalAuth } = require('../middleware/auth');

const STAFF = ['GERENTE','ADMIN','SUPER_ADMIN'];

const router = express.Router();

router.get('/',         optionalAuth, productCtrl.getProducts);
router.get('/featured', productCtrl.getFeatured);

// Get by ID — used by cart (returns any status so cart doesn't break)
router.get('/id/:id', optionalAuth, async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images:   { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!product) return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
});

// Get by slug — public product page
router.get('/:slug', optionalAuth, productCtrl.getProduct);

// Admin routes — accept all staff roles
router.post('/',           protect, restrictTo(...STAFF), productCtrl.createProduct);
router.put('/:id',         protect, restrictTo(...STAFF), productCtrl.updateProduct);
router.delete('/:id',      protect, restrictTo('ADMIN', 'SUPER_ADMIN'), productCtrl.deleteProduct);
router.patch('/:id/stock', protect, restrictTo(...STAFF), productCtrl.updateStock);

module.exports = router;
