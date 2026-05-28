// Francisco Store — Database Seed
// Dados de exemplo para desenvolvimento

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...\n');

  // ── Store Config ───────────────────────────────────────────
  await prisma.storeConfig.createMany({
    data: [
      { key: 'store_name',        value: 'Francisco Store',          group: 'general', label: 'Nome da Loja' },
      { key: 'store_email',       value: 'contato@franciscostore.com', group: 'general', label: 'Email' },
      { key: 'store_phone',       value: '(11) 99999-9999',           group: 'general', label: 'Telefone' },
      { key: 'store_logo',        value: '/images/logo.png',          group: 'general', label: 'Logo' },
      { key: 'store_currency',    value: 'BRL',                       group: 'payment', label: 'Moeda' },
      { key: 'free_shipping_min', value: '299',                       group: 'shipping', label: 'Frete grátis acima de' },
      { key: 'shipping_price',    value: '19.90',                     group: 'shipping', label: 'Preço do frete padrão' },
      { key: 'maintenance_mode',  value: 'false',                     group: 'general', label: 'Modo manutenção' },
    ],
    skipDuplicates: true,
  });
  console.log('✔ Store config criado');

  // ── Admin User ────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@franciscostore.com' },
    update: {},
    create: {
      email: 'admin@franciscostore.com',
      password: adminHash,
      name: 'Francisco Admin',
      role: 'SUPER_ADMIN',
      isEmailVerified: true,
    },
  });
  console.log('✔ Admin criado:', admin.email);

  // ── Customer User ─────────────────────────────────────────
  const custHash = await bcrypt.hash('Cliente@123', 12);
  const customer = await prisma.user.upsert({
    where: { email: 'cliente@teste.com' },
    update: {},
    create: {
      email: 'cliente@teste.com',
      password: custHash,
      name: 'João Silva',
      phone: '(11) 98765-4321',
      role: 'CUSTOMER',
      isEmailVerified: true,
    },
  });
  console.log('✔ Cliente criado:', customer.email);

  // ── Categories ────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'eletronicos' },
      update: {},
      create: {
        name: 'Eletrônicos',
        slug: 'eletronicos',
        description: 'Smartphones, notebooks, tablets e muito mais',
        imageUrl: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=400',
        isActive: true,
        sortOrder: 1,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'moda' },
      update: {},
      create: {
        name: 'Moda',
        slug: 'moda',
        description: 'Roupas, calçados e acessórios',
        imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
        isActive: true,
        sortOrder: 2,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'casa-jardim' },
      update: {},
      create: {
        name: 'Casa & Jardim',
        slug: 'casa-jardim',
        description: 'Decoração, móveis e ferramentas',
        imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400',
        isActive: true,
        sortOrder: 3,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'esportes' },
      update: {},
      create: {
        name: 'Esportes',
        slug: 'esportes',
        description: 'Equipamentos e roupas esportivas',
        imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400',
        isActive: true,
        sortOrder: 4,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'beleza' },
      update: {},
      create: {
        name: 'Beleza & Saúde',
        slug: 'beleza',
        description: 'Cosméticos, perfumes e cuidados pessoais',
        imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
        isActive: true,
        sortOrder: 5,
      },
    }),
  ]);
  console.log('✔ Categorias criadas:', categories.length);

  // ── Products ──────────────────────────────────────────────
  const products = [
    {
      name: 'iPhone 15 Pro Max 256GB',
      slug: 'iphone-15-pro-max-256gb',
      description: 'O iPhone 15 Pro Max oferece o melhor sistema de câmera já feito num smartphone, com chip A17 Pro, tela Super Retina XDR de 6.7" e titânio de grau aeroespacial.',
      shortDesc: 'O smartphone mais avançado da Apple',
      price: 9499.00,
      comparePrice: 11999.00,
      costPrice: 7000.00,
      sku: 'APPLE-IP15PM-256',
      stock: 25,
      isFeatured: true,
      isNew: true,
      tags: ['apple', 'iphone', 'smartphone', '5g'],
      categorySlug: 'eletronicos',
      images: [
        'https://images.unsplash.com/photo-1696446702183-cbd88f80dd21?w=600',
        'https://images.unsplash.com/photo-1695048133142-1a20484429bb?w=600',
      ],
    },
    {
      name: 'MacBook Pro 14" M3 Pro',
      slug: 'macbook-pro-14-m3-pro',
      description: 'MacBook Pro com chip M3 Pro, 18GB de memória unificada, SSD de 512GB e tela Liquid Retina XDR. Performance extraordinária para profissionais.',
      shortDesc: 'Notebook profissional com chip M3 Pro',
      price: 17999.00,
      comparePrice: 21999.00,
      costPrice: 13000.00,
      sku: 'APPLE-MBP14-M3P',
      stock: 10,
      isFeatured: true,
      isNew: true,
      tags: ['apple', 'macbook', 'notebook', 'm3'],
      categorySlug: 'eletronicos',
      images: [
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600',
      ],
    },
    {
      name: 'Tênis Nike Air Max 270',
      slug: 'tenis-nike-air-max-270',
      description: 'O Nike Air Max 270 combina estilo e conforto com a maior unidade de Air heel já vista num tênis de lifestyle. Cabedal em mesh e couro sintético.',
      shortDesc: 'Conforto e estilo em cada passo',
      price: 699.90,
      comparePrice: 899.90,
      costPrice: 350.00,
      sku: 'NIKE-AM270-BLK',
      stock: 50,
      isFeatured: true,
      isNew: false,
      tags: ['nike', 'tenis', 'air max', 'esporte'],
      categorySlug: 'esportes',
      images: [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
        'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600',
      ],
    },
    {
      name: 'Perfume Chanel N°5 EDP 100ml',
      slug: 'perfume-chanel-n5-edp-100ml',
      description: 'O icônico Chanel N°5 em Eau de Parfum. Uma fragrância floral-aldéidica que definiu a perfumaria moderna. Notas de ylang-ylang, jasmim e sândalo.',
      shortDesc: 'A fragrância mais icônica do mundo',
      price: 1299.00,
      comparePrice: 1599.00,
      costPrice: 800.00,
      sku: 'CHANEL-N5-EDP100',
      stock: 15,
      isFeatured: true,
      isNew: false,
      tags: ['chanel', 'perfume', 'fragrancia', 'luxo'],
      categorySlug: 'beleza',
      images: [
        'https://images.unsplash.com/photo-1541643600914-78b084683702?w=600',
      ],
    },
    {
      name: 'Samsung Galaxy S24 Ultra 512GB',
      slug: 'samsung-galaxy-s24-ultra-512gb',
      description: 'Galaxy S24 Ultra com S Pen integrado, câmera de 200MP, processador Snapdragon 8 Gen 3 e tela Dynamic AMOLED 2X de 6.8".',
      shortDesc: 'Poder máximo com S Pen integrado',
      price: 8299.00,
      comparePrice: 9999.00,
      costPrice: 6000.00,
      sku: 'SAMSUNG-S24U-512',
      stock: 20,
      isFeatured: false,
      isNew: true,
      tags: ['samsung', 'galaxy', 'smartphone', 'android'],
      categorySlug: 'eletronicos',
      images: [
        'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600',
      ],
    },
    {
      name: 'Sofá 3 Lugares Veludo',
      slug: 'sofa-3-lugares-veludo',
      description: 'Sofá luxuoso em veludo premium com estrutura em madeira maciça. Almofadas confortáveis com enchimento de espuma D-28. Disponível em várias cores.',
      shortDesc: 'Luxo e conforto para sua sala',
      price: 2799.00,
      comparePrice: 3599.00,
      costPrice: 1500.00,
      sku: 'SOFA-3LUG-VEL',
      stock: 8,
      isFeatured: false,
      isNew: false,
      tags: ['sofa', 'sala', 'decoracao', 'veludo'],
      categorySlug: 'casa-jardim',
      images: [
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600',
      ],
    },
  ];

  for (const p of products) {
    const cat = categories.find(c => c.slug === p.categorySlug);
    const { images, categorySlug, ...productData } = p;
    
    const product = await prisma.product.upsert({
      where: { slug: productData.slug },
      update: {},
      create: {
        ...productData,
        price: productData.price,
        comparePrice: productData.comparePrice || null,
        costPrice: productData.costPrice || null,
        categoryId: cat?.id,
        avgRating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
        totalReviews: Math.floor(Math.random() * 100) + 10,
        totalSold: Math.floor(Math.random() * 500) + 50,
      },
    });

    // Images
    for (let i = 0; i < images.length; i++) {
      await prisma.productImage.upsert({
        where: { id: `img-${product.id}-${i}` },
        update: {},
        create: {
          id: `img-${product.id}-${i}`,
          productId: product.id,
          url: images[i],
          isPrimary: i === 0,
          sortOrder: i,
        },
      });
    }
  }
  console.log('✔ Produtos criados:', products.length);

  // ── Banners ───────────────────────────────────────────────
  await prisma.banner.createMany({
    data: [
      {
        title: 'Bem-vindo à Francisco Store',
        subtitle: 'Os melhores produtos com os melhores preços',
        imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1920',
        linkUrl: '/produtos',
        buttonText: 'Explorar Agora',
        status: 'ACTIVE',
        sortOrder: 1,
      },
      {
        title: 'Novos Eletrônicos',
        subtitle: 'iPhone 15 Pro Max e MacBook M3 com desconto especial',
        imageUrl: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=1920',
        linkUrl: '/categoria/eletronicos',
        buttonText: 'Ver Ofertas',
        status: 'ACTIVE',
        sortOrder: 2,
      },
      {
        title: 'Moda Premium',
        subtitle: 'As últimas tendências para você',
        imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1920',
        linkUrl: '/categoria/moda',
        buttonText: 'Ver Coleção',
        status: 'ACTIVE',
        sortOrder: 3,
      },
    ],
    skipDuplicates: true,
  });
  console.log('✔ Banners criados');

  // ── Coupons ───────────────────────────────────────────────
  await prisma.coupon.createMany({
    data: [
      {
        code: 'FRANCISCO10',
        description: '10% de desconto em toda a loja',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderValue: 100,
        usageLimit: 1000,
        isActive: true,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
      {
        code: 'BLACKFRIDAY50',
        description: '50% OFF produtos selecionados',
        discountType: 'PERCENTAGE',
        discountValue: 50,
        maxDiscount: 500,
        minOrderValue: 500,
        usageLimit: 200,
        isActive: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    ],
    skipDuplicates: true,
  });
  console.log('✔ Cupons criados');

  // ── Sample Address ─────────────────────────────────────────
  await prisma.address.upsert({
    where: { id: 'addr-sample-001' },
    update: {},
    create: {
      id: 'addr-sample-001',
      userId: customer.id,
      label: 'Casa',
      cep: '01310-100',
      street: 'Av. Paulista',
      number: '1000',
      complement: 'Apto 42',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      isDefault: true,
    },
  });

  console.log('\n✅ Seed concluído com sucesso!\n');
  console.log('═══════════════════════════════════════');
  console.log('  🔑 CREDENCIAIS DE ACESSO:');
  console.log('  Admin:   admin@franciscostore.com');
  console.log('  Senha:   Admin@123456');
  console.log('  ─────────────────────────────────────');
  console.log('  Cliente: cliente@teste.com');
  console.log('  Senha:   Cliente@123');
  console.log('═══════════════════════════════════════\n');
}

main()
  .catch(e => {
    console.error('❌ Seed falhou:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });