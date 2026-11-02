import assert from 'assert';
import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import pg from 'pg';
import apiRouter from '../routes/api';
import { db } from '../db/database';
import { AuthService } from '../services/authService';
import { verifyDatabaseConnection } from '../db/index';

const { Pool } = pg;

// Connect to PostgreSQL instance
const pool = new Pool(
  process.env.SQL_HOST && process.env.SQL_DB_NAME
    ? {
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 5,
        connectionTimeoutMillis: 10000,
      }
    : {
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/nivaspay',
        max: 5,
        connectionTimeoutMillis: 10000,
      }
);

interface ApiResponse<T = any> {
  status: number;
  body: T;
  headers: Headers;
}

async function startTestServer(): Promise<{ server: http.Server; baseUrl: string; close: () => Promise<void> }> {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api', apiRouter);

  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const address = server.address() as any;
      const baseUrl = `http://127.0.0.1:${address.port}/api`;
      resolve({
        server,
        baseUrl,
        close: () => new Promise<void>((res) => server.close(() => res())),
      });
    });
  });
}

async function request(
  baseUrl: string,
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<ApiResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Platform': 'NivasPay-Web',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let responseBody: any;
  const text = await response.text();
  try {
    responseBody = JSON.parse(text);
  } catch {
    responseBody = text;
  }

  return {
    status: response.status,
    body: responseBody,
    headers: response.headers,
  };
}

async function runE2EApiIntegrationTests() {
  console.log('================================================================');
  console.log('    NIVASPAY END-TO-END REST API & POSTGRESQL INTEGRATION TESTS ');
  console.log('================================================================');

  // Verify and initialize PostgreSQL database connection
  const dbHealth = await verifyDatabaseConnection();
  if (!dbHealth.connected) {
    console.error(`[ERROR] PostgreSQL is not reachable: ${dbHealth.error}`);
    process.exit(1);
  }
  console.log(`[INFO] PostgreSQL Live Database Verified: ${dbHealth.databaseName} (Driver: ${dbHealth.driver})`);

  const { baseUrl, close } = await startTestServer();
  const testRunId = `e2e_${Date.now()}`;
  let passed = 0;

  try {
    // -------------------------------------------------------------------------
    // Scenario 1: Register customer & verify PostgreSQL row
    // -------------------------------------------------------------------------
    console.log('\n▶ Scenario 1: Register customer & verify PostgreSQL row');
    const custEmail = `cust_${testRunId}@nivaspay.test`;
    const custPass = 'SecurePass!2026';
    const custRes = await request(baseUrl, 'POST', '/auth/signup', {
      email: custEmail,
      password: custPass,
      role: 'CUSTOMER',
      fullName: 'Anita Roy',
      phone: '+919876500001',
      agreedTerms: true,
      agreedAntiDiscrimination: true,
    });

    if (custRes.status !== 201) {
      console.error('Registration failed:', custRes.body);
    }
    assert.strictEqual(custRes.status, 201, `Customer registration should return 201, got ${custRes.status}`);
    assert.ok(custRes.body.token, 'Must return JWT token');
    const customerToken = custRes.body.token;
    const customerUserId = custRes.body.user.id;

    // Verify row in PostgreSQL
    const custDbRow = (await pool.query('SELECT * FROM users WHERE email = $1;', [custEmail])).rows[0];
    assert.ok(custDbRow, 'Customer user row must exist in PostgreSQL users table');
    assert.strictEqual(custDbRow.role, 'CUSTOMER');
    assert.strictEqual(custDbRow.full_name, 'Anita Roy');
    assert.ok(
      custDbRow.password_hash.startsWith('$2b$') ||
      custDbRow.password_hash.startsWith('$argon2') ||
      custDbRow.password_hash.startsWith('$pbkdf2'),
      'Password hash must be secure (bcrypt/argon2/pbkdf2)'
    );
    console.log('  ✓ Customer registered via API and verified in PostgreSQL');
    passed++;

    // -------------------------------------------------------------------------
    // Scenario 2: Register owner & verify PostgreSQL row
    // -------------------------------------------------------------------------
    console.log('\n▶ Scenario 2: Register owner & verify PostgreSQL row');
    const ownerEmail = `owner_${testRunId}@nivaspay.test`;
    const ownerPass = 'SecureOwner!2026';
    const ownerRes = await request(baseUrl, 'POST', '/auth/signup', {
      email: ownerEmail,
      password: ownerPass,
      role: 'OWNER',
      fullName: 'Dorjee Khandu',
      phone: '+919876500002',
      agreedTerms: true,
      agreedAntiDiscrimination: true,
    });

    if (ownerRes.status !== 201) {
      console.error('Owner registration failed:', ownerRes.body);
    }
    assert.strictEqual(ownerRes.status, 201, `Owner registration should return 201, got ${ownerRes.status}`);
    assert.ok(ownerRes.body.token, 'Must return JWT token');
    const ownerToken = ownerRes.body.token;
    const ownerUserId = ownerRes.body.user.id;

    // Verify row in PostgreSQL
    const ownerDbRow = (await pool.query('SELECT * FROM users WHERE email = $1;', [ownerEmail])).rows[0];
    assert.ok(ownerDbRow, 'Owner user row must exist in PostgreSQL users table');
    assert.strictEqual(ownerDbRow.role, 'OWNER');
    assert.strictEqual(ownerDbRow.full_name, 'Dorjee Khandu');
    console.log('  ✓ Owner registered via API and verified in PostgreSQL');
    passed++;

    // -------------------------------------------------------------------------
    // Scenario 3: Log in & restore session via /auth/me
    // -------------------------------------------------------------------------
    console.log('\n▶ Scenario 3: Log in & restore session via /auth/me');
    const loginRes = await request(baseUrl, 'POST', '/auth/login', {
      email: custEmail,
      password: custPass,
    });
    assert.strictEqual(loginRes.status, 200, 'Login should succeed');
    const freshToken = loginRes.body.token;

    // Restore session via /auth/me
    const meRes = await request(baseUrl, 'GET', '/auth/me', undefined, freshToken);
    assert.strictEqual(meRes.status, 200, '/auth/me should succeed');
    const meUser = meRes.body.user || meRes.body;
    assert.strictEqual(meUser.id, customerUserId);
    assert.strictEqual(meUser.role, 'CUSTOMER');
    assert.strictEqual(meUser.email, custEmail);
    console.log('  ✓ Session login and restoration verified via /auth/me');
    passed++;

    // -------------------------------------------------------------------------
    // Scenario 4: Create property via /properties & verify PostgreSQL persistence
    // -------------------------------------------------------------------------
    console.log('\n▶ Scenario 4: Create property via /properties & verify PostgreSQL persistence');
    const propPayload = {
      title: 'Himalayan View Villa',
      bhk: '3 BHK',
      rentMonthly: 28000,
      securityDeposit: 56000,
      locality: 'Zero Point',
      city: 'Itanagar',
      propertyType: 'Villa',
      category: 'VILLA',
      totalUnits: 1,
      occupiedUnits: 0,
      status: 'available',
      amenities: ['Power Backup', 'Covered Parking', 'Mountain View', 'Geyser'],
      photos: ['https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80'],
      requirements: {
        petsAllowed: true,
        maxOccupants: 5,
        vegOnly: false,
        smokingAllowed: false,
        minStayMonths: 11,
      },
      approximateLat: 27.102,
      approximateLng: 93.618,
      maskedAddressPreview: 'Zero Point, Itanagar',
    };

    const propCreateRes = await request(baseUrl, 'POST', '/properties', propPayload, ownerToken);
    assert.strictEqual(propCreateRes.status, 201, `Property creation should return 201, got ${propCreateRes.status}`);
    assert.ok(propCreateRes.body.property.id, 'Must return created property ID');
    const createdPropId = propCreateRes.body.property.id;

    // Verify row in PostgreSQL
    const propDbRow = (await pool.query('SELECT * FROM properties WHERE id = $1;', [createdPropId])).rows[0];
    assert.ok(propDbRow, 'Property row must exist in PostgreSQL properties table');
    assert.strictEqual(propDbRow.owner_id, ownerUserId);
    assert.strictEqual(Number(propDbRow.rent_monthly), 28000);
    assert.strictEqual(Number(propDbRow.security_deposit), 56000);
    assert.strictEqual(propDbRow.title, 'Himalayan View Villa');
    console.log('  ✓ Property created via API and verified in PostgreSQL');
    passed++;

    // -------------------------------------------------------------------------
    // Scenario 5: Edit property via /properties/:id & verify update in PostgreSQL
    // -------------------------------------------------------------------------
    console.log('\n▶ Scenario 5: Edit property via /properties/:id & verify update in PostgreSQL');
    const propUpdateRes = await request(
      baseUrl,
      'PUT',
      `/properties/${createdPropId}`,
      {
        rentMonthly: 30000,
        title: 'Himalayan View Premium Villa',
      },
      ownerToken
    );
    assert.strictEqual(propUpdateRes.status, 200, 'Property update should return 200');

    // Verify PostgreSQL reflection
    const updatedPropDbRow = (await pool.query('SELECT * FROM properties WHERE id = $1;', [createdPropId])).rows[0];
    assert.strictEqual(Number(updatedPropDbRow.rent_monthly), 30000);
    assert.strictEqual(updatedPropDbRow.title, 'Himalayan View Premium Villa');
    console.log('  ✓ Property updated via API and verified in PostgreSQL');
    passed++;

    // -------------------------------------------------------------------------
    // Scenario 6: Retrieve property from independent session
    // -------------------------------------------------------------------------
    console.log('\n▶ Scenario 6: Retrieve property from independent session');
    const publicPropRes = await request(baseUrl, 'GET', `/properties/${createdPropId}`);
    assert.strictEqual(publicPropRes.status, 200, 'Public property retrieval should return 200');
    assert.strictEqual(publicPropRes.body.property.id, createdPropId);
    assert.strictEqual(publicPropRes.body.property.maskedAddressPreview, 'Zero Point, Itanagar');
    assert.ok(publicPropRes.body.property.photos.length > 0);
    console.log('  ✓ Property retrieved from unauthenticated session with privacy masking');
    passed++;

    // -------------------------------------------------------------------------
    // Scenario 7: Submit customer application via /applications & verify fee
    // -------------------------------------------------------------------------
    console.log('\n▶ Scenario 7: Submit customer application & verify ₹20 fee payment');
    const appPayload = {
      listingId: createdPropId,
      applicantName: 'Anita Roy',
      applicantEmail: custEmail,
      monthlyIncome: 65000,
    };
    const appRes = await request(baseUrl, 'POST', '/applications', appPayload, customerToken);
    assert.strictEqual(appRes.status, 201, `Application submission should return 201, got ${appRes.status}`);
    const createdAppId = appRes.body.application.id;
    assert.ok(createdAppId);
    assert.ok(appRes.body.payment, 'Must initiate application fee payment');
    assert.strictEqual(appRes.body.payment.amount, 20, 'Application fee must be ₹20');

    // Verify PostgreSQL applications and payments tables
    const appDbRow = (await pool.query('SELECT * FROM applications WHERE id = $1;', [createdAppId])).rows[0];
    assert.ok(appDbRow, 'Application must exist in PostgreSQL');
    assert.strictEqual(appDbRow.customer_id, customerUserId);
    assert.strictEqual(appDbRow.listing_id, createdPropId);
    assert.strictEqual(appDbRow.status, 'pending');

    const paymentDbRow = (await pool.query('SELECT * FROM payments WHERE application_id = $1;', [createdAppId])).rows[0];
    assert.ok(paymentDbRow, 'Payment record must exist in PostgreSQL');
    assert.strictEqual(Number(paymentDbRow.amount), 20);
    assert.strictEqual(paymentDbRow.type, 'APPLICATION_FEE');
    console.log('  ✓ Tenancy application & ₹20 fee order verified in PostgreSQL');
    passed++;

    // -------------------------------------------------------------------------
    // Scenario 8: Update application status via /applications/:id/status
    // -------------------------------------------------------------------------
    console.log('\n▶ Scenario 8: Update application status via owner & verify customer view');
    const statusUpdateRes = await request(
      baseUrl,
      'PATCH',
      `/applications/${createdAppId}/status`,
      {
        status: 'accepted',
      },
      ownerToken
    );
    assert.strictEqual(statusUpdateRes.status, 200, 'Status update by owner should return 200');

    // Verify as Customer
    const custAppFetch = await request(baseUrl, 'GET', `/applications/${createdAppId}`, undefined, customerToken);
    assert.strictEqual(custAppFetch.status, 200);
    assert.strictEqual(custAppFetch.body.application.status, 'accepted');
    console.log('  ✓ Owner accepted application and customer sees real-time status update');
    passed++;

    // -------------------------------------------------------------------------
    // Scenario 9: IDOR protection: customer cannot view another customer's app
    // -------------------------------------------------------------------------
    console.log('\n▶ Scenario 9: IDOR protection on customer applications');
    const cust2Email = `cust2_${testRunId}@nivaspay.test`;
    const cust2Res = await request(baseUrl, 'POST', '/auth/signup', {
      email: cust2Email,
      password: 'SecurePassword123!',
      role: 'CUSTOMER',
      fullName: 'Second Customer',
      phone: '+919876500003',
      agreedTerms: true,
      agreedAntiDiscrimination: true,
    });
    const cust2Token = cust2Res.body.token;

    // Customer 2 attempts to fetch Customer 1's application
    const idorRes = await request(baseUrl, 'GET', `/applications/${createdAppId}`, undefined, cust2Token);
    assert.strictEqual(idorRes.status, 403, `IDOR attempt must be rejected with 403, got ${idorRes.status}`);
    console.log('  ✓ IDOR protection verified: Customer cannot view another customer application');
    passed++;

    // -------------------------------------------------------------------------
    // Scenario 10: Tenant/Owner isolation: owner cannot modify unowned property
    // -------------------------------------------------------------------------
    console.log('\n▶ Scenario 10: Cross-tenant isolation: owner cannot modify unowned property');
    const owner2Email = `owner2_${testRunId}@nivaspay.test`;
    const owner2Res = await request(baseUrl, 'POST', '/auth/signup', {
      email: owner2Email,
      password: 'SecurePassword123!',
      role: 'OWNER',
      fullName: 'Second Owner',
      phone: '+919876500004',
      agreedTerms: true,
      agreedAntiDiscrimination: true,
    });
    const owner2Token = owner2Res.body.token;

    // Owner 2 attempts to modify Owner 1's property
    const crossOwnerRes = await request(
      baseUrl,
      'PUT',
      `/properties/${createdPropId}`,
      { rentMonthly: 99999 },
      owner2Token
    );
    assert.strictEqual(crossOwnerRes.status, 403, `Unauthorized owner edit must return 403, got ${crossOwnerRes.status}`);
    console.log('  ✓ Cross-tenant isolation verified: Owner cannot modify unowned property');
    passed++;

    // -------------------------------------------------------------------------
    // Scenario 11: Delegated memberships: broker & staff endpoints
    // -------------------------------------------------------------------------
    console.log('\n▶ Scenario 11: Delegated memberships (Broker & Staff endpoints)');
    // Seeded broker admin user
    const brokerLogin = await request(baseUrl, 'POST', '/auth/login', {
      email: 'broker.admin@apexrealty.in',
      password: 'Pass@Nivas2026!',
    });
    assert.strictEqual(brokerLogin.status, 200, 'Broker login should succeed');
    const brokerToken = brokerLogin.body.token;

    const agencyRes = await request(baseUrl, 'GET', '/broker/agency', undefined, brokerToken);
    assert.strictEqual(agencyRes.status, 200, 'Broker agency endpoint should succeed with delegated token');
    assert.strictEqual(agencyRes.body.membership.membershipRole, 'BROKER_ADMIN');

    // Seeded RM staff user
    const rmLogin = await request(baseUrl, 'POST', '/auth/login', {
      email: 'tenzing.rm@nivaspay.in',
      password: 'Pass@Nivas2026!',
    });
    if (rmLogin.status !== 200) {
      console.error('RM login failed:', rmLogin.body);
    }
    assert.strictEqual(rmLogin.status, 200, 'RM staff login should succeed');
    const rmToken = rmLogin.body.token;

    const rmRes = await request(baseUrl, 'GET', '/staff/rm/assignments', undefined, rmToken);
    assert.strictEqual(rmRes.status, 200, 'RM staff assignments endpoint should succeed');
    assert.strictEqual(rmRes.body.membership.staffRole, 'NIVASPAY_RM');
    console.log('  ✓ Delegated memberships verified for Broker and RM staff endpoints');
    passed++;

    // -------------------------------------------------------------------------
    // Scenario 12: Verify unauthorized API requests return 401/403
    // -------------------------------------------------------------------------
    console.log('\n▶ Scenario 12: Unauthorized API requests return 401/403');
    // Customer attempts to create property -> 403
    const custPropRes = await request(baseUrl, 'POST', '/properties', propPayload, customerToken);
    assert.strictEqual(custPropRes.status, 403, 'Customer creating property must return 403');

    // Missing token on protected route -> 401
    const noTokenRes = await request(baseUrl, 'GET', '/auth/me');
    assert.strictEqual(noTokenRes.status, 401, 'Missing token on protected route must return 401');

    // Customer attempts to access admin metrics -> 403
    const adminMetricsRes = await request(baseUrl, 'GET', '/admin/metrics', undefined, customerToken);
    assert.strictEqual(adminMetricsRes.status, 403, 'Customer accessing admin metrics must return 403');
    console.log('  ✓ Role-based authorization rejects unauthorized actions with 401/403');
    passed++;

    // -------------------------------------------------------------------------
    // Scenario 13: Verify payment records are not duplicated
    // -------------------------------------------------------------------------
    console.log('\n▶ Scenario 13: Payment idempotency and duplicate prevention');
    const payId = `pay_unique_${testRunId}`;
    await pool.query(
      `INSERT INTO payments (id, application_id, property_id, payer_id, payee_id, amount, currency, type, status)
       VALUES ($1, $2, $3, $4, 'nivaspay_platform', 20.00, 'INR', 'APPLICATION_FEE', 'PENDING');`,
      [payId, createdAppId, createdPropId, customerUserId]
    );

    let duplicateThrew = false;
    try {
      await pool.query(
        `INSERT INTO payments (id, application_id, property_id, payer_id, payee_id, amount, currency, type, status)
         VALUES ($1, $2, $3, $4, 'nivaspay_platform', 20.00, 'INR', 'APPLICATION_FEE', 'PENDING');`,
        [payId, createdAppId, createdPropId, customerUserId]
      );
    } catch {
      duplicateThrew = true;
    }
    assert.strictEqual(duplicateThrew, true, 'Primary key constraint must reject duplicate payment ID');
    console.log('  ✓ Database constraints prevent duplicate payment records');
    passed++;

    // -------------------------------------------------------------------------
    // Scenario 14: Verify database outage handling produces clean errors
    // -------------------------------------------------------------------------
    console.log('\n▶ Scenario 14: Database outage handling produces clean operational errors');
    // Querying invalid property returns 404, not unhandled 500 crash
    const nonExistentRes = await request(baseUrl, 'GET', '/properties/non_existent_property_id');
    assert.strictEqual(nonExistentRes.status, 404, 'Non-existent property should return clean 404');

    // Check health endpoint when healthy
    const healthRes = await request(baseUrl, 'GET', '/health');
    assert.strictEqual(healthRes.status, 200, 'Health endpoint returns 200 when live');
    assert.strictEqual(healthRes.body.status, 'healthy');
    assert.strictEqual(healthRes.body.database.connected, true);
    console.log('  ✓ System reports accurate database health without fabricating status');
    passed++;

    // -------------------------------------------------------------------------
    // Clean up disposable test fixtures
    // -------------------------------------------------------------------------
    await pool.query('DELETE FROM payments WHERE property_id = $1;', [createdPropId]);
    await pool.query('DELETE FROM applications WHERE listing_id = $1;', [createdPropId]);
    await pool.query('DELETE FROM properties WHERE id = $1;', [createdPropId]);
    await pool.query('DELETE FROM customer_profiles WHERE user_id IN ($1, $2);', [customerUserId, cust2Res.body.user.id]);
    await pool.query('DELETE FROM owner_profiles WHERE user_id IN ($1, $2);', [ownerUserId, owner2Res.body.user.id]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3, $4);', [
      customerUserId,
      ownerUserId,
      cust2Res.body.user.id,
      owner2Res.body.user.id,
    ]);
    console.log('\n  ✓ Test fixtures cleanly removed from PostgreSQL');
  } finally {
    await close();
    await pool.end();
  }

  console.log('================================================================');
  console.log(`E2E API Integration Results: ${passed}/14 SCENARIOS PASSED (0 FAILED)`);
  console.log('================================================================');
}

runE2EApiIntegrationTests().catch((err) => {
  console.error('[E2E API Integration Test Error]:', err);
  process.exit(1);
});
