/**
 * seed-categories.js
 * Garante que as categorias fixas da navbar existam no banco.
 * Execute: node src/scripts/seed-categories.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FIXED_CATEGORIES = [
  { name: 'Produtos',    slug: 'produtos', description: 'Todos os produtos digitais', sortOrder: 0 },
  { name: 'E-Books',     slug: 'ebooks',   description: 'Livros digitais',             sortOrder: 1 },
  { name: 'Ferramentas', slug: 'cursos',   description: 'Ferramentas digitais',        sortOrder: 2 },
  { name: 'Jogos',       slug: 'jogos',    description: 'Jogos digitais',              sortOrder: 3 },
];

async function main() {
  console.log('Verificando categorias fixas...\n');
  for (const cat of FIXED_CATEGORIES) {
    const existing = await prisma.category.findUnique({ where: { slug: cat.slug } });
    if (existing) {
      await prisma.category.update({
        where: { slug: cat.slug },
        data: { name: cat.name, description: cat.description, isActive: true, sortOrder: cat.sortOrder },
      });
      console.log(`✔ Atualizada: ${cat.name}`);
    } else {
      await prisma.category.create({
        data: { name: cat.name, slug: cat.slug, description: cat.description, isActive: true, sortOrder: cat.sortOrder },
      });
      console.log(`✔ Criada: ${cat.name}`);
    }
  }
  console.log('\nPronto! Categorias fixas garantidas.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());