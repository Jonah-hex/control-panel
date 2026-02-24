-- إصلاح: السماح للموظف بقراءة سجله من dashboard_employees
-- نفّذ هذا في Supabase → SQL Editor إذا كانت اللوحة فارغة عند دخول الموظف
DROP POLICY IF EXISTS "employee_select_own_row" ON dashboard_employees;
CREATE POLICY "employee_select_own_row" ON dashboard_employees
  FOR SELECT USING (auth_user_id = auth.uid());
