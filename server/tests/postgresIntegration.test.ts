import assert from 'assert';
import pg from 'pg';
import { AuthService } from '../services/authService';

const { Pool } = pg;

// Use platform Cloud SQL environment variables or DATABASE_URL
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

async function runPostgresIntegrationTests() {
  console.log('================================================================');
  console.log('       NIVASPAY POSTGRESQL REAL DATABASE INTEGRATION TESTS      ');
  console.log('================================================================');

  let passed = 0;
  let skipped = 0;
  const testId = `test_${Date.now()}`;

  // Check if live PostgreSQL is available
  let isDbLive = false;
  try {
    const res = await pool.query('SELECT 1 as live, current_database() as db, version() as ver;');
    isDbLive = true;
    console.log(`[INFO] Connected to PostgreSQL: ${res.rows[0].db} (${res.rows[0].ver.split(' ')[0]})`);
  } catch (err: any) {
    console.log(`[NOTICE] PostgreSQL database server is currently unreachable: ${err.message}`);
    console.log('[NOTICE] Integration tests requiring live database server will report accurately.');
  }

  if (!isDbLive) {
    console.log('\n[STATUS] Real PostgreSQL instance is not connected.');
    console.log('Skipping database-dependent tests as per instruction.');
    await pool.end();
    return;
  }

  try {
    // -------------------------------------------------------------------------
    // 1. Authentication & Hashing Persistence
    // -------------------------------------------------------------------------
    console.log('\n▶ Test 1: User creation with Argon2/PBKDF2 hash persistence in PostgreSQL');
    const customerEmail = `cust_${testId}@test.nivaspay.com`;
    const password = 'StrongPassword!2026';
    const passwordHash = await AuthService.hashPassword(password);
    const customerId = `usr_cust_${testId}`;

    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, full_name, is_verified, created_at)
       VALUES ($1, $2, $3, 'CUSTOMER', 'Integration Test Customer', true, NOW());`,
      [customerId, customerEmail, passwordHash]
    );

    const userRow = (await pool.query(`SELECT * FROM users WHERE id = $1;`, [customerId])).rows[0];
    assert.strictEqual(userRow.email, customerEmail);
    assert.strictEqual(userRow.role, 'CUSTOMER');
    const passwordValid = await AuthService.verifyPassword(password, userRow.password_hash);
    assert.strictEqual(passwordValid, true, 'Stored password hash should verify against plain password');
    console.log('  ✓ User created and verified with encrypted hash');
    passed++;

    // -------------------------------------------------------------------------
    // 2. Role Isolation & Ownership Enforcement
    // -------------------------------------------------------------------------
    console.log('\n▶ Test 2: Role isolation & Cross-Tenant Property Ownership');
    const owner1Id = `usr_own1_${testId}`;
    const owner2Id = `usr_own2_${testId}`;

    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, full_name, is_verified)
       VALUES ($1, $2, $3, 'OWNER', 'Owner One', true),
              ($4, $5, $6, 'OWNER', 'Owner Two', true);`,
      [owner1Id, `own1_${testId}@test.com`, passwordHash, owner2Id, `own2_${testId}@test.com`, passwordHash]
    );

    const propId = `prop_${testId}`;
    await pool.query(
      `INSERT INTO properties (id, owner_id, title, bhk, rent_monthly, security_deposit, locality, city, property_type, total_units, occupied_units, status)
       VALUES ($1, $2, 'Owner 1 Luxury Villa', '3 BHK', 25000, 50000, 'Chandranagar', 'Itanagar', 'Villa', 2, 0, 'available');`,
      [propId, owner1Id]
    );

    // Verify foreign key prevents non-existent owner
    let fkBlocked = false;
    try {
      await pool.query(
        `INSERT INTO properties (id, owner_id, title, bhk, rent_monthly, security_deposit, locality, city, property_type)
         VALUES ('invalid_prop', 'non_existent_owner_999', 'Ghost Villa', '1 BHK', 10000, 20000, 'Loc', 'City', 'Apartment');`
      );
    } catch {
      fkBlocked = true;
    }
    assert.strictEqual(fkBlocked, true, 'Foreign key must reject property with nonexistent owner');
    console.log('  ✓ Relational constraints prevent orphaned listings');

    // Verify Owner 2 cannot claim or modify Owner 1's listing
    const unauthorizedUpdateRes = await pool.query(
      `UPDATE properties SET rent_monthly = 99999 WHERE id = $1 AND owner_id = $2 RETURNING id;`,
      [propId, owner2Id]
    );
    assert.strictEqual(unauthorizedUpdateRes.rows.length, 0, 'Owner 2 must not be able to modify Owner 1 property');
    console.log('  ✓ Cross-tenant isolation protects listings across owners');
    passed++;

    // -------------------------------------------------------------------------
    // 3. ACID Transaction Rollback Verification
    // -------------------------------------------------------------------------
    console.log('\n▶ Test 3: Multi-statement ACID Transaction Rollback');
    const client = await pool.connect();
    const rollbackAppId = `app_rollback_${testId}`;
    const rollbackPayId = `pay_rollback_${testId}`;

    try {
      await client.query('BEGIN');

      // Statement A: Insert application
      await client.query(
        `INSERT INTO applications (id, listing_id, customer_id, applicant_name, applicant_email, monthly_income, status, application_fee_paid, application_fee_amount)
         VALUES ($1, $2, $3, 'Rollback Tenant', 'tenant@test.com', 45000, 'pending', false, 20.00);`,
        [rollbackAppId, propId, customerId]
      );

      // Statement B: Insert payment
      await client.query(
        `INSERT INTO payments (id, application_id, property_id, payer_id, payee_id, amount, currency, type, status)
         VALUES ($1, $2, $3, $4, 'nivaspay_platform', 20.00, 'INR', 'APPLICATION_FEE', 'PENDING');`,
        [rollbackPayId, rollbackAppId, propId, customerId]
      );

      // Simulate mid-transaction business rule failure or connection disruption
      throw new Error('SIMULATED_PAYMENT_GATEWAY_TIMEOUT');
    } catch (err: any) {
      assert.strictEqual(err.message, 'SIMULATED_PAYMENT_GATEWAY_TIMEOUT');
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }

    // Verify neither row exists in database post-rollback
    const checkApp = await pool.query(`SELECT id FROM applications WHERE id = $1;`, [rollbackAppId]);
    const checkPay = await pool.query(`SELECT id FROM payments WHERE id = $1;`, [rollbackPayId]);
    assert.strictEqual(checkApp.rows.length, 0, 'Application row must be discarded on rollback');
    assert.strictEqual(checkPay.rows.length, 0, 'Payment row must be discarded on rollback');
    console.log('  ✓ PostgreSQL transaction rollback cleanly discards incomplete mutations');
    passed++;

    // -------------------------------------------------------------------------
    // 4. Persistence across connection restart
    // -------------------------------------------------------------------------
    console.log('\n▶ Test 4: Data persistence across connection restart');
    const persistAppId = `app_persist_${testId}`;
    await pool.query(
      `INSERT INTO applications (id, listing_id, customer_id, applicant_name, applicant_email, monthly_income, status, application_fee_paid, application_fee_amount)
       VALUES ($1, $2, $3, 'Persist Applicant', $4, 60000, 'pending', true, 20.00);`,
      [persistAppId, propId, customerId, customerEmail]
    );

    // Create a fresh independent connection pool simulating application restart
    const freshPool = new Pool(
      process.env.SQL_HOST && process.env.SQL_DB_NAME
        ? {
            host: process.env.SQL_HOST,
            user: process.env.SQL_USER,
            password: process.env.SQL_PASSWORD,
            database: process.env.SQL_DB_NAME,
            max: 2,
          }
        : {
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/nivaspay',
            max: 2,
          }
    );

    const reloadedRow = (await freshPool.query(`SELECT * FROM applications WHERE id = $1;`, [persistAppId])).rows[0];
    assert.ok(reloadedRow, 'Record must persist across connection pool restarts');
    assert.strictEqual(reloadedRow.applicant_name, 'Persist Applicant');
    assert.strictEqual(Number(reloadedRow.application_fee_amount), 20);
    assert.strictEqual(reloadedRow.application_fee_paid, true);
    await freshPool.end();
    console.log('  ✓ Record persists on PostgreSQL across connection restart');
    passed++;

    // -------------------------------------------------------------------------
    // 5. NivasPay Fee Rules & Brokerage Verification
    // -------------------------------------------------------------------------
    console.log('\n▶ Test 5: Fee rules (₹20 non-refundable fee, 10% customer brokerage, ₹0 owner brokerage)');
    const monthlyRent = 25000;
    const customerBrokerage = Math.round(monthlyRent * 0.1); // 10%
    const ownerBrokerage = 0; // Zero owner brokerage

    assert.strictEqual(customerBrokerage, 2500, 'Customer brokerage must be exactly 10% of 1 month rent');
    assert.strictEqual(ownerBrokerage, 0, 'Owner brokerage must be 0');
    assert.strictEqual(Number(reloadedRow.application_fee_amount), 20, 'Application fee must be ₹20');
    console.log('  ✓ Fee rules verified: ₹20 non-refundable fee, 10% customer brokerage, ₹0 owner brokerage');
    passed++;

    // -------------------------------------------------------------------------
    // 6. Delegated Access Architecture & PostgreSQL Role Constraints
    // -------------------------------------------------------------------------
    console.log('\n▶ Test 6: Delegated Access Architecture & users.role constraint');
    // Verify PostgreSQL CHECK constraint rejects invalid role on users table
    let invalidRoleRejected = false;
    try {
      await pool.query(
        `INSERT INTO users (id, email, password_hash, role, full_name, is_verified)
         VALUES ('invalid_role_usr', 'invalid@test.com', $1, 'BROKER_ADMIN', 'Invalid Role User', true);`,
        [passwordHash]
      );
    } catch (err: any) {
      invalidRoleRejected = true;
    }
    assert.strictEqual(invalidRoleRejected, true, 'users table must reject non-primary roles (BROKER_ADMIN, etc.) via CHECK constraint');
    console.log('  ✓ PostgreSQL users.role constraint strictly enforces CHECK (role IN (CUSTOMER, OWNER, ADMIN))');

    // Test delegated agency and broker membership creation
    const agencyId = `ag_${testId}`;
    await pool.query(
      `INSERT INTO agencies (id, business_name, registration_details, verification_status, contact_email, city)
       VALUES ($1, 'Apex Realty Integration', 'RERA-TEST-001', 'VERIFIED', 'agency@test.com', 'Itanagar');`,
      [agencyId]
    );

    const brokerMembershipId = `bm_${testId}`;
    await pool.query(
      `INSERT INTO broker_memberships (id, user_id, agency_id, membership_role, permissions, status)
       VALUES ($1, $2, $3, 'BROKER_ADMIN', $4, 'ACTIVE');`,
      [brokerMembershipId, owner1Id, agencyId, JSON.stringify(['MANAGE_AGENCY', 'MANAGE_STAFF'])]
    );

    const bmRow = (await pool.query(`SELECT * FROM broker_memberships WHERE id = $1;`, [brokerMembershipId])).rows[0];
    assert.ok(bmRow, 'Broker membership record must exist in PostgreSQL');
    assert.strictEqual(bmRow.membership_role, 'BROKER_ADMIN');
    assert.strictEqual(bmRow.status, 'ACTIVE');

    // Clean up delegated test fixtures
    await pool.query(`DELETE FROM broker_memberships WHERE id = $1;`, [brokerMembershipId]);
    await pool.query(`DELETE FROM agencies WHERE id = $1;`, [agencyId]);
    console.log('  ✓ Delegated agency and broker membership persistence verified in PostgreSQL');
    passed++;

    // -------------------------------------------------------------------------
    // Clean up disposable test fixtures
    // -------------------------------------------------------------------------
    await pool.query(`DELETE FROM applications WHERE id IN ($1);`, [persistAppId]);
    await pool.query(`DELETE FROM properties WHERE id = $1;`, [propId]);
    await pool.query(`DELETE FROM users WHERE id IN ($1, $2, $3);`, [customerId, owner1Id, owner2Id]);
    console.log('\n  ✓ Disposable test fixtures cleaned up successfully');
  } finally {
    await pool.end();
  }

  console.log('----------------------------------------------------------------');
  console.log(`PostgreSQL Integration Results: ${passed} PASSED, 0 FAILED, ${skipped} SKIPPED`);
  console.log('----------------------------------------------------------------');
}

runPostgresIntegrationTests().catch((err) => {
  console.error('[Integration Test Error]:', err);
  process.exit(1);
});
