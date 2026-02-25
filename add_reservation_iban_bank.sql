-- إضافة حقول رقم الحساب/آيبان واسم البنك لجدول الحجوزات (للسند والواجهة)
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS customer_iban_or_account VARCHAR(64);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS customer_bank_name VARCHAR(128);
