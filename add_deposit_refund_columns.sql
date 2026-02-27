-- تتبع استرداد العربون عند إلغاء الحجز (حجز ملغي + كان مدفوع بعربون)
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS deposit_refunded BOOLEAN DEFAULT FALSE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS deposit_refunded_at TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS deposit_refund_method VARCHAR(50); -- 'cash' | 'transfer'
COMMENT ON COLUMN reservations.deposit_refunded IS 'تم استرداد العربون بعد إلغاء الحجز';
COMMENT ON COLUMN reservations.deposit_refund_method IS 'طريقة الاسترداد: cash أو transfer';
