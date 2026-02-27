-- السماح للموظفين برؤية وإدخال مبيعات عمارات المالك (مثل الحجوزات)
-- يجب تنفيذ هذا السكربت في Supabase → SQL Editor حتى يظهر سجل المبيعات للموظفين

DROP POLICY IF EXISTS "Users manage own sales" ON sales;
DROP POLICY IF EXISTS "sales_select_policy" ON sales;
CREATE POLICY "sales_select_policy" ON sales FOR SELECT USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = sales.building_id AND b.owner_id = auth.uid())
  OR EXISTS(SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true WHERE b.id = sales.building_id)
);

DROP POLICY IF EXISTS "sales_insert_policy" ON sales;
CREATE POLICY "sales_insert_policy" ON sales FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = sales.building_id AND b.owner_id = auth.uid())
  OR EXISTS(SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true WHERE b.id = sales.building_id)
);

DROP POLICY IF EXISTS "sales_update_policy" ON sales;
CREATE POLICY "sales_update_policy" ON sales FOR UPDATE USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = sales.building_id AND b.owner_id = auth.uid())
  OR EXISTS(SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true WHERE b.id = sales.building_id)
) WITH CHECK (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = sales.building_id AND b.owner_id = auth.uid())
  OR EXISTS(SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true WHERE b.id = sales.building_id)
);

DROP POLICY IF EXISTS "sales_delete_policy" ON sales;
CREATE POLICY "sales_delete_policy" ON sales FOR DELETE USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = sales.building_id AND b.owner_id = auth.uid())
  OR EXISTS(SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true WHERE b.id = sales.building_id)
);
