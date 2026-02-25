-- ==========================================
-- إصلاح: تفعيل RLS على جدول public.staff
-- Fix: Enable RLS on public.staff (Security Advisor)
-- ==========================================
-- جدول staff مرتبط بالعمارة (building_id) — المالك فقط يدير موظفي عماراته
-- نفّذ في Supabase → SQL Editor

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- حذف سياسات قديمة إن وُجدت
DROP POLICY IF EXISTS "Users manage own staff" ON public.staff;
DROP POLICY IF EXISTS "staff_select_policy" ON public.staff;
DROP POLICY IF EXISTS "staff_insert_policy" ON public.staff;
DROP POLICY IF EXISTS "staff_update_policy" ON public.staff;
DROP POLICY IF EXISTS "staff_delete_policy" ON public.staff;

-- المالك يرى موظفي عماراته فقط
CREATE POLICY "staff_select_policy" ON public.staff
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = staff.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "staff_insert_policy" ON public.staff
  FOR INSERT WITH CHECK (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = staff.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "staff_update_policy" ON public.staff
  FOR UPDATE USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = staff.building_id AND b.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = staff.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "staff_delete_policy" ON public.staff
  FOR DELETE USING (
    EXISTS(SELECT 1 FROM buildings b WHERE b.id = staff.building_id AND b.owner_id = auth.uid())
  );
