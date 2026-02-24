-- إضافة دعوة الموظفين وتسجيل الدخول تحت حساب المالك
-- 1) عمود auth_user_id: ربط الموظف بحساب Auth بعد قبول الدعوة
-- 2) البريد إلزامي لإرسال الدعوة
-- 3) سياسات RLS لتمكين الموظف من قراءة/تعديل بيانات المالك حسب الصلاحيات
--
-- إذا كانت أسماء السياسات في مشروعك مختلفة، عدّل أوامر DROP POLICY قبل التشغيل.
ALTER TABLE dashboard_employees
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN dashboard_employees.auth_user_id IS 'معرف مستخدم Auth للموظف بعد قبول الدعوة';

-- جعل البريد إلزامياً للموظفين الجدد (الموجودون بدون بريد يبقون للتوافق)
-- إن كان الجدول يسمح بـ NULL يمكن تغييره لاحقاً بعد تحديث البيانات
-- ALTER TABLE dashboard_employees ALTER COLUMN email SET NOT NULL;

-- فهرس لاستعلام الموظف الحالي عن سجله
CREATE INDEX IF NOT EXISTS idx_dashboard_employees_auth_user_id
  ON dashboard_employees(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- السماح للموظف بقراءة سجله فقط (ليحصل على owner_id والصلاحيات)
DROP POLICY IF EXISTS "employee_select_own_row" ON dashboard_employees;
CREATE POLICY "employee_select_own_row" ON dashboard_employees
  FOR SELECT USING (auth_user_id = auth.uid());

-- ========== RLS: السماح للموظف برؤية وتعديل بيانات عماير المالك ==========
-- المالك يبقى owner_id = auth.uid()
-- الموظف: auth.uid() = auth_user_id في dashboard_employees و owner_id هناك = owner_id العمارة

-- buildings: SELECT و UPDATE و INSERT و DELETE للمالك أو للموظف النشط التابع لنفس المالك
DROP POLICY IF EXISTS "Users can view their own buildings" ON buildings;
CREATE POLICY "Users can view their own buildings" ON buildings
  FOR SELECT USING (
    owner_id = auth.uid()
    OR auth.uid() IN (
      SELECT auth_user_id FROM dashboard_employees
      WHERE owner_id = buildings.owner_id AND is_active = true AND auth_user_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Users can create buildings" ON buildings;
CREATE POLICY "Users can create buildings" ON buildings
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
    OR auth.uid() IN (
      SELECT auth_user_id FROM dashboard_employees
      WHERE owner_id = buildings.owner_id AND is_active = true AND auth_user_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Users can update their own buildings" ON buildings;
CREATE POLICY "Users can update their own buildings" ON buildings
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR auth.uid() IN (
      SELECT auth_user_id FROM dashboard_employees
      WHERE owner_id = buildings.owner_id AND is_active = true AND auth_user_id IS NOT NULL
    )
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR auth.uid() IN (
      SELECT auth_user_id FROM dashboard_employees
      WHERE owner_id = buildings.owner_id AND is_active = true AND auth_user_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Users can delete their own buildings" ON buildings;
CREATE POLICY "Users can delete their own buildings" ON buildings
  FOR DELETE USING (
    owner_id = auth.uid()
    OR auth.uid() IN (
      SELECT auth_user_id FROM dashboard_employees
      WHERE owner_id = buildings.owner_id AND is_active = true AND auth_user_id IS NOT NULL
    )
  );

-- units: نفس الفكرة عبر building_id -> buildings.owner_id
DROP POLICY IF EXISTS "Users can view units in their buildings" ON units;
CREATE POLICY "Users can view units in their buildings" ON units
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM buildings b
      WHERE b.id = units.building_id
      AND (
        b.owner_id = auth.uid()
        OR auth.uid() IN (
          SELECT auth_user_id FROM dashboard_employees
          WHERE owner_id = b.owner_id AND is_active = true AND auth_user_id IS NOT NULL
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can create units in their buildings" ON units;
CREATE POLICY "Users can create units in their buildings" ON units
  FOR INSERT WITH CHECK (
    EXISTS(
      SELECT 1 FROM buildings b
      WHERE b.id = units.building_id
      AND (
        b.owner_id = auth.uid()
        OR auth.uid() IN (
          SELECT auth_user_id FROM dashboard_employees
          WHERE owner_id = b.owner_id AND is_active = true AND auth_user_id IS NOT NULL
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can update units in their buildings" ON units;
CREATE POLICY "Users can update units in their buildings" ON units
  FOR UPDATE USING (
    EXISTS(
      SELECT 1 FROM buildings b
      WHERE b.id = units.building_id
      AND (
        b.owner_id = auth.uid()
        OR auth.uid() IN (
          SELECT auth_user_id FROM dashboard_employees
          WHERE owner_id = b.owner_id AND is_active = true AND auth_user_id IS NOT NULL
        )
      )
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM buildings b
      WHERE b.id = units.building_id
      AND (
        b.owner_id = auth.uid()
        OR auth.uid() IN (
          SELECT auth_user_id FROM dashboard_employees
          WHERE owner_id = b.owner_id AND is_active = true AND auth_user_id IS NOT NULL
        )
      )
    )
  );

-- ملاحظة: سياسات DELETE على units إن وُجدت تحتاج تحديثاً مماثلاً إن رغبت بمنح الموظف حذف الوحدات.
