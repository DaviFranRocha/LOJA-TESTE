const { prisma } = require('../lib/prisma');

const auditLog = async ({ userId, action, entity, entityId, oldData, newData, req }) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId:    userId || null,
        action,
        entity,
        entityId:  entityId || null,
        oldData:   oldData  || null,
        newData:   newData  || null,
        ip:        req?.ip || req?.headers?.['x-forwarded-for'] || null,
        userAgent: req?.headers?.['user-agent'] || null,
      },
    });
  } catch (err) {
    console.error('AuditLog error:', err.message);
  }
};

module.exports = { auditLog };
