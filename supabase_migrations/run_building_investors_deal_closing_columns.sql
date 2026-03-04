-- ==========================================
-- أعمدة إغلاق صفقة الاستثمار — building_investors
-- نفّذ هذا الملف مرة واحدة في Supabase SQL Editor
-- لضمان وجود كل الأعمدة المستخدمة في صفحة المستثمرين والتحليلات
-- ==========================================

-- 1) تاريخ إغلاق الصفقة
ALTER TABLE building_investors
  ADD COLUMN IF NOT EXISTS closed_at DATE;
COMMENT ON COLUMN building_investors.closed_at IS 'تاريخ إغلاق صفقة الاستثمار (عند تسوية الربح مع المستثمر)';

-- 2) الربح المحقق (يُحسب من نسبة الإغلاق)
ALTER TABLE building_investors
  ADD COLUMN IF NOT EXISTS realized_profit NUMERIC(15,2);
COMMENT ON COLUMN building_investors.realized_profit IS 'الربح المحقق بريال عند الإغلاق — يُستخدم في الأرباح والتحليلات والمخالصة المالية';

-- 3) نسبة الإغلاق النهائية %
ALTER TABLE building_investors
  ADD COLUMN IF NOT EXISTS closing_percentage NUMERIC(5,2);
COMMENT ON COLUMN building_investors.closing_percentage IS 'نسبة الإغلاق النهائية % المدخلة عند إغلاق الصفقة — تُسجّل للربط مع البيانات والتحليلات';

-- 4) طريقة المخالصة (حوالة / شيك / كاش)
ALTER TABLE building_investors
  ADD COLUMN IF NOT EXISTS settlement_method VARCHAR(20);
COMMENT ON COLUMN building_investors.settlement_method IS 'طريقة المخالصة: transfer=حوالة، check=شيك، cash=كاش';

-- 5) رقم الحساب أو الآيبان للمخالصة (عند الحوالة)
ALTER TABLE building_investors
  ADD COLUMN IF NOT EXISTS settlement_account_iban TEXT;
COMMENT ON COLUMN building_investors.settlement_account_iban IS 'رقم الحساب أو الآيبان للمخالصة';

-- 6) اسم البنك للمخالصة (عند الحوالة)
ALTER TABLE building_investors
  ADD COLUMN IF NOT EXISTS settlement_bank_name TEXT;
COMMENT ON COLUMN building_investors.settlement_bank_name IS 'اسم البنك للمخالصة';

-- 7) نوع المخالصة (أرباح فقط / مع رأس المال)
ALTER TABLE building_investors
  ADD COLUMN IF NOT EXISTS settlement_type VARCHAR(20);
COMMENT ON COLUMN building_investors.settlement_type IS 'نوع المخالصة: profit_only=أرباح فقط، with_capital=مع رأس المال (للتحليلات ومفهوم البيع بالكامل)';

-- فهرس اختياري للاستعلامات حسب حالة الإغلاق
CREATE INDEX IF NOT EXISTS idx_building_investors_closed_at
  ON building_investors(closed_at) WHERE closed_at IS NOT NULL;
