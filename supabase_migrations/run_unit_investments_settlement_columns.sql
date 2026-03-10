-- ==========================================
-- أعمدة نوع المخالصة لاستثمار الوحدات — unit_investments
-- نفّذ هذا الملف مرة واحدة في Supabase SQL Editor
-- لاستخدام نوع المخالصة (مع رأس المال / أرباح فقط) في التحليلات وملخص المنشأة
-- ==========================================

-- 1) نوع المخالصة (أرباح فقط / مع رأس المال)
ALTER TABLE unit_investments
  ADD COLUMN IF NOT EXISTS settlement_type VARCHAR(20);
COMMENT ON COLUMN unit_investments.settlement_type IS 'نوع المخالصة: profit_only=أرباح فقط، with_capital=مع رأس المال — يُسجّل عند إغلاق الصفقة (ربط إعادة البيع) للتحليلات وصافي المنشأة';

-- 2) طريقة المخالصة (حوالة / شيك / كاش)
ALTER TABLE unit_investments
  ADD COLUMN IF NOT EXISTS settlement_method VARCHAR(20);
COMMENT ON COLUMN unit_investments.settlement_method IS 'طريقة المخالصة: transfer=حوالة، check=شيك، cash=كاش';

-- 3) رقم الحساب أو الآيبان للمخالصة (عند الحوالة)
ALTER TABLE unit_investments
  ADD COLUMN IF NOT EXISTS settlement_account_iban TEXT;
COMMENT ON COLUMN unit_investments.settlement_account_iban IS 'رقم الحساب أو الآيبان للمخالصة';

-- 4) اسم البنك للمخالصة (عند الحوالة)
ALTER TABLE unit_investments
  ADD COLUMN IF NOT EXISTS settlement_bank_name TEXT;
COMMENT ON COLUMN unit_investments.settlement_bank_name IS 'اسم البنك للمخالصة';

-- للوحدات المُخالصة مسبقاً (status='resold' و settlement_type NULL): يُعامل NULL في التحليلات كـ with_capital للتوافق مع البيانات القديمة.
