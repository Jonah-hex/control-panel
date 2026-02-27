-- نوع تسوية العربون عند إتمام البيع: included = مشمول في مبلغ الشراء (تم المخالصة)، refund = استرداد (تم مخالصة الاسترداد)
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS deposit_settlement_type VARCHAR(50);
COMMENT ON COLUMN reservations.deposit_settlement_type IS 'included=مشمول في البيع، refund=استرداد';
