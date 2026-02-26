-- عمود ملف بوليصة التأمين لكل مبنى (مسار التخزين في Supabase Storage)
-- Run in Supabase > SQL Editor

ALTER TABLE buildings
ADD COLUMN IF NOT EXISTS insurance_policy_path TEXT;

COMMENT ON COLUMN buildings.insurance_policy_path IS 'مسار ملف بوليصة التأمين في التخزين (مثل: insurance/{building_id}/policy.pdf)';
