-- عمولة البيع ورسوم إدارية لاستثمار الوحدات (عند إغلاق الصفقة / ربط عملية البيع)
-- نفّذ مرة واحدة في Supabase SQL Editor

ALTER TABLE unit_investments
  ADD COLUMN IF NOT EXISTS resale_commission DECIMAL(15,2) DEFAULT 0;
COMMENT ON COLUMN unit_investments.resale_commission IS 'عمولة البيع (ر.س) — تُخصم من الربح عند إغلاق الصفقة';

ALTER TABLE unit_investments
  ADD COLUMN IF NOT EXISTS admin_fees DECIMAL(15,2) DEFAULT 0;
COMMENT ON COLUMN unit_investments.admin_fees IS 'رسوم إدارية (ر.س) — تُخصم من الربح عند إغلاق الصفقة';

-- عمولة البيع عند شراء الوحدة (تُخصم من سعر الشراء → السعر الفعلي = سعر الشراء − عمولة البيع)
ALTER TABLE unit_investments
  ADD COLUMN IF NOT EXISTS purchase_commission DECIMAL(15,2) DEFAULT 0;
COMMENT ON COLUMN unit_investments.purchase_commission IS 'عمولة البيع عند الشراء (ر.س) — السعر الفعلي = سعر الشراء − عمولة البيع';
