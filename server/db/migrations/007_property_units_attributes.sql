-- Migration: 007_property_units_attributes.sql
-- Description: Extends property_units with unit_type, bedrooms, bathrooms, and availability_status.
--              Extends property_rooms check constraint to support PRIVATE_ROOM alongside SINGLE.
-- Preserves all existing records, foreign keys, and unique constraints.

-- 1. Add missing attributes to property_units
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_units' AND column_name = 'unit_type'
  ) THEN
    ALTER TABLE property_units ADD COLUMN unit_type VARCHAR(64) DEFAULT 'Standard';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_units' AND column_name = 'bedrooms'
  ) THEN
    ALTER TABLE property_units ADD COLUMN bedrooms INTEGER DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_units' AND column_name = 'bathrooms'
  ) THEN
    ALTER TABLE property_units ADD COLUMN bathrooms INTEGER DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_units' AND column_name = 'availability_status'
  ) THEN
    ALTER TABLE property_units ADD COLUMN availability_status VARCHAR(32) DEFAULT 'AVAILABLE';
  END IF;
END $$;

-- 2. Backfill existing property_units rows
UPDATE property_units
SET unit_type = COALESCE(unit_type, bhk, 'Standard'),
    bedrooms = COALESCE(bedrooms, 1),
    bathrooms = COALESCE(bathrooms, 1),
    availability_status = COALESCE(availability_status, status, 'AVAILABLE');

CREATE INDEX IF NOT EXISTS idx_property_units_avail ON property_units(availability_status);
CREATE INDEX IF NOT EXISTS idx_property_units_type ON property_units(unit_type);

-- 3. Update property_rooms check constraint to support PRIVATE_ROOM
DO $$
BEGIN
  ALTER TABLE property_rooms DROP CONSTRAINT IF EXISTS property_rooms_room_type_check;
  ALTER TABLE property_rooms ADD CONSTRAINT property_rooms_room_type_check CHECK (
    room_type IN ('PRIVATE_ROOM', 'SINGLE', 'DOUBLE_SHARING', 'TRIPLE_SHARING', 'FOUR_SHARING', 'DORMITORY')
  );
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 4. Extend pg_hostel_metadata with configurable accommodation rules
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pg_hostel_metadata' AND column_name = 'visitor_policy'
  ) THEN
    ALTER TABLE pg_hostel_metadata ADD COLUMN visitor_policy VARCHAR(128) DEFAULT 'ALLOWED_WITH_PASS';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pg_hostel_metadata' AND column_name = 'guest_restrictions'
  ) THEN
    ALTER TABLE pg_hostel_metadata ADD COLUMN guest_restrictions VARCHAR(255) DEFAULT 'NO_OVERNIGHT_GUESTS';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pg_hostel_metadata' AND column_name = 'smoking_policy'
  ) THEN
    ALTER TABLE pg_hostel_metadata ADD COLUMN smoking_policy VARCHAR(64) DEFAULT 'STRICTLY_PROHIBITED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pg_hostel_metadata' AND column_name = 'min_stay_months'
  ) THEN
    ALTER TABLE pg_hostel_metadata ADD COLUMN min_stay_months INTEGER DEFAULT 1;
  END IF;
END $$;
