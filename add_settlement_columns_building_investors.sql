-- إضافة أعمدة طريقة المخالصة ورقم الحساب/الآيبان واسم البنك
-- Run in Supabase SQL Editor if not in add_building_investors_deal_closing.sql

ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS settlement_method VARCHAR(20);
ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS settlement_account_iban TEXT;
ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS settlement_bank_name TEXT;

COMMENT ON COLUMN building_investors.settlement_method IS 'طريقة المخالصة: transfer=حوالة، check=شيك، cash=كاش';
COMMENT ON COLUMN building_investors.settlement_account_iban IS 'رقم الحساب أو الآيبان للمخالصة';
COMMENT ON COLUMN building_investors.settlement_bank_name IS 'اسم البنك للمخالصة';
