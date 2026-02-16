-- إضافة عمود الحي (neighborhood) إلى جدول buildings
-- قم بتشغيل هذا الكود في Supabase SQL Editor

-- 1. إضافة العمود الجديد neighborhood
ALTER TABLE buildings 
ADD COLUMN IF NOT EXISTS neighborhood TEXT;

-- 2. يمكنك تحديث البيانات الموجودة إذا كان لديك قيم افتراضية
-- UPDATE buildings 
-- SET neighborhood = 'حي افتراضي'
-- WHERE neighborhood IS NULL;

-- 3. إذا كنت تريد جعل الحقل إلزامياً لاحقاً، قم بتفعيل هذا السطر
-- ALTER TABLE buildings 
-- ALTER COLUMN neighborhood SET NOT NULL;

-- ملاحظة: تأكد من عمل نسخة احتياطية من البيانات قبل تشغيل هذا الكود
