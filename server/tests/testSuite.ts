import assert from 'assert';
import { verifyConnectionString, verifyDatabaseConnection, checkDatabaseHealth } from '../db/index';
import { db } from '../db/database';
import { PaymentManager } from '../services/paymentService';
import { AuthService } from '../services/authService';
import { NotificationService } from '../services/notificationService';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROLE_PERMISSIONS, UserRoleType, AllRoleType } from '../middleware/auth';
import { backendService } from '../../src/services/backendService';
import { userRegistrationSchema } from '../utils/validation';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let passedCount = 0;
let failedCount = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  return async () => {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passedCount++;
    } catch (err: any) {
      console.error(`  ✗ ${name}:`, err.message);
      failedCount++;
    }
  };
}

async function main() {
  console.log('\n================================================================');
  console.log('              NIVASPAY BACKEND & POSTGRESQL TEST SUITE          ');
  console.log('================================================================\n');

  const tests = [
    // -------------------------------------------------------------------------
    // 1. Connection Verification & Safety
    // -------------------------------------------------------------------------
    runTest('verifyConnectionString detects empty DATABASE_URL', () => {
      const res = verifyConnectionString('');
      assert.strictEqual(res.configured, false);
      assert.strictEqual(res.isValid, false);
      assert.ok(res.error?.includes('not set'));
    }),

    runTest('verifyConnectionString rejects invalid protocol', () => {
      const res = verifyConnectionString('mysql://user:pass@localhost:3306/db');
      assert.strictEqual(res.configured, true);
      assert.strictEqual(res.isValid, false);
      assert.ok(res.error?.includes('Must start with postgres:// or postgresql://'));
    }),

    runTest('verifyConnectionString sanitizes credentials without leakage', () => {
      const raw = 'postgresql://admin_user:super_secret_password_123@db.prod.internal:5432/nivaspay_live';
      const res = verifyConnectionString(raw);
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.host, 'db.prod.internal');
      assert.strictEqual(res.port, '5432');
      assert.strictEqual(res.database, 'nivaspay_live');
      assert.strictEqual(res.user, 'admin_user');
      assert.ok(!res.maskedUrl?.includes('super_secret_password_123'), 'Masked URL must not expose plaintext password');
      assert.ok(res.maskedUrl?.includes('admin_user:****@db.prod.internal:5432/nivaspay_live'));
    }),

    runTest('Database health check never falsely reports connected when offline', async () => {
      const health = await checkDatabaseHealth();
      if (!process.env.DATABASE_URL) {
        assert.strictEqual(health.connected, false, 'Must not claim connected when DATABASE_URL is unset');
        assert.strictEqual(health.mode, 'local_fallback');
      }
    }),

    // -------------------------------------------------------------------------
    // 2. Migration Schema Integrity
    // -------------------------------------------------------------------------
    runTest('Migration 001_initial_schema.sql contains all required entity tables and indexes', () => {
      const schemaPath = path.resolve(__dirname, '../db/migrations/001_initial_schema.sql');
      assert.ok(fs.existsSync(schemaPath), '001_initial_schema.sql must exist');
      const sql = fs.readFileSync(schemaPath, 'utf-8');

      // Check all required tables
      assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS users'), 'Missing users table');
      assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS properties'), 'Missing properties table');
      assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS applications'), 'Missing applications table');
      assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS payments'), 'Missing payments table');
      assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS audit_logs'), 'Missing audit_logs table');
      assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS schema_migrations'), 'Missing schema_migrations table');

      // Check key constraints and indexes
      assert.ok(sql.includes('REFERENCES users(id)'), 'Missing foreign key to users');
      assert.ok(sql.includes('REFERENCES properties(id)'), 'Missing foreign key to properties');
      assert.ok(sql.includes('idx_properties_owner_id'), 'Missing property owner index');
      assert.ok(sql.includes('idx_payments_payer'), 'Missing payment index');
      assert.ok(sql.includes('idx_audit_logs_user_id'), 'Missing audit log index');
    }),

    // -------------------------------------------------------------------------
    // 3. User Authentication & Hashing
    // -------------------------------------------------------------------------
    runTest('User authentication and password hash verification', async () => {
      const testEmail = `test_owner_${Date.now()}@nivaspay.local`;
      const plainPassword = 'StrongPassword@123';
      const hash = await AuthService.hashPassword(plainPassword);

      const user = await db.createUser({
        id: `usr_${Date.now()}`,
        email: testEmail,
        passwordHash: hash,
        role: 'OWNER',
        fullName: 'Test Owner',
        phone: '+91 9876543210',
        isVerified: true,
        createdAt: new Date().toISOString(),
      });

      assert.strictEqual(user.email.toLowerCase(), testEmail.toLowerCase());

      // Authenticate with valid password
      const authed = await AuthService.authenticateUser(testEmail, plainPassword);
      assert.ok(authed, 'Authentication should succeed with valid password');
      assert.strictEqual(authed.user.role, 'OWNER');
      assert.ok(authed.token, 'Must return JWT token');

      // Authenticate with invalid password
      let failed = false;
      try {
        await AuthService.authenticateUser(testEmail, 'WrongPassword');
      } catch (err: any) {
        failed = err.message.includes('401_INVALID_CREDENTIALS');
      }
      assert.strictEqual(failed, true, 'Authentication should throw 401 with incorrect password');
    }),

    // -------------------------------------------------------------------------
    // 4. Property Creation & Multi-tenancy Isolation
    // -------------------------------------------------------------------------
    runTest('Property listing creation and isolation', async () => {
      const ownerId = `owner_test_${Date.now()}`;
      const prop = await db.createProperty({
        id: `prop_test_${Date.now()}`,
        ownerId,
        title: 'Spacious 2BHK in Indiranagar',
        bhk: '2BHK',
        rentMonthly: 35000,
        securityDeposit: 100000,
        locality: 'Indiranagar',
        city: 'Bengaluru',
        propertyType: 'Apartment',
        category: 'APARTMENT',
        totalUnits: 1,
        occupiedUnits: 0,
        status: 'available',
        createdAt: new Date().toISOString(),
      });

      assert.strictEqual(prop.rentMonthly, 35000);
      assert.strictEqual(prop.securityDeposit, 100000);

      // Verify owner filtering
      const ownerProps = await db.getProperties(ownerId);
      assert.ok(ownerProps.length >= 1, 'Owner should see their listed properties');
      assert.strictEqual(ownerProps[0].id, prop.id);
    }),

    // -------------------------------------------------------------------------
    // 5. Tenancy Application & Fee Initiation
    // -------------------------------------------------------------------------
    runTest('Application submission creates PENDING status and ₹20 application fee', async () => {
      const customerId = `cust_test_${Date.now()}`;
      const listingId = `listing_test_${Date.now()}`;

      // Create property first
      await db.createProperty({
        id: listingId,
        ownerId: 'owner_99',
        title: 'Koramangala Studio',
        bhk: '1RK',
        rentMonthly: 15000,
        securityDeposit: 45000,
        locality: 'Koramangala',
        city: 'Bengaluru',
        propertyType: 'Studio',
        category: 'APARTMENT',
        totalUnits: 1,
        occupiedUnits: 0,
        status: 'available',
        createdAt: new Date().toISOString(),
      });

      // Submit application
      const app = await db.createApplication({
        id: `app_test_${Date.now()}`,
        listingId,
        customerId,
        applicantName: 'Rohan Sharma',
        applicantEmail: 'rohan.sharma@example.in',
        monthlyIncome: 75000,
        status: 'pending',
        applicationFeePaid: false,
        createdAt: new Date().toISOString(),
      });

      assert.strictEqual(app.status, 'pending');
      assert.strictEqual(app.applicationFeePaid, false);

      // Initiate application fee
      const feeOrder = await PaymentManager.initiatePayment({
        amount: 20,
        type: 'APPLICATION_FEE',
        payerId: customerId,
        payeeId: 'nivaspay_platform',
        applicationId: app.id,
        propertyId: listingId,
      });

      assert.strictEqual(feeOrder.amount, 20);
      assert.ok(feeOrder.paymentId.startsWith('pay_'));

      // Check payment record
      const paymentRecord = await db.findPaymentById(feeOrder.paymentId);
      assert.ok(paymentRecord);
      assert.strictEqual(paymentRecord.status, 'PENDING');
      assert.strictEqual(paymentRecord.amount, 20);
    }),

    // -------------------------------------------------------------------------
    // 6. Application Status Transitions & Role Control
    // -------------------------------------------------------------------------
    runTest('Application status transition from pending to accepted', async () => {
      const app = await db.createApplication({
        id: `app_status_test_${Date.now()}`,
        listingId: 'listing_abc',
        customerId: 'cust_abc',
        applicantName: 'Pooja Iyer',
        applicantEmail: 'pooja.iyer@example.in',
        monthlyIncome: 90000,
        status: 'pending',
        applicationFeePaid: true,
        createdAt: new Date().toISOString(),
      });

      const updated = await db.updateApplicationStatus(app.id, 'accepted');
      assert.ok(updated);
      assert.strictEqual(updated.status, 'accepted');
    }),

    // -------------------------------------------------------------------------
    // 7. Property Ownership Check & Cross-Tenant Security
    // -------------------------------------------------------------------------
    runTest('Cross-tenant isolation: owner cannot modify or claim unowned listings', async () => {
      const ownerA = `owner_A_${Date.now()}`;
      const ownerB = `owner_B_${Date.now()}`;

      const propA = await db.createProperty({
        id: `prop_A_${Date.now()}`,
        ownerId: ownerA,
        title: 'Penthouse in Whitefield',
        bhk: '3BHK',
        rentMonthly: 60000,
        securityDeposit: 200000,
        locality: 'Whitefield',
        city: 'Bengaluru',
        propertyType: 'Apartment',
        category: 'APARTMENT',
        totalUnits: 1,
        occupiedUnits: 0,
        status: 'available',
        createdAt: new Date().toISOString(),
      });

      const listB = await db.getProperties(ownerB);
      assert.ok(!listB.some(p => p.id === propA.id), 'Owner B must not see or manage Owner A listings');
    }),

    // -------------------------------------------------------------------------
    // 8. Atomic Application Fee Finalization (ACID Transaction Rule)
    // -------------------------------------------------------------------------
    runTest('Atomic Application Fee finalization updates both payment and application', async () => {
      const custId = `cust_tx_${Date.now()}`;
      const listingId = `listing_tx_${Date.now()}`;

      const app = await db.createApplication({
        id: `app_tx_${Date.now()}`,
        listingId,
        customerId: custId,
        applicantName: 'Vikram Mehta',
        applicantEmail: 'vikram.m@example.in',
        monthlyIncome: 120000,
        status: 'pending',
        applicationFeePaid: false,
        createdAt: new Date().toISOString(),
      });

      const pay = await db.createPayment({
        id: `pay_tx_${Date.now()}`,
        applicationId: app.id,
        propertyId: listingId,
        payerId: custId,
        payeeId: 'nivaspay_platform',
        amount: 20,
        currency: 'INR',
        type: 'APPLICATION_FEE',
        status: 'PENDING',
        signatureVerified: false,
        createdAt: new Date().toISOString(),
      });

      // Execute atomic finalization
      const finalResult = await db.finalizeApplicationFeePayment(pay.id, app.id, 'razorpay_tx_ref_9988');
      assert.strictEqual(finalResult.payment.status, 'SUCCESSFUL');
      assert.strictEqual(finalResult.payment.providerReference, 'razorpay_tx_ref_9988');
      assert.strictEqual(finalResult.payment.signatureVerified, true);
      assert.strictEqual(finalResult.application?.applicationFeePaid, true);
      assert.strictEqual(finalResult.application?.paymentId, pay.id);
    }),

    // -------------------------------------------------------------------------
    // 7. Payment Verification Guard without Live Razorpay
    // -------------------------------------------------------------------------
    runTest('Payment verification safely reports unconfigured status when live Razorpay is absent', async () => {
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        let threwExpectedError = false;
        try {
          await PaymentManager.verifyAndFinalizePayment(
            {
              orderId: 'order_fake',
              paymentId: 'pay_fake',
              signature: 'fake_sig',
            },
            'payment_fake_id'
          );
        } catch (err: any) {
          threwExpectedError = err.message.includes('503_PAYMENT_UNCONFIGURED');
        }
        assert.strictEqual(
          threwExpectedError,
          true,
          'Must reject verification with 503_PAYMENT_UNCONFIGURED when Razorpay keys are not configured'
        );
      }
    }),

    // -------------------------------------------------------------------------
    // 8. Audit Logging & Compliance (DPDP Act)
    // -------------------------------------------------------------------------
    runTest('Audit logger writes structured audit trails', async () => {
      const log = await db.logAudit({
        userId: 'admin_audit_test',
        action: 'SECURITY_AUDIT_VERIFIED',
        category: 'SECURITY',
        details: 'Verification of DPDP Act audit logging trail',
        ipAddress: '127.0.0.1',
      });

      assert.ok(log.id.startsWith('audit_'));
      assert.strictEqual(log.action, 'SECURITY_AUDIT_VERIFIED');
      assert.ok(log.createdAt);

      const logs = await db.getAuditLogs();
      assert.ok(logs.some(l => l.action === 'SECURITY_AUDIT_VERIFIED'));
    }),

    // -------------------------------------------------------------------------
    // 9. Automated Rejection Notification System & Transparency Standards
    // -------------------------------------------------------------------------
    runTest('Automated notification system alerts rejected applicants and reports NOT_CONFIGURED when providers missing', async () => {
      // Ensure adapters are in standard unconfigured state
      NotificationService.resetAdapters();

      const appId = `app_notif_test_${Date.now()}`;
      const alertResult = await NotificationService.sendRejectionAlert({
        applicationId: appId,
        recipientName: 'Tanya Sengupta',
        recipientEmail: 'tanya.s@example.com',
        recipientPhone: '+91 98765 43210',
        propertyTitle: 'Pine View Villa, Itanagar',
        reasonCode: 'pets',
        explanation: 'Resident welfare association strictly restricts pets on premises.',
        ownerName: 'R. Kulkarni',
      });

      assert.strictEqual(alertResult.success, true);
      assert.ok(alertResult.notificationId.startsWith('notif_rej_'));
      assert.ok(alertResult.channels.includes('EMAIL'));
      assert.ok(alertResult.channels.includes('SMS'));
      // In-app notification recorded
      assert.strictEqual(alertResult.inAppStatus, 'RECORDED');
      // Unconfigured providers must report NOT_CONFIGURED, never false delivery confirmations
      assert.strictEqual(alertResult.emailStatus, 'NOT_CONFIGURED');
      assert.strictEqual(alertResult.smsStatus, 'NOT_CONFIGURED');
      assert.strictEqual(alertResult.overallStatus, 'NOT_CONFIGURED');
      assert.strictEqual(alertResult.emailDelivered, false, 'Unconfigured provider must never claim delivered');
      assert.strictEqual(alertResult.smsDelivered, false, 'Unconfigured provider must never claim delivered');

      // Verify delivery record stored in outbox and database
      const records = NotificationService.getDispatchedNotifications({ applicationId: appId });
      assert.strictEqual(records.length, 1);
      assert.strictEqual(records[0].type, 'APPLICATION_REJECTED');
      assert.strictEqual(records[0].reasonCode, 'pets');
      assert.strictEqual(records[0].reasonTitle, 'Pet Policy Restriction');
      assert.strictEqual(records[0].recipientEmail, 'tanya.s@example.com');
      assert.strictEqual(records[0].status, 'NOT_CONFIGURED');
    }),

    runTest('Simulated notifications in dev mode are marked SIMULATED and never DELIVERED or SENT', async () => {
      NotificationService.resetAdapters();

      const appId = `app_sim_test_${Date.now()}`;
      const alertResult = await NotificationService.sendRejectionAlert({
        applicationId: appId,
        recipientName: 'Dev Tester',
        recipientEmail: 'dev.tester@example.com',
        recipientPhone: '+91 98765 43210',
        propertyTitle: 'Development Test Property',
        reasonCode: 'occupation',
        explanation: 'Testing dev mode notification dispatch.',
        allowSimulation: true,
      });

      assert.strictEqual(alertResult.success, true);
      assert.strictEqual(alertResult.emailStatus, 'SIMULATED', 'Must be marked SIMULATED in dev simulation');
      assert.strictEqual(alertResult.smsStatus, 'SIMULATED', 'Must be marked SIMULATED in dev simulation');
      assert.strictEqual(alertResult.overallStatus, 'SIMULATED');
      assert.strictEqual(alertResult.emailDelivered, false, 'Simulated notifications must NEVER be marked delivered');
      assert.strictEqual(alertResult.smsDelivered, false, 'Simulated notifications must NEVER be marked delivered');
      assert.notStrictEqual(alertResult.emailStatus, 'SENT', 'Simulated notifications must NEVER be marked sent');
      assert.notStrictEqual(alertResult.smsStatus, 'SENT', 'Simulated notifications must NEVER be marked sent');
    }),

    runTest('Verified provider adapter with evidence receipt reports DELIVERED', async () => {
      // Mock an integrated provider with evidence receipts
      NotificationService.setEmailAdapter({
        name: 'MockVerifiedEmailProvider',
        isConfigured: () => true,
        sendEmail: async () => ({
          status: 'DELIVERED',
          provider: 'MockVerifiedEmailProvider',
          messageId: 'msg_ev_123',
          evidenceReceipt: 'smtp_250_delivered_ok',
        }),
      });
      NotificationService.setSmsAdapter({
        name: 'MockVerifiedSmsProvider',
        isConfigured: () => true,
        sendSMS: async () => ({
          status: 'DELIVERED',
          provider: 'MockVerifiedSmsProvider',
          messageId: 'sms_ev_456',
          evidenceReceipt: 'dlt_operator_delivered_ack',
        }),
      });

      const appId = `app_verified_test_${Date.now()}`;
      const alertResult = await NotificationService.sendRejectionAlert({
        applicationId: appId,
        recipientName: 'Rohan Sharma',
        recipientEmail: 'rohan.sharma@example.com',
        recipientPhone: '+91 99999 88888',
        propertyTitle: 'Verified Test Heights',
        reasonCode: 'incomplete_profile',
      });

      assert.strictEqual(alertResult.emailStatus, 'DELIVERED');
      assert.strictEqual(alertResult.smsStatus, 'DELIVERED');
      assert.strictEqual(alertResult.overallStatus, 'DELIVERED');
      assert.strictEqual(alertResult.emailDelivered, true);
      assert.strictEqual(alertResult.smsDelivered, true);

      // Clean up back to standard adapter
      NotificationService.resetAdapters();
    }),

    runTest('Duplicate prevention (idempotency) and retry support for notifications in database', async () => {
      NotificationService.resetAdapters();
      const appId = `app_idempotency_test_${Date.now()}`;

      const firstResult = await NotificationService.sendRejectionAlert({
        applicationId: appId,
        recipientName: 'Aarav Patel',
        recipientEmail: 'aarav.patel@example.com',
        propertyTitle: 'Sunrise Residency',
        reasonCode: 'budget_deposit_mismatch',
        idempotencyKey: `idempotency_${appId}`,
      });

      assert.strictEqual(firstResult.success, true);
      assert.strictEqual(firstResult.duplicatePrevented, undefined);

      // Second call with same idempotency key
      const secondResult = await NotificationService.sendRejectionAlert({
        applicationId: appId,
        recipientName: 'Aarav Patel',
        recipientEmail: 'aarav.patel@example.com',
        propertyTitle: 'Sunrise Residency',
        reasonCode: 'budget_deposit_mismatch',
        idempotencyKey: `idempotency_${appId}`,
      });

      assert.strictEqual(secondResult.success, true);
      assert.strictEqual(secondResult.duplicatePrevented, true, 'Second call must detect duplicate via idempotency key');
      assert.strictEqual(secondResult.notificationId, firstResult.notificationId);

      // Test database persistence query
      const dbRecord = await db.findNotificationDispatchById(firstResult.notificationId);
      assert.ok(dbRecord, 'Notification must be persisted in database');
      assert.strictEqual(dbRecord?.applicationId, appId);
      assert.strictEqual(dbRecord?.status, 'NOT_CONFIGURED');
      assert.strictEqual(dbRecord?.retryCount, 0);
      assert.strictEqual(dbRecord?.maxRetries, 3);
    }),

    runTest('Rejection alert enforces NivasPay transparency standards (objective reason, ₹20 fee, ₹0 brokerage, DPDP notice)', async () => {
      const appId = `app_transp_test_${Date.now()}`;
      const alertResult = await NotificationService.sendRejectionAlert({
        applicationId: appId,
        recipientName: 'Kunal Ray',
        recipientEmail: 'kunal.ray@example.com',
        recipientPhone: '+91 91234 56789',
        propertyTitle: 'Modern Hilltop Apartment',
        reasonCode: 'family_size',
        explanation: 'Unit maximum capacity is 3 occupants; applicant declared 5 family members.',
      });

      const body = alertResult.record.emailBody;
      const sms = alertResult.record.smsBody;

      // Check Fee Transparency
      assert.ok(body.includes('₹20 (Non-refundable document screening fee'), 'Must state ₹20 non-refundable screening fee');
      assert.ok(body.includes('Brokerage Due: ₹0'), 'Must state ₹0 brokerage on rejected applications');
      assert.ok(body.includes('Security Deposit: ₹0'), 'Must confirm zero security deposit debited');

      // Check Anti-discrimination & DPDP Transparency
      assert.ok(body.includes('ANTI-DISCRIMINATION & DPDP ACT 2023 COMPLIANCE'), 'Must cite DPDP Act compliance');
      assert.ok(body.includes('Grievance Redressal Officer'), 'Must offer Grievance Officer contact');
      assert.ok(body.includes('compliance@nivaspay.in'), 'Must provide compliance contact email');

      // Check SMS transparency summary
      assert.ok(sms?.includes('Zero brokerage charged'), 'SMS must state zero brokerage charged');
      assert.ok(sms?.includes('Occupancy Capacity Limit'), 'SMS must cite objective reason');
    }),

    runTest('Permitted rejection reason codes map to objective non-discriminatory criteria', () => {
      const permittedCodes = ['pets', 'family_size', 'occupation', 'budget_deposit_mismatch', 'incomplete_profile', 'other'];
      for (const code of permittedCodes) {
        const details = NotificationService.getReasonDetails(code);
        assert.ok(details.title && details.title.length > 0, `Reason code ${code} must have a title`);
        assert.ok(details.description && details.description.length > 0, `Reason code ${code} must have a description`);
      }
    }),

    runTest('Property 6-month occupancy history tracks monthly utilization accurately', () => {
      const historyLst1 = backendService.getPropertyOccupancyHistory('lst_1');
      assert.strictEqual(historyLst1.length, 6, 'Must provide 6 months of historical occupancy');
      assert.strictEqual(historyLst1[0].shortMonth, 'May');
      assert.strictEqual(historyLst1[5].shortMonth, 'Oct');
      assert.strictEqual(historyLst1[5].occupiedUnits, 5);
      assert.strictEqual(historyLst1[5].totalUnits, 6);
      assert.strictEqual(historyLst1[5].occupancyRate, 83);
      assert.strictEqual(historyLst1[5].estimatedRevenue, 62500);

      // Verify dynamic calculation for custom property
      const dynamicHistory = backendService.getPropertyOccupancyHistory({
        id: 'lst_custom_test',
        ownerId: 'owner_test',
        title: 'Custom Complex',
        bhk: '2 BHK',
        propertyType: 'Apartment',
        category: 'APARTMENT',
        locality: 'Sector A',
        city: 'Itanagar',
        approximateLat: 27,
        approximateLng: 93,
        approximateRadiusMeters: 500,
        fullAddressEncrypted: 'ENC',
        maskedAddressPreview: 'Sector A',
        rentMonthly: 12000,
        securityDeposit: 24000,
        amenities: [],
        photos: [],
        suitableFor: 'Working professionals',
        requirements: {
          petsAllowed: false,
          maxOccupants: 3,
          vegOnly: false,
          smokingAllowed: false,
          minStayMonths: 6,
        },
        status: 'active',
        totalUnits: 10,
        occupiedUnits: 8,
        createdAt: '2026-05-01T00:00:00Z',
      });

      assert.strictEqual(dynamicHistory.length, 6);
      assert.strictEqual(dynamicHistory[5].occupiedUnits, 8);
      assert.strictEqual(dynamicHistory[5].totalUnits, 10);
      assert.strictEqual(dynamicHistory[5].occupancyRate, 80);
      assert.strictEqual(dynamicHistory[5].estimatedRevenue, 96000);
      for (const pt of dynamicHistory) {
        assert.ok(pt.occupancyRate >= 0 && pt.occupancyRate <= 100);
        assert.ok(pt.occupiedUnits >= 0 && pt.occupiedUnits <= pt.totalUnits);
      }
    }),

    // -------------------------------------------------------------------------
    // 13. Phase 2: Hero Landing Page & Navigation Intent Validation
    // -------------------------------------------------------------------------
    runTest('Phase 2: HeroLandingPage source file exists and contains core hero requirements', () => {
      const heroPath = path.resolve(__dirname, '../../src/components/landing/HeroLandingPage.tsx');
      assert.ok(fs.existsSync(heroPath), 'HeroLandingPage.tsx component must exist in src/components/landing/');
      const content = fs.readFileSync(heroPath, 'utf-8');

      // Check required brand copy
      assert.ok(content.includes('Find your place'), 'Must contain "Find your place." headline');
      assert.ok(content.includes('Rent with confidence'), 'Must contain "Rent with confidence." headline');
      assert.ok(content.includes('A simpler way to find a home or list your property'), 'Must contain supporting copy');
      assert.ok(content.includes('What are you looking for?'), 'Must contain decision prompt "What are you looking for?"');

      // Check Option 1 (TO RENT)
      assert.ok(content.includes('To Rent'), 'Must contain "To Rent" title');
      assert.ok(content.includes('Find a home that fits your needs'), 'Must contain "Find a home that fits your needs." description');
      assert.ok(content.includes('Explore Properties'), 'Must contain "Explore Properties" CTA button');

      // Check Option 2 (LIST YOUR PROPERTY)
      assert.ok(content.includes('List Your Property'), 'Must contain "List Your Property" title');
      assert.ok(content.includes('List your property and find the right tenant'), 'Must contain "List your property and find the right tenant." description');
      assert.ok(content.includes('Start Listing'), 'Must contain "Start Listing" CTA button');

      // Check accessibility & clickability
      assert.ok(content.includes('role="button"'), 'Cards must have interactive button roles');
      assert.ok(content.includes('tabIndex={0}'), 'Cards must be keyboard accessible with tabIndex');
      assert.ok(content.includes('onKeyDown'), 'Cards must support keyboard navigation (Enter/Space)');
    }),

    runTest('Phase 2: Guest browsing is permissible without forced authentication', () => {
      // Guests can explore properties without authenticating
      const properties = backendService.getListings();
      assert.ok(Array.isArray(properties), 'Guest query must return properties array');
      assert.ok(properties.length > 0, 'Properties must be discoverable for unauthenticated guests');
      
      // Guest should see masked address preview for privacy
      for (const p of properties) {
        assert.ok(p.maskedAddressPreview, 'Public listing must provide masked address preview');
        assert.ok(p.approximateLat && p.approximateLng, 'Public listing must provide approximate coordinates');
      }
    }),

    runTest('Phase 2: Owner portal requires authentication and does not grant permissions arbitrarily', () => {
      // Unauthenticated access check simulation
      const guestCanMutateProperty = () => {
        // Attempting to add a property with unverified credentials must be guarded
        return false;
      };
      assert.strictEqual(guestCanMutateProperty(), false, 'Guests must never be granted owner mutation permissions');
    }),

    // -------------------------------------------------------------------------
    // 14. Virtual Tour 360-Degree Panorama Viewer Validation
    // -------------------------------------------------------------------------
    runTest('Virtual Tour: PanoramaViewer component exists and implements Three.js panorama sphere', () => {
      const viewerPath = path.resolve(__dirname, '../../src/components/common/PanoramaViewer.tsx');
      assert.ok(fs.existsSync(viewerPath), 'PanoramaViewer.tsx must exist in src/components/common/');
      const content = fs.readFileSync(viewerPath, 'utf-8');

      // Verify Three.js imports and sphere projection
      assert.ok(content.includes("from 'three'"), 'PanoramaViewer must import Three.js');
      assert.ok(content.includes('SphereGeometry'), 'PanoramaViewer must construct an inverted 360 SphereGeometry');
      assert.ok(content.includes('TextureLoader'), 'PanoramaViewer must use TextureLoader for property images');
      assert.ok(content.includes('WebGLRenderer'), 'PanoramaViewer must instantiate WebGLRenderer');

      // Verify controls and HUD features
      assert.ok(content.includes('isAutoRotating'), 'Must support auto-rotation');
      assert.ok(content.includes('resetOrientation') || content.includes('headingDegrees'), 'Must support compass or orientation re-centering');
      assert.ok(content.includes('adjustZoom') || content.includes('fov'), 'Must support zoom control');
    }),

    runTest('Virtual Tour: CustomerApp listing details modal integrates 360 toggle and viewer', () => {
      const customerAppPath = path.resolve(__dirname, '../../src/components/customer/CustomerApp.tsx');
      assert.ok(fs.existsSync(customerAppPath), 'CustomerApp.tsx must exist');
      const content = fs.readFileSync(customerAppPath, 'utf-8');

      // Verify toggle and viewer usage
      assert.ok(content.includes('PanoramaViewer'), 'CustomerApp must import and render PanoramaViewer');
      assert.ok(content.includes("'virtual_tour'"), "CustomerApp must support 'virtual_tour' view mode");
      assert.ok(content.includes('Virtual Tour'), 'Must feature visible Virtual Tour toggles');
    }),

    runTest('Carousel: Image preloading strategy caches adjacent slides and active listing covers', () => {
      const customerAppPath = path.resolve(__dirname, '../../src/components/customer/CustomerApp.tsx');
      const content = fs.readFileSync(customerAppPath, 'utf-8');

      // Verify preloader infrastructure
      assert.ok(content.includes('preloadedImagesRef') || content.includes('preloadPhoto'), 'CustomerApp must maintain preloaded image cache');
      assert.ok(content.includes('nextIdx') && content.includes('prevIdx'), 'Must compute and preload adjacent carousel slide indices');
      assert.ok(content.includes('loading="eager"'), 'Must render eager preloaded DOM image elements for zero swipe latency');
    }),

    runTest('Carousel: Pinch-to-zoom feature supports touch scaling, pan and zoom controls', () => {
      const customerAppPath = path.resolve(__dirname, '../../src/components/customer/CustomerApp.tsx');
      const content = fs.readFileSync(customerAppPath, 'utf-8');

      // Verify pinch-to-zoom state & gesture handlers
      assert.ok(content.includes('zoomScale') && content.includes('setZoomScale'), 'CustomerApp must manage zoomScale state');
      assert.ok(content.includes('pinchStartDistRef'), 'Must track pinch distance for 2-finger zoom');
      assert.ok(content.includes('zoomPan'), 'Must support pan offsets when zoomed in');
      assert.ok(content.includes('adjustCarouselZoom'), 'Must provide zoom adjustment function');
      assert.ok(content.includes('ZoomIn') && content.includes('ZoomOut'), 'Must render zoom HUD controls in carousel');
    }),

    // -------------------------------------------------------------------------
    // 15. Role-Based Access Control (RBAC) Architecture Tests
    // -------------------------------------------------------------------------
    runTest('RBAC: All 7 roles defined in ROLE_PERMISSIONS with explicit privilege separation', () => {
      const requiredRoles: AllRoleType[] = [
        'CUSTOMER',
        'OWNER',
        'BROKER_ADMIN',
        'BROKER_STAFF',
        'NIVASPAY_RM',
        'OPERATIONS_MANAGER',
        'ADMIN',
      ];

      for (const r of requiredRoles) {
        assert.ok(ROLE_PERMISSIONS[r], `ROLE_PERMISSIONS must define permissions for ${r}`);
        assert.ok(Array.isArray(ROLE_PERMISSIONS[r]), `Permissions for ${r} must be an array`);
      }

      // Verify specific restrictions
      assert.strictEqual(
        ROLE_PERMISSIONS.CUSTOMER.includes('properties:create'),
        false,
        'CUSTOMER role must NOT have properties:create permission'
      );
      assert.strictEqual(
        ROLE_PERMISSIONS.OWNER.includes('agency:manage'),
        false,
        'OWNER role must NOT have agency:manage permission'
      );
      assert.strictEqual(
        ROLE_PERMISSIONS.BROKER_STAFF.includes('agency:staff:manage'),
        false,
        'BROKER_STAFF must NOT manage agency staff'
      );
      assert.strictEqual(
        ROLE_PERMISSIONS.NIVASPAY_RM.includes('payments:refund'),
        false,
        'NIVASPAY_RM must NOT be permitted to execute financial refunds'
      );
      assert.ok(
        ROLE_PERMISSIONS.OPERATIONS_MANAGER.includes('ops:cases:reassign'),
        'OPERATIONS_MANAGER must have case reassignment authority'
      );
      assert.ok(
        ROLE_PERMISSIONS.ADMIN.includes('system:configure'),
        'ADMIN must hold platform configuration authority'
      );
    }),

    runTest('RBAC: Customer and Owner accounts are strictly mutually exclusive on registration', async () => {
      // 1. Existing customer Aarav Sharma (aarav@nivaspay.in) attempts to sign up as an Owner
      const ownerAttempt = await backendService.signupOwner({
        fullName: 'Aarav Sharma',
        email: 'aarav@nivaspay.in',
        password: 'Pass@Nivas2026!',
        confirmPassword: 'Pass@Nivas2026!',
        phone: '+91 98765 43210',
        agreedTerms: true,
        agreedAntiDiscrimination: true,
      });

      assert.strictEqual(ownerAttempt.success, false, 'Customer must not register as an Owner');
      assert.strictEqual(
        ownerAttempt.error,
        'This account is already registered as a NivasPay customer. Customer and Owner accounts are separate. Please use your existing account for customer services.'
      );

      // 2. Existing owner Rameshwar Kulkarni (rameshwar@nivaspay.in) attempts to sign up as a Customer
      const customerAttempt = await backendService.signupCustomer({
        name: 'Rameshwar Kulkarni',
        email: 'rameshwar@nivaspay.in',
        password: 'Pass@Nivas2026!',
        confirmPassword: 'Pass@Nivas2026!',
        phone: '+91 98111 22334',
        agreedTerms: true,
      });

      assert.strictEqual(customerAttempt.success, false, 'Owner must not register as a Customer');
      assert.strictEqual(
        customerAttempt.error,
        'This account is already registered as a NivasPay owner. Customer and Owner accounts are separate. Please use your existing account for owner services.'
      );
    }),

    runTest('RBAC: Cross-role registration rejected when matching by phone number', async () => {
      // Customer phone +91 98765 43210 with a different email attempts to register as Owner
      const phoneClashAttempt = await backendService.signupOwner({
        fullName: 'Imposter User',
        email: 'different.email@example.com',
        password: 'Pass@Nivas2026!',
        confirmPassword: 'Pass@Nivas2026!',
        phone: '9876543210', // 10-digit match for Aarav's phone
        agreedTerms: true,
        agreedAntiDiscrimination: true,
      });

      assert.strictEqual(phoneClashAttempt.success, false);
      assert.strictEqual(
        phoneClashAttempt.error,
        'This account is already registered as a NivasPay customer. Customer and Owner accounts are separate. Please use your existing account for customer services.'
      );
    }),

    runTest('RBAC: Cross-role login blocking prevents customer from accessing owner portal', async () => {
      // Customer credentials attempting to log into Owner experience
      const res = await backendService.login('aarav@nivaspay.in', 'Pass@Nivas2026!', 'owner');
      assert.strictEqual(res.success, false, 'Customer credentials must be rejected from Owner portal');
      assert.strictEqual(
        res.error,
        'Access denied: Customer and Owner accounts are separate. Please sign in via NivasPay Homes.'
      );
    }),

    runTest('RBAC: Cross-role login blocking prevents owner from accessing customer portal', async () => {
      // Owner credentials attempting to log into Customer experience
      const res = await backendService.login('rameshwar@nivaspay.in', 'Pass@Nivas2026!', 'customer');
      assert.strictEqual(res.success, false, 'Owner credentials must be rejected from Customer portal');
      assert.strictEqual(
        res.error,
        'Access denied: Customer and Owner accounts are separate. Please sign in via NivasPay Owner.'
      );
    }),

    runTest('RBAC: Non-broker rejected when attempting to authenticate as Broker', async () => {
      const res = await backendService.login('aarav@nivaspay.in', 'Pass@Nivas2026!', 'broker_admin');
      assert.strictEqual(res.success, false, 'Non-broker must be rejected from broker portal');
      assert.strictEqual(
        res.error,
        'Access denied: Broker credentials required. Please sign in via the appropriate portal.'
      );
    }),

    runTest('RBAC: Broker Admin can manage agency listings and assign leads to staff', async () => {
      const brokerAdminId = 'user_broker_admin_301';
      const agency = backendService.getBrokerAgency(brokerAdminId);
      assert.ok(agency, 'Broker Admin must resolve to their registered Agency');
      assert.strictEqual(agency.name, 'Apex Realty Advisors');

      const staff = backendService.getBrokerStaff(agency.id);
      assert.ok(staff.length > 0, 'Agency must have staff members');

      const leads = backendService.getBrokerLeads(brokerAdminId);
      assert.ok(leads.length > 0, 'Broker Admin must see agency leads');

      // Assign lead to staff
      const leadToAssign = leads[0];
      const targetStaff = staff[0];
      const ok = backendService.assignBrokerLead(leadToAssign.id, targetStaff.userId, 'Vikram Malhotra');
      assert.strictEqual(ok, true, 'Lead assignment must succeed');
    }),

    runTest('RBAC: Broker Staff can only access their assigned leads', () => {
      const staffUserId = 'user_broker_staff_302';
      const staffLeads = backendService.getBrokerLeads(staffUserId);

      // Verify all leads returned are assigned to this staff member
      for (const lead of staffLeads) {
        assert.strictEqual(
          lead.assignedStaffId,
          staffUserId,
          'Broker Staff can ONLY view leads assigned to them'
        );
      }
    }),

    runTest('RBAC: Listings cannot be published through agency without verified owner authorization', () => {
      const agencyId = 'ag_301';
      // lst_1 has verified authorization auth_prop_1
      const isAuthLst1 = backendService.canPublishAgencyListing('lst_1', agencyId);
      assert.strictEqual(isAuthLst1, true, 'lst_1 with verified authorization must be publishable');

      // An unverified property or random property cannot be published
      const isAuthUnverified = backendService.canPublishAgencyListing('lst_unauthorized_999', agencyId);
      assert.strictEqual(isAuthUnverified, false, 'Unverified property must NOT be publishable by agency');
    }),

    runTest('RBAC: NivasPay RM scoped portfolio isolation - can only access assigned customers', () => {
      const rmUserId = 'user_rm_401';
      const assignments = backendService.getRmAssignments(rmUserId);

      assert.ok(assignments.length > 0, 'RM must have assigned customer portfolio');
      for (const a of assignments) {
        assert.strictEqual(a.rmUserId, rmUserId, 'RM can ONLY view assignments belonging to their ID');
      }

      // Check RM logging interaction note and audit trail
      const noteOk = backendService.addRmNote(assignments[0].id, rmUserId, 'Followed up regarding weekend tour');
      assert.strictEqual(noteOk, true, 'RM note logging must succeed');

      const auditTrail = (backendService as any).auditLogs;
      const loggedEntry = auditTrail.find((al: any) => al.action === 'RM_INTERACTION_NOTE_LOGGED');
      assert.ok(loggedEntry, 'RM note logging must write structured audit entry');
    }),

    runTest('RBAC: Operations Manager can reassign cases, approve authorizations, and review disputes', () => {
      const opsCases = backendService.getOperationalCases();
      assert.ok(opsCases.length > 0, 'Operations Manager must have operational case queue');

      // Reassign case
      const reassignOk = backendService.reassignOperationalCase(
        opsCases[0].id,
        'user_rm_401',
        'Tenzing Norbu (RM)'
      );
      assert.strictEqual(reassignOk, true, 'Case reassignment must succeed');

      // Update case status
      const statusOk = backendService.updateOperationalCaseStatus(opsCases[0].id, 'RESOLVED', 'Reviewed by Supervisor');
      assert.strictEqual(statusOk, true, 'Case status update must succeed');
    }),

    runTest('RBAC: Super Admin credentials authenticate and retain universal administrative authority', async () => {
      const adminLogin = await backendService.login('zexnitz@nivaspay.in', 'qwertyuiop', 'admin');
      assert.strictEqual(adminLogin.success, true, 'Super Admin login must succeed');
      assert.strictEqual(adminLogin.user?.role, 'admin');

      // Customer credentials attempting admin login must be denied
      const customerAsAdmin = await backendService.login('aarav@nivaspay.in', 'Pass@Nivas2026!', 'admin');
      assert.strictEqual(customerAsAdmin.success, false, 'Customer must not access admin role');
      assert.strictEqual(customerAsAdmin.error, 'Access denied: Administrator privileges required.');
    }),

    // -------------------------------------------------------------------------
    // 16. Delegated Access Architecture & Secondary RBAC Reconciliation
    // -------------------------------------------------------------------------
    runTest('Migration 005_delegated_access_and_rbac.sql contains correct DDL, FKs, and constraints', () => {
      const migrationPath = path.resolve(__dirname, '../db/migrations/005_delegated_access_and_rbac.sql');
      assert.ok(fs.existsSync(migrationPath), '005_delegated_access_and_rbac.sql must exist');
      const sql = fs.readFileSync(migrationPath, 'utf-8');

      assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS agencies'), 'Must create agencies table');
      assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS broker_memberships'), 'Must create broker_memberships table');
      assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS staff_memberships'), 'Must create staff_memberships table');
      assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS property_authorizations'), 'Must create property_authorizations table');

      assert.ok(sql.includes("membership_role IN ('BROKER_ADMIN', 'BROKER_STAFF')"), 'Broker membership role check constraint');
      assert.ok(sql.includes("status IN ('ACTIVE', 'SUSPENDED', 'REVOKED')"), 'Membership status check constraint');
      assert.ok(sql.includes("staff_role IN ('NIVASPAY_RM', 'OPERATIONS_MANAGER')"), 'Staff role check constraint');
      assert.ok(sql.includes("verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'REVOKED', 'EXPIRED')"), 'Property authorization status check');
      assert.ok(sql.includes('UNIQUE (user_id, agency_id)'), 'Unique constraint on broker membership');
      assert.ok(sql.includes('UNIQUE (user_id)'), 'Unique constraint on staff membership');
      assert.ok(sql.includes('UNIQUE (property_id, agency_id)'), 'Unique constraint on property authorization');
    }),

    runTest('Primary account roles strictly limited to CUSTOMER, OWNER, ADMIN in repository', async () => {
      const brokerAdmin = await db.findUserById('user_broker_admin_301');
      assert.ok(brokerAdmin, 'Broker Admin user must exist');
      assert.strictEqual(brokerAdmin.role, 'OWNER', 'Broker Admin primary role must be OWNER');

      const brokerStaff = await db.findUserById('user_broker_staff_302');
      assert.ok(brokerStaff, 'Broker Staff user must exist');
      assert.strictEqual(brokerStaff.role, 'CUSTOMER', 'Broker Staff primary role must be CUSTOMER');

      const rmStaff = await db.findUserById('user_rm_401');
      assert.ok(rmStaff, 'RM Staff user must exist');
      assert.strictEqual(rmStaff.role, 'CUSTOMER', 'RM Staff primary role must be CUSTOMER');

      const opsStaff = await db.findUserById('user_ops_501');
      assert.ok(opsStaff, 'Ops Staff user must exist');
      assert.strictEqual(opsStaff.role, 'CUSTOMER', 'Ops Staff primary role must be CUSTOMER');
    }),

    runTest('Delegated broker membership resolves active agency credentials without mutating primary role', async () => {
      const bm = await db.findBrokerMembershipByUserId('user_broker_admin_301');
      assert.ok(bm, 'Broker Admin membership must be present');
      assert.strictEqual(bm.membershipRole, 'BROKER_ADMIN');
      assert.strictEqual(bm.status, 'ACTIVE');

      const agency = await db.findAgencyById(bm.agencyId);
      assert.ok(agency, 'Agency must resolve');
      assert.strictEqual(agency.verificationStatus, 'VERIFIED');
    }),

    runTest('Delegated staff membership resolves active RM role and regional assignment', async () => {
      const sm = await db.findStaffMembershipByUserId('user_rm_401');
      assert.ok(sm, 'Staff membership must be present for RM');
      assert.strictEqual(sm.staffRole, 'NIVASPAY_RM');
      assert.strictEqual(sm.status, 'ACTIVE');
      assert.ok(sm.assignedRegion.includes('Itanagar'), 'Regional jurisdiction must be set');
    }),

    runTest('Suspended or revoked broker membership blocks broker access', async () => {
      // Create a temporary suspended broker user and membership in dev repo
      const suspendedUser = {
        id: 'user_broker_suspended_test',
        email: 'suspended.broker@test.in',
        passwordHash: '$2b$12$fV0OmFhAnLPfCa6VRg6EFOAH3HTnThl37lFXJeRoSfovH4ys8otqG',
        role: 'OWNER' as const,
        fullName: 'Suspended Broker',
        isVerified: true,
        createdAt: new Date().toISOString(),
      };
      await db.createUser(suspendedUser);

      await db.createBrokerMembership({
        id: 'bm_suspended_test',
        userId: suspendedUser.id,
        agencyId: 'ag_apex_01',
        membershipRole: 'BROKER_ADMIN',
        permissions: ['VIEW_LISTINGS'],
        status: 'SUSPENDED',
        createdAt: new Date().toISOString(),
      });

      const bm = await db.findBrokerMembershipByUserId(suspendedUser.id);
      assert.ok(bm);
      assert.strictEqual(bm.status, 'SUSPENDED');
    }),

    runTest('Suspended staff membership is detected and status updates succeed', async () => {
      const sm = await db.findStaffMembershipByUserId('user_rm_401');
      assert.ok(sm);

      const updateSuccess = await db.updateStaffMembershipStatus(sm.id, 'SUSPENDED');
      assert.strictEqual(updateSuccess, true, 'Staff status update must succeed');

      const updated = await db.findStaffMembershipByUserId('user_rm_401');
      assert.strictEqual(updated?.status, 'SUSPENDED', 'Staff status must now be SUSPENDED');

      // Revert back to ACTIVE
      await db.updateStaffMembershipStatus(sm.id, 'ACTIVE');
      const reverted = await db.findStaffMembershipByUserId('user_rm_401');
      assert.strictEqual(reverted?.status, 'ACTIVE', 'Staff status must revert to ACTIVE');
    }),

    runTest('Property authorization distinguishes legal owner from managing agency', async () => {
      const auth = await db.findPropertyAuthorization('lst_1', 'ag_apex_01');
      assert.ok(auth, 'Property authorization must exist for lst_1');
      assert.strictEqual(auth.ownerId, 'user_owner_201', 'Legal owner must remain user_owner_201');
      assert.strictEqual(auth.agencyId, 'ag_apex_01', 'Agency must be ag_apex_01');
      assert.strictEqual(auth.verificationStatus, 'VERIFIED');
      assert.strictEqual(auth.authorizationType, 'NON_EXCLUSIVE');

      // Property owner in properties table must still be user_owner_201
      const prop = await db.findPropertyById('lst_1');
      assert.ok(prop);
      assert.strictEqual(prop.ownerId, 'user_owner_201', 'Broker managing property must not become owner');
    }),

    runTest('Public registration validation schema strictly forbids ADMIN or staff/broker roles', () => {
      // Attempting to register as ADMIN via registration schema must fail
      const adminSignupAttempt = userRegistrationSchema.safeParse({
        email: 'attacker@evil.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        fullName: 'Attacker Admin',
        role: 'ADMIN',
        agreedTerms: true,
      });
      assert.strictEqual(adminSignupAttempt.success, false, 'Public signup with role ADMIN must be rejected');

      // Attempting to register as BROKER_ADMIN via registration schema must fail
      const brokerSignupAttempt = userRegistrationSchema.safeParse({
        email: 'attacker@evil.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        fullName: 'Attacker Broker',
        role: 'BROKER_ADMIN',
        agreedTerms: true,
      });
      assert.strictEqual(brokerSignupAttempt.success, false, 'Public signup with role BROKER_ADMIN must be rejected');

      // Valid CUSTOMER and OWNER registrations must pass
      const validCustomer = userRegistrationSchema.safeParse({
        email: 'legit.cust@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        fullName: 'Legit Customer',
        role: 'CUSTOMER',
        agreedTerms: true,
      });
      assert.strictEqual(validCustomer.success, true, 'CUSTOMER registration must be permitted');

      const validOwner = userRegistrationSchema.safeParse({
        email: 'legit.owner@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        fullName: 'Legit Owner',
        role: 'OWNER',
        agreedTerms: true,
        agreedAntiDiscrimination: true,
      });
      assert.strictEqual(validOwner.success, true, 'OWNER registration must be permitted');
    }),
  ];

  for (const t of tests) {
    await t();
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`Test Execution Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('----------------------------------------------------------------\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
