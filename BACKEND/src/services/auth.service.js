import bcrypt from 'bcrypt';
import { env } from '../config/env.js';
import { getMysqlPool, isMysqlConfigured } from '../db/mysql.pool.js';
import { AppError } from '../utils/AppError.js';
import { HttpStatus } from '../constants/httpStatus.js';
import {
  formatExpiresForResponse,
  signAccessToken,
} from '../utils/jwt.util.js';

const MOBILE_RE = /^\d{6,15}$/;

function ensureAuthDb() {
  if (!isMysqlConfigured() || !getMysqlPool()) {
    throw new AppError('Authentication is not configured', HttpStatus.SERVICE_UNAVAILABLE);
  }
}

function formatCreatedAt(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().replace('T', ' ').replace('Z', '');
  return String(value);
}

/** Public user shape (never includes password_hash). */
export function toPublicUser(row) {
  return {
    id: String(row.id),
    name: row.name,
    mobile: row.mobile,
    dbname: row.dbname ?? null,
    created_at: formatCreatedAt(row.created_at),
    status: row.status,
    api_token: row.api_token ?? null,
    token_expires_at: row.token_expires_at ?? null,
    last_login: row.last_login != null ? formatCreatedAt(row.last_login) : null,
  };
}

export async function registerUser({ name, mobile, password }) {
  ensureAuthDb();
  const n = String(name ?? '').trim();
  const m = String(mobile ?? '').trim();
  const p = password ?? '';

  if (!n || !MOBILE_RE.test(m) || String(p).length < 6) {
    throw new AppError(
      'Invalid input. Provide name, mobile (6-15 digits) and password (min 6).',
      HttpStatus.BAD_REQUEST,
    );
  }

  const passwordHash = await bcrypt.hash(p, env.BCRYPT_ROUNDS);
  const pool = getMysqlPool();

  try {
    const [result] = await pool.execute(
      `INSERT INTO users (name, mobile, password_hash, dbname, status)
       VALUES (?, ?, ?, NULL, 'pending')`,
      [n, m, passwordHash],
    );
    return { id: result.insertId, name: n, mobile: m };
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new AppError('Mobile already registered', HttpStatus.CONFLICT);
    }
    throw err;
  }
}

export async function loginUser({ mobile, password }) {
  ensureAuthDb();
  const m = String(mobile ?? '').trim();
  const p = password ?? '';

  if (!MOBILE_RE.test(m) || p === '') {
    throw new AppError('Provide mobile and password', HttpStatus.BAD_REQUEST);
  }

  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT id, name, mobile, password_hash, dbname, status, api_token, token_expires_at, created_at
     FROM users WHERE mobile = ? LIMIT 1`,
    [m],
  );

  const row = rows[0];
  if (!row || !(await bcrypt.compare(p, row.password_hash))) {
    throw new AppError('Invalid credentials', HttpStatus.UNAUTHORIZED);
  }

  const { token, expiresAt } = signAccessToken({
    sub: String(row.id),
    mobile: row.mobile,
  });

  return {
    token,
    expires: formatExpiresForResponse(expiresAt),
    token_expires_at: formatExpiresForResponse(expiresAt),
    user: toPublicUser(row),
  };
}

export async function findUserById(id) {
  ensureAuthDb();
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT id, name, mobile, dbname, status, api_token, token_expires_at, created_at
     FROM users WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}
