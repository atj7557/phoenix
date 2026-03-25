import { env } from '../config/env.js';

const isDev = env.NODE_ENV === 'development';

export const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  debug: (...args) => {
    if (isDev) console.debug('[DEBUG]', ...args);
  },
};
