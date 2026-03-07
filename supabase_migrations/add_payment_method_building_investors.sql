-- طريقة دفع المستثمر (مبلغ الاستثمار): كاش، حوالة، شيك مصدق + حقول البنك عند الحوالة
-- Run once in Supabase SQL Editor (مضمّن أيضاً في run_transferred_amount_building_investors.sql)
ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);
COMMENT ON COLUMN building_investors.payment_method IS 'طريقة دفع مبلغ الاستثمار: cash=كاش، transfer=حوالة، check=شيك مصدق';
ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS payment_bank_name TEXT;
COMMENT ON COLUMN building_investors.payment_bank_name IS 'على بنك — عند الدفع حوالة';
ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS payment_check_number TEXT;
COMMENT ON COLUMN building_investors.payment_check_number IS 'رقم الشيك عند الدفع شيك مصدق';
ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS payment_check_image_path TEXT;
COMMENT ON COLUMN building_investors.payment_check_image_path IS 'مسار صورة الشيك في التخزين';
