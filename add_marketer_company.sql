-- إضافة حقل اسم المؤسسة/الشركة لجدول المسوقين
ALTER TABLE reservation_marketers ADD COLUMN IF NOT EXISTS company VARCHAR(255);
