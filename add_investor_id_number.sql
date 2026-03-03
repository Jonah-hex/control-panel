-- إضافة رقم الهوية لمستثمري العمارة واستثمار الوحدات
-- Run once in Supabase SQL Editor

ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS investor_id_number VARCHAR(20);
ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS investor_id_number VARCHAR(20);

COMMENT ON COLUMN building_investors.investor_id_number IS 'رقم هوية المستثمر';
COMMENT ON COLUMN unit_investments.investor_id_number IS 'رقم هوية المستثمر';
