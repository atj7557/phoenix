import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { HttpStatus } from '../constants/httpStatus.js';
import { logger } from '../utils/logger.js';

function isSqlServerLoginError(err) {
  const code = err?.code;
  const msg = String(err?.message ?? '');
  return (
    code === 'ELOGIN' ||
    /login failed for user/i.test(msg) ||
    err?.name === 'ConnectionError'
  );
}

export function errorMiddleware(err, req, res, _next) {
  let statusCode =
    err instanceof AppError ? err.statusCode : HttpStatus.INTERNAL_SERVER_ERROR;

  let message =
    err instanceof AppError
      ? err.message
      : env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message || 'Internal server error';

  const sqlLoginRejected = !(err instanceof AppError) && isSqlServerLoginError(err);

  if (sqlLoginRejected) {
    statusCode = HttpStatus.SERVICE_UNAVAILABLE;
    message =
      'SQL Server rejected the login (wrong DB_USER/DB_PASSWORD, sa disabled, or server not using SQL authentication). ' +
      'Confirm credentials with SSMS or sqlcmd, enable Mixed Mode if needed, and fix BACKEND/.env or host env vars.';
    if (env.NODE_ENV !== 'production') {
      message = `${message} Underlying: ${err.message}`;
    }
  }

  if (statusCode >= 500 || sqlLoginRejected) {
    logger.error(err);
  }

  const exposeStack =
    env.NODE_ENV !== 'production' &&
    !(err instanceof AppError) &&
    err.stack &&
    !sqlLoginRejected;

  res.status(statusCode).json({
    success: false,
    message,
    ...(exposeStack ? { stack: err.stack } : {}),
  });
}
