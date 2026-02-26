-- إنشاء جدول activity_logs إن لم يكن موجوداً، ثم تفعيل RLS وسياسة الإدراج
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor).

-- 1) إنشاء الجدول إن لم يكن موجوداً
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,
  action_description TEXT,
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(50) DEFAULT 'success',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2) تفعيل RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 3) سياسة القراءة (إن لم تكن موجودة، احذف السطر التالي إذا ظهر خطأ "policy already exists")
DROP POLICY IF EXISTS "Users can view their own activity logs" ON activity_logs;
CREATE POLICY "Users can view their own activity logs"
ON activity_logs FOR SELECT
USING (user_id = auth.uid());

-- 4) سياسة الإدراج
DROP POLICY IF EXISTS "Users can insert their own activity logs" ON activity_logs;
CREATE POLICY "Users can insert their own activity logs"
ON activity_logs FOR INSERT
WITH CHECK (user_id = auth.uid());
