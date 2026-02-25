-- ==========================================
-- إصلاح: تفعيل RLS على جدول public.income
-- Fix: Enable RLS on public.income (Security Advisor)
-- ==========================================
-- جدول income مرتبط بالعمارة (building_id) — المالك فقط يدير إيرادات عماراته
-- نفّذ في Supabase → SQL Editor

ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;

-- حذف سياسات قديمة إن وُجدت
DROP POLICY IF EXISTS "Users manage own income" ON public.income;
DROP POLICY IF EXISTS "income_select_policy" ON public.income;
DROP POLICY IF EXISTS "income_insert_policy" ON public.income;
DROP POLICY IF EXISTS "income_update_policy" ON public.income;
DROP POLICY IF EXISTS "income_delete_policy" ON public.income;

-- المالك يرى إيرادات عماراته فقط
CREATE POLICY "income_select_policy" ON public.income
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = income.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "income_insert_policy" ON public.income
  FOR INSERT WITH CHECK (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = income.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "income_update_policy" ON public.income
  FOR UPDATE USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = income.building_id AND b.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = income.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "income_delete_policy" ON public.income
  FOR DELETE USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = income.building_id AND b.owner_id = auth.uid())
  );
