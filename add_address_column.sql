-- ==========================================
-- إضافة عمود address إلى جدول buildings
-- Add address column to buildings table
-- ==========================================
-- هذا سكريبت آمن - لن يحذف أي بيانات
-- This is a safe script - will not delete any data
-- ==========================================

-- إضافة عمود address فقط
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS address TEXT;

-- التحقق من نجاح الإضافة
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'buildings' AND column_name = 'address';

-- تحديث العناوين للعماير الموجودة (اختياري)
UPDATE buildings 
SET address = CONCAT(COALESCE(neighborhood, ''), ' - قطعة ', COALESCE(plot_number, ''))
WHERE address IS NULL AND (neighborhood IS NOT NULL OR plot_number IS NOT NULL);

-- عرض النتيجة
SELECT id, name, address, neighborhood, plot_number 
FROM buildings 
LIMIT 5;
