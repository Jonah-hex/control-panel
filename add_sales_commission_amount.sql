-- إضافة عمولة البيع إلى جدول المبيعات
-- Run in Supabase SQL Editor (Dashboard → SQL Editor).

ALTER TABLE sales
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(15, 2);

COMMENT ON COLUMN sales.commission_amount IS 'عمولة البيع (مبلغ بالريال) تُسجل مع عملية البيع';

