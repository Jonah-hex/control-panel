-- أعمدة كارد الضمانات (جدول buildings) — أسفل كارد المصاعد والصيانة
-- نفّذ مرة واحدة من Supabase Dashboard > SQL Editor

ALTER TABLE buildings ADD COLUMN IF NOT EXISTS structural_warranty_years INTEGER;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS plumbing_electrical_warranty_years INTEGER;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS outlets_circuits_warranty_years INTEGER;

COMMENT ON COLUMN buildings.structural_warranty_years IS 'ضمان الهيكل الإنشائي — عدد السنوات';
COMMENT ON COLUMN buildings.plumbing_electrical_warranty_years IS 'ضمان تأسيس السباكة والكهرباء — عدد السنوات';
COMMENT ON COLUMN buildings.outlets_circuits_warranty_years IS 'ضمان الأفيش والقواطع — عدد السنوات';
