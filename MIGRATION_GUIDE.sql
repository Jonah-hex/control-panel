-- ==========================================
-- تطبيق التحديثات على Supabase
-- بدء من ملف Migration في Supabase
-- ==========================================

-- 1. إضافة الأعمدة الجديدة لجدول buildings
BEGIN;

ALTER TABLE public.buildings
ADD COLUMN IF NOT EXISTS build_status VARCHAR(50) DEFAULT 'ready',
ADD COLUMN IF NOT EXISTS land_area DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS building_license_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS insurance_available BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS insurance_policy_number VARCHAR(100);

-- 2. إضافة التعليقات (تحديد الأغراض)
COMMENT ON COLUMN public.buildings.build_status IS 'حالة البناء: جاهز (ready)، تحت الإنشاء (under_construction)، تشطيب (finishing)، أرض مشروع جديد (new_project)';
COMMENT ON COLUMN public.buildings.land_area IS 'مساحة الأرض بالمتر المربع';
COMMENT ON COLUMN public.buildings.building_license_number IS 'رقم رخصة البناء الصادرة من الجهات الحكومية';
COMMENT ON COLUMN public.buildings.insurance_available IS 'هل يوجد تأمين على المبنى (TRUE/FALSE)';
COMMENT ON COLUMN public.buildings.insurance_policy_number IS 'رقم بوليصة التأمين (فقط إذا كان insurance_available = TRUE)';

-- 3. إضافة الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_buildings_build_status ON public.buildings(build_status);
CREATE INDEX IF NOT EXISTS idx_buildings_insurance_available ON public.buildings(insurance_available);
CREATE INDEX IF NOT EXISTS idx_buildings_land_area ON public.buildings(land_area);

-- 4. إضافة البيانات التاريخية (إذا كانت موجودة)
-- تعيين قيم افتراضية للسجلات الموجودة
UPDATE public.buildings 
SET 
  build_status = COALESCE(build_status, 'ready'),
  insurance_available = COALESCE(insurance_available, FALSE)
WHERE build_status IS NULL OR insurance_available IS NULL;

COMMIT;

-- ==========================================
-- استعلامات اختبار للتحقق من النجاح
-- ==========================================

-- 1. التحقق من الأعمدة الجديدة
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'buildings' 
AND column_name IN ('build_status', 'land_area', 'building_license_number', 'insurance_available', 'insurance_policy_number')
ORDER BY column_name;

-- 2. عرض عدد العماير حسب حالة البناء
SELECT 
  build_status, 
  COUNT(*) as count 
FROM public.buildings 
GROUP BY build_status 
ORDER BY count DESC;

-- 3. عرض عماير بتأمين
SELECT 
  id, 
  name, 
  insurance_available, 
  insurance_policy_number 
FROM public.buildings 
WHERE insurance_available = TRUE;

-- 4. عرض إحصائيات مساحة الأرض
SELECT 
  COUNT(*) as total_buildings,
  AVG(land_area) as avg_land_area,
  MIN(land_area) as min_land_area,
  MAX(land_area) as max_land_area,
  SUM(land_area) as total_land_area
FROM public.buildings 
WHERE land_area IS NOT NULL;

-- 5. التحقق من رخص البناء الناقصة
SELECT 
  id, 
  name, 
  building_license_number 
FROM public.buildings 
WHERE building_license_number IS NULL 
ORDER BY created_at DESC;

-- ==========================================
-- استعلامات متقدمة للتحليل
-- ==========================================

-- 1. عماير قيد الإنشاء بدون رخصة بناء
SELECT 
  id, 
  name, 
  build_status, 
  building_license_number,
  created_at
FROM public.buildings 
WHERE build_status = 'under_construction' 
AND building_license_number IS NULL;

-- 2. عماير مكتملة بتأمين كامل
SELECT 
  id, 
  name, 
  build_status, 
  insurance_available, 
  insurance_policy_number,
  land_area
FROM public.buildings 
WHERE build_status = 'ready' 
AND insurance_available = TRUE 
AND insurance_policy_number IS NOT NULL;

-- 3. إحصائيات البيانات الناقصة
SELECT 
  COUNT(*) as total_buildings,
  COUNT(CASE WHEN build_status IS NULL THEN 1 END) as missing_build_status,
  COUNT(CASE WHEN building_license_number IS NULL THEN 1 END) as missing_license,
  COUNT(CASE WHEN land_area IS NULL THEN 1 END) as missing_land_area,
  COUNT(CASE WHEN insurance_policy_number IS NULL AND insurance_available = TRUE THEN 1 END) as missing_policy_number
FROM public.buildings;

-- ==========================================
-- تحديثات مجموعية (للاستخدام الاختياري)
-- ==========================================

-- تحديث جميع العماير المكتملة إلى حالة "جاهز"
-- UPDATE public.buildings 
-- SET build_status = 'ready'
-- WHERE build_status IS NULL 
-- AND EXTRACT(YEAR FROM updated_at) < 2024;

-- إضافة تأمين ID مفترض للعماير المختار (مثال)
-- UPDATE public.buildings 
-- SET insurance_policy_number = 'AUTO-' || id 
-- WHERE insurance_available = TRUE 
-- AND insurance_policy_number IS NULL;
