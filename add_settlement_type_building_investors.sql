-- إضافة عمود نوع المخالصة (أرباح فقط / مع رأس المال) للتحليلات ومفهوم البيع بالكامل
-- نفّذ هذا الملف إذا سبق تنفيذ add_building_investors_deal_closing.sql بدون هذا العمود

ALTER TABLE building_investors
  ADD COLUMN IF NOT EXISTS settlement_type VARCHAR(20);

COMMENT ON COLUMN building_investors.settlement_type IS 'نوع المخالصة: profit_only=أرباح فقط، with_capital=مع رأس المال (للتحليلات ومفهوم البيع بالكامل)';
