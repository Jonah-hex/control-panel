-- إضافة تاريخ بدء الاستثمار وتاريخ استحقاق مبلغ الاستثمار لمستثمري العمارة
-- Run once in Supabase SQL Editor

ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS investment_start_date DATE;
ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS investment_due_date DATE;

COMMENT ON COLUMN building_investors.investment_start_date IS 'تاريخ بدء الاستثمار';
COMMENT ON COLUMN building_investors.investment_due_date IS 'تاريخ انتهاء واستحقاق مبلغ الاستثمار';
