import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { ProfileController } from '../controllers/profileController';
import { PropertyController } from '../controllers/propertyController';
import { ApplicationController } from '../controllers/applicationController';
import { AgreementController } from '../controllers/agreementController';
import { ReviewController } from '../controllers/reviewController';
import { PaymentController } from '../controllers/paymentController';
import { ReportController } from '../controllers/reportController';
import { ConsentController } from '../controllers/consentController';
import { MetricsController } from '../controllers/metricsController';
import { RazorpayWebhookHandler } from '../webhooks/razorpayWebhook';
import { requireAuth, requireRole, requireBrokerMembership, requireStaffMembership } from '../middleware/auth';
import { db } from '../db/database';
import { checkDatabaseHealth } from '../db/index';
import { ENV } from '../config/env';

const router = Router();

// ============================================================================
// 1. Auth Routes
// ============================================================================
router.post('/auth/login', AuthController.login);
router.post('/auth/signup', AuthController.signup);
router.post('/auth/google', AuthController.googleLogin);
router.post('/auth/refresh', AuthController.refresh);
router.post('/auth/logout', AuthController.logout);
router.get('/auth/me', requireAuth, AuthController.me);

// ============================================================================
// 2. Profile Routes
// ============================================================================
router.get('/profile', requireAuth, ProfileController.getProfile);
router.put('/profile', requireAuth, ProfileController.updateProfile);

// ============================================================================
// 3. Property Routes
// ============================================================================
router.get('/properties', PropertyController.getProperties);
router.get('/properties/saved', requireAuth, PropertyController.getSavedProperties);
router.get('/properties/:id', PropertyController.getPropertyById);
router.post('/properties', requireAuth, requireRole('OWNER', 'ADMIN'), PropertyController.createProperty);
router.put('/properties/:id', requireAuth, requireRole('OWNER', 'ADMIN'), PropertyController.updateProperty);
router.delete('/properties/:id', requireAuth, requireRole('OWNER', 'ADMIN'), PropertyController.deleteProperty);
router.post('/properties/:id/save', requireAuth, PropertyController.saveProperty);
router.delete('/properties/:id/save', requireAuth, PropertyController.unsaveProperty);
router.post('/properties/:id/units', requireAuth, requireRole('OWNER', 'ADMIN'), PropertyController.addUnit);
router.post('/properties/:id/rooms', requireAuth, requireRole('OWNER', 'ADMIN'), PropertyController.addRoom);
router.post('/properties/:id/rooms/:roomId/beds', requireAuth, requireRole('OWNER', 'ADMIN'), PropertyController.addBed);
router.post('/properties/:id/pg-metadata', requireAuth, requireRole('OWNER', 'ADMIN'), PropertyController.upsertPgMetadata);
router.patch('/properties/:id/beds/:bedId/status', requireAuth, PropertyController.updateBedStatus);

// ============================================================================
// 4. Tenancy Application Routes
// ============================================================================
router.get('/applications', requireAuth, ApplicationController.getApplications);
router.get('/applications/:id', requireAuth, ApplicationController.getApplicationById);
router.post('/applications', requireAuth, requireRole('CUSTOMER'), ApplicationController.createApplication);
router.patch(
  '/applications/:id/status',
  requireAuth,
  requireRole('OWNER', 'ADMIN'),
  ApplicationController.updateApplicationStatus
);

// ============================================================================
// 5. Rental Agreement Routes
// ============================================================================
router.get('/agreements', requireAuth, AgreementController.getAgreements);
router.get('/agreements/:id', requireAuth, AgreementController.getAgreementById);
router.post('/agreements', requireAuth, requireRole('OWNER', 'ADMIN'), AgreementController.createAgreement);
router.post('/agreements/:id/sign', requireAuth, AgreementController.signAgreement);
router.post('/agreements/:id/conclude', requireAuth, AgreementController.concludeAgreement);

// ============================================================================
// 5b. Reviews & Ratings with Inappropriate Content Moderation
// ============================================================================
router.get('/reviews', ReviewController.getReviews);
router.get('/reviews/:id', ReviewController.getReviewById);
router.post('/reviews', requireAuth, requireRole('CUSTOMER'), ReviewController.createReview);
router.patch('/reviews/:id/moderate', requireAuth, requireRole('ADMIN'), ReviewController.moderateReview);
router.post('/reviews/:id/respond', requireAuth, requireRole('OWNER', 'ADMIN'), ReviewController.respondToReview);
router.post('/reviews/:id/flag', requireAuth, ReviewController.flagReview);

// ============================================================================
// 6. Payment & Settlement Routes
// ============================================================================
router.post('/payments/verify', requireAuth, PaymentController.verifyPayment);
router.get('/payments', requireAuth, PaymentController.getPayments);

// ============================================================================
// 7. Grievances & Anti-Discrimination Reports
// ============================================================================
router.post('/reports', requireAuth, requireRole('CUSTOMER'), ReportController.createReport);
router.get('/reports', requireAuth, ReportController.getReports);
router.patch('/reports/:id', requireAuth, requireRole('ADMIN'), ReportController.updateReportStatus);

// ============================================================================
// 8. DPDP Act 2023 Consent Routes
// ============================================================================
router.post('/consent', requireAuth, ConsentController.logConsent);
router.get('/consent', requireAuth, ConsentController.getConsents);

// ============================================================================
// 9. Operational Metrics & Admin Dashboard
// ============================================================================
router.get('/admin/metrics', requireAuth, requireRole('ADMIN'), MetricsController.getAdminMetrics);
router.get('/admin/audit-logs', requireAuth, requireRole('ADMIN'), MetricsController.getAuditLogs);
router.get('/owner/metrics', requireAuth, requireRole('OWNER'), MetricsController.getOwnerMetrics);

// ============================================================================
// 9b. Broker & Agency Portal Routes (Delegated Secondary Access)
// ============================================================================
router.get('/broker/agency', requireAuth, requireBrokerMembership('BROKER_ADMIN', 'BROKER_STAFF'), async (req: any, res) => {
  const agencyId = req.brokerMembership?.agencyId;
  const agency = agencyId ? await db.findAgencyById(agencyId) : ((await db.getAgencies())[0]);
  return res.json({ success: true, agency, data: agency, membership: req.brokerMembership });
});

router.get('/broker/listings', requireAuth, requireBrokerMembership('BROKER_ADMIN', 'BROKER_STAFF'), async (req: any, res) => {
  const allProps = await db.getProperties();
  return res.json({ success: true, listings: allProps, membership: req.brokerMembership });
});

router.get('/broker/leads', requireAuth, requireBrokerMembership('BROKER_ADMIN', 'BROKER_STAFF'), async (req: any, res) => {
  const apps = await db.getApplications();
  return res.json({ success: true, leads: apps, membership: req.brokerMembership });
});

// ============================================================================
// 9c. NivasPay Internal Staff Routes (Delegated RM & Operations Access)
// ============================================================================
router.get('/staff/rm/assignments', requireAuth, requireStaffMembership('NIVASPAY_RM', 'OPERATIONS_MANAGER'), async (req: any, res) => {
  const apps = await db.getApplications();
  return res.json({ success: true, rmUserId: req.user?.id, assignments: apps, membership: req.staffMembership });
});

router.get('/staff/operations/cases', requireAuth, requireStaffMembership('OPERATIONS_MANAGER'), async (req: any, res) => {
  const reports = await db.getReports();
  return res.json({ success: true, cases: reports, membership: req.staffMembership });
});

// ============================================================================
// 10. Webhooks
// ============================================================================
router.post('/webhooks/razorpay', RazorpayWebhookHandler.handleWebhook);

// ============================================================================
// 11. Diagnostic & Health Route
// ============================================================================
router.get('/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();

  const healthPayload = {
    status: dbHealth.connected ? 'healthy' : 'degraded',
    environment: ENV.NODE_ENV,
    timestamp: new Date().toISOString(),
    database: {
      type: 'PostgreSQL',
      connected: dbHealth.connected,
      driver: dbHealth.driver,
      urlConfigured: dbHealth.urlConfigured,
      activeStorageMode: db.activeStorageMode,
      databaseName: dbHealth.databaseName ?? null,
      latencyMs: dbHealth.latencyMs ?? null,
      serverTime: dbHealth.serverTime ?? null,
    },
    paymentGateway: {
      provider: 'Razorpay Route (India)',
      configured: ENV.RAZORPAY.isConfigured,
      keyIdPresent: Boolean(ENV.RAZORPAY.KEY_ID),
    },
  };

  return res.status(dbHealth.connected ? 200 : 503).json(healthPayload);
});

export default router;
