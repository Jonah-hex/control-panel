-- تاريخ استلام المسوق للعمولة (تأكيد الاستلام من تفاصيل البيع)
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS commission_received_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN sales.commission_received_at IS 'تاريخ تأكيد تسليم العمولة للمسوق';
