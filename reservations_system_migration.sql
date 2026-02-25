-- ==========================================
-- نظام حجوزات متكامل: مسوقين، سند عربون، إلغاء/إتمام
-- تشغيله مرة واحدة في Supabase → SQL Editor
-- ==========================================

-- 0) إنشاء الجداول الأساسية إذا لم تكن موجودة (مطلوب لـ relation "reservations" does not exist)
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL,
  building_id UUID NOT NULL,
  buyer_name VARCHAR(255) NOT NULL,
  buyer_email VARCHAR(255),
  buyer_phone VARCHAR(20),
  buyer_id_number VARCHAR(20),
  sale_date TIMESTAMPTZ DEFAULT NOW(),
  sale_price DECIMAL(15, 2) NOT NULL,
  payment_method VARCHAR(100),
  down_payment DECIMAL(15, 2),
  remaining_payment DECIMAL(15, 2),
  payment_status VARCHAR(50) DEFAULT 'pending',
  contract_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL,
  building_id UUID NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20) NOT NULL,
  reservation_date TIMESTAMPTZ DEFAULT NOW(),
  expiry_date TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  deposit_amount DECIMAL(15, 2),
  deposit_paid BOOLEAN DEFAULT FALSE,
  deposit_paid_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1) جدول المسوقين (مرتبط بملكية المالك فقط)
CREATE TABLE IF NOT EXISTS reservation_marketers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketers_owner ON reservation_marketers(owner_id);
ALTER TABLE reservation_marketers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketers_owner_only" ON reservation_marketers;
CREATE POLICY "marketers_owner_only" ON reservation_marketers
  FOR ALL USING (
    owner_id = auth.uid()
    OR EXISTS(SELECT 1 FROM dashboard_employees e WHERE e.owner_id = reservation_marketers.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true)
  );

-- 2) إضافة أعمدة جديدة لجدول الحجوزات
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS marketer_id UUID REFERENCES reservation_marketers(id) ON DELETE SET NULL;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS marketer_name VARCHAR(255);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS marketer_phone VARCHAR(50);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(100) UNIQUE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES sales(id) ON DELETE SET NULL;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255);

COMMENT ON COLUMN reservations.status IS 'active=قيد الحجز, cancelled=ملغي, completed=تم البيع';
COMMENT ON COLUMN reservations.receipt_number IS 'رقم سند عربون الحجز';

-- 3) تطبيع الحالات: نستخدم active بدل pending/confirmed للحجوزات النشطة
-- (لا نغيّر البيانات القديمة؛ التطبيق يتعامل مع active | cancelled | completed)

-- 4) تفعيل RLS على الحجوزات ثم سياسات الحجوزات: المالك أو الموظف التابع له
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reservations_select_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_insert_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_update_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_delete_policy" ON reservations;

CREATE POLICY "reservations_select_policy" ON reservations FOR SELECT USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = reservations.building_id AND b.owner_id = auth.uid())
  OR EXISTS(SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true WHERE b.id = reservations.building_id)
);

CREATE POLICY "reservations_insert_policy" ON reservations FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = reservations.building_id AND b.owner_id = auth.uid())
  OR EXISTS(SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true WHERE b.id = reservations.building_id)
);

CREATE POLICY "reservations_update_policy" ON reservations FOR UPDATE USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = reservations.building_id AND b.owner_id = auth.uid())
  OR EXISTS(SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true WHERE b.id = reservations.building_id)
) WITH CHECK (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = reservations.building_id AND b.owner_id = auth.uid())
  OR EXISTS(SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true WHERE b.id = reservations.building_id)
);

CREATE POLICY "reservations_delete_policy" ON reservations FOR DELETE USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = reservations.building_id AND b.owner_id = auth.uid())
  OR EXISTS(SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true WHERE b.id = reservations.building_id)
);
