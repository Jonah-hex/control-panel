-- إضافة أعمدة الصك ومحضر الفرز وملف الصك واسم المالك إلى جدول الوحدات
-- كل وحدة سكنية لها صك رسمي خاص ومحضر فرز ومالك وملف PDF للصك

ALTER TABLE units
ADD COLUMN IF NOT EXISTS deed_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS sorting_minutes_ref VARCHAR(200),
ADD COLUMN IF NOT EXISTS deed_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255);

-- deed_number: رقم الصك الرسمي للوحدة
-- sorting_minutes_ref: مرجع محضر الفرز (رقم أو رابط الملف)
-- deed_pdf_url: رابط ملف الصك بصيغة PDF (يُخزن في building-images/deeds/)
-- owner_name: اسم مالك الوحدة
