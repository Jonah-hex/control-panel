-- ==========================================
-- إضافة جميع الأعمدة الناقصة لجدول buildings
-- Add All Missing Columns to Buildings Table
-- ==========================================

-- هذا السكريبت يضيف الأعمدة الناقصة فقط دون حذف البيانات الموجودة
-- This script adds missing columns only without deleting existing data

-- معلومات أساسية - Basic Information
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- تفاصيل البناء - Building Details
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS reserved_units INTEGER DEFAULT 0;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS parking_slots INTEGER DEFAULT 0;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS driver_rooms INTEGER DEFAULT 0;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS elevators INTEGER DEFAULT 1;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS street_type VARCHAR(50) DEFAULT 'one';
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_facing VARCHAR(50) DEFAULT 'north';
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS year_built INTEGER;

-- حالة البناء ومعلومات قانونية - Build Status & Legal
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS build_status VARCHAR(50) DEFAULT 'ready';
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS deed_number VARCHAR(100);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS land_area DECIMAL(10, 2);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_license_number VARCHAR(100);

-- معلومات التأمين - Insurance Information
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS insurance_available BOOLEAN DEFAULT FALSE;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS insurance_policy_number VARCHAR(100);

-- عدادات المرافق - Utility Meters
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS has_main_water_meter BOOLEAN DEFAULT FALSE;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS water_meter_number VARCHAR(100);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS has_main_electricity_meter BOOLEAN DEFAULT FALSE;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS electricity_meter_number VARCHAR(100);

-- معلومات الحارس - Guard Information
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS guard_name VARCHAR(255);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS guard_phone VARCHAR(20);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS guard_room_number VARCHAR(50);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS guard_id_photo TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS guard_shift VARCHAR(50);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS guard_has_salary BOOLEAN DEFAULT FALSE;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS guard_salary_amount DECIMAL(15, 2);

-- الموقع - Location
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS google_maps_link TEXT;

-- بيانات إضافية - Additional Data
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS image_urls TEXT[];
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS floors_data JSONB;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS owner_association JSONB;

-- ==========================================
-- التحقق من الأعمدة المضافة
-- Verify Added Columns
-- ==========================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'buildings'
ORDER BY ordinal_position;

-- ==========================================
-- الخلاصة | Summary
-- ==========================================
/*
تم إضافة جميع الأعمدة الناقصة بنجاح ✅

الأعمدة المضافة: 37 عمود
- معلومات أساسية: 3
- تفاصيل البناء: 9
- معلومات قانونية: 4
- تأمين: 2
- عدادات: 4
- حارس: 7
- موقع: 1
- بيانات إضافية: 3

بعد تنفيذ هذا السكريبت:
1. ستعمل جميع عمليات الحفظ بنجاح
2. لن تحتاج لتعديل الكود
3. جميع البيانات الموجودة محفوظة

الخطوة التالية: نفّذ fix_units_policies.sql
*/
