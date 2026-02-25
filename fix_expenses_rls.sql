-- ==========================================
-- إصلاح: تفعيل RLS على جدول public.expenses
-- Fix: Enable RLS on public.expenses (Security Advisor)
-- ==========================================
-- جدول expenses مرتبط بالعمارة (building_id) — المالك فقط يدير مصروفات عماراته
-- نفّذ في Supabase → SQL Editor

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- حذف سياسات قديمة إن وُجدت
DROP POLICY IF EXISTS "Users manage own expenses" ON public.expenses;
DROP POLICY IF EXISTS "expenses_select_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_policy" ON public.expenses;

-- المالك يرى مصروفات عماراته فقط
CREATE POLICY "expenses_select_policy" ON public.expenses
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = expenses.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "expenses_insert_policy" ON public.expenses
  FOR INSERT WITH CHECK (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = expenses.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "expenses_update_policy" ON public.expenses
  FOR UPDATE USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = expenses.building_id AND b.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = expenses.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "expenses_delete_policy" ON public.expenses
  FOR DELETE USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = expenses.building_id AND b.owner_id = auth.uid())
  );
