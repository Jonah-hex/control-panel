-- إضافة رقم الشيك لجدول الوحدات (عند الدفع شيكاً مصدقاً)
-- Run in Supabase SQL Editor.

ALTER TABLE units
ADD COLUMN IF NOT EXISTS transfer_check_number VARCHAR(100);

COMMENT ON COLUMN units.transfer_check_number IS 'رقم الشيك عند الدفع شيكاً مصدقاً';
