-- جدول طلبات الصيانة — ربط بالوحدة + فهرس unit_id
-- نفّذ من Supabase Dashboard → SQL Editor إذا كان الجدول موجوداً ولم يكن فيه unit_id أو الفهرس

-- إنشاء الجدول إن لم يكن موجوداً (مطابق لـ supabase_schema)
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
  request_date TIMESTAMPTZ DEFAULT NOW(),
  scheduled_date DATE,
  completion_date DATE,
  estimated_cost DECIMAL(15, 2),
  actual_cost DECIMAL(15, 2),
  notes TEXT,
  completion_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إضافة عمود unit_id إن لم يكن موجوداً
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE SET NULL;

-- فهرس للاستعلام حسب الوحدة
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_unit_id ON maintenance_requests(unit_id);

COMMENT ON COLUMN maintenance_requests.unit_id IS 'الوحدة المرتبطة بطلب الصيانة — إن وُجدت';
