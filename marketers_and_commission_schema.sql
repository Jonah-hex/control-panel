-- =============================================================================
-- قسم المسوقين والعمولة — قواعد البيانات والأعمدة المطلوبة لسياسة العمل
-- نفّذ مرة واحدة من Supabase Dashboard → SQL Editor
-- السياسة: لا بيع بدون مسوق، لا عمولة بدون بيع، ربط الحجوزات والمبيعات بالمسوق
-- =============================================================================

-- 1) جدول المسوقين (إن لم يكن موجوداً)
CREATE TABLE IF NOT EXISTS reservation_marketers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  company VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reservation_marketers ADD COLUMN IF NOT EXISTS company VARCHAR(255);

COMMENT ON TABLE reservation_marketers IS 'قائمة المسوقين لكل مالك — تُربط بالحجوزات عبر marketer_id';
COMMENT ON COLUMN reservation_marketers.owner_id IS 'معرف المالك (صاحب العمارات)';
COMMENT ON COLUMN reservation_marketers.phone IS 'جوال المسوق — يُستخدم لمطابقة المسوق عند إدخال يدوي في الحجز';

CREATE INDEX IF NOT EXISTS idx_marketers_owner ON reservation_marketers(owner_id);
CREATE INDEX IF NOT EXISTS idx_marketers_phone ON reservation_marketers(owner_id, phone);

ALTER TABLE reservation_marketers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketers_owner_only" ON reservation_marketers;
CREATE POLICY "marketers_owner_only" ON reservation_marketers
  FOR ALL USING (
    owner_id = auth.uid()
    OR EXISTS(
      SELECT 1 FROM dashboard_employees e
      WHERE e.owner_id = reservation_marketers.owner_id
        AND e.auth_user_id = auth.uid()
        AND e.is_active = true
    )
  );

-- 2) أعمدة الحجوزات المرتبطة بالمسوق والبيع
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS marketer_id UUID REFERENCES reservation_marketers(id) ON DELETE SET NULL;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS marketer_name VARCHAR(255);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS marketer_phone VARCHAR(50);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES sales(id) ON DELETE SET NULL;

COMMENT ON COLUMN reservations.marketer_id IS 'ربط الحجز بمسوق مسجّل في قسم المسوقين';
COMMENT ON COLUMN reservations.marketer_name IS 'اسم المسوق (مُخزّن مع الحجز للعرض والسندات)';
COMMENT ON COLUMN reservations.marketer_phone IS 'جوال المسوق';
COMMENT ON COLUMN reservations.sale_id IS 'عند إتمام البيع — ربط الحجز بعملية البيع للعمولة والتقارير';

-- 3) عمولة البيع في جدول المبيعات
ALTER TABLE sales ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(15, 2);

COMMENT ON COLUMN sales.commission_amount IS 'عمولة البيع (ر.س) — تُسجّل عند إتمام نقل الملكية من إدارة المبيعات';

-- انتهى — بعد التنفيذ تأكد أن سياسات RLS لجدول reservations و sales تسمح للمالك والموظفين ذوي الصلاحية بالوصول.
