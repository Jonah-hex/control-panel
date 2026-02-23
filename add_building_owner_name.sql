-- إضافة عمود اسم المالك (owner_name) إلى جدول buildings
-- Add owner_name column to buildings table

ALTER TABLE buildings
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255);

-- تعليق على العمود
COMMENT ON COLUMN buildings.owner_name IS 'اسم مالك العمارة / المالك الرئيسي للمشروع';
