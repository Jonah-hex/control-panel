-- إضافة عمود ملف محضر الفرز PDF إلى جدول الوحدات
-- Add sorting_minutes_pdf_url column for storing the sorting minutes document

ALTER TABLE units
ADD COLUMN IF NOT EXISTS sorting_minutes_pdf_url TEXT;

-- sorting_minutes_pdf_url: رابط ملف محضر الفرز بصيغة PDF (يُخزن في building-images/sorting-minutes/)
