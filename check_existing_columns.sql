-- ==========================================
-- فحص سريع للأعمدة الموجودة في جدول buildings
-- Quick Check for Existing Columns in Buildings Table
-- ==========================================

-- هذا السكريبت يعرض فقط الأعمدة الموجودة حالياً
-- This script only displays currently existing columns

SELECT 
  column_name AS "اسم العمود - Column Name",
  data_type AS "نوع البيانات - Data Type",
  CASE 
    WHEN is_nullable = 'YES' THEN 'نعم - Yes'
    ELSE 'لا - No'
  END AS "يقبل null - Nullable",
  column_default AS "القيمة الافتراضية - Default Value"
FROM information_schema.columns
WHERE table_name = 'buildings'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ==========================================
-- عدد الأعمدة الموجودة
-- Count of Existing Columns
-- ==========================================

SELECT 
  COUNT(*) AS "عدد الأعمدة الموجودة - Total Columns"
FROM information_schema.columns
WHERE table_name = 'buildings'
  AND table_schema = 'public';

-- ==========================================
-- التحقق من الأعمدة المطلوبة
-- Check Required Columns
-- ==========================================

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buildings' AND column_name = 'name') 
    THEN '✅ موجود' ELSE '❌ مفقود' 
  END AS "name",
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buildings' AND column_name = 'plot_number') 
    THEN '✅ موجود' ELSE '❌ مفقود' 
  END AS "plot_number",
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buildings' AND column_name = 'neighborhood') 
    THEN '✅ موجود' ELSE '❌ مفقود' 
  END AS "neighborhood",
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buildings' AND column_name = 'build_status') 
    THEN '✅ موجود' ELSE '❌ مفقود' 
  END AS "build_status",
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buildings' AND column_name = 'total_floors') 
    THEN '✅ موجود' ELSE '❌ مفقود' 
  END AS "total_floors",
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buildings' AND column_name = 'total_units') 
    THEN '✅ موجود' ELSE '❌ مفقود' 
  END AS "total_units",
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buildings' AND column_name = 'owner_association') 
    THEN '✅ موجود' ELSE '❌ مفقود' 
  END AS "owner_association",
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buildings' AND column_name = 'guard_name') 
    THEN '✅ موجود' ELSE '❌ مفقود' 
  END AS "guard_name",
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buildings' AND column_name = 'insurance_available') 
    THEN '✅ موجود' ELSE '❌ مفقود' 
  END AS "insurance_available";

-- ==========================================
-- الخلاصة | Summary
-- ==========================================
/*
نفّذ هذا السكريبت لمعرفة:
1. ما هي الأعمدة الموجودة حالياً في قاعدة بياناتك
2. كم عدد الأعمدة المتوفرة
3. ما هي الأعمدة المفقودة من القائمة المطلوبة

إذا كانت النتيجة:
- ✅ موجود = العمود موجود ويمكن استخدامه
- ❌ مفقود = العمود غير موجود ويجب إضافته

الحل:
نفّذ add_all_missing_columns.sql لإضافة جميع الأعمدة الناقصة
*/
