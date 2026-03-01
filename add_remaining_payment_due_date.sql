-- تاريخ استحقاق المبلغ المتبقي للبيع (عند الدفع الجزئي)
-- نفّذ مرة واحدة من Supabase Dashboard > SQL Editor

ALTER TABLE sales ADD COLUMN IF NOT EXISTS remaining_payment_due_date DATE;

COMMENT ON COLUMN sales.remaining_payment_due_date IS 'تاريخ استحقاق المبلغ المتبقي عند الدفع الجزئي — للتنبيهات للمالك ومدير المبيعات';
