-- تاريخ السند: تاريخ إصدار سند عربون الحجز (يظهر في معاينة السند تحت رقم السند)
-- Run once in Supabase SQL Editor

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS receipt_date DATE;
COMMENT ON COLUMN reservations.receipt_date IS 'تاريخ إصدار سند عربون الحجز — يظهر في معاينة السند تحت رقم السند';
