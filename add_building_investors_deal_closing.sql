-- ==========================================
-- أعمدة إغلاق صفقة الاستثمار — building_investors
-- (نفس الأعمدة في: supabase_migrations/run_building_investors_deal_closing_columns.sql)
-- مرجع الربط: docs/building-investors-schema.md
-- ==========================================
-- نفّذ هذا الملف مرة واحدة في Supabase → SQL Editor
-- ==========================================

-- تاريخ إغلاق الصفقة (عند تسوية الربح مع المستثمر)
ALTER TABLE building_investors
  ADD COLUMN IF NOT EXISTS closed_at DATE;

-- الربح المحقق (المبلغ الفعلي المدفوع للمستثمر عند الإغلاق، يُحسب من نسبة الإغلاق النهائية)
ALTER TABLE building_investors
  ADD COLUMN IF NOT EXISTS realized_profit NUMERIC(15,2);

-- نسبة الإغلاق النهائية % (المدخلة عند إغلاق الصفقة — مصدر الربح المحقق والربط مع التقارير)
ALTER TABLE building_investors
  ADD COLUMN IF NOT EXISTS closing_percentage NUMERIC(5,2);

COMMENT ON COLUMN building_investors.closed_at IS 'تاريخ إغلاق صفقة الاستثمار (عند تسوية الربح مع المستثمر)';
COMMENT ON COLUMN building_investors.realized_profit IS 'الربح المحقق بريال عند الإغلاق — يُستخدم في الأرباح والتحليلات والمخالصة المالية';
COMMENT ON COLUMN building_investors.closing_percentage IS 'نسبة الإغلاق النهائية % المدخلة عند إغلاق الصفقة — تُسجّل للربط مع البيانات والتحليلات';

-- طريقة المخالصة (حوالة، شيك، كاش) وبيانات الحساب/البنك
ALTER TABLE building_investors
  ADD COLUMN IF NOT EXISTS settlement_method VARCHAR(20);
ALTER TABLE building_investors
  ADD COLUMN IF NOT EXISTS settlement_account_iban TEXT;
ALTER TABLE building_investors
  ADD COLUMN IF NOT EXISTS settlement_bank_name TEXT;

-- نوع المخالصة: profit_only=أرباح فقط، with_capital=مع رأس المال (للتحليلات والربط مع البيع بالكامل)
ALTER TABLE building_investors
  ADD COLUMN IF NOT EXISTS settlement_type VARCHAR(20);

COMMENT ON COLUMN building_investors.settlement_method IS 'طريقة المخالصة: transfer=حوالة، check=شيك، cash=كاش';
COMMENT ON COLUMN building_investors.settlement_account_iban IS 'رقم الحساب أو الآيبان للمخالصة';
COMMENT ON COLUMN building_investors.settlement_bank_name IS 'اسم البنك للمخالصة';
COMMENT ON COLUMN building_investors.settlement_type IS 'نوع المخالصة: profit_only=أرباح فقط، with_capital=مع رأس المال (يُستخدم في التحليلات ومفهوم البيع بالكامل)';

-- فهرس اختياري للاستعلامات حسب حالة الإغلاق
CREATE INDEX IF NOT EXISTS idx_building_investors_closed_at
  ON building_investors(closed_at) WHERE closed_at IS NOT NULL;
