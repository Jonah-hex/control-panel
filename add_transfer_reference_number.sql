-- إضافة رقم الحوالة واسم بنك الشيك لسجل نقل الملكية
-- Run in Supabase SQL Editor.

ALTER TABLE units
ADD COLUMN IF NOT EXISTS transfer_reference_number VARCHAR(100);

ALTER TABLE units
ADD COLUMN IF NOT EXISTS transfer_check_bank_name VARCHAR(255);

COMMENT ON COLUMN units.transfer_reference_number IS 'رقم الحوالة البنكية عند الدفع تحويلاً';
COMMENT ON COLUMN units.transfer_check_bank_name IS 'اسم البنك عند الدفع شيكاً مصدقاً';
