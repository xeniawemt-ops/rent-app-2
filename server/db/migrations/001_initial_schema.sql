-- Migration: 001_initial_schema.sql
-- Description: Core tables for NivasPay Rental Platform (India)
-- Includes: users, properties, applications, payments, and audit_logs
-- Compliant with DPDP Act 2023, RBI Payment Aggregator Guidelines, and strict FK constraints.

-- 1. Enable UUID Extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL CHECK (role IN ('CUSTOMER', 'OWNER', 'ADMIN')),
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(32),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 3. Properties Table
CREATE TABLE IF NOT EXISTS properties (
  id VARCHAR(64) PRIMARY KEY,
  owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  bhk VARCHAR(32) NOT NULL,
  rent_monthly NUMERIC(12, 2) NOT NULL CHECK (rent_monthly > 0),
  security_deposit NUMERIC(12, 2) NOT NULL CHECK (security_deposit >= 0),
  locality VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  property_type VARCHAR(64) NOT NULL,
  total_units INTEGER NOT NULL DEFAULT 1 CHECK (total_units > 0),
  occupied_units INTEGER NOT NULL DEFAULT 0 CHECK (occupied_units >= 0 AND occupied_units <= total_units),
  status VARCHAR(32) NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_city_locality ON properties(city, locality);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);

-- 4. Tenancy Applications Table
CREATE TABLE IF NOT EXISTS applications (
  id VARCHAR(64) PRIMARY KEY,
  listing_id VARCHAR(64) NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  customer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  applicant_name VARCHAR(255) NOT NULL,
  applicant_email VARCHAR(255) NOT NULL,
  monthly_income NUMERIC(12, 2) NOT NULL CHECK (monthly_income >= 0),
  status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'under_review', 'accepted', 'rejected', 'active_tenancy', 'cancelled')
  ),
  application_fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
  payment_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_applications_listing_id ON applications(listing_id);
CREATE INDEX IF NOT EXISTS idx_applications_customer_id ON applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- 5. Payments Table (RBI Compliant Ledger & Auditability)
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  application_id VARCHAR(64) REFERENCES applications(id) ON DELETE SET NULL,
  property_id VARCHAR(64) REFERENCES properties(id) ON DELETE SET NULL,
  payer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  payee_id VARCHAR(64) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  type VARCHAR(64) NOT NULL CHECK (
    type IN (
      'APPLICATION_FEE', 'BROKERAGE', 'RENT', 'DEPOSIT',
      'OWNER_PLATFORM_FEE', 'TRANSACTION_FEE', 'TAX', 'ADJUSTMENT', 'REFUND'
    )
  ),
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'SUCCESSFUL', 'SETTLED', 'FAILED', 'REVERSED')
  ),
  provider_reference VARCHAR(128),
  provider_status VARCHAR(64),
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_payer ON payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_payee ON payments(payee_id);
CREATE INDEX IF NOT EXISTS idx_payments_application ON payments(application_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 6. Audit Logs Table (DPDP Act & Tamper-Evident Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(128) NOT NULL,
  category VARCHAR(64) NOT NULL,
  details TEXT NOT NULL,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- 7. Schema Migrations Tracking Table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(64) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
