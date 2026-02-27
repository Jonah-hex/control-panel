-- حقول إضافية لنقل الملكية: صورة الشيك، مبلغ الشيك، رقم طلب التصرفات العقارية
-- نفّذ هذا الملف مرة واحدة من Supabase Dashboard > SQL Editor

ALTER TABLE units ADD COLUMN IF NOT EXISTS transfer_check_image_url TEXT;
ALTER TABLE units ADD COLUMN IF NOT EXISTS transfer_check_amount DECIMAL(15,2);
ALTER TABLE units ADD COLUMN IF NOT EXISTS transfer_real_estate_request_no VARCHAR(100);

-- transfer_check_image_url: رابط صورة الشيك المرفقة
-- transfer_check_amount: مبلغ الشيك
-- transfer_real_estate_request_no: رقم طلب التصرفات العقارية
