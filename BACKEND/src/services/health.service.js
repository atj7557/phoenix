import { getSqlServerHealth } from '../db/sqlServer.pool.js';

export async function getHealthPayload() {
  const database = await getSqlServerHealth();
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database,
  };
}
