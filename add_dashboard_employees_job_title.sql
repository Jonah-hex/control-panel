-- إضافة عمود المسمى الوظيفي لجدول موظفي لوحة التحكم (يُعرض في هيدر لوحة التحكم للموظف)
ALTER TABLE dashboard_employees
  ADD COLUMN IF NOT EXISTS job_title TEXT;

COMMENT ON COLUMN dashboard_employees.job_title IS 'المسمى الوظيفي للموظف (يظهر في لوحة التحكم تحت عنوان الصفحة)';
