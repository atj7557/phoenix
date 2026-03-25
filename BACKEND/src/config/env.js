import { config as loadEnv } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

// Load .env from BACKEND root even if the process was started from another cwd (PM2, systemd, panels).
const envFileDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(envFileDir, '..', '..');
loadEnv({ path: join(projectRoot, '.env') });

function toBool(defaultValue) {
  return z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === '') return defaultValue;
      const s = String(v).toLowerCase();
      if (['1', 'true', 'yes', 'on'].includes(s)) return true;
      if (['0', 'false', 'no', 'off'].includes(s)) return false;
      return defaultValue;
    });
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    API_PREFIX: z.string().default('/api/v1'),
    CORS_ORIGIN: z.string().default('*'),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

    // Microsoft SQL Server (same family as "SQL Server" ODBC driver — not MS Access)
    DB_SERVER: z.string().optional().default(''),
    DB_PORT: z.coerce.number().int().positive().default(1433),
    DB_DATABASE: z.string().optional().default(''),
    DB_USER: z.string().optional().default(''),
    DB_PASSWORD: z.string().optional().default(''),
    DB_ENCRYPT: toBool(true),
    DB_TRUST_SERVER_CERTIFICATE: toBool(true),
    DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
    DB_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
    DB_POOL_MAX: z.coerce.number().int().positive().max(100).default(10),
    /** If true, health runs read-only `SELECT 1`. Default false if you must not run queries. */
    DB_HEALTHCHECK_SELECT_ONE: toBool(false),

    JWT_SECRET: z.string().optional().default(''),
    JWT_EXPIRES_IN: z.string().default('30d'),
    BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(10),
  })
  .superRefine((data, ctx) => {
    const hasAny = Boolean(
      data.DB_SERVER?.trim() ||
        data.DB_DATABASE?.trim() ||
        data.DB_USER?.trim() ||
        (data.DB_PASSWORD !== undefined && data.DB_PASSWORD !== ''),
    );
    const hasAll = Boolean(
      data.DB_SERVER?.trim() &&
        data.DB_DATABASE?.trim() &&
        data.DB_USER?.trim() &&
        data.DB_PASSWORD !== undefined,
    );
    if (hasAny && !hasAll) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'SQL Server: set DB_SERVER, DB_DATABASE, DB_USER, and DB_PASSWORD together (use empty DB_PASSWORD only if truly no password).',
        path: ['DB_SERVER'],
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
