-- تاريخ تحصيل المبلغ المتبقي (عند تأكيد "تأكيد تحصيل المتبقي")
-- نفّذ مرة واحدة من Supabase Dashboard > SQL Editor

ALTER TABLE sales ADD COLUMN IF NOT EXISTS remaining_payment_collected_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN sales.remaining_payment_collected_at IS 'تاريخ ووقت تحصيل المبلغ المتبقي — يُسجّل عند تأكيد الدفع المكتمل (للعرض ولتنبيه التأخير إن تجاوز تاريخ الاستحقاق)';
