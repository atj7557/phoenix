import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAccessToken(payload) {
  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: 'store-report-backend',
  });
  const decoded = jwt.decode(token, { complete: false });
  const expSec = decoded?.exp;
  const expiresAt = expSec ? new Date(expSec * 1000) : null;
  return { token, expiresAt };
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET, {
    issuer: 'store-report-backend',
  });
}

/** `YYYY-MM-DD HH:mm:ss` UTC — matches common PHP `Y-m-d H:i:s` style */
export function formatExpiresForResponse(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}
