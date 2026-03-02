-- السماح للموظفين الذين لديهم صلاحية "units" برؤية وإضافة وتحديث طلبات الصيانة لعمارات المالك
-- نفّذ من Supabase Dashboard → SQL Editor

DROP POLICY IF EXISTS "maintenance_select_policy" ON maintenance_requests;
CREATE POLICY "maintenance_select_policy" ON maintenance_requests FOR SELECT USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = maintenance_requests.building_id AND b.owner_id = auth.uid())
  OR EXISTS(
    SELECT 1 FROM buildings b
    JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true
    WHERE b.id = maintenance_requests.building_id AND COALESCE((e.permissions->>'units')::boolean, false) = true
  )
);

DROP POLICY IF EXISTS "maintenance_insert_policy" ON maintenance_requests;
CREATE POLICY "maintenance_insert_policy" ON maintenance_requests FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = maintenance_requests.building_id AND b.owner_id = auth.uid())
  OR EXISTS(
    SELECT 1 FROM buildings b
    JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true
    WHERE b.id = maintenance_requests.building_id AND COALESCE((e.permissions->>'units')::boolean, false) = true
  )
);

DROP POLICY IF EXISTS "maintenance_update_policy" ON maintenance_requests;
CREATE POLICY "maintenance_update_policy" ON maintenance_requests FOR UPDATE USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = maintenance_requests.building_id AND b.owner_id = auth.uid())
  OR EXISTS(
    SELECT 1 FROM buildings b
    JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true
    WHERE b.id = maintenance_requests.building_id AND COALESCE((e.permissions->>'units')::boolean, false) = true
  )
) WITH CHECK (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = maintenance_requests.building_id AND b.owner_id = auth.uid())
  OR EXISTS(
    SELECT 1 FROM buildings b
    JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true
    WHERE b.id = maintenance_requests.building_id AND COALESCE((e.permissions->>'units')::boolean, false) = true
  )
);

DROP POLICY IF EXISTS "maintenance_delete_policy" ON maintenance_requests;
CREATE POLICY "maintenance_delete_policy" ON maintenance_requests FOR DELETE USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = maintenance_requests.building_id AND b.owner_id = auth.uid())
  OR EXISTS(
    SELECT 1 FROM buildings b
    JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true
    WHERE b.id = maintenance_requests.building_id AND COALESCE((e.permissions->>'units')::boolean, false) = true
  )
);
