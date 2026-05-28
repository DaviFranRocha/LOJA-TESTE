# 🚀 Como Rodar o Francisco Store

## ✅ PRÉ-REQUISITOS

Instale antes de começar:
- **Node.js 20+**: https://nodejs.org
- **PostgreSQL 15+**: https://www.postgresql.org/download/ (ou use Docker)
- **Git** (opcional)

---

## ⚡ OPÇÃO 1 — Rodar sem Docker (Recomendado para desenvolvimento)

### 1. Configure o Banco de Dados
Crie um banco no PostgreSQL:
```sql
CREATE DATABASE franciscostore;
CREATE USER fsadmin WITH PASSWORD 'FS_S3cur3_P4ss!';
GRANT ALL PRIVILEGES ON DATABASE franciscostore TO fsadmin;
```

### 2. Configure o Backend
```bash
cd backend
cp .env.example .env
```
Abra o arquivo `backend/.env` e configure pelo menos:
- `DATABASE_URL` — sua string de conexão PostgreSQL
- `JWT_SECRET` — qualquer texto longo aleatório (ex: `minha_chave_super_secreta_123456`)
- `JWT_REFRESH_SECRET` — outro texto longo aleatório

### 3. Instale e rode o Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```
Backend rodando em: http://localhost:4000

### 4. Configure o Frontend
```bash
cd frontend
cp .env.example .env.local
```

### 5. Instale e rode o Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend rodando em: http://localhost:3000

---

## 🐳 OPÇÃO 2 — Rodar com Docker (tudo junto)

```bash
docker-compose up -d --build
```
Loja em: http://localhost

---

## 🔑 CREDENCIAIS DE TESTE

| Tipo    | Email                          | Senha         |
|---------|--------------------------------|---------------|
| Admin   | admin@franciscostore.com       | Admin@123456  |
| Cliente | cliente@teste.com              | Cliente@123   |

---

## 📋 ESTRUTURA DE PASTAS

```
francisco-store/
├── backend/
│   ├── src/
│   │   ├── controllers/   ← Lógica de negócio
│   │   ├── routes/        ← Rotas da API
│   │   ├── middleware/    ← Auth, erros, validação
│   │   ├── services/      ← Email, notificações
│   │   ├── utils/         ← Helpers
│   │   ├── lib/           ← Prisma client
│   │   └── server.js      ← Entrada do servidor
│   ├── prisma/
│   │   ├── schema.prisma  ← Models do banco
│   │   └── seed.js        ← Dados de exemplo
│   └── .env               ← Suas variáveis (EDITE AQUI)
├── frontend/
│   ├── src/
│   │   ├── app/           ← Páginas Next.js
│   │   ├── components/    ← Componentes React
│   │   └── lib/           ← API client e Store
│   └── .env.local         ← Variáveis do frontend
├── docker/                ← Dockerfiles
├── nginx/                 ← Config do proxy
└── docker-compose.yml
```

---

## ❓ PROBLEMAS COMUNS

**Erro de banco de dados:**
→ Verifique se o PostgreSQL está rodando e a `DATABASE_URL` está correta

**Erro "prisma not found":**
→ Rode `cd backend && npm install` novamente

**Porta 3000 ou 4000 já em uso:**
→ Mude `PORT=4001` no `backend/.env` ou feche o processo que usa a porta

**Frontend não conecta no backend:**
→ Verifique se `NEXT_PUBLIC_API_URL=http://localhost:4000/api` está no `frontend/.env.local`
