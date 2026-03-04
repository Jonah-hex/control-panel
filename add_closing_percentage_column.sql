-- إضافة عمود نسبة الإغلاق فقط (إذا كان الملف الرئيسي نُفّذ بدون هذا العمود)
-- Run in Supabase SQL Editor

ALTER TABLE building_investors
  ADD COLUMN IF NOT EXISTS closing_percentage NUMERIC(5,2);

COMMENT ON COLUMN building_investors.closing_percentage IS 'نسبة الإغلاق النهائية % المدخلة عند إغلاق الصفقة — تُسجّل للربط مع البيانات والتحليلات';
