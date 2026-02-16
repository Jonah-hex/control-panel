-- تحديث اسم العمود من address إلى plot_number في جدول buildings
-- قم بتشغيل هذا الكود في Supabase SQL Editor

-- 1. إضافة العمود الجديد plot_number
ALTER TABLE buildings 
ADD COLUMN IF NOT EXISTS plot_number TEXT;

-- 2. نسخ البيانات من address إلى plot_number
UPDATE buildings 
SET plot_number = address
WHERE plot_number IS NULL;

-- 3. حذف العمود القديم address
ALTER TABLE buildings 
DROP COLUMN IF EXISTS address;

-- 4. إضافة قيد NOT NULL للعمود الجديد (إذا كان العمود القديم NOT NULL)
-- ALTER TABLE buildings 
-- ALTER COLUMN plot_number SET NOT NULL;

-- ملاحظة: تأكد من عمل نسخة احتياطية من البيانات قبل تشغيل هذا الكود
