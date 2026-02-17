-- Add missing column to units table
-- Safe to run (IF NOT EXISTS)

ALTER TABLE units ADD COLUMN IF NOT EXISTS entrances INTEGER DEFAULT 1;
