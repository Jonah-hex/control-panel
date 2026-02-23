-- Ensure entrances column exists on buildings and units (safe to run multiple times)
-- عدد المداخل

ALTER TABLE buildings ADD COLUMN IF NOT EXISTS entrances INTEGER DEFAULT 1;
ALTER TABLE units ADD COLUMN IF NOT EXISTS entrances INTEGER DEFAULT 1;
