const { prisma } = require('../lib/prisma');

exports.create = async ({ userId, type, title, message, data }) => {
  return prisma.notification.create({
    data: { userId, type, title, message, data: data || null },
  });
};
