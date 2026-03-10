-- ==========================================
-- نقل رأس المال من استثمار وحدة (مخالصة أرباح فقط)
-- نفّذ هذا الملف مرة واحدة في Supabase SQL Editor
-- ==========================================

-- رأس المال المُنقَل من وحدة مُخالصة «أرباح فقط» — رأس المال القائم = purchase_price - transferred_amount
ALTER TABLE unit_investments
  ADD COLUMN IF NOT EXISTS transferred_amount DECIMAL(15,2) DEFAULT 0;
COMMENT ON COLUMN unit_investments.transferred_amount IS 'المبلغ المُنقَل من رأس المال القائم (وحدة مُخالصة بأرباح فقط) إلى استثمار آخر — رأس المال القائم = purchase_price - transferred_amount';

-- ربط استثمار العمارة الجديد بمصدر الوحدة (عند النقل من وحدة إلى عمارة)
ALTER TABLE building_investors
  ADD COLUMN IF NOT EXISTS transferred_from_unit_investment_id UUID REFERENCES unit_investments(id) ON DELETE SET NULL;
COMMENT ON COLUMN building_investors.transferred_from_unit_investment_id IS 'إذا تم إنشاء هذا السجل بنقل رأس المال من وحدة مُخالصة بأرباح فقط';

-- ربط استثمار الوحدة الجديد بمصدر الوحدة (عند النقل من وحدة إلى وحدة)
ALTER TABLE unit_investments
  ADD COLUMN IF NOT EXISTS transferred_from_unit_investment_id UUID REFERENCES unit_investments(id) ON DELETE SET NULL;
COMMENT ON COLUMN unit_investments.transferred_from_unit_investment_id IS 'إذا تم إنشاء هذا السجل بنقل رأس المال من وحدة مُخالصة بأرباح فقط';
