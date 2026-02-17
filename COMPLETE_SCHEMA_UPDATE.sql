-- ==========================================
-- Complete Schema Update - All Tables and All Columns
-- تحديث شامل للسكيما - جميع الجداول والأعمدة
-- ==========================================

-- PART 1: BUILDINGS TABLE
-- جدول العمارات - جميع الأعمدة

-- Basic Information
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS plot_number VARCHAR(100);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(255);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Building Details
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS total_floors INTEGER DEFAULT 1;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS total_units INTEGER DEFAULT 0;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS reserved_units INTEGER DEFAULT 0;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS entrances INTEGER DEFAULT 1;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS parking_slots INTEGER DEFAULT 0;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS driver_rooms INTEGER DEFAULT 0;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS elevators INTEGER DEFAULT 1;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS street_type VARCHAR(50) DEFAULT 'one';
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_facing VARCHAR(50) DEFAULT 'north';
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS year_built INTEGER;

-- Legal Information
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS build_status VARCHAR(50) DEFAULT 'ready';
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS deed_number VARCHAR(100);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS land_area DECIMAL(10, 2);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_license_number VARCHAR(100);

-- Insurance
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS insurance_available BOOLEAN DEFAULT FALSE;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS insurance_policy_number VARCHAR(100);

-- Utility Meters
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS has_main_water_meter BOOLEAN DEFAULT FALSE;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS water_meter_number VARCHAR(100);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS has_main_electricity_meter BOOLEAN DEFAULT FALSE;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS electricity_meter_number VARCHAR(100);

-- Guard Information
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS guard_name VARCHAR(255);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS guard_phone VARCHAR(20);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS guard_room_number VARCHAR(50);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS guard_id_photo TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS guard_shift VARCHAR(50);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS guard_has_salary BOOLEAN DEFAULT FALSE;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS guard_salary_amount DECIMAL(15, 2);

-- Location and Media
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS google_maps_link TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS image_urls TEXT[];

-- JSONB Data
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS floors_data JSONB;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS owner_association JSONB;

-- Owner and Tracking
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ==========================================
-- PART 2: UNITS TABLE
-- جدول الوحدات - جميع الأعمدة
-- ==========================================

-- Basic Information
ALTER TABLE units ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE units ADD COLUMN IF NOT EXISTS building_id UUID;
ALTER TABLE units ADD COLUMN IF NOT EXISTS unit_number VARCHAR(50);
ALTER TABLE units ADD COLUMN IF NOT EXISTS floor INTEGER;

-- Unit Details
ALTER TABLE units ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'apartment';
ALTER TABLE units ADD COLUMN IF NOT EXISTS facing VARCHAR(50) DEFAULT 'front';

-- Specifications
ALTER TABLE units ADD COLUMN IF NOT EXISTS area DECIMAL(8, 2) DEFAULT 0;
ALTER TABLE units ADD COLUMN IF NOT EXISTS rooms INTEGER DEFAULT 1;
ALTER TABLE units ADD COLUMN IF NOT EXISTS bathrooms INTEGER DEFAULT 1;
ALTER TABLE units ADD COLUMN IF NOT EXISTS living_rooms INTEGER DEFAULT 1;
ALTER TABLE units ADD COLUMN IF NOT EXISTS kitchens INTEGER DEFAULT 1;

-- Additional Rooms
ALTER TABLE units ADD COLUMN IF NOT EXISTS maid_room BOOLEAN DEFAULT FALSE;
ALTER TABLE units ADD COLUMN IF NOT EXISTS driver_room BOOLEAN DEFAULT FALSE;
ALTER TABLE units ADD COLUMN IF NOT EXISTS entrances INTEGER DEFAULT 1;

-- Air Conditioning
ALTER TABLE units ADD COLUMN IF NOT EXISTS ac_type VARCHAR(50) DEFAULT 'split';

-- Status and Price
ALTER TABLE units ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'available';
ALTER TABLE units ADD COLUMN IF NOT EXISTS price DECIMAL(15, 2);
ALTER TABLE units ADD COLUMN IF NOT EXISTS description TEXT;

-- Tracking
ALTER TABLE units ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE units ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ==========================================
-- VERIFICATION
-- التحقق من النتائج
-- ==========================================

-- Check buildings columns
SELECT 
  'buildings' AS table_name,
  COUNT(*) AS total_columns
FROM information_schema.columns
WHERE table_name = 'buildings' 
  AND table_schema = 'public';

-- Check units columns  
SELECT 
  'units' AS table_name,
  COUNT(*) AS total_columns
FROM information_schema.columns
WHERE table_name = 'units'
  AND table_schema = 'public';

-- List all buildings columns
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'buildings'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- List all units columns
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'units'
  AND table_schema = 'public'
ORDER BY ordinal_position;
