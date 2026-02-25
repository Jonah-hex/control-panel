-- ==========================================
-- إصلاح: تفعيل RLS على جدول public.subscriptions
-- Fix: Enable RLS on public.subscriptions (Security Advisor)
-- ==========================================
-- نفّذ في Supabase → SQL Editor

-- 1) تفعيل RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 2) سياسات آمنة
-- إذا كان الجدول يحتوي عمود user_id أو owner_id يربط الاشتراك بالمستخدم، استخدم السياسة الثانية أدناه.

-- السماح للمستخدمين المسجلين بقراءة الجدول فقط (الكتابة عبر دوال أو service role إن لزم)
DROP POLICY IF EXISTS "subscriptions_authenticated_read" ON public.subscriptions;
CREATE POLICY "subscriptions_authenticated_read" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (true);

-- إذا كان الجدول فيه عمود user_id وتريد أن يرى كل مستخدم اشتراكه فقط، احذف السياسة أعلاه واستخدم:
-- DROP POLICY IF EXISTS "subscriptions_authenticated_read" ON public.subscriptions;
-- CREATE POLICY "subscriptions_authenticated_read" ON public.subscriptions
--   FOR SELECT TO authenticated USING (user_id = auth.uid());
