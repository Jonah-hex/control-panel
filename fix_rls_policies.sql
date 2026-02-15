-- ==========================================
-- سياسات الأمان الكاملة والصحيحة
-- Complete and Correct Security Policies
-- ==========================================

-- حذف السياسات القديمة أولاً
DROP POLICY IF EXISTS "Users view own buildings" ON buildings;
DROP POLICY IF EXISTS "Users create buildings" ON buildings;
DROP POLICY IF EXISTS "Users update own buildings" ON buildings;
DROP POLICY IF EXISTS "Users delete own buildings" ON buildings;

DROP POLICY IF EXISTS "Users view own units" ON units;
DROP POLICY IF EXISTS "Users manage own reservations" ON reservations;
DROP POLICY IF EXISTS "Users manage own sales" ON sales;
DROP POLICY IF EXISTS "Users manage own staff" ON staff;
DROP POLICY IF EXISTS "Users manage own expenses" ON expenses;
DROP POLICY IF EXISTS "Users manage own income" ON income;
DROP POLICY IF EXISTS "Users manage own maintenance" ON maintenance_requests;
DROP POLICY IF EXISTS "Users view own activity" ON activity_log;
DROP POLICY IF EXISTS "Users view own notifications" ON notifications;

-- ==========================================
-- سياسات جدول العماير
-- ==========================================

CREATE POLICY "buildings_select_policy" ON buildings
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "buildings_insert_policy" ON buildings
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "buildings_update_policy" ON buildings
  FOR UPDATE USING (owner_id = auth.uid()) 
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "buildings_delete_policy" ON buildings
  FOR DELETE USING (owner_id = auth.uid());

-- ==========================================
-- سياسات جدول الوحدات
-- ==========================================

CREATE POLICY "units_select_policy" ON units
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = units.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "units_insert_policy" ON units
  FOR INSERT WITH CHECK (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = units.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "units_update_policy" ON units
  FOR UPDATE USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = units.building_id AND b.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = units.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "units_delete_policy" ON units
  FOR DELETE USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = units.building_id AND b.owner_id = auth.uid())
  );

-- ==========================================
-- سياسات جدول الحجوزات
-- ==========================================

CREATE POLICY "reservations_select_policy" ON reservations
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = reservations.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "reservations_insert_policy" ON reservations
  FOR INSERT WITH CHECK (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = reservations.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "reservations_update_policy" ON reservations
  FOR UPDATE USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = reservations.building_id AND b.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = reservations.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "reservations_delete_policy" ON reservations
  FOR DELETE USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = reservations.building_id AND b.owner_id = auth.uid())
  );

-- ==========================================
-- سياسات جدول المبيعات
-- ==========================================

CREATE POLICY "sales_select_policy" ON sales
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = sales.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "sales_insert_policy" ON sales
  FOR INSERT WITH CHECK (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = sales.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "sales_update_policy" ON sales
  FOR UPDATE USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = sales.building_id AND b.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = sales.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "sales_delete_policy" ON sales
  FOR DELETE USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = sales.building_id AND b.owner_id = auth.uid())
  );

-- ==========================================
-- سياسات جدول الموظفين
-- ==========================================

CREATE POLICY "staff_select_policy" ON staff
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = staff.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "staff_insert_policy" ON staff
  FOR INSERT WITH CHECK (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = staff.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "staff_update_policy" ON staff
  FOR UPDATE USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = staff.building_id AND b.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = staff.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "staff_delete_policy" ON staff
  FOR DELETE USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = staff.building_id AND b.owner_id = auth.uid())
  );

-- ==========================================
-- سياسات جدول المصروفات
-- ==========================================

CREATE POLICY "expenses_select_policy" ON expenses
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = expenses.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "expenses_insert_policy" ON expenses
  FOR INSERT WITH CHECK (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = expenses.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "expenses_update_policy" ON expenses
  FOR UPDATE USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = expenses.building_id AND b.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = expenses.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "expenses_delete_policy" ON expenses
  FOR DELETE USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = expenses.building_id AND b.owner_id = auth.uid())
  );

-- ==========================================
-- سياسات جدول الإيرادات
-- ==========================================

CREATE POLICY "income_select_policy" ON income
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = income.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "income_insert_policy" ON income
  FOR INSERT WITH CHECK (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = income.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "income_update_policy" ON income
  FOR UPDATE USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = income.building_id AND b.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = income.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "income_delete_policy" ON income
  FOR DELETE USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = income.building_id AND b.owner_id = auth.uid())
  );

-- ==========================================
-- سياسات جدول طلبات الصيانة
-- ==========================================

CREATE POLICY "maintenance_select_policy" ON maintenance_requests
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = maintenance_requests.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "maintenance_insert_policy" ON maintenance_requests
  FOR INSERT WITH CHECK (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = maintenance_requests.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "maintenance_update_policy" ON maintenance_requests
  FOR UPDATE USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = maintenance_requests.building_id AND b.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = maintenance_requests.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "maintenance_delete_policy" ON maintenance_requests
  FOR DELETE USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = maintenance_requests.building_id AND b.owner_id = auth.uid())
  );

-- ==========================================
-- سياسات جدول سجل الأنشطة
-- ==========================================

CREATE POLICY "activity_log_select_policy" ON activity_log
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = activity_log.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "activity_log_insert_policy" ON activity_log
  FOR INSERT WITH CHECK (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = activity_log.building_id AND b.owner_id = auth.uid())
  );

-- ==========================================
-- سياسات جدول الإخطارات
-- ==========================================

CREATE POLICY "notifications_select_policy" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_policy" ON notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_update_policy" ON notifications
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ==========================================
-- تم!
-- ==========================================
