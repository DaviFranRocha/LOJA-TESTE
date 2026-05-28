const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },
});

const STORE   = () => process.env.STORE_NAME || 'Francis Store';
const FROM    = () => `"${STORE()}" <${process.env.SMTP_USER}>`;
const ADMIN   = () => process.env.ADMIN_EMAIL || process.env.SMTP_USER;
const FRONT   = () => process.env.FRONTEND_URL || 'http://localhost:3000';
const DISCORD = 'https://discord.gg/nBJGJG3DwJ';

const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn(`[EMAIL SKIP] Sem credenciais. To: ${to} | ${subject}`);
    return;
  }
  try {
    const info = await transporter.sendMail({ from: FROM(), to, subject, html, text });
    logger.info(`[EMAIL OK] To: ${to} | ${subject} | ID: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`[EMAIL ERR] To: ${to} | ${err.message}`);
    throw err;
  }
};

// ── Rodapé padrão com Discord ──────────────────────────────────
const footer = () => `
  <div style="background:#1a0533;padding:24px;text-align:center;border-top:2px solid #3b1f6e;">
    <p style="margin:0 0 12px;color:#c4b5fd;font-weight:bold;font-size:15px;letter-spacing:1px;">✨ ${STORE()}</p>
    <a href="${DISCORD}" target="_blank"
      style="display:inline-block;background:#5865F2;color:white;padding:9px 22px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:13px;margin-bottom:14px;">
      💬 Entrar no Discord
    </a>
    <p style="margin:8px 0 0;color:#7c6b9e;font-size:11px;line-height:1.6;">
      © ${new Date().getFullYear()} ${STORE()} · Todos os direitos reservados<br/>
      Dúvidas? Fale conosco pelo Discord ou responda este email.
    </p>
  </div>`;

// ── Cabeçalho padrão ──────────────────────────────────────────
const header = (sub) => `
  <div style="background:linear-gradient(135deg,#2d0a6e 0%,#4c1d95 50%,#7c3aed 100%);padding:36px;text-align:center;">
    <h1 style="margin:0 0 6px;color:white;font-size:22px;letter-spacing:2px;font-family:Arial,sans-serif;">✨ ${STORE()}</h1>
    <p style="margin:0;color:rgba(255,255,255,0.75);font-size:14px;">${sub}</p>
  </div>`;

// ── 1. Verificação de email ────────────────────────────────────
exports.sendVerificationEmail = async (email, name, token) => {
  const url = `${FRONT()}/auth/verify-email/${token}`;
  return sendEmail({
    to: email,
    subject: `✅ Confirme seu email — ${STORE()}`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f0ff;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(124,58,237,0.15);">
  ${header('Bem-vindo! Só mais um passo.')}
  <div style="padding:36px;">
    <h2 style="color:#1a0533;margin:0 0 12px;">Olá, ${name}! 👋</h2>
    <p style="color:#555;line-height:1.7;margin:0 0 24px;">Estamos animados em ter você na <strong>${STORE()}</strong>! Confirme seu email para ativar sua conta.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;">
        ✅ Confirmar Meu Email
      </a>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;">O link expira em 24 horas.</p>
  </div>
  ${footer()}
</div></body></html>`,
    text: `Confirme seu email: ${url}`,
  });
};

// ── 2. Recuperação de senha ────────────────────────────────────
exports.sendPasswordResetEmail = async (email, name, token) => {
  const url = `${FRONT()}/auth/redefinir-senha?token=${token}`;
  return sendEmail({
    to: email,
    subject: `🔑 Redefinir senha — ${STORE()}`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f0ff;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(124,58,237,0.15);">
  ${header('Redefinição de senha solicitada.')}
  <div style="padding:36px;">
    <h2 style="color:#1a0533;margin:0 0 12px;">Olá, ${name}! 🔐</h2>
    <p style="color:#555;line-height:1.7;margin:0 0 24px;">Recebemos uma solicitação para redefinir a senha da sua conta na <strong>${STORE()}</strong>.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;">
        🔑 Redefinir Minha Senha
      </a>
    </div>
    <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:14px;">
      <p style="margin:0;color:#92400e;font-size:13px;">⚠️ <strong>Não solicitou isso?</strong> Ignore este email. Sua senha continua a mesma.</p>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;margin-top:16px;">O link expira em 1 hora.</p>
  </div>
  ${footer()}
</div></body></html>`,
    text: `Redefina sua senha: ${url}`,
  });
};

// ── 3. Nova conta — notifica admin ────────────────────────────
exports.sendNewAccountNotification = async (userName, userEmail) => {
  if (!ADMIN()) return;
  return sendEmail({
    to: ADMIN(),
    subject: `👤 Nova conta criada — ${userName} | ${STORE()}`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f0ff;font-family:Arial,sans-serif;">
<div style="max-width:480px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(124,58,237,0.12);">
  ${header('Um novo cliente se cadastrou!')}
  <div style="padding:32px;">
    <h2 style="color:#1a0533;margin:0 0 20px;">👤 Novo cadastro!</h2>
    <div style="background:#f9f5ff;border-radius:12px;padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 6px;color:#7c3aed;font-size:12px;font-weight:bold;letter-spacing:1px;">NOME</p>
      <p style="margin:0 0 14px;color:#1a0533;font-size:16px;font-weight:bold;">${userName}</p>
      <p style="margin:0 0 6px;color:#7c3aed;font-size:12px;font-weight:bold;letter-spacing:1px;">EMAIL</p>
      <p style="margin:0;color:#1a0533;font-size:15px;">${userEmail}</p>
    </div>
    <div style="text-align:center;">
      <a href="${FRONT()}/admin/usuarios" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:bold;">
        Ver no Painel Admin
      </a>
    </div>
  </div>
  ${footer()}
</div></body></html>`,
    text: `Nova conta: ${userName} (${userEmail})`,
  });
};

// ── 4. Novo pedido — notifica admin ───────────────────────────
exports.sendNewOrderNotification = async (order, customerName, customerEmail) => {
  if (!ADMIN()) return;
  return sendEmail({
    to: ADMIN(),
    subject: `🛒 Novo pedido ${order.orderNumber} — R$ ${Number(order.total).toFixed(2)} | ${STORE()}`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f0ff;font-family:Arial,sans-serif;">
<div style="max-width:480px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(124,58,237,0.12);">
  ${header('Um cliente acabou de fazer um pedido!')}
  <div style="padding:32px;">
    <h2 style="color:#1a0533;margin:0 0 20px;">🛒 Novo pedido recebido!</h2>
    <div style="background:#f9f5ff;border-radius:12px;padding:16px;margin-bottom:16px;border-left:4px solid #7c3aed;">
      <p style="margin:0 0 4px;color:#7c3aed;font-size:12px;font-weight:bold;letter-spacing:1px;">PEDIDO</p>
      <p style="margin:0;font-family:monospace;font-size:20px;font-weight:bold;color:#1a0533;">${order.orderNumber}</p>
    </div>
    <div style="background:#f9f5ff;border-radius:12px;padding:16px;margin-bottom:16px;">
      <p style="margin:0 0 4px;color:#7c3aed;font-size:12px;font-weight:bold;">CLIENTE</p>
      <p style="margin:0 0 2px;color:#1a0533;font-weight:bold;">${customerName}</p>
      <p style="margin:0;color:#888;font-size:13px;">${customerEmail}</p>
    </div>
    <div style="background:#f0fdf4;border-radius:12px;padding:16px;margin-bottom:20px;border:1px solid #86efac;">
      <p style="margin:0 0 4px;color:#16a34a;font-size:12px;font-weight:bold;">VALOR</p>
      <p style="margin:0;color:#15803d;font-size:26px;font-weight:bold;">R$ ${Number(order.total).toFixed(2)}</p>
    </div>
    <div style="background:#fef3c7;border-radius:10px;padding:12px;margin-bottom:20px;border:1px solid #f59e0b;">
      <p style="margin:0;color:#92400e;font-size:13px;">⏳ <strong>Aguardando confirmação do pagamento PIX.</strong></p>
    </div>
    <div style="text-align:center;">
      <a href="${FRONT()}/admin/pedidos" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:bold;">
        Ver Pedido no Admin
      </a>
    </div>
  </div>
  ${footer()}
</div></body></html>`,
    text: `Novo pedido ${order.orderNumber} de ${customerName} — R$ ${Number(order.total).toFixed(2)}`,
  });
};

// ── 5. Pagamento confirmado — cliente + admin ─────────────────
exports.sendPurchaseEmail = async (email, name, order, items) => {
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #f0e8ff;">
        <strong style="color:#1a0533;font-size:14px;">${item.productName}</strong>
        <br/><small style="color:#888;">Qtd: ${item.quantity}</small>
      </td>
      <td style="padding:12px;border-bottom:1px solid #f0e8ff;text-align:right;color:#7c3aed;font-weight:bold;">
        R$ ${Number(item.totalPrice).toFixed(2)}
      </td>
    </tr>
    ${item.downloadUrl ? `
    <tr>
      <td colspan="2" style="padding:8px 12px 16px;border-bottom:1px solid #f0e8ff;background:#f9f5ff;">
        <a href="${item.downloadUrl}" target="_blank"
          style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;padding:10px 22px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:bold;">
          📥 Acessar / Baixar Produto
        </a>
        <br/><small style="color:#aaa;font-size:11px;margin-top:4px;display:block;">Disponível por ${item.accessDays || 5} dias</small>
      </td>
    </tr>` : ''}
  `).join('');

  // ── Email para o CLIENTE ──────────────────────────────────────
  await sendEmail({
    to: email,
    subject: `🎉 Pagamento confirmado — Pedido ${order.orderNumber} | ${STORE()}`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f0ff;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(124,58,237,0.15);">
  ${header('Seu pagamento foi confirmado! 🎉')}
  <div style="padding:36px;">
    <h2 style="color:#1a0533;margin:0 0 8px;">Olá, ${name}! 🙌</h2>
    <p style="color:#555;line-height:1.7;margin:0 0 24px;">
      Seu pagamento foi <strong>confirmado com sucesso</strong> e seu acesso já está liberado! 
      Seus produtos estão disponíveis na aba <strong>"Meus Produtos"</strong> da loja.
    </p>

    <div style="background:linear-gradient(135deg,#f9f5ff,#ede9fe);border-radius:12px;padding:16px;margin-bottom:24px;border:1px solid #c4b5fd;">
      <p style="margin:0 0 4px;color:#7c3aed;font-size:12px;font-weight:bold;letter-spacing:1px;">NÚMERO DO PEDIDO</p>
      <p style="margin:0;font-family:monospace;font-size:20px;font-weight:bold;color:#1a0533;">${order.orderNumber}</p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:8px;border-radius:12px;overflow:hidden;border:1px solid #f0e8ff;">
      <thead>
        <tr style="background:#7c3aed;">
          <th style="padding:12px;text-align:left;color:white;font-size:13px;">Produto</th>
          <th style="padding:12px;text-align:right;color:white;font-size:13px;">Valor</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        <tr style="background:#f9f5ff;">
          <td style="padding:14px 12px;font-weight:bold;color:#1a0533;font-size:15px;">Total Pago</td>
          <td style="padding:14px 12px;text-align:right;font-weight:bold;color:#7c3aed;font-size:18px;">R$ ${Number(order.total).toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    <div style="text-align:center;margin:28px 0;">
      <a href="${FRONT()}/meus-produtos"
        style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;padding:16px 40px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;letter-spacing:0.5px;box-shadow:0 4px 20px rgba(124,58,237,0.4);">
        📥 Acessar Meus Produtos
      </a>
    </div>

    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px;">
      <p style="margin:0;color:#166534;font-size:14px;line-height:1.7;">
        ✅ <strong>Acesso liberado com sucesso!</strong><br/>
        Seus produtos ficam disponíveis por até <strong>5 dias</strong> na aba "Meus Produtos".<br/>
        💬 Precisa de ajuda? Entre no nosso Discord — respondemos rapidamente!
      </p>
    </div>
  </div>
  ${footer()}
</div></body></html>`,
    text: `Pedido ${order.orderNumber} confirmado! Acesse seus produtos em ${FRONT()}/meus-produtos`,
  });

  // ── Email para o ADMIN (dono da loja) ─────────────────────────
  if (ADMIN()) {
    await sendEmail({
      to: ADMIN(),
      subject: `💰 Pagamento recebido — ${order.orderNumber} | R$ ${Number(order.total).toFixed(2)} | ${STORE()}`,
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0fdf4;font-family:Arial,sans-serif;">
<div style="max-width:480px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(22,163,74,0.15);">
  <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px;text-align:center;">
    <h1 style="margin:0 0 6px;color:white;font-size:20px;letter-spacing:1px;">💰 Pagamento Recebido!</h1>
    <p style="margin:0;color:rgba(255,255,255,0.8);font-size:13px;">${STORE()}</p>
  </div>
  <div style="padding:32px;">
    <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin-bottom:16px;border:2px solid #86efac;text-align:center;">
      <p style="margin:0 0 4px;color:#16a34a;font-size:13px;font-weight:bold;letter-spacing:1px;">VALOR RECEBIDO</p>
      <p style="margin:0;color:#15803d;font-size:32px;font-weight:bold;">R$ ${Number(order.total).toFixed(2)}</p>
    </div>
    <div style="background:#f9f5ff;border-radius:12px;padding:16px;margin-bottom:16px;">
      <p style="margin:0 0 4px;color:#7c3aed;font-size:12px;font-weight:bold;letter-spacing:1px;">PEDIDO</p>
      <p style="margin:0;font-family:monospace;font-size:18px;font-weight:bold;color:#1a0533;">${order.orderNumber}</p>
    </div>
    <div style="background:#f9f5ff;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 4px;color:#7c3aed;font-size:12px;font-weight:bold;letter-spacing:1px;">CLIENTE</p>
      <p style="margin:0 0 2px;color:#1a0533;font-weight:bold;font-size:15px;">${name}</p>
      <p style="margin:0;color:#888;font-size:13px;">${email}</p>
    </div>
    <div style="text-align:center;">
      <a href="${FRONT()}/admin/pedidos"
        style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;">
        Ver Pedido no Admin
      </a>
    </div>
  </div>
  ${footer()}
</div></body></html>`,
      text: `Pagamento confirmado: ${order.orderNumber} — R$ ${Number(order.total).toFixed(2)} de ${name} (${email})`,
    });
  }
};