-- نسبة الربح كنطاق (من – إلى) لمستثمري العمارة
-- Run once in Supabase SQL Editor

ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS profit_percentage_to DECIMAL(5,2) CHECK (profit_percentage_to IS NULL OR (profit_percentage_to >= 0 AND profit_percentage_to <= 100));

COMMENT ON COLUMN building_investors.profit_percentage_to IS 'نهاية نطاق نسبة الربح (اختياري). عند تحديده يُعرض النطاق من–إلى ويُحسب الربح المتوقع كنطاق';
