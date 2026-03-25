import { verifyAccessToken } from '../utils/jwt.util.js';
import { HttpStatus } from '../constants/httpStatus.js';

export function getBearerOrQueryToken(req) {
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) return h.slice(7).trim();
  if (req.query?.token != null && req.query.token !== '') {
    return String(req.query.token);
  }
  return null;
}

export function requireAuth(req, res, next) {
  const token = getBearerOrQueryToken(req);
  if (!token) {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      success: false,
      message: 'Missing token. Provide Authorization: Bearer <token> or ?token=...',
    });
  }
  try {
    const payload = verifyAccessToken(token);
    req.auth = { userId: String(payload.sub), mobile: payload.mobile };
    next();
  } catch {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
}
