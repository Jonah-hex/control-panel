-- ==========================================
-- سكريبت تحديث جدول العماير - Buildings Table Update
-- ==========================================

-- حذف الجدول القديم إذا كان موجود (احذر: سيحذف جميع البيانات!)
-- DROP TABLE IF EXISTS buildings CASCADE;

-- إذا كان الجدول موجود، يمكنك إضافة الأعمدة الناقصة فقط:
-- تحقق من وجود الأعمدة أولاً قبل الإضافة

-- إضافة الأعمدة الناقصة إذا لم تكن موجودة
DO $$ 
BEGIN
    -- معلومات أساسية
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='buildings' AND column_name='address') THEN
        ALTER TABLE buildings ADD COLUMN address TEXT;
    END IF;

    -- إضافة أي أعمدة إضافية أخرى إذا لزم الأمر
    -- يمكن إضافة المزيد من الشروط هنا

END $$;

-- أو إنشاء الجدول من الصفر (استخدم هذا فقط إذا كنت تريد البدء من جديد)
CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- معلومات أساسية - Basic Information
  name VARCHAR(255) NOT NULL,
  plot_number VARCHAR(100),
  neighborhood VARCHAR(255),
  address TEXT,
  description TEXT,
  phone VARCHAR(20),
  
  -- تفاصيل البناء - Building Details
  total_floors INTEGER DEFAULT 1,
  total_units INTEGER DEFAULT 0,
  reserved_units INTEGER DEFAULT 0,
  parking_slots INTEGER DEFAULT 0,
  driver_rooms INTEGER DEFAULT 0,
  elevators INTEGER DEFAULT 1,
  street_type VARCHAR(50) DEFAULT 'one', -- one, two, three
  building_facing VARCHAR(50) DEFAULT 'north', -- north, south, east, west, etc.
  year_built INTEGER,
  
  -- حالة البناء ومعلومات قانونية - Build Status & Legal Info
  build_status VARCHAR(50) DEFAULT 'ready', -- ready, under_construction, old
  deed_number VARCHAR(100),
  land_area DECIMAL(10, 2),
  building_license_number VARCHAR(100),
  
  -- معلومات التأمين - Insurance Information
  insurance_available BOOLEAN DEFAULT FALSE,
  insurance_policy_number VARCHAR(100),
  
  -- عدادات المرافق - Utility Meters
  has_main_water_meter BOOLEAN DEFAULT FALSE,
  water_meter_number VARCHAR(100),
  has_main_electricity_meter BOOLEAN DEFAULT FALSE,
  electricity_meter_number VARCHAR(100),
  
  -- معلومات الحارس - Guard Information
  guard_name VARCHAR(255),
  guard_phone VARCHAR(20),
  guard_room_number VARCHAR(50),
  guard_id_photo TEXT,
  guard_shift VARCHAR(50), -- morning, evening, night, full_day
  guard_has_salary BOOLEAN DEFAULT FALSE,
  guard_salary_amount DECIMAL(15, 2),
  
  -- الموقع - Location
  google_maps_link TEXT,
  
  -- بيانات إضافية معقدة - Complex Additional Data
  image_urls TEXT[], -- مصفوفة روابط الصور
  floors_data JSONB, -- بيانات الطوابق والوحدات بتفاصيلها
  
  -- معلومات اتحاد الملاك - Owner Association Info (JSONB)
  -- يحتوي على: hasAssociation, managerName, registrationNumber, registeredUnitsCount, 
  -- iban, accountNumber, contactNumber, startDate, endDate, monthlyFee, 
  -- includesElectricity, includesWater
  owner_association JSONB,
  
  -- معلومات المالك والنظام - Owner & System Info
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء الفهارس لتحسين الأداء - Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_buildings_owner_id ON buildings(owner_id);
CREATE INDEX IF NOT EXISTS idx_buildings_neighborhood ON buildings(neighborhood);
CREATE INDEX IF NOT EXISTS idx_buildings_plot_number ON buildings(plot_number);
CREATE INDEX IF NOT EXISTS idx_buildings_created_at ON buildings(created_at DESC);

-- تفعيل RLS (Row Level Security)
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان - Security Policies
DROP POLICY IF EXISTS "Users can view their own buildings" ON buildings;
CREATE POLICY "Users can view their own buildings"
  ON buildings FOR SELECT
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can insert their own buildings" ON buildings;
CREATE POLICY "Users can insert their own buildings"
  ON buildings FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update their own buildings" ON buildings;
CREATE POLICY "Users can update their own buildings"
  ON buildings FOR UPDATE
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete their own buildings" ON buildings;
CREATE POLICY "Users can delete their own buildings"
  ON buildings FOR DELETE
  USING (auth.uid() = owner_id);

-- تعليق توضيحي على الجدول
COMMENT ON TABLE buildings IS 'جدول العماير - يحتوي على جميع معلومات العماير بما في ذلك التفاصيل الفنية والقانونية ومعلومات الحارس واتحاد الملاك';

-- تعليقات على الأعمدة المهمة
COMMENT ON COLUMN buildings.owner_association IS 'معلومات اتحاد الملاك (JSONB): hasAssociation, managerName, registrationNumber, registeredUnitsCount, iban, accountNumber, contactNumber, startDate, endDate, monthlyFee, includesElectricity, includesWater';
COMMENT ON COLUMN buildings.floors_data IS 'بيانات الطوابق والوحدات بصيغة JSON تحتوي على تفاصيل كل طابق ووحداته';
COMMENT ON COLUMN buildings.image_urls IS 'مصفوفة روابط صور العمارة';
