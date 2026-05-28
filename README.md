# 🛒 FRANCISCO STORE — E-Commerce Premium

Sistema de e-commerce **enterprise** completo com painel administrativo, pagamentos integrados e segurança máxima.

---

## 🚀 Início Rápido (Deploy com Python)

```bash
python start.py
```

O script instala dependências, configura o banco, faz seed e sobe todos os serviços.

---

## 🧱 Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 + TailwindCSS + Framer Motion |
| Backend | Node.js + Express |
| Banco | PostgreSQL + Prisma ORM |
| Upload | Cloudinary |
| Auth | JWT + Refresh Tokens + bcrypt |
| Pagamentos | Stripe + Mercado Pago |
| Deploy | Docker + Nginx |

---

## 📁 Estrutura

```
francisco-store/
├── frontend/          # Next.js app
├── backend/           # Express API
├── docker/            # Dockerfiles
├── nginx/             # Config Nginx
├── scripts/           # Scripts automáticos
├── docs/              # Documentação API
├── start.py           # 🚀 Entry point principal
└── docker-compose.yml
```

---

## 🔑 Credenciais Padrão (Seed)

| Tipo | Email | Senha |
|---|---|---|
| Admin | admin@franciscostore.com | Admin@123456 |
| Cliente | cliente@teste.com | Cliente@123 |

---

## ⚙️ Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

---

## 📦 Funcionalidades

### 🛍️ Loja
- Home com banner animado
- Catálogo com filtros avançados
- Página de produto com galeria
- Carrinho inteligente
- Wishlist
- Checkout completo
- Cupons de desconto
- Avaliações e ratings
- Rastreio de pedidos
- Histórico de compras
- Área do cliente

### 👑 Admin
- Dashboard com gráficos
- Gestão de produtos (CRUD + upload)
- Controle de estoque
- Gestão de pedidos
- Controle de usuários
- Relatórios financeiros
- Gestão de banners
- Logs do sistema
- Configurações da loja

### 💳 Pagamentos
- PIX (Mercado Pago)
- Cartão de crédito (Stripe)
- Boleto bancário
- Webhooks automáticos
- Confirmação automática
- Anti-fraude básico

### 🔒 Segurança
- JWT + Refresh Tokens
- bcrypt hash de senhas
- Rate limiting por IP
- Proteção XSS/CSRF/SQLi
- Helmet headers
- Sanitização de inputs
- Upload seguro
- Logs de auditoria
- OWASP compliance

---

## 🐳 Docker

```bash
docker-compose up -d
```

Serviços: `frontend:3000`, `backend:4000`, `postgres:5432`, `nginx:80/443`

---

## 📖 API Docs

Após subir o backend: `http://localhost:4000/api/docs`

---

## 🛠️ Desenvolvimento

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

---

**Francisco Store** © 2025 — Todos os direitos reservados.