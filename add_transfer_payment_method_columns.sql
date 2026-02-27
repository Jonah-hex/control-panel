-- طريقة الشراء وبياناتها حسب النوع (نقل ملكية)
-- نفّذ مرة واحدة من Supabase Dashboard > SQL Editor

-- طريقة الدفع: cash | transfer | certified_check
ALTER TABLE units ADD COLUMN IF NOT EXISTS transfer_payment_method VARCHAR(50);
-- كاش: المبلغ
ALTER TABLE units ADD COLUMN IF NOT EXISTS transfer_cash_amount DECIMAL(15,2);
-- تحويل: اسم البنك + مبلغ الحوالة
ALTER TABLE units ADD COLUMN IF NOT EXISTS transfer_bank_name VARCHAR(255);
ALTER TABLE units ADD COLUMN IF NOT EXISTS transfer_amount DECIMAL(15,2);
-- شيك مصدق: يستخدم transfer_check_amount و transfer_check_image_url الموجودين

-- جدول المبيعات: اسم البنك عند التحويل (اختياري للتقارير)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);
