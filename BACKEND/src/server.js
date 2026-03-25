import { createServer } from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { closeMysqlPool } from './db/mysql.pool.js';
import { closeSqlPool, getSqlServerHealth } from './db/sqlServer.pool.js';
import { logger } from './utils/logger.js';

const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info(`Server listening on port ${env.PORT} (${env.NODE_ENV})`);
  logger.info(`API base: http://localhost:${env.PORT}${env.API_PREFIX}`);

  void (async () => {
    const db = await getSqlServerHealth();
    if (!db.configured) {
      logger.info('SQL Server: not configured (add DB_* to .env to connect)');
    } else if (db.connected) {
      logger.info(`SQL Server: connected successfully (database: ${db.database})`);
    } else {
      logger.warn(`SQL Server: connection failed — ${db.message ?? 'unknown error'}`);
    }
  })();
});

const shutdown = (signal) => {
  logger.info(`${signal} received, closing server`);
  server.close(() => {
    Promise.all([closeSqlPool(), closeMysqlPool()])
      .then(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      })
      .catch(() => process.exit(1));
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
