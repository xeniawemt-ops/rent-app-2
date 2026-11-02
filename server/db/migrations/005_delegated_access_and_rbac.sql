-- Migration: 005_delegated_access_and_rbac.sql
-- Description: Establishes delegated secondary access architecture (Agencies, Broker Memberships,
--              Staff Memberships, and Property Authorizations) while strictly preserving
--              the three primary account roles (CUSTOMER, OWNER, ADMIN) on users.role.

-- 1. Ensure all existing users strictly adhere to the 3 primary roles
DO $$
BEGIN
  -- Safe reconciliation of any historical prototype accounts:
  -- Any non-conforming role is mapped safely to CUSTOMER or OWNER
  UPDATE users SET role = 'OWNER' WHERE role IN ('BROKER_ADMIN');
  UPDATE users SET role = 'CUSTOMER' WHERE role NOT IN ('CUSTOMER', 'OWNER', 'ADMIN');

  -- Re-assert users role check constraint
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('CUSTOMER', 'OWNER', 'ADMIN'));
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- 2. Broker Agencies Table
CREATE TABLE IF NOT EXISTS agencies (
  id VARCHAR(64) PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  registration_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (
    verification_status IN ('PENDING', 'VERIFIED', 'SUSPENDED', 'REJECTED')
  ),
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(32) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agencies_status ON agencies(verification_status);
CREATE INDEX IF NOT EXISTS idx_agencies_email ON agencies(contact_email);

-- 3. Broker Memberships Table (Delegated Secondary Access for Agencies)
CREATE TABLE IF NOT EXISTS broker_memberships (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agency_id VARCHAR(64) NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  membership_role VARCHAR(32) NOT NULL CHECK (membership_role IN ('BROKER_ADMIN', 'BROKER_STAFF')),
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'REVOKED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_broker_membership UNIQUE (user_id, agency_id)
);

CREATE INDEX IF NOT EXISTS idx_broker_memberships_user ON broker_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_broker_memberships_agency ON broker_memberships(agency_id);
CREATE INDEX IF NOT EXISTS idx_broker_memberships_status ON broker_memberships(status);
CREATE INDEX IF NOT EXISTS idx_broker_memberships_role ON broker_memberships(membership_role);

-- 4. Internal Staff Memberships Table (Delegated Operations Access for NivasPay Employees)
CREATE TABLE IF NOT EXISTS staff_memberships (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  staff_role VARCHAR(32) NOT NULL CHECK (staff_role IN ('NIVASPAY_RM', 'OPERATIONS_MANAGER')),
  assigned_region VARCHAR(100) NOT NULL DEFAULT 'All',
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'REVOKED')),
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_staff_membership_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_memberships_user ON staff_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_memberships_role ON staff_memberships(staff_role);
CREATE INDEX IF NOT EXISTS idx_staff_memberships_status ON staff_memberships(status);

-- 5. Property Authorizations Table (Decoupling Property Ownership from Listing Management)
CREATE TABLE IF NOT EXISTS property_authorizations (
  id VARCHAR(64) PRIMARY KEY,
  property_id VARCHAR(64) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  agency_id VARCHAR(64) NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  permission_scope VARCHAR(64) NOT NULL DEFAULT 'LISTING_AND_LEADS' CHECK (
    permission_scope IN ('LISTING_MANAGEMENT', 'LEAD_HANDLING', 'LISTING_AND_LEADS', 'FULL_MANAGEMENT')
  ),
  authorization_type VARCHAR(32) NOT NULL DEFAULT 'NON_EXCLUSIVE' CHECK (
    authorization_type IN ('EXCLUSIVE', 'NON_EXCLUSIVE')
  ),
  doc_reference VARCHAR(255),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMPTZ NOT NULL,
  verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (
    verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'REVOKED', 'EXPIRED')
  ),
  verified_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_property_agency_auth UNIQUE (property_id, agency_id)
);

CREATE INDEX IF NOT EXISTS idx_property_auth_property ON property_authorizations(property_id);
CREATE INDEX IF NOT EXISTS idx_property_auth_owner ON property_authorizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_property_auth_agency ON property_authorizations(agency_id);
CREATE INDEX IF NOT EXISTS idx_property_auth_status ON property_authorizations(verification_status);
