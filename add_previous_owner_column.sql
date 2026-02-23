-- إضافة عمود اسم المالك السابق (يُملأ تلقائياً عند نقل الملكية)
ALTER TABLE units
ADD COLUMN IF NOT EXISTS previous_owner_name VARCHAR(255);

-- previous_owner_name: اسم المالك قبل نقل الملكية (يُحفظ عند تسجيل المشتري الجديد)
