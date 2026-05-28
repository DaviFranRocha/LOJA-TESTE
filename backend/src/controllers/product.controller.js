// Francisco Store — Product Controller

// ── Generate unique 8-char SKU ─────────────────────────────────
const generateSKU = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let sku = '';
  for (let i = 0; i < 8; i++) sku += chars[Math.floor(Math.random() * chars.length)];
  return sku;
};

const generateUniqueSKU = async () => {
  let sku, exists;
  do {
    sku = generateSKU();
    exists = await prisma.product.findFirst({ where: { sku } });
  } while (exists);
  return sku;
};

const { prisma }  = require('../lib/prisma');
const AppError    = require('../utils/AppError');
const { auditLog } = require('../utils/audit');

// ── Get Products (with filters, search, pagination) ───────────
exports.getProducts = async (req, res, next) => {
  try {
    const {
      search, category, minPrice, maxPrice,
      sort = 'createdAt', order = 'desc',
      page = 1, limit = 20,
      featured, isNew, status = 'ACTIVE',
      tags,
    } = req.query;

    const where = {};

    // Admin can see all statuses; public only ACTIVE
    if (req.user?.role?.includes('ADMIN')) {
      if (status) where.status = status;
    } else {
      where.status = 'ACTIVE';
    }

    if (search) {
      where.OR = [
        { name:        { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku:         { contains: search, mode: 'insensitive' } },
        { tags:        { has: search.toLowerCase() } },
      ];
    }

    if (category)  where.category = { slug: category };
    if (featured === 'true') where.isFeatured = true;
    if (isNew === 'true')    where.isNew = true;
    if (tags)      where.tags = { hasSome: tags.split(',') };

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const take  = Math.min(parseInt(limit), 100);

    const orderBy = {};
    const validSorts = ['price', 'createdAt', 'avgRating', 'totalSold', 'name'];
    orderBy[validSorts.includes(sort) ? sort : 'createdAt'] = order === 'asc' ? 'asc' : 'desc';

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images:   { orderBy: { sortOrder: 'asc' }, take: 1 },
        },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (err) { next(err); }
};

// ── Get Single Product ────────────────────────────────────────
exports.getProduct = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const product = await prisma.product.findFirst({
      where: { slug, ...(req.user?.role?.includes('ADMIN') ? {} : { status: 'ACTIVE' }) },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images:   { orderBy: { sortOrder: 'asc' } },
        variants: true,
        reviews: {
          where:   { isApproved: true },
          include: { user: { select: { name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
          take:    10,
        },
      },
    });

    if (!product) return next(new AppError('Produto não encontrado', 404));

    // Related products
    const related = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        status: 'ACTIVE',
      },
      include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } },
      take: 6,
    });

    res.json({ success: true, data: { ...product, related } });
  } catch (err) { next(err); }
};

// ── Create Product (Admin) ─────────────────────────────────────
exports.createProduct = async (req, res, next) => {
  try {
    const {
      name, description, shortDesc, price, comparePrice, costPrice,
      sku, barcode, stock, lowStockAlert, weight, width, height, depth,
      categoryId, status, isFeatured, isNew, tags, metaTitle, metaDesc,
      images, variants,
    } = req.body;

    // Auto-generate unique 8-char SKU if not provided
    const finalSKU = (sku && sku.trim()) ? sku.trim() : await generateUniqueSKU();

    // Generate slug
    const slug = name
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      + '-' + Date.now();

    const product = await prisma.product.create({
      data: {
        name, slug, description, shortDesc,
        price: parseFloat(price),
        comparePrice: comparePrice ? parseFloat(comparePrice) : null,
        costPrice: costPrice ? parseFloat(costPrice) : null,
        sku: finalSKU,
        barcode: barcode && barcode.trim() !== '' ? barcode.trim() : null,
        stock: parseInt(stock) || 0,
        lowStockAlert: parseInt(lowStockAlert) || 5,
        weight: weight ? parseFloat(weight) : null,
        width: width ? parseFloat(width) : null,
        height: height ? parseFloat(height) : null,
        depth: depth ? parseFloat(depth) : null,
        categoryId: categoryId || null,
        status: status || 'ACTIVE',
        isFeatured: Boolean(isFeatured),
        isNew: Boolean(isNew),
        tags: tags || [],
        metaTitle, metaDesc,
        images: images ? {
          create: images.map((img, i) => ({
            url: img.url,
            publicId: img.publicId,
            alt: img.alt || name,
            isPrimary: i === 0,
            sortOrder: i,
          })),
        } : undefined,
        variants: variants ? {
          create: variants.map(v => ({
            name: v.name,
            value: v.value,
            price: v.price ? parseFloat(v.price) : null,
            stock: parseInt(v.stock) || 0,
            sku: v.sku,
          })),
        } : undefined,
      },
      include: {
        category: true,
        images: true,
        variants: true,
      },
    });

    await auditLog({
      userId: req.user.id,
      action: 'CREATE_PRODUCT',
      entity: 'Product',
      entityId: product.id,
      newData: product,
      req,
    });

    res.status(201).json({ success: true, data: product });
  } catch (err) { next(err); }
};

// ── Update Product (Admin) ─────────────────────────────────────
exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const old = await prisma.product.findUnique({ where: { id } });
    if (!old) return next(new AppError('Produto não encontrado', 404));

    const data = { ...req.body };
    ["price", "comparePrice", "costPrice"].forEach(f => {
      if (data[f] !== undefined) data[f] = data[f] ? parseFloat(data[f]) : null;
    });
    ["stock", "lowStockAlert"].forEach(f => {
      if (data[f] !== undefined) data[f] = parseInt(data[f]);
    });
    if (data.sku !== undefined) data.sku = data.sku && data.sku.trim() ? data.sku.trim() : null;
    if (data.barcode !== undefined) data.barcode = data.barcode && data.barcode.trim() ? data.barcode.trim() : null;
    delete data.id; delete data.slug; delete data.createdAt; delete data.images; delete data.variants;

    const product = await prisma.product.update({
      where: { id },
      data,
      include: { category: true, images: true, variants: true },
    });

    await auditLog({
      userId: req.user.id, action: 'UPDATE_PRODUCT',
      entity: 'Product', entityId: id,
      oldData: old, newData: product, req,
    });

    res.json({ success: true, data: product });
  } catch (err) { next(err); }
};

// ── Delete Product (Admin) ─────────────────────────────────────
exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return next(new AppError('Produto não encontrado', 404));

    // Soft delete (set inactive)
    await prisma.product.update({
      where: { id },
      data: { status: 'DISCONTINUED' },
    });

    await auditLog({
      userId: req.user.id, action: 'DELETE_PRODUCT',
      entity: 'Product', entityId: id, oldData: product, req,
    });

    res.json({ success: true, message: 'Produto removido' });
  } catch (err) { next(err); }
};

// ── Get Featured Products ──────────────────────────────────────
exports.getFeatured = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { isFeatured: true, status: 'ACTIVE' },
      include: { images: { take: 1, orderBy: { sortOrder: 'asc' } }, category: true },
      take: 8,
      orderBy: { totalSold: 'desc' },
    });
    res.json({ success: true, data: products });
  } catch (err) { next(err); }
};

// ── Update Stock (Admin) ───────────────────────────────────────
exports.updateStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stock, operation } = req.body; // operation: set | add | subtract

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return next(new AppError('Produto não encontrado', 404));

    let newStock;
    if (operation === 'add')      newStock = product.stock + parseInt(stock);
    else if (operation === 'subtract') newStock = Math.max(0, product.stock - parseInt(stock));
    else                          newStock = parseInt(stock);

    const updated = await prisma.product.update({
      where: { id },
      data: {
        stock: newStock,
        status: newStock === 0 ? 'OUT_OF_STOCK' : (product.status === 'OUT_OF_STOCK' ? 'ACTIVE' : product.status),
      },
    });

    res.json({ success: true, data: { stock: updated.stock, status: updated.status } });
  } catch (err) { next(err); }
};