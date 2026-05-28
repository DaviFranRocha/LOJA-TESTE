const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message, isOperational } = err;

  // Prisma errors
  if (err.code === 'P2002') {
    statusCode = 409;
    message = 'Registro duplicado';
    isOperational = true;
  } else if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Registro não encontrado';
    isOperational = true;
  } else if (err.code === 'P2003') {
    statusCode = 400;
    message = 'Referência inválida';
    isOperational = true;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token inválido';
    isOperational = true;
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expirado';
    isOperational = true;
  }

  if (!isOperational) {
    logger.error('Unexpected error:', { message: err.message, stack: err.stack, url: req.url, method: req.method });
  }

  res.status(statusCode).json({
    success: false,
    message: isOperational ? message : 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
