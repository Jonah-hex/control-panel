-- ============================================================
-- جدول طلبات الصيانة — سكيمة موحّدة وربط صحيح مع الوحدات والعمارات
-- Maintenance requests: canonical schema, linked to units + buildings
-- ============================================================
-- نفّذ مرة واحدة من Supabase Dashboard → SQL Editor
-- ============================================================

-- إنشاء الجدول إن لم يكن موجوداً (مطابق للتطبيق)
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(50) DEFAULT 'normal',
  category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  assigned_to UUID,
  request_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_date DATE,
  completion_date DATE,
  estimated_cost DECIMAL(15, 2),
  actual_cost DECIMAL(15, 2),
  notes TEXT,
  completion_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إضافة unit_id إن كان الجدول قديماً وبدون هذا العمود
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE SET NULL;

-- فهارس للربط والاستعلام
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_building_id ON maintenance_requests(building_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_unit_id ON maintenance_requests(unit_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_request_date ON maintenance_requests(request_date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_scheduled_date ON maintenance_requests(scheduled_date) WHERE scheduled_date IS NOT NULL;

-- توثيق
COMMENT ON TABLE maintenance_requests IS 'طلبات الصيانة — مرتبطة بعمارة ووحدة (اختياري)';
COMMENT ON COLUMN maintenance_requests.building_id IS 'العمارة (مطلوب)';
COMMENT ON COLUMN maintenance_requests.unit_id IS 'الوحدة — إن كان الطلب خاصاً بوحدة';
COMMENT ON COLUMN maintenance_requests.request_date IS 'تاريخ إنشاء الطلب';
COMMENT ON COLUMN maintenance_requests.scheduled_date IS 'موعد التنفيذ المخطط (YYYY-MM-DD)';
