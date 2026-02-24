-- جدول موظفي لوحة التحكم (يعملون تحت حساب المالك)
-- Dashboard employees: linked to owner, permission switches per section

CREATE TABLE IF NOT EXISTS dashboard_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  -- صلاحيات الوصول لكل قسم (سويتشات)
  permissions JSONB NOT NULL DEFAULT '{
    "dashboard": true,
    "buildings": true,
    "buildings_create": true,
    "buildings_edit": true,
    "building_details": true,
    "buildings_delete": true,
    "details_basic": true,
    "details_building": true,
    "details_facilities": true,
    "details_guard": true,
    "details_location": true,
    "details_association": true,
    "details_engineering": true,
    "details_electricity": true,
    "units": true,
    "units_edit": true,
    "deeds": true,
    "statistics": true,
    "activities": true,
    "reports": true,
    "reservations": true,
    "sales": true,
    "security": false,
    "settings": false
  }'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE dashboard_employees IS 'موظفو لوحة التحكم تحت حساب المالك مع صلاحيات لكل قسم';
COMMENT ON COLUMN dashboard_employees.owner_id IS 'معرف المالك (المستخدم الرئيسي)';
COMMENT ON COLUMN dashboard_employees.permissions IS 'صلاحيات الوصول: dashboard, buildings, buildings_create, buildings_edit, building_details, buildings_delete, details_* , units, units_edit, deeds, statistics, activities, reports, reservations, sales, security, settings';

-- فهرس للبحث حسب المالك
CREATE INDEX IF NOT EXISTS idx_dashboard_employees_owner_id ON dashboard_employees(owner_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_employees_active ON dashboard_employees(owner_id, is_active) WHERE is_active = true;

-- تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_dashboard_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_dashboard_employees_updated_at ON dashboard_employees;
CREATE TRIGGER trigger_dashboard_employees_updated_at
  BEFORE UPDATE ON dashboard_employees
  FOR EACH ROW EXECUTE PROCEDURE update_dashboard_employees_updated_at();

-- RLS: المالك فقط يدير موظفيه
ALTER TABLE dashboard_employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_select_employees" ON dashboard_employees;
CREATE POLICY "owner_select_employees" ON dashboard_employees
  FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "owner_insert_employees" ON dashboard_employees;
CREATE POLICY "owner_insert_employees" ON dashboard_employees
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "owner_update_employees" ON dashboard_employees;
CREATE POLICY "owner_update_employees" ON dashboard_employees
  FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "owner_delete_employees" ON dashboard_employees;
CREATE POLICY "owner_delete_employees" ON dashboard_employees
  FOR DELETE USING (auth.uid() = owner_id);
