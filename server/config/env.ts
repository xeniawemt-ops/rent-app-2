import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config({ override: true });

const isProduction = process.env.NODE_ENV === 'production';

// Robust port resolution: in AI Studio preview, dev server must run on 3000,
// and 8080 is reserved by internal Nginx reverse proxy.
function resolvePort(): number {
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const parsed = parseInt(process.argv[portArgIdx + 1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (!isProduction) {
    return 3000;
  }
  if (process.env.PORT) {
    const parsed = parseInt(process.env.PORT, 10);
    if (parsed === 8080) return 3000;
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 3000;
}

// Derive DATABASE_URL from SQL_* environment variables (Cloud SQL Proxy) if not directly set
function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
    return process.env.DATABASE_URL.trim();
  }
  if (process.env.SQL_HOST && process.env.SQL_USER) {
    const user = encodeURIComponent(process.env.SQL_USER);
    const pass = encodeURIComponent(process.env.SQL_PASSWORD || '');
    const db = process.env.SQL_DB_NAME || 'postgres';
    const host = process.env.SQL_HOST;
    if (host.startsWith('/')) {
      return `postgresql://${user}:${pass}@localhost/${db}?host=${encodeURIComponent(host)}`;
    }
    const port = process.env.SQL_PORT || '5432';
    return `postgresql://${user}:${pass}@${host}:${port}/${db}`;
  }
  return '';
}

// Generate ephemeral secure fallback secrets if not explicitly configured in production
function resolveSecret(envVal: string | undefined, name: string): string {
  if (envVal && !envVal.includes('dev_') && envVal.length >= 32) {
    return envVal;
  }
  if (isProduction) {
    // Generate secure random key to ensure container boots safely in Cloud Run without crashing
    const ephemeralKey = crypto.randomBytes(32).toString('hex');
    console.warn(`[Security Notice] ${name} not explicitly configured in production environment. Generated ephemeral 64-character secret for runtime session security.`);
    return ephemeralKey;
  }
  return name === 'JWT_SECRET'
    ? 'nivaspay_dev_secret_key_change_in_production_9988776655'
    : 'nivaspay_dev_session_secret_change_in_production';
}

const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map((o) => o.trim());
if (process.env.APP_URL && !configuredOrigins.includes(process.env.APP_URL)) {
  configuredOrigins.push(process.env.APP_URL);
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: resolvePort(),
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  API_URL: process.env.API_URL || 'http://localhost:3000/api',
  // DATABASE_URL is strictly environment-driven or derived from Cloud SQL Proxy credentials.
  DATABASE_URL: resolveDatabaseUrl(),
  // Optional SSL requirement flag for cloud PostgreSQL instances
  DB_SSL: process.env.DB_SSL === 'true',
  JWT_SECRET: resolveSecret(process.env.JWT_SECRET, 'JWT_SECRET'),
  SESSION_SECRET: resolveSecret(process.env.SESSION_SECRET, 'SESSION_SECRET'),
  RAZORPAY: {
    KEY_ID: process.env.RAZORPAY_KEY_ID || '',
    KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
    WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    ACCOUNT_ID: process.env.RAZORPAY_ACCOUNT_ID || '',
    isConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  },
  EMAIL: {
    API_KEY: process.env.EMAIL_PROVIDER_API_KEY || '',
    FROM: process.env.EMAIL_FROM_ADDRESS || 'no-reply@nivaspay.com',
    isConfigured: Boolean(process.env.EMAIL_PROVIDER_API_KEY),
  },
  SMS: {
    API_KEY: process.env.SMS_PROVIDER_API_KEY || '',
    SENDER_ID: process.env.SMS_SENDER_ID || 'NVSPAY',
    isConfigured: Boolean(process.env.SMS_PROVIDER_API_KEY),
  },
  STORAGE: {
    BUCKET: process.env.STORAGE_BUCKET || 'nivaspay-documents-prod',
    ACCESS_KEY: process.env.STORAGE_ACCESS_KEY || '',
    SECRET_KEY: process.env.STORAGE_SECRET_KEY || '',
    REGION: process.env.STORAGE_REGION || 'ap-south-1',
    isConfigured: Boolean(process.env.STORAGE_ACCESS_KEY && process.env.STORAGE_SECRET_KEY),
  },
  CORS_ORIGINS: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map((o) => o.trim()),
};
