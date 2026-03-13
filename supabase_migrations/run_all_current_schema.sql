-- =============================================================================
-- run_all_current_schema.sql — ترحيل موحّد لمجلد supabase_migrations
-- =============================================================================
-- لأي Supabase جديد: نفّذ هذا الملف مرة واحدة في SQL Editor (لصق كامل ثم Run).
-- المتطلب: وجود الجداول building_investors، unit_investments، dashboard_appointments
--           (أنشئها أولاً من investors_schema.sql و create_dashboard_tasks_and_appointments.sql
--            أو من مشروعك الأساسي إن وُجد).
-- لا يحذف بيانات. يستخدم ADD COLUMN IF NOT EXISTS حيث ينطبق.
-- ترتيب: أعمدة حسب الجدول → فهارس → قيود المواعيد.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) جدول building_investors — مستثمرو العمارة (إغلاق صفقة + نقل رأس مال + دفع)
-- -----------------------------------------------------------------------------
ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS closed_at DATE;
COMMENT ON COLUMN building_investors.closed_at IS 'تاريخ إغلاق صفقة الاستثمار';

ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS realized_profit NUMERIC(15,2);
COMMENT ON COLUMN building_investors.realized_profit IS 'الربح المحقق بريال عند الإغلاق';

ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS closing_percentage NUMERIC(5,2);
COMMENT ON COLUMN building_investors.closing_percentage IS 'نسبة الإغلاق النهائية %';

ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS settlement_method VARCHAR(20);
COMMENT ON COLUMN building_investors.settlement_method IS 'طريقة المخالصة: transfer/check/cash';

ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS settlement_account_iban TEXT;
COMMENT ON COLUMN building_investors.settlement_account_iban IS 'آيبان/حساب المخالصة';

ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS settlement_bank_name TEXT;
COMMENT ON COLUMN building_investors.settlement_bank_name IS 'اسم بنك المخالصة';

ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS settlement_type VARCHAR(20);
COMMENT ON COLUMN building_investors.settlement_type IS 'profit_only | with_capital';

ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS transferred_amount DECIMAL(15,2) DEFAULT 0;
COMMENT ON COLUMN building_investors.transferred_amount IS 'المبلغ المنقول من رأس المال القائم';

ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS transferred_from_building_investor_id UUID REFERENCES building_investors(id) ON DELETE SET NULL;
COMMENT ON COLUMN building_investors.transferred_from_building_investor_id IS 'مصدر النقل من مخالصة عمارة أرباح فقط';

ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS transferred_from_unit_investment_id UUID REFERENCES unit_investments(id) ON DELETE SET NULL;
COMMENT ON COLUMN building_investors.transferred_from_unit_investment_id IS 'مصدر النقل من وحدة أرباح فقط';

ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);
COMMENT ON COLUMN building_investors.payment_method IS 'دفع الاستثمار: cash/transfer/check';

ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS payment_bank_name TEXT;
COMMENT ON COLUMN building_investors.payment_bank_name IS 'على بنك — حوالة';

ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS payment_check_number TEXT;
COMMENT ON COLUMN building_investors.payment_check_number IS 'رقم الشيك';

ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS payment_check_image_path TEXT;
COMMENT ON COLUMN building_investors.payment_check_image_path IS 'مسار صورة الشيك';

-- -----------------------------------------------------------------------------
-- 2) جدول unit_investments — استثمار الوحدات (مخالصة + دفع + نقل + عمولات)
-- -----------------------------------------------------------------------------
ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS transferred_from_building_investor_id UUID REFERENCES building_investors(id) ON DELETE SET NULL;
COMMENT ON COLUMN unit_investments.transferred_from_building_investor_id IS 'مصدر النقل من عمارة';

ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS transferred_from_unit_investment_id UUID REFERENCES unit_investments(id) ON DELETE SET NULL;
COMMENT ON COLUMN unit_investments.transferred_from_unit_investment_id IS 'مصدر النقل من وحدة أرباح فقط';

ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS transferred_amount DECIMAL(15,2) DEFAULT 0;
COMMENT ON COLUMN unit_investments.transferred_amount IS 'المبلغ المنقول من رأس المال القائم (وحدة)';

ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS settlement_type VARCHAR(20);
COMMENT ON COLUMN unit_investments.settlement_type IS 'profit_only | with_capital';

ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS settlement_method VARCHAR(20);
COMMENT ON COLUMN unit_investments.settlement_method IS 'طريقة المخالصة';

ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS settlement_account_iban TEXT;
COMMENT ON COLUMN unit_investments.settlement_account_iban IS 'آيبان المخالصة';

ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS settlement_bank_name TEXT;
COMMENT ON COLUMN unit_investments.settlement_bank_name IS 'بنك المخالصة';

ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);
COMMENT ON COLUMN unit_investments.payment_method IS 'دفع سعر الشراء: cash/transfer/check';

ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS payment_bank_name TEXT;
ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS payment_check_number TEXT;
ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS payment_check_image_path TEXT;
ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS contract_image_path TEXT;
ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS id_image_path TEXT;
COMMENT ON COLUMN unit_investments.contract_image_path IS 'مسار صورة العقد';
COMMENT ON COLUMN unit_investments.id_image_path IS 'مسار صورة الهوية';

ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS resale_commission DECIMAL(15,2) DEFAULT 0;
COMMENT ON COLUMN unit_investments.resale_commission IS 'عمولة إعادة البيع (ر.س)';

ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS admin_fees DECIMAL(15,2) DEFAULT 0;
COMMENT ON COLUMN unit_investments.admin_fees IS 'رسوم إدارية (ر.س)';

ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS purchase_commission DECIMAL(15,2) DEFAULT 0;
COMMENT ON COLUMN unit_investments.purchase_commission IS 'عمولة عند الشراء (ر.س)';

-- -----------------------------------------------------------------------------
-- 3) جدول dashboard_appointments — مواعيد اللوحة
-- -----------------------------------------------------------------------------
ALTER TABLE dashboard_appointments ADD COLUMN IF NOT EXISTS created_by_name TEXT;
COMMENT ON COLUMN dashboard_appointments.created_by_name IS 'اسم من أنشأ الموعد';

ALTER TABLE dashboard_appointments ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE dashboard_appointments DROP CONSTRAINT IF EXISTS dashboard_appointments_priority_check;
ALTER TABLE dashboard_appointments ADD CONSTRAINT dashboard_appointments_priority_check
  CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
COMMENT ON COLUMN dashboard_appointments.priority IS 'أولوية الموعد: عالي/عاجل → تنبيه حرج؛ منخفض/عادي → جرس عادي';

-- -----------------------------------------------------------------------------
-- 4) فهارس
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_building_investors_closed_at
  ON building_investors(closed_at) WHERE closed_at IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 5) قيود CHECK لنوع الموعد (يستبدل القيد السابق إن وُجد)
-- -----------------------------------------------------------------------------
ALTER TABLE dashboard_appointments
  DROP CONSTRAINT IF EXISTS dashboard_appointments_type_check;

ALTER TABLE dashboard_appointments
  ADD CONSTRAINT dashboard_appointments_type_check CHECK (
    type IN (
      'handover_appointment',
      'inspector_viewing',
      'engineering_review',
      'unit_delivery',
      'viewing',
      'maintenance',
      'marketing',
      'contract_signing',
      'other',
      'meeting',
      'unit_handover',
      'complaint',
      'owner_meeting',
      'document_delivery',
      'unit_inspection'
    )
  );

-- =============================================================================
-- انتهى run_all_current_schema.sql
-- =============================================================================
