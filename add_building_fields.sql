-- ==========================================
-- تحديث جدول العماير بحقول جديدة
-- Adding new fields to buildings table
-- ==========================================

-- إضافة الحقول الجديدة لجدول buildings
ALTER TABLE buildings
ADD COLUMN IF NOT EXISTS build_status VARCHAR(50) DEFAULT 'ready', -- 'ready', 'under_construction', 'finishing', 'new_project'
ADD COLUMN IF NOT EXISTS land_area DECIMAL(15, 2), -- مساحة الأرض
ADD COLUMN IF NOT EXISTS building_license_number VARCHAR(100), -- رقم رخصة البناء
ADD COLUMN IF NOT EXISTS insurance_available BOOLEAN DEFAULT FALSE, -- هل يوجد تأمين
ADD COLUMN IF NOT EXISTS insurance_policy_number VARCHAR(100); -- رقم بوليصة التأمين

-- إضافة تعليقات للحقول الجديدة
COMMENT ON COLUMN buildings.build_status IS 'حالة البناء: جاهز، تحت الإنشاء، تشطيب، أرض مشروع جديد';
COMMENT ON COLUMN buildings.land_area IS 'مساحة الأرض بالمتر المربع';
COMMENT ON COLUMN buildings.building_license_number IS 'رقم رخصة البناء';
COMMENT ON COLUMN buildings.insurance_available IS 'هل يوجد تأمين على المبنى';
COMMENT ON COLUMN buildings.insurance_policy_number IS 'رقم بوليصة التأمين (إذا كان يوجد تأمين)';

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_buildings_build_status ON buildings(build_status);
CREATE INDEX IF NOT EXISTS idx_buildings_insurance ON buildings(insurance_available);
