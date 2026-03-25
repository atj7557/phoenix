import bcrypt from 'bcrypt';
import { env } from '../config/env.js';
import { getSqlPool, isSqlServerConfigured, sql } from '../db/sqlServer.pool.js';
import { AppError } from '../utils/AppError.js';
import { HttpStatus } from '../constants/httpStatus.js';
import {
  formatExpiresForResponse,
  signAccessToken,
} from '../utils/jwt.util.js';

const MOBILE_RE = /^\d{6,15}$/;
/** PHP bcrypt uses $2y$; Node bcrypt compares reliably when normalized to $2a$. */
function normalizeBcryptHash(hash) {
  const h = String(hash ?? '');
  if (h.startsWith('$2y$')) return `$2a$${h.slice(4)}`;
  return h;
}

async function ensureAuthDb() {
  if (!isSqlServerConfigured()) {
    throw new AppError(
      'Authentication is not configured: set DB_SERVER, DB_DATABASE, DB_USER, and DB_PASSWORD for SQL Server.',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 16) {
    throw new AppError(
      'JWT_SECRET must be at least 16 characters to issue login tokens.',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
  const pool = await getSqlPool();
  if (!pool) {
    throw new AppError('Database connection not available', HttpStatus.SERVICE_UNAVAILABLE);
  }
}

function formatCreatedAt(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().replace('T', ' ').replace('Z', '');
  return String(value);
}

function rowToUserShape(row) {
  if (!row) return row;
  return {
    ...row,
    dbname: row.dbname ?? row.db_name ?? null,
  };
}

/** Public user shape (never includes password_hash). */
export function toPublicUser(row) {
  const r = rowToUserShape(row);
  return {
    id: String(r.id),
    name: r.name,
    mobile: r.mobile,
    dbname: r.dbname ?? null,
    created_at: formatCreatedAt(r.created_at),
    status: r.status,
    api_token: r.api_token ?? null,
    token_expires_at: r.token_expires_at ?? null,
    last_login: r.last_login != null ? formatCreatedAt(r.last_login) : null,
  };
}

export async function registerUser({ name, mobile, password }) {
  await ensureAuthDb();
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
  const pool = await getSqlPool();

  try {
    const result = await pool
      .request()
      .input('name', sql.NVarChar(255), n)
      .input('mobile', sql.NVarChar(32), m)
      .input('password_hash', sql.NVarChar(255), passwordHash)
      .query(`
        INSERT INTO users (name, mobile, password_hash, status)
        OUTPUT INSERTED.id AS id
        VALUES (@name, @mobile, @password_hash, N'pending')
      `);
    const insertId = result.recordset[0]?.id;
    return { id: insertId, name: n, mobile: m };
  } catch (err) {
    if (err.number === 2627 || err.number === 2601) {
      throw new AppError('Mobile already registered', HttpStatus.CONFLICT);
    }
    throw err;
  }
}

export async function loginUser({ mobile, password }) {
  await ensureAuthDb();
  const m = String(mobile ?? '').trim();
  const p = password ?? '';

  if (!MOBILE_RE.test(m) || p === '') {
    throw new AppError('Provide mobile and password', HttpStatus.BAD_REQUEST);
  }

  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input('mobile', sql.NVarChar(32), m)
    .query(`
      SELECT TOP 1 *
      FROM users
      WHERE mobile = @mobile
    `);

  const row = rowToUserShape(result.recordset[0]);
  const storedHash = normalizeBcryptHash(row?.password_hash);
  if (!row || !storedHash || !(await bcrypt.compare(p, storedHash))) {
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
  await ensureAuthDb();
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input('id', sql.NVarChar(32), String(id))
    .query(`
      SELECT *
      FROM users
      WHERE id = @id
    `);
  return rowToUserShape(result.recordset[0]) ?? null;
}
