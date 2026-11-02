-- Migration: 004_reviews_and_ratings.sql
-- Description: Tenant reviews and ratings for concluded agreements with content moderation

-- 1. Ensure rental_agreements status allows 'concluded'
DO $$
BEGIN
  -- Drop existing status check if present and add updated check constraint
  ALTER TABLE rental_agreements DROP CONSTRAINT IF EXISTS rental_agreements_status_check;
  ALTER TABLE rental_agreements ADD CONSTRAINT rental_agreements_status_check CHECK (
    status IN ('draft', 'pending_signatures', 'active', 'terminated', 'concluded')
  );
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- 2. Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(64) PRIMARY KEY,
  agreement_id VARCHAR(64) NOT NULL UNIQUE REFERENCES rental_agreements(id) ON DELETE CASCADE,
  listing_id VARCHAR(64) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  property_title VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_name VARCHAR(255) NOT NULL,
  owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_name VARCHAR(255) NOT NULL,
  
  -- Ratings (1-5 integer scale)
  property_rating INTEGER NOT NULL CHECK (property_rating >= 1 AND property_rating <= 5),
  owner_rating INTEGER NOT NULL CHECK (owner_rating >= 1 AND owner_rating <= 5),
  overall_rating NUMERIC(3, 2) NOT NULL CHECK (overall_rating >= 1.0 AND overall_rating <= 5.0),
  
  -- Sub-category optional ratings (1-5)
  cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  maintenance_rating INTEGER CHECK (maintenance_rating >= 1 AND maintenance_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  deposit_return_rating INTEGER CHECK (deposit_return_rating >= 1 AND deposit_return_rating <= 5),
  
  -- Review Text Content
  title VARCHAR(255) NOT NULL,
  review_text TEXT NOT NULL,
  tags JSONB DEFAULT '[]'::JSONB,
  
  -- Moderation System
  moderation_status VARCHAR(32) NOT NULL DEFAULT 'approved' CHECK (
    moderation_status IN ('pending_moderation', 'approved', 'flagged', 'rejected')
  ),
  flagged_reason TEXT,
  auto_moderated BOOLEAN NOT NULL DEFAULT FALSE,
  moderated_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  moderated_at TIMESTAMPTZ,
  moderation_notes TEXT,
  
  -- Owner Response
  owner_response TEXT,
  owner_responded_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_listing ON reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_owner ON reviews(owner_id);
CREATE INDEX IF NOT EXISTS idx_reviews_tenant ON reviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(moderation_status);
CREATE INDEX IF NOT EXISTS idx_reviews_agreement ON reviews(agreement_id);
