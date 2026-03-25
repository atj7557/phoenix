import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

let pool = null;

export function isMysqlConfigured() {
  return Boolean(
    env.MYSQL_HOST?.trim() &&
      env.MYSQL_DATABASE?.trim() &&
      env.MYSQL_USER?.trim() &&
      env.MYSQL_PASSWORD !== undefined,
  );
}

export function getMysqlPool() {
  if (!isMysqlConfigured()) return null;
  if (!pool) {
    pool = mysql.createPool({
      host: env.MYSQL_HOST.trim(),
      port: env.MYSQL_PORT,
      user: env.MYSQL_USER.trim(),
      password: env.MYSQL_PASSWORD,
      database: env.MYSQL_DATABASE.trim(),
      waitForConnections: true,
      connectionLimit: 10,
      charset: 'utf8mb4',
    });
  }
  return pool;
}

export async function closeMysqlPool() {
  if (!pool) return;
  await pool.end();
  pool = null;
}
