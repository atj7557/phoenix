import { HttpStatus } from '../constants/httpStatus.js';

export function notFoundMiddleware(req, res) {
  res.status(HttpStatus.NOT_FOUND).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}
