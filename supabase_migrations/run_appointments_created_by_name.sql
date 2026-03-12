-- اسم منشئ الموعد للعرض في تفاصيل الموعد
ALTER TABLE dashboard_appointments
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

COMMENT ON COLUMN dashboard_appointments.created_by_name IS 'اسم من أنشأ الموعد (للعرض في التفاصيل)';
