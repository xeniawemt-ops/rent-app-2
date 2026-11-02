import { ENV } from '../config/env';
import { isDbConnected } from './postgres';
import { PostgresRepository } from './postgresRepository';
import { UserRoleType } from '../middleware/auth';

export interface DBUser {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRoleType;
  fullName: string;
  phone?: string;
  isVerified: boolean;
  createdAt: string;
}

export interface DBCustomerProfile {
  id: string;
  userId: string;
  name: string;
  age: number;
  gender: string;
  occupation: string;
  maritalStatus: string;
  familySize: number;
  hasPets: boolean;
  petType?: string;
  religion?: string;
  tribe?: string;
  consentShareReligionTribe: boolean;
  religionTribeConsentTimestamp?: string;
  agreedDpdpNoticeAt: string;
  dpdpNoticeVersion: string;
  languagePreference: 'en' | 'hi';
  createdAt?: string;
  updatedAt?: string;
}

export interface DBOwnerProfile {
  id: string;
  userId: string;
  fullName: string;
  phoneMasked: string;
  phoneEncrypted: string;
  panMasked?: string;
  panEncrypted?: string;
  panVerified: boolean;
  aadhaarMasked?: string;
  aadhaarEncrypted?: string;
  aadhaarVerified: boolean;
  kycVerifiedAt?: string;
  razorpayAccountId?: string;
  bankAccountMasked?: string;
  agreedAntiDiscriminationTermsAt: string;
  strikesCount: number;
  isSuspended: boolean;
  suspensionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DBAgency {
  id: string;
  businessName: string;
  registrationDetails?: Record<string, any>;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'SUSPENDED' | 'REJECTED';
  contactEmail: string;
  contactPhone: string;
  address?: string;
  city?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DBBrokerMembership {
  id: string;
  userId: string;
  agencyId: string;
  membershipRole: 'BROKER_ADMIN' | 'BROKER_STAFF';
  permissions: string[];
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  createdAt: string;
  updatedAt?: string;
}

export interface DBStaffMembership {
  id: string;
  userId: string;
  staffRole: 'NIVASPAY_RM' | 'OPERATIONS_MANAGER';
  assignedRegion: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  permissions: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface DBPropertyAuthorization {
  id: string;
  propertyId: string;
  ownerId: string;
  agencyId: string;
  permissionScope: string;
  authorizationType: 'EXCLUSIVE' | 'NON_EXCLUSIVE';
  docReference?: string;
  validFrom: string;
  validUntil: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'REVOKED' | 'EXPIRED';
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ResidentialCategory =
  | 'APARTMENT'
  | 'INDEPENDENT_HOUSE'
  | 'VILLA'
  | 'PG'
  | 'HOSTEL'
  | 'SHARED_ROOM';

export interface PropertyFilters {
  category?: ResidentialCategory;
  locality?: string;
  city?: string;
  minRent?: number;
  maxRent?: number;
  bhk?: string;
  propertyType?: string;
  accommodationType?: string;
  furnishing?: string;
  bedrooms?: number;
  bathrooms?: number;
  availability?: string;
  genderPreference?: string;
  mealsIncluded?: boolean;
  foodIncluded?: boolean;
  dietaryPolicy?: string;
  roomType?: string;
  bedType?: string;
  sharingArrangement?: string;
  availableBedsOnly?: boolean;
  facilities?: string[];
  search?: string;
}

export interface DBPropertyUnit {
  id: string;
  propertyId: string;
  unitNumber: string;
  unitType?: string;
  floorNumber?: number;
  bhk?: string;
  bedrooms?: number;
  bathrooms?: number;
  rentMonthly: number;
  securityDeposit: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
  availabilityStatus?: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
  furnishingStatus?: string;
  carpetAreaSqft?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DBPropertyRoom {
  id: string;
  propertyId: string;
  roomNumber: string;
  roomType: 'SINGLE' | 'PRIVATE_ROOM' | 'DOUBLE_SHARING' | 'TRIPLE_SHARING' | 'FOUR_SHARING' | 'DORMITORY';
  totalBeds: number;
  occupiedBeds: number;
  rentPerBed: number;
  securityDeposit: number;
  attachedBathroom: boolean;
  hasBalcony: boolean;
  airConditioning: boolean;
  status: 'AVAILABLE' | 'FULL' | 'MAINTENANCE';
  beds?: DBBedInventoryItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DBBedInventoryItem {
  id: string;
  roomId: string;
  propertyId: string;
  bedNumber: string;
  bedType: 'SINGLE' | 'BUNK_LOWER' | 'BUNK_UPPER';
  rentMonthly: number;
  securityDeposit: number;
  status: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE' | 'UNAVAILABLE';
  tenantId?: string | null;
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DBPgHostelMetadata {
  id?: string;
  propertyId: string;
  foodIncluded: boolean;
  mealOfferings: string[];
  dietaryPolicy: 'VEG_ONLY' | 'NON_VEG_ALLOWED' | 'JAIN_AVAILABLE' | 'ANY';
  genderPreference: 'MALE_ONLY' | 'FEMALE_ONLY' | 'CO_ED' | 'ALL';
  curfewTime?: string;
  noticePeriodDays: number;
  gateClosingTime?: string;
  wardenContactName?: string;
  wardenContactPhone?: string;
  visitorPolicy?: string;
  guestRestrictions?: string;
  smokingPolicy?: string;
  minStayMonths?: number;
  commonFacilities: string[];
  rulesAndRegulations: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DBProperty {
  id: string;
  ownerId: string;
  title: string;
  bhk: string;
  rentMonthly: number;
  securityDeposit: number;
  locality: string;
  city: string;
  propertyType: string;
  category: ResidentialCategory;
  totalUnits: number;
  occupiedUnits: number;
  status: string;
  amenities?: string[];
  photos?: string[];
  requirements?: Record<string, any>;
  approximateLat?: number;
  approximateLng?: number;
  fullAddressEncrypted?: string;
  maskedAddressPreview?: string;
  units?: DBPropertyUnit[];
  rooms?: DBPropertyRoom[];
  beds?: DBBedInventoryItem[];
  pgHostelMetadata?: DBPgHostelMetadata;
  createdAt: string;
}

export interface DBSavedProperty {
  id: string;
  userId: string;
  propertyId: string;
  createdAt: string;
}

export interface DBApplication {
  id: string;
  listingId: string;
  customerId: string;
  applicantName: string;
  applicantEmail: string;
  monthlyIncome: number;
  status: 'pending' | 'under_review' | 'accepted' | 'rejected' | 'active_tenancy' | 'cancelled';
  applicationFeePaid: boolean;
  applicationFeeAmount?: number;
  paymentId?: string;
  rejectionReasonCode?: string;
  rejectionReasonExplanation?: string;
  brokerageAmount?: number;
  brokeragePaid?: boolean;
  depositBalanceAmount?: number;
  depositBalancePaid?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface DBRentalAgreement {
  id: string;
  applicationId: string;
  listingId: string;
  propertyTitle: string;
  propertyAddress: string;
  tenantId: string;
  tenantName: string;
  ownerId: string;
  ownerName: string;
  monthlyRent: number;
  securityDeposit: number;
  commencementDate: string;
  tenancyPeriodMonths: number;
  status: 'draft' | 'pending_signatures' | 'active' | 'terminated' | 'concluded';
  tenantSignedAt?: string;
  ownerSignedAt?: string;
  contractHash: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DBReview {
  id: string;
  agreementId: string;
  listingId: string;
  propertyTitle: string;
  tenantId: string;
  tenantName: string;
  ownerId: string;
  ownerName: string;
  propertyRating: number;
  ownerRating: number;
  overallRating: number;
  cleanlinessRating?: number;
  maintenanceRating?: number;
  communicationRating?: number;
  depositReturnRating?: number;
  title: string;
  reviewText: string;
  tags?: string[];
  moderationStatus: 'pending_moderation' | 'approved' | 'flagged' | 'rejected';
  flaggedReason?: string;
  autoModerated: boolean;
  moderatedBy?: string;
  moderatedAt?: string;
  moderationNotes?: string;
  ownerResponse?: string;
  ownerRespondedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DBPayment {
  id: string;
  applicationId?: string;
  propertyId?: string;
  payerId: string;
  payeeId: string;
  amount: number;
  currency: string;
  type: 'APPLICATION_FEE' | 'BROKERAGE' | 'RENT' | 'DEPOSIT' | 'OWNER_PLATFORM_FEE' | 'TRANSACTION_FEE' | 'TAX' | 'ADJUSTMENT' | 'REFUND';
  status: 'PENDING' | 'SUCCESSFUL' | 'SETTLED' | 'FAILED' | 'REVERSED';
  providerReference?: string;
  providerStatus?: string;
  signatureVerified: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
}

export interface DBRefundRecord {
  id: string;
  transactionId: string;
  applicationId?: string;
  userId: string;
  userName: string;
  amount: number;
  reason: string;
  status: 'Refund Requested' | 'Refund Approved' | 'Refund Processing' | 'Refund Completed' | 'Refund Rejected';
  requestedAt: string;
  resolvedAt?: string;
  referenceId: string;
  adminNotes?: string;
  createdAt: string;
}

export interface DBRejectionReport {
  id: string;
  applicationId: string;
  customerId: string;
  reportedOwnerId: string;
  allegationDescription: string;
  rejectionReasonGiven?: string;
  status: 'Reviewed' | 'Action Taken' | 'pending_review' | 'strike_issued' | 'owner_suspended' | 'dismissed';
  adminNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface DBConsentLog {
  id: string;
  userId: string;
  consentType: string;
  granted: boolean;
  version: string;
  ipAddress?: string;
  purpose: string;
  retentionPeriod: string;
  timestamp: string;
}

export interface DBAuditLog {
  id: string;
  userId?: string;
  action: string;
  category: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
}

export interface DBNotificationDispatch {
  id: string;
  applicationId?: string;
  recipientEmail: string;
  recipientPhone?: string;
  recipientName: string;
  propertyTitle: string;
  notificationType: string;
  status: 'NOT_CONFIGURED' | 'SIMULATED' | 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED';
  inAppStatus: 'RECORDED' | 'NOT_CONFIGURED' | 'FAILED';
  emailStatus: 'NOT_CONFIGURED' | 'SIMULATED' | 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED';
  smsStatus: 'NOT_CONFIGURED' | 'SIMULATED' | 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED';
  channels: string[];
  subject: string;
  emailBody: string;
  smsBody?: string;
  reasonCode?: string;
  reasonTitle?: string;
  explanation?: string;
  idempotencyKey?: string;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  dispatchedAt: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Common Repository Interface implemented by PostgresRepository and InMemoryRepository (dev/test fallback only)
 */
export interface IRepository {
  // Users
  findUserByEmail(email: string): Promise<DBUser | undefined>;
  findUserById(id: string): Promise<DBUser | undefined>;
  createUser(user: DBUser): Promise<DBUser>;

  // Profiles
  getCustomerProfile(userId: string): Promise<DBCustomerProfile | undefined>;
  upsertCustomerProfile(profile: DBCustomerProfile): Promise<DBCustomerProfile>;
  getOwnerProfile(userId: string): Promise<DBOwnerProfile | undefined>;
  upsertOwnerProfile(profile: DBOwnerProfile): Promise<DBOwnerProfile>;

  // Properties & Saved
  getProperties(ownerId?: string, filters?: PropertyFilters): Promise<DBProperty[]>;
  findPropertyById(id: string): Promise<DBProperty | undefined>;
  createProperty(prop: DBProperty): Promise<DBProperty>;
  updateProperty(id: string, updates: Partial<DBProperty>): Promise<DBProperty | undefined>;
  deleteProperty(id: string): Promise<boolean>;
  getSavedProperties(userId: string): Promise<DBProperty[]>;
  saveProperty(userId: string, propertyId: string): Promise<boolean>;
  unsaveProperty(userId: string, propertyId: string): Promise<boolean>;

  // Units, Rooms, Beds & PG/Hostel Metadata
  createPropertyUnit(unit: DBPropertyUnit): Promise<DBPropertyUnit>;
  getPropertyUnits(propertyId: string): Promise<DBPropertyUnit[]>;
  createPropertyRoom(room: DBPropertyRoom): Promise<DBPropertyRoom>;
  getPropertyRooms(propertyId: string): Promise<DBPropertyRoom[]>;
  createBedInventory(bed: DBBedInventoryItem): Promise<DBBedInventoryItem>;
  getBedInventory(propertyId: string, roomId?: string): Promise<DBBedInventoryItem[]>;
  updateBedStatus(bedId: string, status: DBBedInventoryItem['status'], tenantId?: string | null, expectedVersion?: number): Promise<{ success: boolean; bed?: DBBedInventoryItem; error?: string }>;
  upsertPgHostelMetadata(metadata: DBPgHostelMetadata): Promise<DBPgHostelMetadata>;
  getPgHostelMetadata(propertyId: string): Promise<DBPgHostelMetadata | undefined>;

  // Tenancy Applications
  getApplications(userId?: string, role?: string, ownerId?: string): Promise<DBApplication[]>;
  findApplicationById(id: string): Promise<DBApplication | undefined>;
  createApplication(app: DBApplication): Promise<DBApplication>;
  updateApplicationStatus(
    appId: string,
    status: DBApplication['status'],
    details?: { rejectionReasonCode?: string; rejectionReasonExplanation?: string }
  ): Promise<DBApplication | undefined>;

  // Rental Agreements
  getAgreements(userId?: string, role?: string): Promise<DBRentalAgreement[]>;
  findAgreementById(id: string): Promise<DBRentalAgreement | undefined>;
  createAgreement(agreement: DBRentalAgreement): Promise<DBRentalAgreement>;
  signAgreement(id: string, role: 'customer' | 'owner'): Promise<DBRentalAgreement | undefined>;
  concludeAgreement(id: string): Promise<DBRentalAgreement | undefined>;

  // Reviews & Ratings
  createReview(review: DBReview): Promise<DBReview>;
  getReviews(filter?: { listingId?: string; ownerId?: string; tenantId?: string; moderationStatus?: string }): Promise<DBReview[]>;
  findReviewById(id: string): Promise<DBReview | undefined>;
  findReviewByAgreementId(agreementId: string): Promise<DBReview | undefined>;
  updateReviewModeration(id: string, status: string, details?: { flaggedReason?: string; moderatedBy?: string; moderationNotes?: string }): Promise<DBReview | undefined>;
  addOwnerResponse(id: string, ownerId: string, response: string): Promise<DBReview | undefined>;
  flagReview(id: string, reason: string): Promise<DBReview | undefined>;

  // Payments & Refunds
  getPayments(payerOrPayeeId?: string): Promise<DBPayment[]>;
  findPaymentById(id: string): Promise<DBPayment | undefined>;
  createPayment(payment: DBPayment): Promise<DBPayment>;
  updatePaymentStatus(paymentId: string, status: DBPayment['status'], providerReference?: string): Promise<DBPayment | undefined>;
  finalizeApplicationFeePayment(paymentId: string, applicationId: string, providerRef: string): Promise<{ payment: DBPayment; application?: DBApplication }>;
  createRefund(refund: DBRefundRecord): Promise<DBRefundRecord>;
  getRefunds(userId?: string): Promise<DBRefundRecord[]>;

  // Rejection Reports & Grievances
  createReport(report: DBRejectionReport): Promise<DBRejectionReport>;
  getReports(userId?: string, role?: string): Promise<DBRejectionReport[]>;
  updateReportStatus(id: string, status: DBRejectionReport['status'], adminNotes?: string): Promise<DBRejectionReport | undefined>;

  // DPDP Consent Logs
  logConsent(consent: DBConsentLog): Promise<DBConsentLog>;
  getConsents(userId: string): Promise<DBConsentLog[]>;

  // Audit Logs
  logAudit(log: Omit<DBAuditLog, 'id' | 'createdAt'>): Promise<DBAuditLog>;
  getAuditLogs(): Promise<DBAuditLog[]>;

  // Notification Dispatches (PostgreSQL persistence & idempotency)
  createNotificationDispatch(dispatch: DBNotificationDispatch): Promise<DBNotificationDispatch>;
  findNotificationDispatchById(id: string): Promise<DBNotificationDispatch | undefined>;
  findNotificationDispatchByIdempotencyKey(key: string): Promise<DBNotificationDispatch | undefined>;
  getNotificationDispatches(filter?: { applicationId?: string; recipientEmail?: string }): Promise<DBNotificationDispatch[]>;
  updateNotificationDispatch(id: string, updates: Partial<DBNotificationDispatch>): Promise<DBNotificationDispatch | undefined>;

  // Operational Metrics
  getAdminMetrics(): Promise<Record<string, any>>;
  getOwnerMetrics(ownerId: string): Promise<Record<string, any>>;

  // Delegated Memberships & Secondary Access
  findBrokerMembershipByUserId(userId: string): Promise<DBBrokerMembership | undefined>;
  findStaffMembershipByUserId(userId: string): Promise<DBStaffMembership | undefined>;
  getAgencies(): Promise<DBAgency[]>;
  findAgencyById(id: string): Promise<DBAgency | undefined>;
  createAgency(agency: DBAgency): Promise<DBAgency>;
  createBrokerMembership(membership: DBBrokerMembership): Promise<DBBrokerMembership>;
  updateBrokerMembershipStatus(membershipId: string, status: DBBrokerMembership['status']): Promise<boolean>;
  createStaffMembership(membership: DBStaffMembership): Promise<DBStaffMembership>;
  updateStaffMembershipStatus(membershipId: string, status: DBStaffMembership['status']): Promise<boolean>;
  createPropertyAuthorization(auth: DBPropertyAuthorization): Promise<DBPropertyAuthorization>;
  findPropertyAuthorization(propertyId: string, agencyId: string): Promise<DBPropertyAuthorization | undefined>;
  updatePropertyAuthorizationStatus(authId: string, status: DBPropertyAuthorization['verificationStatus'], verifiedBy?: string): Promise<boolean>;
}

/**
 * Temporary In-Memory Development Repository
 * Strictly restricted to local development or offline test environments.
 * Disabled completely in production.
 */
class InMemoryDevRepository implements IRepository {
  private users: DBUser[] = [
    {
      id: 'user_cust_101',
      email: 'aarav@nivaspay.in',
      passwordHash: '$2b$12$fV0OmFhAnLPfCa6VRg6EFOAH3HTnThl37lFXJeRoSfovH4ys8otqG', // Pass@Nivas2026!
      role: 'CUSTOMER',
      fullName: 'Aarav Sharma',
      phone: '+91 98765 43210',
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user_cust_102',
      email: 'priyanka@nivaspay.in',
      passwordHash: '$2b$12$fV0OmFhAnLPfCa6VRg6EFOAH3HTnThl37lFXJeRoSfovH4ys8otqG', // Pass@Nivas2026!
      role: 'CUSTOMER',
      fullName: 'Priyanka Sen',
      phone: '+91 91234 56789',
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user_owner_201',
      email: 'rameshwar@nivaspay.in',
      passwordHash: '$2b$12$fV0OmFhAnLPfCa6VRg6EFOAH3HTnThl37lFXJeRoSfovH4ys8otqG', // Pass@Nivas2026!
      role: 'OWNER',
      fullName: 'Rameshwar Kulkarni',
      phone: '+91 98111 22334',
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user_owner_202',
      email: 'meenakshi@nivaspay.in',
      passwordHash: '$2b$12$fV0OmFhAnLPfCa6VRg6EFOAH3HTnThl37lFXJeRoSfovH4ys8otqG', // Pass@Nivas2026!
      role: 'OWNER',
      fullName: 'Meenakshi Iyer',
      phone: '+91 97222 33445',
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user_admin_master',
      email: 'zexnitz@nivaspay.in',
      passwordHash: '$2b$12$PV9IqzDi5HlRvWUMeXxS3.U6Wy3.Zz8DbN30FtVC4ALpsjtzm5x4e', // qwertyuiop
      role: 'ADMIN',
      fullName: 'Zexnitz (Master Administrator)',
      phone: '+91 99999 88888',
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user_admin_999',
      email: 'compliance.admin@nivaspay.in',
      passwordHash: '$2b$12$PV9IqzDi5HlRvWUMeXxS3.U6Wy3.Zz8DbN30FtVC4ALpsjtzm5x4e', // qwertyuiop
      role: 'ADMIN',
      fullName: 'NivasPay Compliance Admin',
      phone: '+91 99999 88888',
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user_admin_001',
      email: 'admin@nivaspay.com',
      passwordHash: '$2b$12$PV9IqzDi5HlRvWUMeXxS3.U6Wy3.Zz8DbN30FtVC4ALpsjtzm5x4e', // qwertyuiop
      role: 'ADMIN',
      fullName: 'System Administrator',
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user_owner_alt',
      email: 'owner@nivaspay.com',
      passwordHash: '$2b$12$fV0OmFhAnLPfCa6VRg6EFOAH3HTnThl37lFXJeRoSfovH4ys8otqG', // Pass@Nivas2026!
      role: 'OWNER',
      fullName: 'Vikram Kulkarni',
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user_cust_alt',
      email: 'customer@nivaspay.com',
      passwordHash: '$2b$12$fV0OmFhAnLPfCa6VRg6EFOAH3HTnThl37lFXJeRoSfovH4ys8otqG', // Pass@Nivas2026!
      role: 'CUSTOMER',
      fullName: 'Aarav Sharma',
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user_broker_admin_301',
      email: 'broker.admin@apexrealty.in',
      passwordHash: '$2b$12$fV0OmFhAnLPfCa6VRg6EFOAH3HTnThl37lFXJeRoSfovH4ys8otqG', // Pass@Nivas2026!
      role: 'OWNER',
      fullName: 'Vikram Malhotra',
      phone: '+91 98222 11001',
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user_broker_staff_302',
      email: 'sonam.staff@apexrealty.in',
      passwordHash: '$2b$12$fV0OmFhAnLPfCa6VRg6EFOAH3HTnThl37lFXJeRoSfovH4ys8otqG', // Pass@Nivas2026!
      role: 'CUSTOMER',
      fullName: 'Sonam Wangchu',
      phone: '+91 98333 22002',
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user_rm_401',
      email: 'tenzing.rm@nivaspay.in',
      passwordHash: '$2b$12$fV0OmFhAnLPfCa6VRg6EFOAH3HTnThl37lFXJeRoSfovH4ys8otqG', // Pass@Nivas2026!
      role: 'CUSTOMER',
      fullName: 'Tenzing Norbu',
      phone: '+91 98444 33003',
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user_ops_501',
      email: 'ananya.ops@nivaspay.in',
      passwordHash: '$2b$12$fV0OmFhAnLPfCa6VRg6EFOAH3HTnThl37lFXJeRoSfovH4ys8otqG', // Pass@Nivas2026!
      role: 'CUSTOMER',
      fullName: 'Ananya Deshmukh',
      phone: '+91 98555 44004',
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
  ];

  private agencies: DBAgency[] = [
    {
      id: 'ag_apex_01',
      businessName: 'Apex Realty Consultants',
      registrationDetails: { reraNumber: 'RERA/AP/2024/0981' },
      verificationStatus: 'VERIFIED',
      contactEmail: 'contact@apexrealty.in',
      contactPhone: '+91 98222 11000',
      address: 'Suite 401, Apex Commercial Tower, Itanagar',
      city: 'Itanagar',
      createdAt: new Date().toISOString(),
    },
  ];

  private brokerMemberships: DBBrokerMembership[] = [
    {
      id: 'bm_301',
      userId: 'user_broker_admin_301',
      agencyId: 'ag_apex_01',
      membershipRole: 'BROKER_ADMIN',
      permissions: ['MANAGE_AGENCY', 'MANAGE_STAFF', 'MANAGE_LISTINGS', 'SUBMIT_PROPOSALS', 'VIEW_CLIENTS'],
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'bm_302',
      userId: 'user_broker_staff_302',
      agencyId: 'ag_apex_01',
      membershipRole: 'BROKER_STAFF',
      permissions: ['VIEW_LISTINGS', 'SHOW_PROPERTIES', 'ASSIST_APPLICATIONS'],
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    },
  ];

  private staffMemberships: DBStaffMembership[] = [
    {
      id: 'sm_401',
      userId: 'user_rm_401',
      staffRole: 'NIVASPAY_RM',
      assignedRegion: 'Arunachal Pradesh - Itanagar Capital Complex',
      status: 'ACTIVE',
      permissions: ['MANAGE_DISPUTES', 'FACILITATE_ONBOARDING', 'COORDINATE_VERIFICATIONS', 'VIEW_OWNER_METRICS'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sm_501',
      userId: 'user_ops_501',
      staffRole: 'OPERATIONS_MANAGER',
      assignedRegion: 'North-East Region',
      status: 'ACTIVE',
      permissions: ['AUDIT_PAYMENTS', 'MANAGE_RECONCILIATION', 'MONITOR_DPDP', 'SYSTEM_HEALTH_VIEW'],
      createdAt: new Date().toISOString(),
    },
  ];

  private propertyAuthorizations: DBPropertyAuthorization[] = [
    {
      id: 'auth_001',
      propertyId: 'lst_1',
      ownerId: 'user_owner_201',
      agencyId: 'ag_apex_01',
      permissionScope: 'LISTING_AND_VISITS',
      authorizationType: 'NON_EXCLUSIVE',
      docReference: 'AUTH-2026-APEX-001',
      validFrom: '2026-01-01T00:00:00Z',
      validUntil: '2026-12-31T23:59:59Z',
      verificationStatus: 'VERIFIED',
      verifiedBy: 'user_admin_master',
      verifiedAt: '2026-01-02T10:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
    },
  ];

  private properties: DBProperty[] = [
    {
      id: 'lst_1',
      ownerId: 'user_owner_201',
      title: 'Pine Valley Enclave, Itanagar',
      bhk: '2 BHK',
      rentMonthly: 12500,
      securityDeposit: 25000,
      locality: 'Chandranagar',
      city: 'Itanagar',
      propertyType: 'Apartment',
      category: 'APARTMENT',
      totalUnits: 4,
      occupiedUnits: 3,
      status: 'available',
      createdAt: new Date().toISOString(),
    },
  ];

  private propertyUnits: DBPropertyUnit[] = [];
  private propertyRooms: DBPropertyRoom[] = [];
  private bedInventory: DBBedInventoryItem[] = [];
  private pgHostelMetadata: DBPgHostelMetadata[] = [];

  private applications: DBApplication[] = [];
  private payments: DBPayment[] = [];
  private auditLogs: DBAuditLog[] = [];
  private customerProfiles: DBCustomerProfile[] = [];
  private ownerProfiles: DBOwnerProfile[] = [];
  private savedProperties: DBSavedProperty[] = [];
  private agreements: DBRentalAgreement[] = [
    {
      id: 'agr_2001',
      applicationId: 'app_1002',
      listingId: 'lst_2',
      propertyTitle: 'Pine Grove Villa, Naharlagun',
      propertyAddress: 'Flat B-202, Valley Heights, Model Village Road, Papu Hill, Naharlagun, Arunachal Pradesh - 791110',
      tenantId: 'user_cust_102',
      tenantName: 'Priyanka Sen',
      ownerId: 'user_owner_202',
      ownerName: 'Meenakshi Iyer',
      monthlyRent: 18000,
      securityDeposit: 40000,
      commencementDate: '2026-10-01T00:00:00Z',
      tenancyPeriodMonths: 11,
      status: 'active',
      tenantSignedAt: '2026-09-26T14:05:00Z',
      ownerSignedAt: '2026-09-26T15:30:00Z',
      contractHash: '0x8f3a991b2c4e5d6a7f8b9c0d1e2f3a4b',
      createdAt: '2026-09-26T12:00:00Z',
    },
    {
      id: 'agr_2002',
      applicationId: 'app_1001',
      listingId: 'lst_1',
      propertyTitle: 'Pine Valley Enclave, Itanagar',
      propertyAddress: 'Villa 14, Pine Valley Enclave, Near Ganga Lake, Chandranagar, Itanagar, Arunachal Pradesh - 791113',
      tenantId: 'user_cust_101',
      tenantName: 'Aarav Sharma',
      ownerId: 'user_owner_201',
      ownerName: 'Rameshwar Kulkarni',
      monthlyRent: 12500,
      securityDeposit: 25000,
      commencementDate: '2025-10-01T00:00:00Z',
      tenancyPeriodMonths: 11,
      status: 'concluded',
      tenantSignedAt: '2025-09-25T10:00:00Z',
      ownerSignedAt: '2025-09-25T11:30:00Z',
      contractHash: '0x5c4a112b9d8e7f6a5b4c3d2e1f0a9b8c',
      createdAt: '2025-09-25T09:00:00Z',
    },
    {
      id: 'agr_2003',
      applicationId: 'app_1003',
      listingId: 'lst_3',
      propertyTitle: 'Siang Riverview Cottage, Pasighat',
      propertyAddress: 'Cottage 3, Riverbank Grove, Near Siang Bridge, Medical Colony, Pasighat, Arunachal Pradesh - 791102',
      tenantId: 'user_cust_101',
      tenantName: 'Aarav Sharma',
      ownerId: 'user_owner_201',
      ownerName: 'Rameshwar Kulkarni',
      monthlyRent: 9500,
      securityDeposit: 20000,
      commencementDate: '2026-01-01T00:00:00Z',
      tenancyPeriodMonths: 6,
      status: 'concluded',
      tenantSignedAt: '2025-12-28T14:20:00Z',
      ownerSignedAt: '2025-12-28T16:10:00Z',
      contractHash: '0x9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a',
      createdAt: '2025-12-28T12:00:00Z',
    },
  ];

  private reviews: DBReview[] = [
    {
      id: 'rev_1001',
      agreementId: 'agr_2002',
      listingId: 'lst_1',
      propertyTitle: 'Pine Valley Enclave, Itanagar',
      tenantId: 'user_cust_101',
      tenantName: 'Aarav Sharma',
      ownerId: 'user_owner_201',
      ownerName: 'Rameshwar Kulkarni',
      propertyRating: 5,
      ownerRating: 5,
      overallRating: 5.0,
      cleanlinessRating: 5,
      maintenanceRating: 5,
      communicationRating: 5,
      depositReturnRating: 5,
      title: 'Flawless tenancy & timely security deposit refund!',
      reviewText:
        'Stayed at Pine Valley Enclave for 11 months. The house was in pristine condition, water supply was reliable, and Mr. Kulkarni was exceptionally respectful and communicative. Full security deposit was refunded on the very day of key handover.',
      tags: ['Smooth Deposit Return', 'Quiet Neighborhood', 'Prompt Maintenance', 'Great Landlord'],
      moderationStatus: 'approved',
      autoModerated: true,
      ownerResponse:
        'Thank you Aarav for taking great care of the property throughout your tenancy! You are welcome back anytime.',
      ownerRespondedAt: '2026-09-02T10:00:00Z',
      createdAt: '2026-09-01T15:30:00Z',
    },
    {
      id: 'rev_1002',
      agreementId: 'agr_9999',
      listingId: 'lst_2',
      propertyTitle: 'Pine Grove Villa, Naharlagun',
      tenantId: 'user_cust_102',
      tenantName: 'Priyanka Sen',
      ownerId: 'user_owner_202',
      ownerName: 'Meenakshi Iyer',
      propertyRating: 1,
      ownerRating: 2,
      overallRating: 1.5,
      cleanlinessRating: 2,
      maintenanceRating: 1,
      communicationRating: 2,
      depositReturnRating: 1,
      title: 'Unresolved water pressure issues and call me 9876543210 for scam details',
      reviewText:
        'Water pressure in bathroom was poor. Landlord took two weeks to send a plumber. Anyone looking to rent here should call me on 9876543210 to hear the truth about this scam building.',
      tags: ['Maintenance Delays'],
      moderationStatus: 'flagged',
      flaggedReason: 'Direct phone numbers or contact details are not permitted in public reviews; Inappropriate or abusive language detected ("scam")',
      autoModerated: true,
      createdAt: '2026-10-15T11:00:00Z',
    },
  ];

  private refunds: DBRefundRecord[] = [];
  private reports: DBRejectionReport[] = [];
  private consents: DBConsentLog[] = [];
  private notificationDispatches: DBNotificationDispatch[] = [];

  public async findUserByEmail(emailOrUsername: string): Promise<DBUser | undefined> {
    const clean = emailOrUsername.trim().toLowerCase();
    return this.users.find((u) => {
      const emailLower = u.email.toLowerCase();
      const idLower = u.id.toLowerCase();
      const prefix = emailLower.split('@')[0];
      return emailLower === clean || idLower === clean || prefix === clean;
    });
  }

  public async findUserById(id: string): Promise<DBUser | undefined> {
    return this.users.find((u) => u.id === id);
  }

  public async createUser(user: DBUser): Promise<DBUser> {
    this.users.push(user);
    return user;
  }

  public async getCustomerProfile(userId: string): Promise<DBCustomerProfile | undefined> {
    return this.customerProfiles.find((p) => p.userId === userId);
  }

  public async upsertCustomerProfile(profile: DBCustomerProfile): Promise<DBCustomerProfile> {
    const idx = this.customerProfiles.findIndex((p) => p.userId === profile.userId);
    if (idx >= 0) {
      this.customerProfiles[idx] = { ...this.customerProfiles[idx], ...profile };
      return this.customerProfiles[idx];
    }
    this.customerProfiles.push(profile);
    return profile;
  }

  public async getOwnerProfile(userId: string): Promise<DBOwnerProfile | undefined> {
    return this.ownerProfiles.find((p) => p.userId === userId);
  }

  public async upsertOwnerProfile(profile: DBOwnerProfile): Promise<DBOwnerProfile> {
    const idx = this.ownerProfiles.findIndex((p) => p.userId === profile.userId);
    if (idx >= 0) {
      this.ownerProfiles[idx] = { ...this.ownerProfiles[idx], ...profile };
      return this.ownerProfiles[idx];
    }
    this.ownerProfiles.push(profile);
    return profile;
  }

  public async getProperties(ownerId?: string, filters?: PropertyFilters): Promise<DBProperty[]> {
    let list = this.properties;
    if (ownerId) list = list.filter((p) => p.ownerId === ownerId);
    if (filters?.category) list = list.filter((p) => p.category === filters.category);
    if (filters?.locality) list = list.filter((p) => p.locality.toLowerCase().includes(filters.locality!.toLowerCase()));
    if (filters?.city) list = list.filter((p) => p.city.toLowerCase() === filters.city!.toLowerCase());
    if (filters?.minRent !== undefined) list = list.filter((p) => p.rentMonthly >= filters.minRent!);
    if (filters?.maxRent !== undefined) list = list.filter((p) => p.rentMonthly <= filters.maxRent!);
    if (filters?.bhk) list = list.filter((p) => p.bhk === filters.bhk);
    return list;
  }

  public async findPropertyById(id: string): Promise<DBProperty | undefined> {
    const prop = this.properties.find((p) => p.id === id);
    if (!prop) return undefined;
    const units = this.propertyUnits.filter((u) => u.propertyId === id);
    const rooms = this.propertyRooms.filter((r) => r.propertyId === id).map((r) => ({
      ...r,
      beds: this.bedInventory.filter((b) => b.roomId === r.id),
    }));
    const beds = this.bedInventory.filter((b) => b.propertyId === id);
    const meta = this.pgHostelMetadata.find((m) => m.propertyId === id);
    return {
      ...prop,
      units,
      rooms,
      beds,
      pgHostelMetadata: meta,
    };
  }

  public async createProperty(prop: DBProperty): Promise<DBProperty> {
    this.properties.push(prop);
    return prop;
  }

  public async createPropertyUnit(unit: DBPropertyUnit): Promise<DBPropertyUnit> {
    this.propertyUnits.push(unit);
    return unit;
  }

  public async getPropertyUnits(propertyId: string): Promise<DBPropertyUnit[]> {
    return this.propertyUnits.filter((u) => u.propertyId === propertyId);
  }

  public async createPropertyRoom(room: DBPropertyRoom): Promise<DBPropertyRoom> {
    this.propertyRooms.push(room);
    return room;
  }

  public async getPropertyRooms(propertyId: string): Promise<DBPropertyRoom[]> {
    return this.propertyRooms.filter((r) => r.propertyId === propertyId).map((r) => ({
      ...r,
      beds: this.bedInventory.filter((b) => b.roomId === r.id),
    }));
  }

  public async createBedInventory(bed: DBBedInventoryItem): Promise<DBBedInventoryItem> {
    this.bedInventory.push(bed);
    return bed;
  }

  public async getBedInventory(propertyId: string, roomId?: string): Promise<DBBedInventoryItem[]> {
    let list = this.bedInventory.filter((b) => b.propertyId === propertyId);
    if (roomId) list = list.filter((b) => b.roomId === roomId);
    return list;
  }

  public async updateBedStatus(
    bedId: string,
    status: DBBedInventoryItem['status'],
    tenantId?: string | null,
    expectedVersion?: number
  ): Promise<{ success: boolean; bed?: DBBedInventoryItem; error?: string }> {
    const bed = this.bedInventory.find((b) => b.id === bedId);
    if (!bed) return { success: false, error: 'Bed not found' };
    if (expectedVersion !== undefined && bed.version !== expectedVersion) {
      return { success: false, error: 'CONCURRENCY_CONFLICT: Bed state has changed.' };
    }
    bed.status = status;
    if (tenantId !== undefined) bed.tenantId = tenantId;
    bed.version += 1;
    bed.updatedAt = new Date().toISOString();

    const room = this.propertyRooms.find((r) => r.id === bed.roomId);
    if (room) {
      const roomBeds = this.bedInventory.filter((b) => b.roomId === room.id);
      room.occupiedBeds = roomBeds.filter((b) => b.status === 'OCCUPIED').length;
      room.status = room.occupiedBeds >= room.totalBeds ? 'FULL' : 'AVAILABLE';
    }

    return { success: true, bed };
  }

  public async upsertPgHostelMetadata(metadata: DBPgHostelMetadata): Promise<DBPgHostelMetadata> {
    const idx = this.pgHostelMetadata.findIndex((m) => m.propertyId === metadata.propertyId);
    if (idx >= 0) {
      this.pgHostelMetadata[idx] = { ...this.pgHostelMetadata[idx], ...metadata, updatedAt: new Date().toISOString() };
      return this.pgHostelMetadata[idx];
    }
    this.pgHostelMetadata.push(metadata);
    return metadata;
  }

  public async getPgHostelMetadata(propertyId: string): Promise<DBPgHostelMetadata | undefined> {
    return this.pgHostelMetadata.find((m) => m.propertyId === propertyId);
  }

  public async updateProperty(id: string, updates: Partial<DBProperty>): Promise<DBProperty | undefined> {
    const idx = this.properties.findIndex((p) => p.id === id);
    if (idx < 0) return undefined;
    this.properties[idx] = { ...this.properties[idx], ...updates };
    return this.properties[idx];
  }

  public async deleteProperty(id: string): Promise<boolean> {
    const initialLen = this.properties.length;
    this.properties = this.properties.filter((p) => p.id !== id);
    return this.properties.length < initialLen;
  }

  public async getSavedProperties(userId: string): Promise<DBProperty[]> {
    const savedIds = this.savedProperties.filter((s) => s.userId === userId).map((s) => s.propertyId);
    return this.properties.filter((p) => savedIds.includes(p.id));
  }

  public async saveProperty(userId: string, propertyId: string): Promise<boolean> {
    if (!this.savedProperties.some((s) => s.userId === userId && s.propertyId === propertyId)) {
      this.savedProperties.push({
        id: `save_${Date.now()}`,
        userId,
        propertyId,
        createdAt: new Date().toISOString(),
      });
    }
    return true;
  }

  public async unsaveProperty(userId: string, propertyId: string): Promise<boolean> {
    this.savedProperties = this.savedProperties.filter(
      (s) => !(s.userId === userId && s.propertyId === propertyId)
    );
    return true;
  }

  public async getApplications(userId?: string, role?: string, ownerId?: string): Promise<DBApplication[]> {
    if (role === 'CUSTOMER' && userId) {
      return this.applications.filter((a) => a.customerId === userId);
    }
    if (role === 'OWNER' && ownerId) {
      const ownedPropertyIds = this.properties.filter((p) => p.ownerId === ownerId).map((p) => p.id);
      return this.applications.filter((a) => ownedPropertyIds.includes(a.listingId));
    }
    return this.applications;
  }

  public async findApplicationById(id: string): Promise<DBApplication | undefined> {
    return this.applications.find((a) => a.id === id);
  }

  public async createApplication(app: DBApplication): Promise<DBApplication> {
    this.applications.push(app);
    return app;
  }

  public async updateApplicationStatus(
    appId: string,
    status: DBApplication['status'],
    details?: { rejectionReasonCode?: string; rejectionReasonExplanation?: string }
  ): Promise<DBApplication | undefined> {
    const app = this.applications.find((a) => a.id === appId);
    if (!app) return undefined;
    app.status = status;
    if (details?.rejectionReasonCode) app.rejectionReasonCode = details.rejectionReasonCode;
    if (details?.rejectionReasonExplanation) app.rejectionReasonExplanation = details.rejectionReasonExplanation;
    app.updatedAt = new Date().toISOString();
    return app;
  }

  public async getAgreements(userId?: string, role?: string): Promise<DBRentalAgreement[]> {
    if (role === 'CUSTOMER' && userId) {
      return this.agreements.filter((a) => a.tenantId === userId);
    }
    if (role === 'OWNER' && userId) {
      return this.agreements.filter((a) => a.ownerId === userId);
    }
    return this.agreements;
  }

  public async findAgreementById(id: string): Promise<DBRentalAgreement | undefined> {
    return this.agreements.find((a) => a.id === id);
  }

  public async createAgreement(agreement: DBRentalAgreement): Promise<DBRentalAgreement> {
    this.agreements.push(agreement);
    return agreement;
  }

  public async signAgreement(id: string, role: 'customer' | 'owner'): Promise<DBRentalAgreement | undefined> {
    const agr = this.agreements.find((a) => a.id === id);
    if (!agr) return undefined;
    if (role === 'customer') agr.tenantSignedAt = new Date().toISOString();
    if (role === 'owner') agr.ownerSignedAt = new Date().toISOString();
    if (agr.tenantSignedAt && agr.ownerSignedAt) agr.status = 'active';
    else agr.status = 'pending_signatures';
    return agr;
  }

  public async concludeAgreement(id: string): Promise<DBRentalAgreement | undefined> {
    const agr = this.agreements.find((a) => a.id === id);
    if (!agr) return undefined;
    agr.status = 'concluded';
    agr.updatedAt = new Date().toISOString();
    return agr;
  }

  // Reviews & Ratings
  public async createReview(review: DBReview): Promise<DBReview> {
    this.reviews.push(review);
    return review;
  }

  public async getReviews(filter?: { listingId?: string; ownerId?: string; tenantId?: string; moderationStatus?: string }): Promise<DBReview[]> {
    return this.reviews.filter((r) => {
      if (filter?.listingId && r.listingId !== filter.listingId) return false;
      if (filter?.ownerId && r.ownerId !== filter.ownerId) return false;
      if (filter?.tenantId && r.tenantId !== filter.tenantId) return false;
      if (filter?.moderationStatus && r.moderationStatus !== filter.moderationStatus) return false;
      return true;
    });
  }

  public async findReviewById(id: string): Promise<DBReview | undefined> {
    return this.reviews.find((r) => r.id === id);
  }

  public async findReviewByAgreementId(agreementId: string): Promise<DBReview | undefined> {
    return this.reviews.find((r) => r.agreementId === agreementId);
  }

  public async updateReviewModeration(
    id: string,
    status: string,
    details?: { flaggedReason?: string; moderatedBy?: string; moderationNotes?: string }
  ): Promise<DBReview | undefined> {
    const rev = this.reviews.find((r) => r.id === id);
    if (!rev) return undefined;
    rev.moderationStatus = status as any;
    if (details?.flaggedReason) rev.flaggedReason = details.flaggedReason;
    if (details?.moderatedBy) rev.moderatedBy = details.moderatedBy;
    if (details?.moderationNotes) rev.moderationNotes = details.moderationNotes;
    rev.moderatedAt = new Date().toISOString();
    rev.updatedAt = new Date().toISOString();
    return rev;
  }

  public async addOwnerResponse(id: string, _ownerId: string, response: string): Promise<DBReview | undefined> {
    const rev = this.reviews.find((r) => r.id === id);
    if (!rev) return undefined;
    rev.ownerResponse = response;
    rev.ownerRespondedAt = new Date().toISOString();
    rev.updatedAt = new Date().toISOString();
    return rev;
  }

  public async flagReview(id: string, reason: string): Promise<DBReview | undefined> {
    const rev = this.reviews.find((r) => r.id === id);
    if (!rev) return undefined;
    rev.moderationStatus = 'flagged';
    rev.flaggedReason = reason;
    rev.updatedAt = new Date().toISOString();
    return rev;
  }

  public async getPayments(payerOrPayeeId?: string): Promise<DBPayment[]> {
    if (payerOrPayeeId) {
      return this.payments.filter((p) => p.payerId === payerOrPayeeId || p.payeeId === payerOrPayeeId);
    }
    return this.payments;
  }

  public async findPaymentById(id: string): Promise<DBPayment | undefined> {
    return this.payments.find((p) => p.id === id);
  }

  public async createPayment(payment: DBPayment): Promise<DBPayment> {
    this.payments.push(payment);
    return payment;
  }

  public async updatePaymentStatus(
    paymentId: string,
    status: DBPayment['status'],
    providerReference?: string
  ): Promise<DBPayment | undefined> {
    const payment = this.payments.find((p) => p.id === paymentId);
    if (!payment) return undefined;
    payment.status = status;
    if (providerReference) {
      payment.providerReference = providerReference;
      payment.signatureVerified = true;
    }
    payment.updatedAt = new Date().toISOString();
    return payment;
  }

  public async finalizeApplicationFeePayment(
    paymentId: string,
    applicationId: string,
    providerRef: string
  ): Promise<{ payment: DBPayment; application?: DBApplication }> {
    const payment = await this.updatePaymentStatus(paymentId, 'SUCCESSFUL', providerRef);
    if (!payment) throw new Error(`Payment ${paymentId} not found`);
    const app = this.applications.find((a) => a.id === applicationId);
    if (app) {
      app.applicationFeePaid = true;
      app.paymentId = paymentId;
      app.status = 'pending';
      app.updatedAt = new Date().toISOString();
    }
    return { payment, application: app };
  }

  public async createRefund(refund: DBRefundRecord): Promise<DBRefundRecord> {
    this.refunds.push(refund);
    return refund;
  }

  public async getRefunds(userId?: string): Promise<DBRefundRecord[]> {
    if (userId) return this.refunds.filter((r) => r.userId === userId);
    return this.refunds;
  }

  public async createReport(report: DBRejectionReport): Promise<DBRejectionReport> {
    this.reports.push(report);
    return report;
  }

  public async getReports(userId?: string, role?: string): Promise<DBRejectionReport[]> {
    if (role === 'CUSTOMER' && userId) return this.reports.filter((r) => r.customerId === userId);
    if (role === 'OWNER' && userId) return this.reports.filter((r) => r.reportedOwnerId === userId);
    return this.reports;
  }

  public async updateReportStatus(
    id: string,
    status: DBRejectionReport['status'],
    adminNotes?: string
  ): Promise<DBRejectionReport | undefined> {
    const rep = this.reports.find((r) => r.id === id);
    if (!rep) return undefined;
    rep.status = status;
    if (adminNotes) rep.adminNotes = adminNotes;
    rep.resolvedAt = new Date().toISOString();
    return rep;
  }

  public async logConsent(consent: DBConsentLog): Promise<DBConsentLog> {
    this.consents.push(consent);
    return consent;
  }

  public async getConsents(userId: string): Promise<DBConsentLog[]> {
    return this.consents.filter((c) => c.userId === userId);
  }

  public async logAudit(log: Omit<DBAuditLog, 'id' | 'createdAt'>): Promise<DBAuditLog> {
    const entry: DBAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...log,
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.push(entry);
    return entry;
  }

  public async getAuditLogs(): Promise<DBAuditLog[]> {
    return this.auditLogs;
  }

  public async getAdminMetrics(): Promise<Record<string, any>> {
    const successfulPayments = this.payments.filter((p) => p.status === 'SUCCESSFUL');
    const totalVolume = successfulPayments.reduce((acc, p) => acc + p.amount, 0);
    return {
      totalUsers: this.users.length,
      totalProperties: this.properties.length,
      totalApplications: this.applications.length,
      totalPayments: this.payments.length,
      totalVolume,
      activeReports: this.reports.filter((r) => r.status === 'pending_review').length,
    };
  }

  public async getOwnerMetrics(ownerId: string): Promise<Record<string, any>> {
    const props = this.properties.filter((p) => p.ownerId === ownerId);
    const propIds = props.map((p) => p.id);
    const apps = this.applications.filter((a) => propIds.includes(a.listingId));
    const totalUnits = props.reduce((acc, p) => acc + (p.totalUnits || 1), 0);
    const occupiedUnits = props.reduce((acc, p) => acc + (p.occupiedUnits || 0), 0);
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
    return {
      propertiesCount: props.length,
      applicationsCount: apps.length,
      totalUnits,
      occupiedUnits,
      occupancyRate: Math.round(occupancyRate),
    };
  }

  // Notification Dispatches (In-memory development fallback)
  public async createNotificationDispatch(dispatch: DBNotificationDispatch): Promise<DBNotificationDispatch> {
    if (dispatch.idempotencyKey) {
      const existing = this.notificationDispatches.find((d) => d.idempotencyKey === dispatch.idempotencyKey);
      if (existing) {
        return existing;
      }
    }
    this.notificationDispatches.unshift(dispatch);
    return dispatch;
  }

  public async findNotificationDispatchById(id: string): Promise<DBNotificationDispatch | undefined> {
    return this.notificationDispatches.find((d) => d.id === id);
  }

  public async findNotificationDispatchByIdempotencyKey(key: string): Promise<DBNotificationDispatch | undefined> {
    return this.notificationDispatches.find((d) => d.idempotencyKey === key);
  }

  public async getNotificationDispatches(filter?: { applicationId?: string; recipientEmail?: string }): Promise<DBNotificationDispatch[]> {
    return this.notificationDispatches.filter((d) => {
      if (filter?.applicationId && d.applicationId !== filter.applicationId) return false;
      if (filter?.recipientEmail && d.recipientEmail.toLowerCase() !== filter.recipientEmail.toLowerCase()) return false;
      return true;
    });
  }

  public async updateNotificationDispatch(id: string, updates: Partial<DBNotificationDispatch>): Promise<DBNotificationDispatch | undefined> {
    const idx = this.notificationDispatches.findIndex((d) => d.id === id);
    if (idx === -1) return undefined;
    this.notificationDispatches[idx] = {
      ...this.notificationDispatches[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.notificationDispatches[idx];
  }

  // Delegated Memberships & Secondary Access
  public async findBrokerMembershipByUserId(userId: string): Promise<DBBrokerMembership | undefined> {
    return this.brokerMemberships.find((m) => m.userId === userId);
  }

  public async findStaffMembershipByUserId(userId: string): Promise<DBStaffMembership | undefined> {
    return this.staffMemberships.find((m) => m.userId === userId);
  }

  public async getAgencies(): Promise<DBAgency[]> {
    return this.agencies;
  }

  public async findAgencyById(id: string): Promise<DBAgency | undefined> {
    return this.agencies.find((a) => a.id === id);
  }

  public async createAgency(agency: DBAgency): Promise<DBAgency> {
    this.agencies.push(agency);
    return agency;
  }

  public async createBrokerMembership(membership: DBBrokerMembership): Promise<DBBrokerMembership> {
    const existingIdx = this.brokerMemberships.findIndex(
      (m) => m.userId === membership.userId && m.agencyId === membership.agencyId
    );
    if (existingIdx >= 0) {
      this.brokerMemberships[existingIdx] = membership;
      return membership;
    }
    this.brokerMemberships.push(membership);
    return membership;
  }

  public async updateBrokerMembershipStatus(membershipId: string, status: DBBrokerMembership['status']): Promise<boolean> {
    const m = this.brokerMemberships.find((item) => item.id === membershipId);
    if (!m) return false;
    m.status = status;
    m.updatedAt = new Date().toISOString();
    return true;
  }

  public async createStaffMembership(membership: DBStaffMembership): Promise<DBStaffMembership> {
    const existingIdx = this.staffMemberships.findIndex((m) => m.userId === membership.userId);
    if (existingIdx >= 0) {
      this.staffMemberships[existingIdx] = membership;
      return membership;
    }
    this.staffMemberships.push(membership);
    return membership;
  }

  public async updateStaffMembershipStatus(membershipId: string, status: DBStaffMembership['status']): Promise<boolean> {
    const m = this.staffMemberships.find((item) => item.id === membershipId);
    if (!m) return false;
    m.status = status;
    m.updatedAt = new Date().toISOString();
    return true;
  }

  public async createPropertyAuthorization(auth: DBPropertyAuthorization): Promise<DBPropertyAuthorization> {
    const existingIdx = this.propertyAuthorizations.findIndex(
      (a) => a.propertyId === auth.propertyId && a.agencyId === auth.agencyId
    );
    if (existingIdx >= 0) {
      this.propertyAuthorizations[existingIdx] = auth;
      return auth;
    }
    this.propertyAuthorizations.push(auth);
    return auth;
  }

  public async findPropertyAuthorization(propertyId: string, agencyId: string): Promise<DBPropertyAuthorization | undefined> {
    return this.propertyAuthorizations.find(
      (a) => a.propertyId === propertyId && a.agencyId === agencyId
    );
  }

  public async updatePropertyAuthorizationStatus(
    authId: string,
    status: DBPropertyAuthorization['verificationStatus'],
    verifiedBy?: string
  ): Promise<boolean> {
    const a = this.propertyAuthorizations.find((item) => item.id === authId);
    if (!a) return false;
    a.verificationStatus = status;
    if (verifiedBy) {
      a.verifiedBy = verifiedBy;
      a.verifiedAt = new Date().toISOString();
    }
    a.updatedAt = new Date().toISOString();
    return true;
  }
}

/**
 * Unified Database Router:
 * Strictly routes to PostgresRepository when PostgreSQL is connected.
 * In production mode, in-memory fallback is completely DISABLED:
 * queries raise a 503 Service Unavailable operational error if the database is disconnected.
 */
class UnifiedDatabaseProxy implements IRepository {
  private pgRepo = new PostgresRepository();
  private devRepo = new InMemoryDevRepository();

  public get activeStorageMode(): 'POSTGRESQL' | 'IN_MEMORY_FALLBACK' {
    return isDbConnected() ? 'POSTGRESQL' : 'IN_MEMORY_FALLBACK';
  }

  private get activeRepo(): IRepository {
    if (isDbConnected()) {
      return this.pgRepo;
    }
    if (ENV.NODE_ENV === 'production') {
      throw new Error(
        '503_DATABASE_UNAVAILABLE: PostgreSQL is not connected in production mode. In-memory fallback is disabled.'
      );
    }
    return this.devRepo;
  }

  public async findUserByEmail(email: string) {
    return this.activeRepo.findUserByEmail(email);
  }
  public async findUserById(id: string) {
    return this.activeRepo.findUserById(id);
  }
  public async createUser(user: DBUser) {
    return this.activeRepo.createUser(user);
  }

  public async getCustomerProfile(userId: string) {
    return this.activeRepo.getCustomerProfile(userId);
  }
  public async upsertCustomerProfile(profile: DBCustomerProfile) {
    return this.activeRepo.upsertCustomerProfile(profile);
  }
  public async getOwnerProfile(userId: string) {
    return this.activeRepo.getOwnerProfile(userId);
  }
  public async upsertOwnerProfile(profile: DBOwnerProfile) {
    return this.activeRepo.upsertOwnerProfile(profile);
  }

  public async getProperties(ownerId?: string, filters?: PropertyFilters) {
    return this.activeRepo.getProperties(ownerId, filters);
  }
  public async findPropertyById(id: string) {
    return this.activeRepo.findPropertyById(id);
  }
  public async createProperty(prop: DBProperty) {
    return this.activeRepo.createProperty(prop);
  }
  public async updateProperty(id: string, updates: Partial<DBProperty>) {
    return this.activeRepo.updateProperty(id, updates);
  }
  public async deleteProperty(id: string) {
    return this.activeRepo.deleteProperty(id);
  }
  public async getSavedProperties(userId: string) {
    return this.activeRepo.getSavedProperties(userId);
  }
  public async saveProperty(userId: string, propertyId: string) {
    return this.activeRepo.saveProperty(userId, propertyId);
  }
  public async unsaveProperty(userId: string, propertyId: string) {
    return this.activeRepo.unsaveProperty(userId, propertyId);
  }

  public async createPropertyUnit(unit: DBPropertyUnit) {
    return this.activeRepo.createPropertyUnit(unit);
  }
  public async getPropertyUnits(propertyId: string) {
    return this.activeRepo.getPropertyUnits(propertyId);
  }
  public async createPropertyRoom(room: DBPropertyRoom) {
    return this.activeRepo.createPropertyRoom(room);
  }
  public async getPropertyRooms(propertyId: string) {
    return this.activeRepo.getPropertyRooms(propertyId);
  }
  public async createBedInventory(bed: DBBedInventoryItem) {
    return this.activeRepo.createBedInventory(bed);
  }
  public async getBedInventory(propertyId: string, roomId?: string) {
    return this.activeRepo.getBedInventory(propertyId, roomId);
  }
  public async updateBedStatus(
    bedId: string,
    status: DBBedInventoryItem['status'],
    tenantId?: string | null,
    expectedVersion?: number
  ) {
    return this.activeRepo.updateBedStatus(bedId, status, tenantId, expectedVersion);
  }
  public async upsertPgHostelMetadata(metadata: DBPgHostelMetadata) {
    return this.activeRepo.upsertPgHostelMetadata(metadata);
  }
  public async getPgHostelMetadata(propertyId: string) {
    return this.activeRepo.getPgHostelMetadata(propertyId);
  }

  public async getApplications(userId?: string, role?: string, ownerId?: string) {
    return this.activeRepo.getApplications(userId, role, ownerId);
  }
  public async findApplicationById(id: string) {
    return this.activeRepo.findApplicationById(id);
  }
  public async createApplication(app: DBApplication) {
    return this.activeRepo.createApplication(app);
  }
  public async updateApplicationStatus(
    appId: string,
    status: DBApplication['status'],
    details?: { rejectionReasonCode?: string; rejectionReasonExplanation?: string }
  ) {
    return this.activeRepo.updateApplicationStatus(appId, status, details);
  }

  public async getAgreements(userId?: string, role?: string) {
    return this.activeRepo.getAgreements(userId, role);
  }
  public async findAgreementById(id: string) {
    return this.activeRepo.findAgreementById(id);
  }
  public async createAgreement(agreement: DBRentalAgreement) {
    return this.activeRepo.createAgreement(agreement);
  }
  public async signAgreement(id: string, role: 'customer' | 'owner') {
    return this.activeRepo.signAgreement(id, role);
  }
  public async concludeAgreement(id: string) {
    return this.activeRepo.concludeAgreement(id);
  }

  // Reviews & Ratings
  public async createReview(review: DBReview) {
    return this.activeRepo.createReview(review);
  }
  public async getReviews(filter?: { listingId?: string; ownerId?: string; tenantId?: string; moderationStatus?: string }) {
    return this.activeRepo.getReviews(filter);
  }
  public async findReviewById(id: string) {
    return this.activeRepo.findReviewById(id);
  }
  public async findReviewByAgreementId(agreementId: string) {
    return this.activeRepo.findReviewByAgreementId(agreementId);
  }
  public async updateReviewModeration(id: string, status: string, details?: { flaggedReason?: string; moderatedBy?: string; moderationNotes?: string }) {
    return this.activeRepo.updateReviewModeration(id, status, details);
  }
  public async addOwnerResponse(id: string, ownerId: string, response: string) {
    return this.activeRepo.addOwnerResponse(id, ownerId, response);
  }
  public async flagReview(id: string, reason: string) {
    return this.activeRepo.flagReview(id, reason);
  }

  public async getPayments(payerOrPayeeId?: string) {
    return this.activeRepo.getPayments(payerOrPayeeId);
  }
  public async findPaymentById(id: string) {
    return this.activeRepo.findPaymentById(id);
  }
  public async createPayment(payment: DBPayment) {
    return this.activeRepo.createPayment(payment);
  }
  public async updatePaymentStatus(paymentId: string, status: DBPayment['status'], providerReference?: string) {
    return this.activeRepo.updatePaymentStatus(paymentId, status, providerReference);
  }
  public async finalizeApplicationFeePayment(paymentId: string, applicationId: string, providerRef: string) {
    return this.activeRepo.finalizeApplicationFeePayment(paymentId, applicationId, providerRef);
  }
  public async createRefund(refund: DBRefundRecord) {
    return this.activeRepo.createRefund(refund);
  }
  public async getRefunds(userId?: string) {
    return this.activeRepo.getRefunds(userId);
  }

  public async createReport(report: DBRejectionReport) {
    return this.activeRepo.createReport(report);
  }
  public async getReports(userId?: string, role?: string) {
    return this.activeRepo.getReports(userId, role);
  }
  public async updateReportStatus(id: string, status: DBRejectionReport['status'], adminNotes?: string) {
    return this.activeRepo.updateReportStatus(id, status, adminNotes);
  }

  public async logConsent(consent: DBConsentLog) {
    return this.activeRepo.logConsent(consent);
  }
  public async getConsents(userId: string) {
    return this.activeRepo.getConsents(userId);
  }

  public async logAudit(log: Omit<DBAuditLog, 'id' | 'createdAt'>) {
    return this.activeRepo.logAudit(log);
  }
  public async getAuditLogs() {
    return this.activeRepo.getAuditLogs();
  }

  public async getAdminMetrics() {
    return this.activeRepo.getAdminMetrics();
  }
  public async getOwnerMetrics(ownerId: string) {
    return this.activeRepo.getOwnerMetrics(ownerId);
  }

  // Notification Dispatches
  public async createNotificationDispatch(dispatch: DBNotificationDispatch) {
    return this.activeRepo.createNotificationDispatch(dispatch);
  }
  public async findNotificationDispatchById(id: string) {
    return this.activeRepo.findNotificationDispatchById(id);
  }
  public async findNotificationDispatchByIdempotencyKey(key: string) {
    return this.activeRepo.findNotificationDispatchByIdempotencyKey(key);
  }
  public async getNotificationDispatches(filter?: { applicationId?: string; recipientEmail?: string }) {
    return this.activeRepo.getNotificationDispatches(filter);
  }
  public async updateNotificationDispatch(id: string, updates: Partial<DBNotificationDispatch>) {
    return this.activeRepo.updateNotificationDispatch(id, updates);
  }

  // Delegated Memberships & Secondary Access
  public async findBrokerMembershipByUserId(userId: string) {
    return this.activeRepo.findBrokerMembershipByUserId(userId);
  }
  public async findStaffMembershipByUserId(userId: string) {
    return this.activeRepo.findStaffMembershipByUserId(userId);
  }
  public async getAgencies() {
    return this.activeRepo.getAgencies();
  }
  public async findAgencyById(id: string) {
    return this.activeRepo.findAgencyById(id);
  }
  public async createAgency(agency: DBAgency) {
    return this.activeRepo.createAgency(agency);
  }
  public async createBrokerMembership(membership: DBBrokerMembership) {
    return this.activeRepo.createBrokerMembership(membership);
  }
  public async updateBrokerMembershipStatus(membershipId: string, status: DBBrokerMembership['status']) {
    return this.activeRepo.updateBrokerMembershipStatus(membershipId, status);
  }
  public async createStaffMembership(membership: DBStaffMembership) {
    return this.activeRepo.createStaffMembership(membership);
  }
  public async updateStaffMembershipStatus(membershipId: string, status: DBStaffMembership['status']) {
    return this.activeRepo.updateStaffMembershipStatus(membershipId, status);
  }
  public async createPropertyAuthorization(auth: DBPropertyAuthorization) {
    return this.activeRepo.createPropertyAuthorization(auth);
  }
  public async findPropertyAuthorization(propertyId: string, agencyId: string) {
    return this.activeRepo.findPropertyAuthorization(propertyId, agencyId);
  }
  public async updatePropertyAuthorizationStatus(authId: string, status: DBPropertyAuthorization['verificationStatus'], verifiedBy?: string) {
    return this.activeRepo.updatePropertyAuthorizationStatus(authId, status, verifiedBy);
  }
}

export const db = new UnifiedDatabaseProxy();
