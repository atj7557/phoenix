import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { HttpStatus } from '../constants/httpStatus.js';
import { logger } from '../utils/logger.js';

export function errorMiddleware(err, req, res, _next) {
  let statusCode =
    err instanceof AppError ? err.statusCode : HttpStatus.INTERNAL_SERVER_ERROR;

  let message =
    err instanceof AppError
      ? err.message
      : env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message || 'Internal server error';

  if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    statusCode = HttpStatus.SERVICE_UNAVAILABLE;
    message =
      'MySQL access denied: check MYSQL_USER and MYSQL_PASSWORD in .env (empty MYSQL_PASSWORD means "no password"; your MySQL user may require one).';
    if (env.NODE_ENV !== 'production' && err.sqlMessage) {
      message = `${message} — ${err.sqlMessage}`;
    }
  }

  if (statusCode >= 500) {
    logger.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.NODE_ENV !== 'production' && !(err instanceof AppError) && err.stack
      ? { stack: err.stack }
      : {}),
  });
}
