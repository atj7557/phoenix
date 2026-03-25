import sql from 'mssql';
import { env } from '../config/env.js';

let poolPromise = null;

export function isSqlServerConfigured() {
  return Boolean(
    env.DB_SERVER?.trim() &&
      env.DB_DATABASE?.trim() &&
      env.DB_USER?.trim() &&
      env.DB_PASSWORD !== undefined,
  );
}

function buildPoolConfig() {
  return {
    server: env.DB_SERVER.trim(),
    port: env.DB_PORT,
    database: env.DB_DATABASE.trim(),
    user: env.DB_USER.trim(),
    password: env.DB_PASSWORD,
    options: {
      encrypt: env.DB_ENCRYPT,
      trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE,
      enableArithAbort: true,
    },
    connectionTimeout: env.DB_CONNECTION_TIMEOUT_MS,
    requestTimeout: env.DB_REQUEST_TIMEOUT_MS,
    pool: {
      max: env.DB_POOL_MAX,
      min: 0,
      idleTimeoutMillis: 30_000,
    },
  };
}

/**
 * Shared pool. Lazy-connects on first use.
 * Returns null when SQL Server env is not configured (API can run without DB).
 */
export async function getSqlPool() {
  if (!isSqlServerConfigured()) return null;
  if (!poolPromise) {
    const config = buildPoolConfig();
    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .catch((err) => {
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
}

/**
 * Optional read-only ping. Off by default (set DB_HEALTHCHECK_SELECT_ONE=true) so you can avoid running SQL until allowed.
 */
export async function getSqlServerHealth() {
  if (!isSqlServerConfigured()) {
    return { configured: false, driver: 'mssql (SQL Server)' };
  }

  try {
    const pool = await getSqlPool();
    if (env.DB_HEALTHCHECK_SELECT_ONE) {
      await pool.request().query('SELECT 1 AS [ok]');
    }
    return {
      configured: true,
      connected: true,
      database: env.DB_DATABASE,
      healthcheckQueryRan: env.DB_HEALTHCHECK_SELECT_ONE,
    };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      database: env.DB_DATABASE,
      healthcheckQueryRan: false,
      message:
        env.NODE_ENV === 'production'
          ? 'SQL Server connection failed'
          : err.message,
    };
  }
}

export async function closeSqlPool() {
  if (!poolPromise) return;
  try {
    const pool = await poolPromise;
    await pool.close();
  } catch {
    // ignore close errors on shutdown
  } finally {
    poolPromise = null;
  }
}

export { sql };
