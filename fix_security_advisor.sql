-- ==========================================
-- إصلاح تحذيرات Security Advisor في Supabase
-- Fix Supabase Security Advisor warnings (RLS)
-- ==========================================
-- 1) افتح Supabase → مشروعك → Security Advisor لمعرفة الأخطاء الثلاثة
-- 2) نفّذ هذا الملف في: SQL Editor → New query → الصق المحتوى → Run
-- 3) أعد فتح Security Advisor وتأكد أن التحذيرات زالت
-- ==========================================

-- تفعيل RLS على الجداول الأساسية (إن وُجدت)
ALTER TABLE IF EXISTS buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS units ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS income ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboard_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reservation_marketers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_subscriptions ENABLE ROW LEVEL SECURITY;

-- ========== buildings ==========
DROP POLICY IF EXISTS "Users can view their own buildings" ON buildings;
DROP POLICY IF EXISTS "buildings_select_policy" ON buildings;
CREATE POLICY "buildings_select_policy" ON buildings FOR SELECT USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert their own buildings" ON buildings;
DROP POLICY IF EXISTS "buildings_insert_policy" ON buildings;
CREATE POLICY "buildings_insert_policy" ON buildings FOR INSERT WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their own buildings" ON buildings;
DROP POLICY IF EXISTS "buildings_update_policy" ON buildings;
CREATE POLICY "buildings_update_policy" ON buildings FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete their own buildings" ON buildings;
DROP POLICY IF EXISTS "buildings_delete_policy" ON buildings;
CREATE POLICY "buildings_delete_policy" ON buildings FOR DELETE USING (owner_id = auth.uid());

-- ========== units ==========
DROP POLICY IF EXISTS "Users view own units" ON units;
DROP POLICY IF EXISTS "Users insert own units" ON units;
DROP POLICY IF EXISTS "Users update own units" ON units;
DROP POLICY IF EXISTS "Users delete own units" ON units;
DROP POLICY IF EXISTS "units_select_policy" ON units;
CREATE POLICY "units_select_policy" ON units FOR SELECT USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = units.building_id AND b.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "units_insert_policy" ON units;
CREATE POLICY "units_insert_policy" ON units FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = units.building_id AND b.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "units_update_policy" ON units;
CREATE POLICY "units_update_policy" ON units FOR UPDATE USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = units.building_id AND b.owner_id = auth.uid())
) WITH CHECK (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = units.building_id AND b.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "units_delete_policy" ON units;
CREATE POLICY "units_delete_policy" ON units FOR DELETE USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = units.building_id AND b.owner_id = auth.uid())
);

-- ========== reservations (مع دعم الموظفين إن وُجد جدول dashboard_employees) ==========
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reservations') THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dashboard_employees') THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS "reservations_select_policy" ON reservations;
      CREATE POLICY "reservations_select_policy" ON reservations FOR SELECT USING (
        EXISTS(SELECT 1 FROM buildings b WHERE b.id = reservations.building_id AND b.owner_id = auth.uid())
        OR EXISTS(SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true WHERE b.id = reservations.building_id)
      );
      DROP POLICY IF EXISTS "reservations_insert_policy" ON reservations;
      CREATE POLICY "reservations_insert_policy" ON reservations FOR INSERT WITH CHECK (
        EXISTS(SELECT 1 FROM buildings b WHERE b.id = reservations.building_id AND b.owner_id = auth.uid())
        OR EXISTS(SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true WHERE b.id = reservations.building_id)
      );
      DROP POLICY IF EXISTS "reservations_update_policy" ON reservations;
      CREATE POLICY "reservations_update_policy" ON reservations FOR UPDATE USING (
        EXISTS(SELECT 1 FROM buildings b WHERE b.id = reservations.building_id AND b.owner_id = auth.uid())
        OR EXISTS(SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true WHERE b.id = reservations.building_id)
      ) WITH CHECK (
        EXISTS(SELECT 1 FROM buildings b WHERE b.id = reservations.building_id AND b.owner_id = auth.uid())
        OR EXISTS(SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true WHERE b.id = reservations.building_id)
      );
      DROP POLICY IF EXISTS "reservations_delete_policy" ON reservations;
      CREATE POLICY "reservations_delete_policy" ON reservations FOR DELETE USING (
        EXISTS(SELECT 1 FROM buildings b WHERE b.id = reservations.building_id AND b.owner_id = auth.uid())
        OR EXISTS(SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true WHERE b.id = reservations.building_id)
      );
    $p$;
  ELSE
    EXECUTE $p$
      DROP POLICY IF EXISTS "reservations_select_policy" ON reservations;
      CREATE POLICY "reservations_select_policy" ON reservations FOR SELECT USING (
        EXISTS(SELECT 1 FROM buildings b WHERE b.id = reservations.building_id AND b.owner_id = auth.uid())
      );
      DROP POLICY IF EXISTS "reservations_insert_policy" ON reservations;
      CREATE POLICY "reservations_insert_policy" ON reservations FOR INSERT WITH CHECK (
        EXISTS(SELECT 1 FROM buildings b WHERE b.id = reservations.building_id AND b.owner_id = auth.uid())
      );
      DROP POLICY IF EXISTS "reservations_update_policy" ON reservations;
      CREATE POLICY "reservations_update_policy" ON reservations FOR UPDATE USING (
        EXISTS(SELECT 1 FROM buildings b WHERE b.id = reservations.building_id AND b.owner_id = auth.uid())
      ) WITH CHECK (
        EXISTS(SELECT 1 FROM buildings b WHERE b.id = reservations.building_id AND b.owner_id = auth.uid())
      );
      DROP POLICY IF EXISTS "reservations_delete_policy" ON reservations;
      CREATE POLICY "reservations_delete_policy" ON reservations FOR DELETE USING (
        EXISTS(SELECT 1 FROM buildings b WHERE b.id = reservations.building_id AND b.owner_id = auth.uid())
      );
    $p$;
  END IF;
END $$;

-- ========== sales ==========
DROP POLICY IF EXISTS "Users manage own sales" ON sales;
DROP POLICY IF EXISTS "sales_select_policy" ON sales;
CREATE POLICY "sales_select_policy" ON sales FOR SELECT USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = sales.building_id AND b.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "sales_insert_policy" ON sales;
CREATE POLICY "sales_insert_policy" ON sales FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = sales.building_id AND b.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "sales_update_policy" ON sales;
CREATE POLICY "sales_update_policy" ON sales FOR UPDATE USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = sales.building_id AND b.owner_id = auth.uid())
) WITH CHECK (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = sales.building_id AND b.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "sales_delete_policy" ON sales;
CREATE POLICY "sales_delete_policy" ON sales FOR DELETE USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = sales.building_id AND b.owner_id = auth.uid())
);

-- ========== staff (موظفو العمارة — المالك فقط) ==========
DROP POLICY IF EXISTS "Users manage own staff" ON staff;
DROP POLICY IF EXISTS "staff_select_policy" ON staff;
CREATE POLICY "staff_select_policy" ON staff FOR SELECT USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = staff.building_id AND b.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "staff_insert_policy" ON staff;
CREATE POLICY "staff_insert_policy" ON staff FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = staff.building_id AND b.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "staff_update_policy" ON staff;
CREATE POLICY "staff_update_policy" ON staff FOR UPDATE USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = staff.building_id AND b.owner_id = auth.uid())
) WITH CHECK (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = staff.building_id AND b.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "staff_delete_policy" ON staff;
CREATE POLICY "staff_delete_policy" ON staff FOR DELETE USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = staff.building_id AND b.owner_id = auth.uid())
);

-- ========== expenses (مصروفات العمارة — المالك فقط) ==========
DROP POLICY IF EXISTS "Users manage own expenses" ON expenses;
DROP POLICY IF EXISTS "expenses_select_policy" ON expenses;
CREATE POLICY "expenses_select_policy" ON expenses FOR SELECT USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = expenses.building_id AND b.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "expenses_insert_policy" ON expenses;
CREATE POLICY "expenses_insert_policy" ON expenses FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = expenses.building_id AND b.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "expenses_update_policy" ON expenses;
CREATE POLICY "expenses_update_policy" ON expenses FOR UPDATE USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = expenses.building_id AND b.owner_id = auth.uid())
) WITH CHECK (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = expenses.building_id AND b.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "expenses_delete_policy" ON expenses;
CREATE POLICY "expenses_delete_policy" ON expenses FOR DELETE USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = expenses.building_id AND b.owner_id = auth.uid())
);

-- ========== income (إيرادات العمارة — المالك فقط) ==========
DROP POLICY IF EXISTS "Users manage own income" ON income;
DROP POLICY IF EXISTS "income_select_policy" ON income;
CREATE POLICY "income_select_policy" ON income FOR SELECT USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = income.building_id AND b.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "income_insert_policy" ON income;
CREATE POLICY "income_insert_policy" ON income FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = income.building_id AND b.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "income_update_policy" ON income;
CREATE POLICY "income_update_policy" ON income FOR UPDATE USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = income.building_id AND b.owner_id = auth.uid())
) WITH CHECK (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = income.building_id AND b.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "income_delete_policy" ON income;
CREATE POLICY "income_delete_policy" ON income FOR DELETE USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = income.building_id AND b.owner_id = auth.uid())
);

-- ========== dashboard_employees: مالك يرى موظفيه + موظف يرى سجله ==========
DROP POLICY IF EXISTS "owner_select_employees" ON dashboard_employees;
CREATE POLICY "owner_select_employees" ON dashboard_employees FOR SELECT USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "owner_insert_employees" ON dashboard_employees;
CREATE POLICY "owner_insert_employees" ON dashboard_employees FOR INSERT WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "owner_update_employees" ON dashboard_employees;
CREATE POLICY "owner_update_employees" ON dashboard_employees FOR UPDATE USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "owner_delete_employees" ON dashboard_employees;
CREATE POLICY "owner_delete_employees" ON dashboard_employees FOR DELETE USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "employee_select_own_row" ON dashboard_employees;
CREATE POLICY "employee_select_own_row" ON dashboard_employees FOR SELECT USING (auth_user_id = auth.uid());

-- ========== reservation_marketers ==========
DROP POLICY IF EXISTS "marketers_owner_only" ON reservation_marketers;
CREATE POLICY "marketers_owner_only" ON reservation_marketers FOR ALL USING (
  owner_id = auth.uid()
  OR EXISTS(SELECT 1 FROM dashboard_employees e WHERE e.owner_id = reservation_marketers.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true)
);

-- ========== subscription_plans (قراءة عامة للخطط النشطة) ==========
DROP POLICY IF EXISTS "subscription_plans_read_active" ON subscription_plans;
CREATE POLICY "subscription_plans_read_active" ON subscription_plans FOR SELECT USING (is_active = true);

-- ========== user_subscriptions (المستخدم يرى ويعدل اشتراكه فقط) ==========
DROP POLICY IF EXISTS "user_subscriptions_own" ON user_subscriptions;
CREATE POLICY "user_subscriptions_own" ON user_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ========== التخزين (Storage) إن كان التحذير عنه ==========
-- إذا ظهر تحذير لـ storage أو bucket building-images، نفّذ ملف: fix_storage_deeds_policies.sql
