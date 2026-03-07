-- ==========================================
-- أعمدة نقل رأس المال — building_investors و unit_investments
-- نفّذ هذا الملف مرة واحدة في Supabase SQL Editor
-- مطلوب لميزة «نقل رأس المال» إلى عمارة/وحدة جديدة
-- ==========================================

-- رأس المال المُنقَول: عند نقل رأس المال القائم يُحدَّث هذا الحقل
-- رأس المال القائم = total_invested_amount - transferred_amount (لمخالصات «أرباح فقط» فقط)
ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS transferred_amount DECIMAL(15,2) DEFAULT 0;
COMMENT ON COLUMN building_investors.transferred_amount IS 'المبلغ المُنقَل من رأس المال القائم إلى استثمار آخر (عمارة أو وحدة) — رأس المال القائم = total_invested_amount - transferred_amount';

-- ربط الاستثمار الجديد بالمصدر (للتتبع)
ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS transferred_from_building_investor_id UUID REFERENCES building_investors(id) ON DELETE SET NULL;
ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS transferred_from_building_investor_id UUID REFERENCES building_investors(id) ON DELETE SET NULL;
COMMENT ON COLUMN building_investors.transferred_from_building_investor_id IS 'إذا تم إنشاء هذا السجل بنقل رأس المال من مخالصة «أرباح فقط»';
COMMENT ON COLUMN unit_investments.transferred_from_building_investor_id IS 'إذا تم إنشاء هذا السجل بنقل رأس المال من مخالصة «أرباح فقط»';

-- طريقة دفع مبلغ الاستثمار (كاش، تحويل، شيك مصدق)
ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);
COMMENT ON COLUMN building_investors.payment_method IS 'طريقة دفع مبلغ الاستثمار: cash=كاش، transfer=حوالة، check=شيك مصدق';
ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS payment_bank_name TEXT;
COMMENT ON COLUMN building_investors.payment_bank_name IS 'على بنك — عند الدفع حوالة';
ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS payment_check_number TEXT;
COMMENT ON COLUMN building_investors.payment_check_number IS 'رقم الشيك عند الدفع شيك مصدق';
ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS payment_check_image_path TEXT;
COMMENT ON COLUMN building_investors.payment_check_image_path IS 'مسار صورة الشيك في التخزين';

-- طريقة الدفع لاستثمار الوحدة (سعر الشراء)
ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);
COMMENT ON COLUMN unit_investments.payment_method IS 'طريقة دفع سعر الشراء: cash=كاش، transfer=حوالة، check=شيك مصدق';
ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS payment_bank_name TEXT;
ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS payment_check_number TEXT;
ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS payment_check_image_path TEXT;
ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS contract_image_path TEXT;
ALTER TABLE unit_investments ADD COLUMN IF NOT EXISTS id_image_path TEXT;
