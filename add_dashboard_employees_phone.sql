-- إضافة عمود رقم الجوال لجدول موظفي لوحة التحكم (لإرسال رسائل ترحيبية/تنبيهات لاحقاً)
ALTER TABLE dashboard_employees
  ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN dashboard_employees.phone IS 'رقم جوال الموظف لإرسال رسائل ترحيبية أو تنبيهات عند تفعيل الإرسال';
