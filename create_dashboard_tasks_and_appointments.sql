-- ============================================
-- المهام والملاحظات + المواعيد — نظام متكامل
-- dashboard_tasks: توجيهات/ملاحظات تُعيَّن لموظف (قبول أو جدولة موعد)
-- dashboard_appointments: مواعيد حقيقية تظهر في "المواعيد القادمة"
-- ============================================
-- نفّذ في Supabase → SQL Editor
-- ============================================

-- 1) جدول المهام/الملاحظات (توجيهات للموظفين)
CREATE TABLE IF NOT EXISTS dashboard_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'scheduled', 'done', 'cancelled')),
  related_building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  related_type TEXT,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_dashboard_tasks_owner ON dashboard_tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_tasks_assigned ON dashboard_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_dashboard_tasks_status ON dashboard_tasks(status);
CREATE INDEX IF NOT EXISTS idx_dashboard_tasks_created ON dashboard_tasks(created_at DESC);

-- 2) جدول المواعيد (ما يظهر في كارد المواعيد القادمة)
CREATE TABLE IF NOT EXISTS dashboard_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('handover_appointment', 'inspector_viewing', 'engineering_review', 'unit_delivery', 'viewing', 'maintenance', 'marketing', 'contract_signing', 'other')),
  related_task_id UUID REFERENCES public.dashboard_tasks(id) ON DELETE SET NULL,
  building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_dashboard_appointments_owner ON dashboard_appointments(owner_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_appointments_scheduled ON dashboard_appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_dashboard_appointments_status ON dashboard_appointments(status);

-- 3) RLS
ALTER TABLE dashboard_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_appointments ENABLE ROW LEVEL SECURITY;

-- المهام: المالك يرى/يدير كل المهام، الموظف يرى المهام المعيّنة له
DROP POLICY IF EXISTS "dashboard_tasks_select" ON dashboard_tasks;
CREATE POLICY "dashboard_tasks_select" ON dashboard_tasks FOR SELECT USING (
  owner_id = auth.uid()
  OR assigned_to = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.dashboard_employees e
    WHERE e.owner_id = dashboard_tasks.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true
  )
);

DROP POLICY IF EXISTS "dashboard_tasks_insert" ON dashboard_tasks;
CREATE POLICY "dashboard_tasks_insert" ON dashboard_tasks FOR INSERT WITH CHECK (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.dashboard_employees e WHERE e.owner_id = dashboard_tasks.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true)
);

DROP POLICY IF EXISTS "dashboard_tasks_update" ON dashboard_tasks;
CREATE POLICY "dashboard_tasks_update" ON dashboard_tasks FOR UPDATE USING (
  owner_id = auth.uid()
  OR assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM public.dashboard_employees e WHERE e.owner_id = dashboard_tasks.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true)
);

DROP POLICY IF EXISTS "dashboard_tasks_delete" ON dashboard_tasks;
CREATE POLICY "dashboard_tasks_delete" ON dashboard_tasks FOR DELETE USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.dashboard_employees e WHERE e.owner_id = dashboard_tasks.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true)
);

-- المواعيد: نفس المنطق (مالك + موظفون نفس المنظمة)
DROP POLICY IF EXISTS "dashboard_appointments_select" ON dashboard_appointments;
CREATE POLICY "dashboard_appointments_select" ON dashboard_appointments FOR SELECT USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.dashboard_employees e WHERE e.owner_id = dashboard_appointments.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true)
);

DROP POLICY IF EXISTS "dashboard_appointments_insert" ON dashboard_appointments;
CREATE POLICY "dashboard_appointments_insert" ON dashboard_appointments FOR INSERT WITH CHECK (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.dashboard_employees e WHERE e.owner_id = dashboard_appointments.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true)
);

DROP POLICY IF EXISTS "dashboard_appointments_update" ON dashboard_appointments;
CREATE POLICY "dashboard_appointments_update" ON dashboard_appointments FOR UPDATE USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.dashboard_employees e WHERE e.owner_id = dashboard_appointments.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true)
);

DROP POLICY IF EXISTS "dashboard_appointments_delete" ON dashboard_appointments;
CREATE POLICY "dashboard_appointments_delete" ON dashboard_appointments FOR DELETE USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.dashboard_employees e WHERE e.owner_id = dashboard_appointments.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true)
);

-- تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION dashboard_tasks_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
DROP TRIGGER IF EXISTS dashboard_tasks_updated_at ON dashboard_tasks;
CREATE TRIGGER dashboard_tasks_updated_at BEFORE UPDATE ON dashboard_tasks FOR EACH ROW EXECUTE PROCEDURE dashboard_tasks_updated_at();

CREATE OR REPLACE FUNCTION dashboard_appointments_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
DROP TRIGGER IF EXISTS dashboard_appointments_updated_at ON dashboard_appointments;
CREATE TRIGGER dashboard_appointments_updated_at BEFORE UPDATE ON dashboard_appointments FOR EACH ROW EXECUTE PROCEDURE dashboard_appointments_updated_at();
