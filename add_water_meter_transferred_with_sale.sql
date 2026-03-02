-- عمود نقل عداد المياه مع الوحدة عند البيع (جدول units)
-- نفّذ مرة واحدة من Supabase Dashboard → SQL Editor

ALTER TABLE units ADD COLUMN IF NOT EXISTS water_meter_transferred_with_sale BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN units.water_meter_transferred_with_sale IS 'تم نقل عداد المياه مع الوحدة عند البيع';
