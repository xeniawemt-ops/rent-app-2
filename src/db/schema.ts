import { relations, sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  numeric,
  boolean,
  integer,
  timestamp,
  jsonb,
  check,
  unique,
} from 'drizzle-orm/pg-core';

// 1. Users Table (keyed by Firebase Auth UID or internal ID)
export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash'),
    role: text('role').notNull().default('CUSTOMER'), // 'CUSTOMER' | 'OWNER' | 'ADMIN'
    fullName: text('full_name').notNull().default(''),
    phone: text('phone'),
    isVerified: boolean('is_verified').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    roleCheck: check('users_role_check', sql`${table.role} IN ('CUSTOMER', 'OWNER', 'ADMIN')`),
  })
);

// 2. Customer Profiles Table
export const customerProfiles = pgTable('customer_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  age: integer('age').notNull().default(21),
  gender: text('gender').notNull().default('Prefer not to say'),
  occupation: text('occupation').notNull().default(''),
  maritalStatus: text('marital_status').notNull().default('Prefer not to say'),
  familySize: integer('family_size').notNull().default(1),
  hasPets: boolean('has_pets').notNull().default(false),
  petType: text('pet_type'),
  religion: text('religion'),
  tribe: text('tribe'),
  consentShareReligionTribe: boolean('consent_share_religion_tribe').notNull().default(false),
  religionTribeConsentTimestamp: timestamp('religion_tribe_consent_timestamp', { withTimezone: true }),
  agreedDpdpNoticeAt: timestamp('agreed_dpdp_notice_at', { withTimezone: true }).defaultNow().notNull(),
  dpdpNoticeVersion: text('dpdp_notice_version').notNull().default('v1.0'),
  languagePreference: text('language_preference').notNull().default('en'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 3. Owner Profiles Table
export const ownerProfiles = pgTable('owner_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  phoneMasked: text('phone_masked').notNull().default(''),
  phoneEncrypted: text('phone_encrypted').notNull().default(''),
  panMasked: text('pan_masked').default(''),
  panEncrypted: text('pan_encrypted').default(''),
  panVerified: boolean('pan_verified').notNull().default(false),
  aadhaarMasked: text('aadhaar_masked').default(''),
  aadhaarEncrypted: text('aadhaar_encrypted').default(''),
  aadhaarVerified: boolean('aadhaar_verified').notNull().default(false),
  kycVerifiedAt: timestamp('kyc_verified_at', { withTimezone: true }),
  razorpayAccountId: text('razorpay_account_id'),
  bankAccountMasked: text('bank_account_masked'),
  agreedAntiDiscriminationTermsAt: timestamp('agreed_anti_discrimination_terms_at', { withTimezone: true }).defaultNow().notNull(),
  strikesCount: integer('strikes_count').notNull().default(0),
  isSuspended: boolean('is_suspended').notNull().default(false),
  suspensionReason: text('suspension_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 4. Properties Table
export const properties = pgTable('properties', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  title: text('title').notNull(),
  bhk: text('bhk').notNull(),
  rentMonthly: numeric('rent_monthly', { precision: 12, scale: 2 }).notNull(),
  securityDeposit: numeric('security_deposit', { precision: 12, scale: 2 }).notNull(),
  locality: text('locality').notNull(),
  city: text('city').notNull(),
  propertyType: text('property_type').notNull(),
  category: text('category').notNull().default('APARTMENT'),
  totalUnits: integer('total_units').notNull().default(1),
  occupiedUnits: integer('occupied_units').notNull().default(0),
  status: text('status').notNull().default('available'),
  amenities: jsonb('amenities'),
  photos: jsonb('photos'),
  requirements: jsonb('requirements'),
  approximateLat: numeric('approximate_lat', { precision: 10, scale: 6 }),
  approximateLng: numeric('approximate_lng', { precision: 10, scale: 6 }),
  fullAddressEncrypted: text('full_address_encrypted'),
  maskedAddressPreview: text('masked_address_preview'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 5. Saved Properties (Favorites/Wishlist)
export const savedProperties = pgTable('saved_properties', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  propertyId: text('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 6. Tenancy Applications Table
export const applications = pgTable('applications', {
  id: text('id').primaryKey(),
  listingId: text('listing_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'restrict' }),
  customerId: text('customer_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  applicantName: text('applicant_name').notNull(),
  applicantEmail: text('applicant_email').notNull(),
  monthlyIncome: numeric('monthly_income', { precision: 12, scale: 2 }).notNull(),
  status: text('status').notNull().default('pending'),
  applicationFeePaid: boolean('application_fee_paid').notNull().default(false),
  applicationFeeAmount: numeric('application_fee_amount', { precision: 12, scale: 2 }).default('20.00'),
  paymentId: text('payment_id'),
  rejectionReasonCode: text('rejection_reason_code'),
  rejectionReasonExplanation: text('rejection_reason_explanation'),
  brokerageAmount: numeric('brokerage_amount', { precision: 12, scale: 2 }),
  brokeragePaid: boolean('brokerage_paid').default(false),
  depositBalanceAmount: numeric('deposit_balance_amount', { precision: 12, scale: 2 }),
  depositBalancePaid: boolean('deposit_balance_paid').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 7. Rental Agreements Table
export const rentalAgreements = pgTable('rental_agreements', {
  id: text('id').primaryKey(),
  applicationId: text('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'restrict' }),
  listingId: text('listing_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'restrict' }),
  propertyTitle: text('property_title').notNull(),
  propertyAddress: text('property_address').notNull(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  tenantName: text('tenant_name').notNull(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  ownerName: text('owner_name').notNull(),
  monthlyRent: numeric('monthly_rent', { precision: 12, scale: 2 }).notNull(),
  securityDeposit: numeric('security_deposit', { precision: 12, scale: 2 }).notNull(),
  commencementDate: timestamp('commencement_date', { withTimezone: true }).notNull(),
  tenancyPeriodMonths: integer('tenancy_period_months').notNull().default(11),
  status: text('status').notNull().default('draft'),
  tenantSignedAt: timestamp('tenant_signed_at', { withTimezone: true }),
  ownerSignedAt: timestamp('owner_signed_at', { withTimezone: true }),
  contractHash: text('contract_hash').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 8. Payments Table (RBI-compliant transaction ledger)
export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  applicationId: text('application_id').references(() => applications.id, {
    onDelete: 'set null',
  }),
  propertyId: text('property_id').references(() => properties.id, {
    onDelete: 'set null',
  }),
  payerId: text('payer_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  payeeId: text('payee_id').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('INR'),
  type: text('type').notNull(), // 'APPLICATION_FEE', 'BROKERAGE', 'RENT', 'DEPOSIT', etc.
  status: text('status').notNull().default('PENDING'),
  providerReference: text('provider_reference'),
  providerStatus: text('provider_status'),
  signatureVerified: boolean('signature_verified').notNull().default(false),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 9. Refund Records Table
export const refundRecords = pgTable('refund_records', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id').notNull(),
  applicationId: text('application_id').references(() => applications.id, { onDelete: 'set null' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  userName: text('user_name').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('Refund Requested'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  referenceId: text('reference_id').notNull(),
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 10. Rejection Reports & Anti-Discrimination Grievances
export const rejectionReports = pgTable('rejection_reports', {
  id: text('id').primaryKey(),
  applicationId: text('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  customerId: text('customer_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  reportedOwnerId: text('reported_owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  allegationDescription: text('allegation_description').notNull(),
  rejectionReasonGiven: text('rejection_reason_given'),
  status: text('status').notNull().default('pending_review'),
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});

// 11. Consent Logs Table (DPDP Act 2023 Explicit Consent Trail)
export const consentLogs = pgTable('consent_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  consentType: text('consent_type').notNull(),
  granted: boolean('granted').notNull().default(true),
  version: text('version').notNull().default('v1.0'),
  ipAddress: text('ip_address'),
  purpose: text('purpose').notNull(),
  retentionPeriod: text('retention_period').notNull().default('7 years'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});

// 12. App Notifications Table
export const appNotifications = pgTable('app_notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default('application'),
  isRead: boolean('is_read').notNull().default(false),
  linkAction: text('link_action'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 13. Audit Logs Table (Tamper-evident trail)
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  category: text('category').notNull(),
  details: text('details').notNull(),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 14. Reviews & Ratings Table (concluded tenancy reviews & moderation)
export const reviews = pgTable('reviews', {
  id: text('id').primaryKey(),
  agreementId: text('agreement_id')
    .notNull()
    .unique()
    .references(() => rentalAgreements.id, { onDelete: 'cascade' }),
  listingId: text('listing_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  propertyTitle: text('property_title').notNull(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tenantName: text('tenant_name').notNull(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  ownerName: text('owner_name').notNull(),
  propertyRating: integer('property_rating').notNull(),
  ownerRating: integer('owner_rating').notNull(),
  overallRating: numeric('overall_rating', { precision: 3, scale: 2 }).notNull(),
  cleanlinessRating: integer('cleanliness_rating'),
  maintenanceRating: integer('maintenance_rating'),
  communicationRating: integer('communication_rating'),
  depositReturnRating: integer('deposit_return_rating'),
  title: text('title').notNull(),
  reviewText: text('review_text').notNull(),
  tags: jsonb('tags'),
  moderationStatus: text('moderation_status').notNull().default('approved'),
  flaggedReason: text('flagged_reason'),
  autoModerated: boolean('auto_moderated').notNull().default(false),
  moderatedBy: text('moderated_by').references(() => users.id, { onDelete: 'set null' }),
  moderatedAt: timestamp('moderated_at', { withTimezone: true }),
  moderationNotes: text('moderation_notes'),
  ownerResponse: text('owner_response'),
  ownerRespondedAt: timestamp('owner_responded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Schema Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  customerProfile: one(customerProfiles, {
    fields: [users.id],
    references: [customerProfiles.userId],
  }),
  ownerProfile: one(ownerProfiles, {
    fields: [users.id],
    references: [ownerProfiles.userId],
  }),
  properties: many(properties),
  savedProperties: many(savedProperties),
  applications: many(applications),
  payments: many(payments),
  auditLogs: many(auditLogs),
  consentLogs: many(consentLogs),
  notifications: many(appNotifications),
  reviewsWritten: many(reviews, { relationName: 'tenantReviews' }),
  reviewsReceived: many(reviews, { relationName: 'ownerReviews' }),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  owner: one(users, {
    fields: [properties.ownerId],
    references: [users.id],
  }),
  applications: many(applications),
  payments: many(payments),
  savedBy: many(savedProperties),
  reviews: many(reviews),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  property: one(properties, {
    fields: [applications.listingId],
    references: [properties.id],
  }),
  applicant: one(users, {
    fields: [applications.customerId],
    references: [users.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  payer: one(users, {
    fields: [payments.payerId],
    references: [users.id],
  }),
  application: one(applications, {
    fields: [payments.applicationId],
    references: [applications.id],
  }),
  property: one(properties, {
    fields: [payments.propertyId],
    references: [properties.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  agreement: one(rentalAgreements, {
    fields: [reviews.agreementId],
    references: [rentalAgreements.id],
  }),
  property: one(properties, {
    fields: [reviews.listingId],
    references: [properties.id],
  }),
  tenant: one(users, {
    fields: [reviews.tenantId],
    references: [users.id],
    relationName: 'tenantReviews',
  }),
  owner: one(users, {
    fields: [reviews.ownerId],
    references: [users.id],
    relationName: 'ownerReviews',
  }),
}));

// 14. Agencies Table
export const agencies = pgTable('agencies', {
  id: text('id').primaryKey(),
  businessName: text('business_name').notNull(),
  registrationDetails: text('registration_details'),
  verificationStatus: text('verification_status').notNull().default('PENDING'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  address: text('address'),
  city: text('city'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 15. Broker Memberships Table
export const brokerMemberships = pgTable('broker_memberships', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  agencyId: text('agency_id')
    .notNull()
    .references(() => agencies.id, { onDelete: 'cascade' }),
  membershipRole: text('membership_role').notNull(), // 'BROKER_ADMIN' | 'BROKER_STAFF'
  permissions: jsonb('permissions'),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'SUSPENDED' | 'REVOKED'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 16. Staff Memberships Table
export const staffMemberships = pgTable('staff_memberships', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  staffRole: text('staff_role').notNull(), // 'NIVASPAY_RM' | 'OPERATIONS_MANAGER'
  assignedRegion: text('assigned_region').notNull().default(''),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'SUSPENDED' | 'REVOKED'
  permissions: jsonb('permissions'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 17. Property Authorizations Table
export const propertyAuthorizations = pgTable('property_authorizations', {
  id: text('id').primaryKey(),
  propertyId: text('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  agencyId: text('agency_id')
    .notNull()
    .references(() => agencies.id, { onDelete: 'cascade' }),
  permissionScope: text('permission_scope').notNull().default('LISTING_AND_VISITS'),
  authorizationType: text('authorization_type').notNull().default('NON_EXCLUSIVE'),
  docReference: text('doc_reference'),
  validFrom: timestamp('valid_from', { withTimezone: true }).defaultNow().notNull(),
  validUntil: timestamp('valid_until', { withTimezone: true }).notNull(),
  verificationStatus: text('verification_status').notNull().default('PENDING'),
  verifiedBy: text('verified_by').references(() => users.id),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const agenciesRelations = relations(agencies, ({ many }) => ({
  memberships: many(brokerMemberships),
  authorizations: many(propertyAuthorizations),
}));

export const brokerMembershipsRelations = relations(brokerMemberships, ({ one }) => ({
  user: one(users, {
    fields: [brokerMemberships.userId],
    references: [users.id],
  }),
  agency: one(agencies, {
    fields: [brokerMemberships.agencyId],
    references: [agencies.id],
  }),
}));

export const staffMembershipsRelations = relations(staffMemberships, ({ one }) => ({
  user: one(users, {
    fields: [staffMemberships.userId],
    references: [users.id],
  }),
}));

export const propertyAuthorizationsRelations = relations(propertyAuthorizations, ({ one }) => ({
  property: one(properties, {
    fields: [propertyAuthorizations.propertyId],
    references: [properties.id],
  }),
  owner: one(users, {
    fields: [propertyAuthorizations.ownerId],
    references: [users.id],
  }),
  agency: one(agencies, {
    fields: [propertyAuthorizations.agencyId],
    references: [agencies.id],
  }),
}));

// 18. Property Units Table (for multi-unit residential buildings)
export const propertyUnits = pgTable(
  'property_units',
  {
    id: text('id').primaryKey(),
    propertyId: text('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    unitNumber: text('unit_number').notNull(),
    unitType: text('unit_type').default('Standard'),
    floorNumber: integer('floor_number'),
    bedrooms: integer('bedrooms').default(1),
    bathrooms: integer('bathrooms').default(1),
    bhk: text('bhk'),
    rentMonthly: numeric('rent_monthly', { precision: 12, scale: 2 }).notNull(),
    securityDeposit: numeric('security_deposit', { precision: 12, scale: 2 }).notNull().default('0'),
    status: text('status').notNull().default('AVAILABLE'),
    availabilityStatus: text('availability_status').default('AVAILABLE'),
    furnishingStatus: text('furnishing_status').default('SEMI_FURNISHED'),
    carpetAreaSqft: numeric('carpet_area_sqft', { precision: 10, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueUnit: unique('uq_property_unit').on(table.propertyId, table.unitNumber),
  })
);

// 19. Property Rooms Table (for PG, Hostel, and Shared Room listings)
export const propertyRooms = pgTable(
  'property_rooms',
  {
    id: text('id').primaryKey(),
    propertyId: text('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    roomNumber: text('room_number').notNull(),
    roomType: text('room_type').notNull(),
    totalBeds: integer('total_beds').notNull().default(1),
    occupiedBeds: integer('occupied_beds').notNull().default(0),
    rentPerBed: numeric('rent_per_bed', { precision: 12, scale: 2 }).notNull(),
    securityDeposit: numeric('security_deposit', { precision: 12, scale: 2 }).notNull().default('0'),
    attachedBathroom: boolean('attached_bathroom').notNull().default(false),
    hasBalcony: boolean('has_balcony').notNull().default(false),
    airConditioning: boolean('air_conditioning').notNull().default(false),
    status: text('status').notNull().default('AVAILABLE'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueRoom: unique('uq_property_room').on(table.propertyId, table.roomNumber),
  })
);

// 20. Bed Inventory Table (for Hostel bunks, PG beds, and Shared Rooms)
export const bedInventory = pgTable(
  'bed_inventory',
  {
    id: text('id').primaryKey(),
    roomId: text('room_id')
      .notNull()
      .references(() => propertyRooms.id, { onDelete: 'cascade' }),
    propertyId: text('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    bedNumber: text('bed_number').notNull(),
    bedType: text('bed_type').notNull().default('SINGLE'),
    rentMonthly: numeric('rent_monthly', { precision: 12, scale: 2 }).notNull(),
    securityDeposit: numeric('security_deposit', { precision: 12, scale: 2 }).notNull().default('0'),
    status: text('status').notNull().default('AVAILABLE'),
    tenantId: text('tenant_id').references(() => users.id, { onDelete: 'set null' }),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueBed: unique('uq_room_bed').on(table.roomId, table.bedNumber),
  })
);

// 21. PG & Hostel Metadata Table (Operational specifications)
export const pgHostelMetadata = pgTable('pg_hostel_metadata', {
  id: text('id').primaryKey(),
  propertyId: text('property_id')
    .notNull()
    .unique()
    .references(() => properties.id, { onDelete: 'cascade' }),
  foodIncluded: boolean('food_included').notNull().default(false),
  mealOfferings: jsonb('meal_offerings').notNull().default([]),
  dietaryPolicy: text('dietary_policy').notNull().default('ANY'),
  genderPreference: text('gender_preference').notNull().default('ALL'),
  curfewTime: text('curfew_time'),
  noticePeriodDays: integer('notice_period_days').notNull().default(30),
  gateClosingTime: text('gate_closing_time'),
  wardenContactName: text('warden_contact_name'),
  wardenContactPhone: text('warden_contact_phone'),
  visitorPolicy: text('visitor_policy').default('ALLOWED_WITH_PASS'),
  guestRestrictions: text('guest_restrictions').default('NO_OVERNIGHT_GUESTS'),
  smokingPolicy: text('smoking_policy').default('STRICTLY_PROHIBITED'),
  minStayMonths: integer('min_stay_months').default(1),
  commonFacilities: jsonb('common_facilities').notNull().default([]),
  rulesAndRegulations: jsonb('rules_and_regulations').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const propertiesExtendedRelations = relations(properties, ({ many, one }) => ({
  units: many(propertyUnits),
  rooms: many(propertyRooms),
  beds: many(bedInventory),
  pgMetadata: one(pgHostelMetadata, {
    fields: [properties.id],
    references: [pgHostelMetadata.propertyId],
  }),
}));

