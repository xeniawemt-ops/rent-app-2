-- Migration: 002_extended_entities.sql
-- Description: Adds profiles, saved properties, agreements, refunds, grievance reports, and DPDP consent logs

-- 1. Customer Profiles Table
CREATE TABLE IF NOT EXISTS customer_profiles (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 18),
  gender VARCHAR(32) NOT NULL DEFAULT 'Prefer not to say',
  occupation VARCHAR(128) NOT NULL DEFAULT '',
  marital_status VARCHAR(32) NOT NULL DEFAULT 'Prefer not to say',
  family_size INTEGER NOT NULL DEFAULT 1 CHECK (family_size >= 1),
  has_pets BOOLEAN NOT NULL DEFAULT FALSE,
  pet_type VARCHAR(64),
  religion VARCHAR(64),
  tribe VARCHAR(64),
  consent_share_religion_tribe BOOLEAN NOT NULL DEFAULT FALSE,
  religion_tribe_consent_timestamp TIMESTAMPTZ,
  agreed_dpdp_notice_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dpdp_notice_version VARCHAR(32) NOT NULL DEFAULT 'v1.0',
  language_preference VARCHAR(10) NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_user ON customer_profiles(user_id);

-- 2. Owner Profiles Table
CREATE TABLE IF NOT EXISTS owner_profiles (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  phone_masked VARCHAR(32) NOT NULL DEFAULT '',
  phone_encrypted TEXT NOT NULL DEFAULT '',
  pan_masked VARCHAR(32) DEFAULT '',
  pan_encrypted TEXT DEFAULT '',
  pan_verified BOOLEAN NOT NULL DEFAULT FALSE,
  aadhaar_masked VARCHAR(32) DEFAULT '',
  aadhaar_encrypted TEXT DEFAULT '',
  aadhaar_verified BOOLEAN NOT NULL DEFAULT FALSE,
  kyc_verified_at TIMESTAMPTZ,
  razorpay_account_id VARCHAR(64),
  bank_account_masked VARCHAR(64),
  agreed_anti_discrimination_terms_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  strikes_count INTEGER NOT NULL DEFAULT 0,
  is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
  suspension_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_owner_profiles_user ON owner_profiles(user_id);

-- 3. Saved Properties (Customer Favorites / Wishlist)
CREATE TABLE IF NOT EXISTS saved_properties (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id VARCHAR(64) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_user_property UNIQUE (user_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_properties_user ON saved_properties(user_id);

-- 4. Rental Agreements Table
CREATE TABLE IF NOT EXISTS rental_agreements (
  id VARCHAR(64) PRIMARY KEY,
  application_id VARCHAR(64) NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
  listing_id VARCHAR(64) NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  property_title VARCHAR(255) NOT NULL,
  property_address TEXT NOT NULL,
  tenant_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  tenant_name VARCHAR(255) NOT NULL,
  owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  owner_name VARCHAR(255) NOT NULL,
  monthly_rent NUMERIC(12, 2) NOT NULL CHECK (monthly_rent > 0),
  security_deposit NUMERIC(12, 2) NOT NULL CHECK (security_deposit >= 0),
  commencement_date TIMESTAMPTZ NOT NULL,
  tenancy_period_months INTEGER NOT NULL DEFAULT 11 CHECK (tenancy_period_months >= 1),
  status VARCHAR(32) NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'pending_signatures', 'active', 'terminated')
  ),
  tenant_signed_at TIMESTAMPTZ,
  owner_signed_at TIMESTAMPTZ,
  contract_hash VARCHAR(128) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agreements_tenant ON rental_agreements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agreements_owner ON rental_agreements(owner_id);
CREATE INDEX IF NOT EXISTS idx_agreements_application ON rental_agreements(application_id);

-- 5. Refund Records Table
CREATE TABLE IF NOT EXISTS refund_records (
  id VARCHAR(64) PRIMARY KEY,
  transaction_id VARCHAR(64) NOT NULL,
  application_id VARCHAR(64) REFERENCES applications(id) ON DELETE SET NULL,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  user_name VARCHAR(255) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'Refund Requested' CHECK (
    status IN ('Refund Requested', 'Refund Approved', 'Refund Processing', 'Refund Completed', 'Refund Rejected')
  ),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMPTZ,
  reference_id VARCHAR(64) NOT NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refunds_user ON refund_records(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refund_records(status);

-- 6. Rejection Reports & Grievances Table (Anti-Discrimination Monitoring)
CREATE TABLE IF NOT EXISTS rejection_reports (
  id VARCHAR(64) PRIMARY KEY,
  application_id VARCHAR(64) NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  customer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reported_owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  allegation_description TEXT NOT NULL,
  rejection_reason_given VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'pending_review' CHECK (
    status IN ('Reviewed', 'Action Taken', 'pending_review', 'strike_issued', 'owner_suspended', 'dismissed')
  ),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reports_customer ON rejection_reports(customer_id);
CREATE INDEX IF NOT EXISTS idx_reports_owner ON rejection_reports(reported_owner_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON rejection_reports(status);

-- 7. Consent Logs Table (DPDP Act 2023 Explicit Consent Audit)
CREATE TABLE IF NOT EXISTS consent_logs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type VARCHAR(64) NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT TRUE,
  version VARCHAR(32) NOT NULL DEFAULT 'v1.0',
  ip_address VARCHAR(45),
  purpose TEXT NOT NULL,
  retention_period VARCHAR(64) NOT NULL DEFAULT '7 years',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consent_logs_user ON consent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_logs_type ON consent_logs(consent_type);

-- 8. Notifications Table
CREATE TABLE IF NOT EXISTS app_notifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(32) NOT NULL DEFAULT 'application',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  link_action VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON app_notifications(user_id);
