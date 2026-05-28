// Singleton SSE clients map — shared across all requires
const clients = new Map();

function pushToUser(userId, payload) {
  const res = clients.get(String(userId));
  if (res) {
    try { res.write(`data: ${JSON.stringify(payload)}\n\n`); } catch {}
  }
}

async function pushToAdmins(payload) {
  const { prisma } = require('./prisma');
  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    select: { id: true },
  });
  admins.forEach(a => pushToUser(a.id, payload));
}

module.exports = { clients, pushToUser, pushToAdmins };