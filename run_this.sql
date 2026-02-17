-- Add all required columns to buildings table
-- Safe to run multiple times (IF NOT EXISTS)

-- Step 1: Basic Information
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS plot_number VARCHAR(100);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(255);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Step 2: Building Details
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS reserved_units INTEGER DEFAULT 0;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS parking_slots INTEGER DEFAULT 0;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS driver_rooms INTEGER DEFAULT 0;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS elevators INTEGER DEFAULT 1;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS entrances INTEGER DEFAULT 1;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS street_type VARCHAR(50) DEFAULT 'one';
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_facing VARCHAR(50) DEFAULT 'north';
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS year_built INTEGER;

-- Legal Information
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS build_status VARCHAR(50) DEFAULT 'ready';
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS deed_number VARCHAR(100);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS land_area DECIMAL(10, 2);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_license_number VARCHAR(100);

-- Insurance Information
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS insurance_available BOOLEAN DEFAULT FALSE;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS insurance_policy_number VARCHAR(100);

-- Utility Meters
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS has_main_water_meter BOOLEAN DEFAULT FALSE;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS water_meter_number VARCHAR(100);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS has_main_electricity_meter BOOLEAN DEFAULT FALSE;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS electricity_meter_number VARCHAR(100);

-- Step 4: Guard Information
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS guard_name VARCHAR(255);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS guard_phone VARCHAR(20);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS guard_room_number VARCHAR(50);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS guard_id_photo TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS guard_shift VARCHAR(50);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS guard_has_salary BOOLEAN DEFAULT FALSE;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS guard_salary_amount DECIMAL(15, 2);

-- Location and Images
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS google_maps_link TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS image_urls TEXT[];
