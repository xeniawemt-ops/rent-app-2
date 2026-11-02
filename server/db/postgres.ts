/**
 * Re-exports and adapter methods for PostgreSQL connection management.
 * Primary implementation lives in server/db/index.ts.
 */
import {
  getDbPool as getPool,
  verifyDatabaseConnection,
  checkDatabaseHealth as checkHealth,
  isDbConnected as getIsConnected,
  DatabaseHealthStatus,
  pool,
  query,
  getClient,
} from './index';

export interface HealthCheckResult {
  connected: boolean;
  driver: 'postgres' | 'none';
  urlConfigured: boolean;
  latencyMs?: number;
  serverTime?: string;
  error?: string;
  databaseName?: string;
}

export const getDbPool = getPool;
export const isDbConnected = getIsConnected;
export { pool, query, getClient };

export async function initPostgresDatabase(): Promise<HealthCheckResult> {
  const result: DatabaseHealthStatus = await verifyDatabaseConnection();
  return {
    connected: result.connected,
    driver: result.driver,
    urlConfigured: result.urlConfigured,
    latencyMs: result.latencyMs,
    serverTime: result.serverTime,
    error: result.error,
    databaseName: result.databaseName,
  };
}

export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  const result: DatabaseHealthStatus = await checkHealth();
  return {
    connected: result.connected,
    driver: result.driver,
    urlConfigured: result.urlConfigured,
    latencyMs: result.latencyMs,
    serverTime: result.serverTime,
    error: result.error,
    databaseName: result.databaseName,
  };
}
