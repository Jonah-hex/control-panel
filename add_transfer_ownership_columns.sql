-- إضافة أعمدة نقل الملكية للوحدة
-- نقل ملكية: اسم المشتري، رقم الجوال، حالة الإعفاء الضريبي، ملف الإعفاء، اسم المالك السابق

ALTER TABLE units
ADD COLUMN IF NOT EXISTS owner_phone VARCHAR(30),
ADD COLUMN IF NOT EXISTS tax_exemption_status BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tax_exemption_file_url TEXT,
ADD COLUMN IF NOT EXISTS previous_owner_name VARCHAR(255);

-- owner_phone: رقم جوال المالك/المشتري
-- tax_exemption_status: يوجد إعفاء ضريبي (نعم/لا)
-- tax_exemption_file_url: رابط ملف الإعفاء الضريبي (صورة أو PDF)
-- previous_owner_name: اسم المالك قبل نقل الملكية (يُحفظ عند تسجيل المشتري الجديد)
