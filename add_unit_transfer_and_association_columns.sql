-- أعمدة إضافية للوحدة: نقل العداد مع البيع، غرفة السائق، تسجيل اتحاد الملاك
-- نفّذ مرة واحدة من Supabase Dashboard > SQL Editor

ALTER TABLE units ADD COLUMN IF NOT EXISTS electricity_meter_transferred_with_sale BOOLEAN DEFAULT FALSE;
ALTER TABLE units ADD COLUMN IF NOT EXISTS driver_room_number VARCHAR(50);
ALTER TABLE units ADD COLUMN IF NOT EXISTS driver_room_transferred_with_sale BOOLEAN DEFAULT FALSE;
ALTER TABLE units ADD COLUMN IF NOT EXISTS owner_association_registered BOOLEAN DEFAULT FALSE;

-- electricity_meter_transferred_with_sale: عند نقل الملكية، إذا تم نقل عداد الكهرباء مع الوحدة يصبح العداد غير قابل للتعديل في جدول العدادات
-- driver_room_number: رقم غرفة السائق المرتبطة بالوحدة
-- driver_room_transferred_with_sale: تم نقل غرفة السائق مع الوحدة عند البيع (غير قابل للتعديل في جدول غرف السائق)
-- owner_association_registered: الوحدة مسجلة في نظام اتحاد الملاك (تُحسب في عدد الوحدات المسجلة)
