-- أعمدة كارد المصاعد والصيانة (جدول buildings)
-- نفّذ مرة واحدة من Supabase Dashboard > SQL Editor

ALTER TABLE buildings ADD COLUMN IF NOT EXISTS elevator_type VARCHAR(50);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS maintenance_company VARCHAR(255);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS maintenance_contract_number VARCHAR(100);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS last_maintenance_date DATE;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS elevator_emergency_phone VARCHAR(30);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS maintenance_contract_date DATE;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS warranty_months INTEGER;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS elevator_installation_contact_name VARCHAR(255);

-- elevator_type: نوع المصاعد
-- maintenance_company: شركة الصيانة
-- maintenance_contract_number: رقم عقد الصيانة
-- last_maintenance_date: تاريخ آخر صيانة
-- elevator_emergency_phone: رقم مسؤول التركيب
-- elevator_installation_contact_name: اسم مسؤول التركيب (مندوب التركيب / موظف الشركة)
-- maintenance_contract_date: تاريخ عقد الصيانة
-- warranty_months: مدة الضمان بالأشهر (يحسب تاريخ الانتهاء وتنبيهات)
