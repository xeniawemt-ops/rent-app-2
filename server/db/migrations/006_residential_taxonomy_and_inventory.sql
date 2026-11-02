-- Migration: 006_residential_taxonomy_and_inventory.sql
-- Description: Adds normalized residential property taxonomy, unit inventory,
--              room inventory, bed-level inventory, and PG/Hostel operational metadata.
-- Preserves existing listings, relationships, and historical integrity.

-- 1. Add normalized category column to properties table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'category'
  ) THEN
    ALTER TABLE properties ADD COLUMN category VARCHAR(32);
  END IF;
END $$;

-- 2. Safely backfill existing property records based on property_type heuristics
UPDATE properties
SET category = CASE
  WHEN LOWER(property_type) LIKE '%villa%' THEN 'VILLA'
  WHEN LOWER(property_type) LIKE '%independent%' OR LOWER(property_type) LIKE '%house%' OR LOWER(property_type) LIKE '%cottage%' THEN 'INDEPENDENT_HOUSE'
  WHEN LOWER(property_type) LIKE '%pg%' THEN 'PG'
  WHEN LOWER(property_type) LIKE '%hostel%' THEN 'HOSTEL'
  WHEN LOWER(property_type) LIKE '%shared%' THEN 'SHARED_ROOM'
  WHEN LOWER(property_type) LIKE '%apartment%' OR LOWER(property_type) LIKE '%flat%' OR LOWER(property_type) LIKE '%studio%' OR LOWER(property_type) LIKE '%gated%' THEN 'APARTMENT'
  ELSE 'APARTMENT'
END
WHERE category IS NULL;

-- 3. Assert NOT NULL and valid category constraint
DO $$
BEGIN
  ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_category_check;
  ALTER TABLE properties ADD CONSTRAINT properties_category_check 
    CHECK (category IN ('APARTMENT', 'INDEPENDENT_HOUSE', 'VILLA', 'PG', 'HOSTEL', 'SHARED_ROOM'));
  
  ALTER TABLE properties ALTER COLUMN category SET NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_properties_category ON properties(category);
CREATE INDEX IF NOT EXISTS idx_properties_category_status ON properties(category, status);
CREATE INDEX IF NOT EXISTS idx_properties_category_locality ON properties(category, locality);

-- 4. Property Units Table (for multi-unit residential buildings)
CREATE TABLE IF NOT EXISTS property_units (
  id VARCHAR(64) PRIMARY KEY,
  property_id VARCHAR(64) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_number VARCHAR(64) NOT NULL,
  floor_number INTEGER,
  bhk VARCHAR(32),
  rent_monthly NUMERIC(12, 2) NOT NULL CHECK (rent_monthly > 0),
  security_deposit NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (security_deposit >= 0),
  status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE')),
  furnishing_status VARCHAR(32) DEFAULT 'SEMI_FURNISHED',
  carpet_area_sqft NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_property_unit UNIQUE (property_id, unit_number)
);

CREATE INDEX IF NOT EXISTS idx_property_units_property ON property_units(property_id);
CREATE INDEX IF NOT EXISTS idx_property_units_status ON property_units(status);

-- 5. Property Rooms Table (for PG, Hostel, and Shared Room listings)
CREATE TABLE IF NOT EXISTS property_rooms (
  id VARCHAR(64) PRIMARY KEY,
  property_id VARCHAR(64) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_number VARCHAR(64) NOT NULL,
  room_type VARCHAR(32) NOT NULL CHECK (
    room_type IN ('SINGLE', 'DOUBLE_SHARING', 'TRIPLE_SHARING', 'FOUR_SHARING', 'DORMITORY')
  ),
  total_beds INTEGER NOT NULL CHECK (total_beds >= 1),
  occupied_beds INTEGER NOT NULL DEFAULT 0 CHECK (occupied_beds >= 0 AND occupied_beds <= total_beds),
  rent_per_bed NUMERIC(12, 2) NOT NULL CHECK (rent_per_bed > 0),
  security_deposit NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (security_deposit >= 0),
  attached_bathroom BOOLEAN NOT NULL DEFAULT FALSE,
  has_balcony BOOLEAN NOT NULL DEFAULT FALSE,
  air_conditioning BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'FULL', 'MAINTENANCE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_property_room UNIQUE (property_id, room_number)
);

CREATE INDEX IF NOT EXISTS idx_property_rooms_property ON property_rooms(property_id);
CREATE INDEX IF NOT EXISTS idx_property_rooms_status ON property_rooms(status);

-- 6. Bed Inventory Table (for Hostel bunks, PG beds, and Shared Rooms)
CREATE TABLE IF NOT EXISTS bed_inventory (
  id VARCHAR(64) PRIMARY KEY,
  room_id VARCHAR(64) NOT NULL REFERENCES property_rooms(id) ON DELETE CASCADE,
  property_id VARCHAR(64) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  bed_number VARCHAR(64) NOT NULL,
  bed_type VARCHAR(32) NOT NULL DEFAULT 'SINGLE' CHECK (
    bed_type IN ('SINGLE', 'BUNK_LOWER', 'BUNK_UPPER')
  ),
  rent_monthly NUMERIC(12, 2) NOT NULL CHECK (rent_monthly > 0),
  security_deposit NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (security_deposit >= 0),
  status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE' CHECK (
    status IN ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE')
  ),
  tenant_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_room_bed UNIQUE (room_id, bed_number)
);

CREATE INDEX IF NOT EXISTS idx_bed_inventory_room ON bed_inventory(room_id);
CREATE INDEX IF NOT EXISTS idx_bed_inventory_property ON bed_inventory(property_id);
CREATE INDEX IF NOT EXISTS idx_bed_inventory_status ON bed_inventory(status);
CREATE INDEX IF NOT EXISTS idx_bed_inventory_tenant ON bed_inventory(tenant_id);

-- 7. PG & Hostel Metadata Table (Operational specifications)
CREATE TABLE IF NOT EXISTS pg_hostel_metadata (
  id VARCHAR(64) PRIMARY KEY,
  property_id VARCHAR(64) NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
  food_included BOOLEAN NOT NULL DEFAULT FALSE,
  meal_offerings JSONB NOT NULL DEFAULT '[]'::jsonb,
  dietary_policy VARCHAR(32) NOT NULL DEFAULT 'ANY' CHECK (
    dietary_policy IN ('VEG_ONLY', 'NON_VEG_ALLOWED', 'JAIN_AVAILABLE', 'ANY')
  ),
  gender_preference VARCHAR(32) NOT NULL DEFAULT 'ALL' CHECK (
    gender_preference IN ('MALE_ONLY', 'FEMALE_ONLY', 'CO_ED', 'ALL')
  ),
  curfew_time VARCHAR(32),
  notice_period_days INTEGER NOT NULL DEFAULT 30 CHECK (notice_period_days >= 0),
  gate_closing_time VARCHAR(32),
  warden_contact_name VARCHAR(128),
  warden_contact_phone VARCHAR(32),
  common_facilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  rules_and_regulations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pg_metadata_property ON pg_hostel_metadata(property_id);
CREATE INDEX IF NOT EXISTS idx_pg_metadata_gender ON pg_hostel_metadata(gender_preference);
CREATE INDEX IF NOT EXISTS idx_pg_metadata_diet ON pg_hostel_metadata(dietary_policy);
