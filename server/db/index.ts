import pg from 'pg';
import { ENV } from '../config/env';
import { runMigrations } from './migrate';

const { Pool } = pg;

export interface SanitizedConnectionDetails {
  isValid: boolean;
  configured: boolean;
  protocol?: string;
  host?: string;
  port?: string;
  database?: string;
  user?: string;
  maskedUrl?: string;
  error?: string;
}

export interface DatabaseHealthStatus {
  connected: boolean;
  driver: 'postgres' | 'none';
  urlConfigured: boolean;
  databaseName?: string;
  serverVersion?: string;
  latencyMs?: number;
  serverTime?: string;
  sanitizedTarget?: string;
  error?: string;
  mode: 'real_postgres' | 'local_fallback';
}

/**
 * Parses and verifies the format of the DATABASE_URL connection string
 * without exposing sensitive user credentials in console logs or error traces.
 */
export function verifyConnectionString(rawUrl?: string): SanitizedConnectionDetails {
  const urlToVerify = rawUrl ?? ENV.DATABASE_URL;

  if (!urlToVerify || urlToVerify.trim() === '') {
    return {
      isValid: false,
      configured: false,
      error: 'DATABASE_URL is not set in environment.',
    };
  }

  const trimmed = urlToVerify.trim();

  // Validate protocol
  if (!trimmed.startsWith('postgres://') && !trimmed.startsWith('postgresql://')) {
    return {
      isValid: false,
      configured: true,
      error: 'Invalid connection string protocol. Must start with postgres:// or postgresql://',
    };
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname;
    const port = parsed.port || '5432';
    const database = parsed.pathname ? parsed.pathname.replace(/^\//, '') : '';
    const user = parsed.username || '';

    // Mask password in URL for safe logging
    let maskedUrl = `${parsed.protocol}//`;
    if (user) {
      maskedUrl += `${user}:****@`;
    }
    maskedUrl += `${host}:${port}/${database}`;

    if (!host) {
      return {
        isValid: false,
        configured: true,
        error: 'DATABASE_URL is missing host component.',
      };
    }

    return {
      isValid: true,
      configured: true,
      protocol: parsed.protocol.replace(':', ''),
      host,
      port,
      database: database || 'postgres',
      user,
      maskedUrl,
    };
  } catch (err: any) {
    return {
      isValid: false,
      configured: true,
      error: `Malformed DATABASE_URL: ${err.message}`,
    };
  }
}

// Global Singleton Pool Instance
let activePool: pg.Pool | null = null;
let connectionHealthy = false;
let lastHealthStatus: DatabaseHealthStatus = {
  connected: false,
  driver: 'none',
  urlConfigured: false,
  mode: 'local_fallback',
};

/**
 * Initializes or retrieves the singleton PostgreSQL connection pool instance.
 */
export function getDbPool(): pg.Pool | null {
  if (activePool) return activePool;

  const verification = verifyConnectionString();
  if (!verification.isValid) {
    return null;
  }

  try {
    activePool = new Pool({
      connectionString: ENV.DATABASE_URL,
      ssl: ENV.DB_SSL ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    activePool.on('error', (err) => {
      console.error('[PostgreSQL Pool Background Error]:', err.message);
      connectionHealthy = false;
    });

    return activePool;
  } catch (err: any) {
    console.error('[PostgreSQL Pool Initialization Failed]:', err.message);
    return null;
  }
}

/**
 * Exported Pool Instance.
 * Uses lazy proxy so consumers importing `pool` can interact directly while safely handling
 * environments where DATABASE_URL is not yet configured.
 */
export const pool = new Proxy({} as pg.Pool, {
  get(_target, prop) {
    const instance = getDbPool();
    if (!instance) {
      if (prop === 'query') {
        return async () => {
          throw new Error('PostgreSQL database pool is unavailable. Set DATABASE_URL to enable PostgreSQL.');
        };
      }
      return undefined;
    }
    const val = (instance as any)[prop];
    return typeof val === 'function' ? val.bind(instance) : val;
  },
});

/**
 * Check out a PostgreSQL client with an automatic release handler.
 */
export async function getClient(): Promise<pg.PoolClient> {
  const p = getDbPool();
  if (!p) {
    throw new Error('Cannot acquire client: PostgreSQL connection pool is not configured.');
  }
  return await p.connect();
}

/**
 * Parameterized query runner against the active PostgreSQL pool.
 */
export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const p = getDbPool();
  if (!p) {
    throw new Error('Database query failed: PostgreSQL connection pool is not configured.');
  }
  return await p.query<T>(text, params);
}

/**
 * Verifies connectivity against the real PostgreSQL instance and logs a clear health check status.
 * STRICT: Never reports a connected status when using fallback or when PostgreSQL is unreachable.
 */
export async function verifyDatabaseConnection(): Promise<DatabaseHealthStatus> {
  const connInfo = verifyConnectionString();

  if (!connInfo.configured) {
    connectionHealthy = false;
    lastHealthStatus = {
      connected: false,
      driver: 'none',
      urlConfigured: false,
      mode: 'local_fallback',
      error: 'DATABASE_URL environment variable is not defined.',
    };
    logStartupHealthCheck(lastHealthStatus);
    return lastHealthStatus;
  }

  if (!connInfo.isValid) {
    connectionHealthy = false;
    lastHealthStatus = {
      connected: false,
      driver: 'none',
      urlConfigured: true,
      mode: 'local_fallback',
      error: connInfo.error,
    };
    logStartupHealthCheck(lastHealthStatus);
    return lastHealthStatus;
  }

  const p = getDbPool();
  if (!p) {
    connectionHealthy = false;
    lastHealthStatus = {
      connected: false,
      driver: 'postgres',
      urlConfigured: true,
      mode: 'local_fallback',
      sanitizedTarget: connInfo.maskedUrl,
      error: 'Failed to instantiate PostgreSQL pool driver.',
    };
    logStartupHealthCheck(lastHealthStatus);
    return lastHealthStatus;
  }

  const startTime = Date.now();

  try {
    // Perform genuine SQL ping to verify the database server is live and responsive
    const res = await p.query(
      'SELECT 1 AS ready, NOW() AS server_time, current_database() AS db_name, version() AS version'
    );
    const latencyMs = Date.now() - startTime;
    const row = res.rows[0];

    connectionHealthy = true;
    lastHealthStatus = {
      connected: true,
      driver: 'postgres',
      urlConfigured: true,
      databaseName: row.db_name,
      serverVersion: row.version.split(' on ')[0],
      serverTime: row.server_time,
      latencyMs,
      sanitizedTarget: connInfo.maskedUrl,
      mode: 'real_postgres',
    };

    logStartupHealthCheck(lastHealthStatus);

    // Run pending schema migrations upon verified connection
    try {
      const migrationRes = await runMigrations(p);
      if (migrationRes.executed.length > 0) {
        console.log(`[PostgreSQL Migrations] Applied ${migrationRes.executed.length} migrations successfully.`);
      }
    } catch (migErr: any) {
      console.warn(`[PostgreSQL Migrations Warning] Notice during schema migrations: ${migErr.message}`);
    }

    // Ensure standard demo user accounts are populated with valid authentication hashes
    try {
      const demoUsers = [
        ['user_cust_101', 'aarav@nivaspay.in', '$2b$12$fV0OmFhAnLPfCa6VRg6EFOAH3HTnThl37lFXJeRoSfovH4ys8otqG', 'CUSTOMER', 'Aarav Sharma', '+91 98765 43210'],
        ['user_cust_102', 'priyanka@nivaspay.in', '$2b$12$fV0OmFhAnLPfCa6VRg6EFOAH3HTnThl37lFXJeRoSfovH4ys8otqG', 'CUSTOMER', 'Priyanka Sen', '+91 91234 56789'],
        ['user_owner_201', 'rameshwar@nivaspay.in', '$2b$12$fV0OmFhAnLPfCa6VRg6EFOAH3HTnThl37lFXJeRoSfovH4ys8otqG', 'OWNER', 'Rameshwar Kulkarni', '+91 98111 22334'],
        ['user_owner_202', 'meenakshi@nivaspay.in', '$2b$12$fV0OmFhAnLPfCa6VRg6EFOAH3HTnThl37lFXJeRoSfovH4ys8otqG', 'OWNER', 'Meenakshi Iyer', '+91 97222 33445'],
        ['user_broker_admin_301', 'broker.admin@apexrealty.in', '$2b$12$fV0OmFhAnLPfCa6VRg6EFOAH3HTnThl37lFXJeRoSfovH4ys8otqG', 'OWNER', 'Vikram Malhotra', '+91 98222 11001'],
        ['user_broker_staff_302', 'sonam.staff@apexrealty.in', '$2b$12$fV0OmFhAnLPfCa6VRg6EFOAH3HTnThl37lFXJeRoSfovH4ys8otqG', 'CUSTOMER', 'Sonam Wangchu', '+91 98333 22002'],
        ['user_rm_401', 'tenzing.rm@nivaspay.in', '$2b$12$fV0OmFhAnLPfCa6VRg6EFOAH3HTnThl37lFXJeRoSfovH4ys8otqG', 'CUSTOMER', 'Tenzing Norbu', '+91 98444 33003'],
        ['user_ops_501', 'ananya.ops@nivaspay.in', '$2b$12$fV0OmFhAnLPfCa6VRg6EFOAH3HTnThl37lFXJeRoSfovH4ys8otqG', 'CUSTOMER', 'Ananya Deshmukh', '+91 98555 44004'],
        ['user_admin_master', 'zexnitz@nivaspay.in', '$2b$12$PV9IqzDi5HlRvWUMeXxS3.U6Wy3.Zz8DbN30FtVC4ALpsjtzm5x4e', 'ADMIN', 'Zexnitz (Master Administrator)', '+91 99999 88888'],
        ['user_admin_999', 'compliance.admin@nivaspay.in', '$2b$12$PV9IqzDi5HlRvWUMeXxS3.U6Wy3.Zz8DbN30FtVC4ALpsjtzm5x4e', 'ADMIN', 'NivasPay Compliance Admin', '+91 99999 88888'],
        ['user_admin_001', 'admin@nivaspay.com', '$2b$12$PV9IqzDi5HlRvWUMeXxS3.U6Wy3.Zz8DbN30FtVC4ALpsjtzm5x4e', 'ADMIN', 'System Administrator', '+91 99999 88888'],
        ['user_owner_alt', 'owner@nivaspay.com', '$2b$12$fV0OmFhAnLPfCa6VRg6EFOAH3HTnThl37lFXJeRoSfovH4ys8otqG', 'OWNER', 'Vikram Kulkarni', '+91 98111 22334'],
        ['user_cust_alt', 'customer@nivaspay.com', '$2b$12$fV0OmFhAnLPfCa6VRg6EFOAH3HTnThl37lFXJeRoSfovH4ys8otqG', 'CUSTOMER', 'Aarav Sharma', '+91 98765 43210']
      ];

      for (const [id, email, passwordHash, role, fullName, phone] of demoUsers) {
        const existing = await p.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) OR id = $2 LIMIT 1;', [email, id]);
        if (existing.rows.length > 0) {
          await p.query(
            'UPDATE users SET password_hash = $1, email = LOWER($2), role = $3, full_name = $4 WHERE id = $5 OR LOWER(email) = LOWER($2);',
            [passwordHash, email, role, fullName, existing.rows[0].id]
          );
        } else {
          await p.query(
            'INSERT INTO users (id, email, password_hash, role, full_name, phone, is_verified, created_at) VALUES ($1, LOWER($2), $3, $4, $5, $6, true, NOW());',
            [id, email, passwordHash, role, fullName, phone]
          );
        }
      }

      // 2. Seed Customer Profiles
      await p.query(`
        INSERT INTO customer_profiles (id, user_id, name, age, gender, occupation, marital_status, family_size, has_pets, pet_type, religion, tribe, consent_share_religion_tribe, agreed_dpdp_notice_at, dpdp_notice_version, language_preference)
        VALUES 
          ('cp_101', 'user_cust_101', 'Aarav Sharma', 27, 'Male', 'Senior Software Engineer (FinTech)', 'Single', 1, true, 'Golden Retriever', 'Hindu', 'General', false, NOW(), 'DPDP-2023-v2.4', 'en'),
          ('cp_102', 'user_cust_102', 'Priyanka Sen', 31, 'Female', 'Lead Architect', 'Married', 3, false, NULL, 'Brahmo/Hindu', 'None', false, NOW(), 'DPDP-2023-v2.4', 'en')
        ON CONFLICT (user_id) DO NOTHING;
      `);

      // 3. Seed Owner Profiles
      await p.query(`
        INSERT INTO owner_profiles (id, user_id, full_name, phone_masked, phone_encrypted, pan_masked, pan_verified, aadhaar_masked, aadhaar_verified, agreed_anti_discrimination_terms_at, strikes_count, is_suspended)
        VALUES 
          ('op_201', 'user_owner_201', 'Rameshwar Kulkarni', '+91 98*** **334', 'ENC_MOCK_PHONE_201', 'ABCDE1234F', true, 'XXXX-XXXX-8921', true, NOW(), 0, false),
          ('op_202', 'user_owner_202', 'Meenakshi Iyer', '+91 97*** **445', 'ENC_MOCK_PHONE_202', 'FGHIJ5678K', true, 'XXXX-XXXX-4512', true, NOW(), 0, false)
        ON CONFLICT (user_id) DO NOTHING;
      `);

      // 4. Seed Properties (Authoritative Arunachal Pradesh Listings)
      const propertiesSeed = [
        ['lst_1', 'user_owner_201', 'Pine View Villa near Ganga Lake', '3 BHK', 12500, 30000, 'Ganga Lake Road, Chandranagar', 'Itanagar', 'Gated Villa', 6, 5, 'available',
          JSON.stringify(['Mountain Valley View', 'Covered Car Parking', '24x7 Water Supply', 'Solar Water Heater', 'Broadband Ready']),
          JSON.stringify(['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&auto=format&fit=crop&q=80']),
          JSON.stringify({ petsAllowed: true, maxOccupants: 4, vegOnly: false, minStayMonths: 11 }),
          27.0844, 93.6053, 'Near Ganga Lake viewpoint corridor, Chandranagar, Itanagar'],
        ['lst_2', 'user_owner_201', 'Modern Hilltop Apartment', '3 BHK', 14000, 35000, 'Model Village, Papu Hill', 'Naharlagun', 'Apartment', 12, 10, 'available',
          JSON.stringify(['Power Backup', 'Paved Parking', 'Intercom Security', 'Terrace Garden']),
          JSON.stringify(['https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1200&auto=format&fit=crop&q=80']),
          JSON.stringify({ petsAllowed: false, maxOccupants: 5, vegOnly: true, minStayMonths: 11 }),
          27.1055, 93.6922, 'Adjacent to Railway station road, Papu Hill, Naharlagun'],
        ['lst_3', 'user_owner_202', 'Siang Riverside Cottage', '2 BHK', 9500, 25000, 'Medical Colony, Siang View', 'Pasighat', 'Independent House', 4, 4, 'rented',
          JSON.stringify(['Private Courtyard', 'River Breeze', 'Modular Kitchen', 'Dedicated Water Tank']),
          JSON.stringify(['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1502005229762-ee1e3e60271b?w=1200&auto=format&fit=crop&q=80']),
          JSON.stringify({ petsAllowed: true, maxOccupants: 3, vegOnly: false, minStayMonths: 6 }),
          28.0667, 95.3333, 'Near Siang river promenade, Medical Colony, Pasighat'],
        ['lst_4', 'user_owner_202', 'Alpine Cedar Studio with Snow Peak View', '1 BHK', 8000, 16000, 'Monastery Road, Upper Tawang', 'Tawang', 'Studio', 6, 5, 'available',
          JSON.stringify(['Snow Peak Panorama', 'Heated Flooring Ready', 'High-Speed Fiber Ready']),
          JSON.stringify(['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&auto=format&fit=crop&q=80']),
          JSON.stringify({ petsAllowed: false, maxOccupants: 2, vegOnly: false, minStayMonths: 3 }),
          27.5861, 91.8675, 'Upper Tawang Monastery Road corridor'],
        ['lst_5', 'user_owner_201', 'Traditional Apatani Bamboo Cottage', '2 BHK', 10500, 20000, 'Hapoli Valley View', 'Ziro', 'Independent House', 2, 1, 'available',
          JSON.stringify(['Pine Forest Trail', 'Organic Kitchen Garden', 'Fireplace Chimney']),
          JSON.stringify(['https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=1200&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&auto=format&fit=crop&q=80']),
          JSON.stringify({ petsAllowed: true, maxOccupants: 4, vegOnly: false, minStayMonths: 6 }),
          27.5450, 93.8320, 'Hapoli Pine ridge overlooking Ziro valley'],
        ['lst_6', 'user_owner_202', 'Dibang Vista Executive Suite', '2 BHK', 11000, 22000, 'Mayudia Highway', 'Roing', 'Apartment', 8, 7, 'available',
          JSON.stringify(['Valley Overlook', 'Covered Parking', 'Solar Water Geyser']),
          JSON.stringify(['https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&auto=format&fit=crop&q=80']),
          JSON.stringify({ petsAllowed: false, maxOccupants: 3, vegOnly: false, minStayMonths: 11 }),
          28.1360, 95.8360, 'Mayudia Highway junction near Circuit House, Roing'],
      ];

      for (const [id, ownerId, title, bhk, rent, deposit, locality, city, type, totalUnits, occUnits, status, amenities, photos, requirements, lat, lng, maskedPreview] of propertiesSeed) {
        await p.query(`
          INSERT INTO properties (id, owner_id, title, bhk, rent_monthly, security_deposit, locality, city, property_type, total_units, occupied_units, status, amenities, photos, requirements, approximate_lat, approximate_lng, masked_address_preview, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            rent_monthly = EXCLUDED.rent_monthly,
            security_deposit = EXCLUDED.security_deposit,
            total_units = EXCLUDED.total_units,
            occupied_units = EXCLUDED.occupied_units,
            status = EXCLUDED.status,
            amenities = EXCLUDED.amenities,
            photos = EXCLUDED.photos;
        `, [id, ownerId, title, bhk, rent, deposit, locality, city, type, totalUnits, occUnits, status, amenities, photos, requirements, lat, lng, maskedPreview]);
      }

      // 5. Seed Agencies and Delegated Memberships
      await p.query(`
        INSERT INTO agencies (id, business_name, registration_details, verification_status, contact_email, contact_phone, address, city)
        VALUES ('ag_apex_01', 'Apex Realty Consultants', '{"reraNumber": "RERA/AP/2024/0981"}', 'VERIFIED', 'contact@apexrealty.in', '+91 98222 11000', 'Suite 401, Apex Commercial Tower, Itanagar', 'Itanagar')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO broker_memberships (id, user_id, agency_id, membership_role, permissions, status)
        VALUES 
          ('bm_301', 'user_broker_admin_301', 'ag_apex_01', 'BROKER_ADMIN', '["MANAGE_AGENCY", "MANAGE_STAFF", "MANAGE_LISTINGS", "SUBMIT_PROPOSALS", "VIEW_CLIENTS"]', 'ACTIVE'),
          ('bm_302', 'user_broker_staff_302', 'ag_apex_01', 'BROKER_STAFF', '["VIEW_ASSIGNED_LEADS", "CONDUCT_VISITS", "CREATE_PROPOSALS"]', 'ACTIVE')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO staff_memberships (id, user_id, staff_role, assigned_region, permissions, status)
        VALUES 
          ('sm_401', 'user_rm_401', 'NIVASPAY_RM', 'Arunachal Pradesh - Itanagar Capital Complex', '["VIEW_ASSIGNED_PORTFOLIO", "COMMUNICATE_TENANTS", "ASSIST_ONBOARDING", "RESOLVE_INQUIRIES"]', 'ACTIVE'),
          ('sm_501', 'user_ops_501', 'OPERATIONS_MANAGER', 'North-East Region (All Territories)', '["AUDIT_PAYMENTS", "MANAGE_RECONCILIATION", "MONITOR_DPDP", "SYSTEM_HEALTH_VIEW"]', 'ACTIVE')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO property_authorizations (id, property_id, owner_id, agency_id, permission_scope, authorization_type, doc_reference, valid_from, valid_until, verification_status)
        VALUES ('auth_001', 'lst_1', 'user_owner_201', 'ag_apex_01', 'LISTING_AND_VISITS', 'NON_EXCLUSIVE', 'AUTH-2026-APEX-001', NOW() - INTERVAL '10 days', NOW() + INTERVAL '355 days', 'VERIFIED')
        ON CONFLICT (id) DO NOTHING;
      `);

      // 6. Seed Sample Applications and Agreements
      await p.query(`
        INSERT INTO applications (id, listing_id, customer_id, applicant_name, applicant_email, monthly_income, status, application_fee_paid, application_fee_amount, created_at)
        VALUES 
          ('app_1001', 'lst_1', 'user_cust_101', 'Aarav Sharma', 'aarav@nivaspay.in', 85000, 'accepted', true, 20.00, NOW() - INTERVAL '5 days'),
          ('app_1002', 'lst_2', 'user_cust_102', 'Priyanka Sen', 'priyanka@nivaspay.in', 95000, 'active_tenancy', true, 20.00, NOW() - INTERVAL '15 days')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO rental_agreements (id, application_id, listing_id, property_title, property_address, tenant_id, tenant_name, owner_id, owner_name, monthly_rent, security_deposit, commencement_date, tenancy_period_months, status, contract_hash, created_at)
        VALUES 
          ('agr_2001', 'app_1002', 'lst_2', 'Modern Hilltop Apartment', 'Flat B-202, Valley Heights, Model Village Road, Papu Hill, Naharlagun, Arunachal Pradesh - 791110', 'user_cust_102', 'Priyanka Sen', 'user_owner_201', 'Rameshwar Kulkarni', 14000, 35000, NOW() - INTERVAL '10 days', 11, 'active', 'hash_seed_2001_sha256', NOW() - INTERVAL '10 days')
        ON CONFLICT (id) DO NOTHING;
      `);
    } catch (seedErr: any) {
      console.warn(`[PostgreSQL Seed Warning] Notice during demo accounts sync: ${seedErr.message}`);
    }

    return lastHealthStatus;
  } catch (err: any) {
    connectionHealthy = false;
    const latencyMs = Date.now() - startTime;

    lastHealthStatus = {
      connected: false,
      driver: 'postgres',
      urlConfigured: true,
      sanitizedTarget: connInfo.maskedUrl,
      latencyMs,
      error: err.message,
      mode: 'local_fallback',
    };

    logStartupHealthCheck(lastHealthStatus);
    return lastHealthStatus;
  }
}

/**
 * Logs a clear, formatted health check status on server startup.
 */
export function logStartupHealthCheck(status: DatabaseHealthStatus): void {
  console.log('================================================================');
  console.log('             NIVASPAY DATABASE STARTUP HEALTH CHECK             ');
  console.log('================================================================');

  if (status.connected) {
    console.log(` Status         : [CONNECTED] Genuine PostgreSQL link verified`);
    console.log(` Target Host    : ${status.sanitizedTarget || 'Configured host'}`);
    console.log(` Database       : ${status.databaseName || 'n/a'}`);
    console.log(` Ping Latency   : ${status.latencyMs}ms`);
    console.log(` Server Time    : ${status.serverTime}`);
    console.log(` Version        : ${status.serverVersion || 'PostgreSQL'}`);
    console.log(` Persistence    : Real PostgreSQL repository active`);
  } else {
    console.log(` Status         : [NOT CONNECTED] PostgreSQL is currently offline`);
    console.log(` URL Configured : ${status.urlConfigured ? 'YES (Valid URL supplied)' : 'NO (Missing DATABASE_URL)'}`);
    if (status.sanitizedTarget) {
      console.log(` Target Host    : ${status.sanitizedTarget}`);
    }
    if (status.error) {
      console.log(` Reason         : ${status.error}`);
    }
    console.log(` Operational Mode: ${status.mode.toUpperCase()} (Zero fabricated persistence)`);
    console.log(` Action Required : Provide a live PostgreSQL instance in DATABASE_URL to activate full persistence`);
  }

  console.log('================================================================\n');
}

/**
 * Returns current connectivity flag.
 */
export function isDbConnected(): boolean {
  return connectionHealthy;
}

/**
 * Health check handler for API endpoints (/api/health).
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
  const p = getDbPool();
  if (!p || !connectionHealthy) {
    return {
      connected: false,
      driver: ENV.DATABASE_URL ? 'postgres' : 'none',
      urlConfigured: Boolean(ENV.DATABASE_URL),
      mode: 'local_fallback',
      error: lastHealthStatus.error || 'Database is not connected.',
    };
  }

  const start = Date.now();
  try {
    const res = await p.query('SELECT NOW() AS server_time, current_database() AS db_name');
    return {
      connected: true,
      driver: 'postgres',
      urlConfigured: true,
      databaseName: res.rows[0].db_name,
      serverTime: res.rows[0].server_time,
      latencyMs: Date.now() - start,
      mode: 'real_postgres',
    };
  } catch (err: any) {
    connectionHealthy = false;
    return {
      connected: false,
      driver: 'postgres',
      urlConfigured: true,
      error: err.message,
      mode: 'local_fallback',
    };
  }
}

/**
 * Graceful shutdown hook for the connection pool.
 */
export async function closePool(): Promise<void> {
  if (activePool) {
    await activePool.end();
    activePool = null;
    connectionHealthy = false;
  }
}
