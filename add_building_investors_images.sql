-- إرفاق صورة العقد وصورة الهوية لمستثمري العمارة
-- Run once in Supabase SQL Editor

ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS contract_image_path TEXT;
ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS id_image_path TEXT;

COMMENT ON COLUMN building_investors.contract_image_path IS 'مسار صورة عقد الاستثمار في التخزين';
COMMENT ON COLUMN building_investors.id_image_path IS 'مسار صورة هوية المستثمر في التخزين';
