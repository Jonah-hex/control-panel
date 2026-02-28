-- ============================================================
-- جدول استلام الوحدات — نموذج الاستلام الشامل
-- Unit handovers table — matches /dashboard/sales/handover/[unitId]
-- ============================================================
-- التشغيل: Supabase Dashboard → SQL Editor → الصق ثم Run
-- ============================================================

CREATE TABLE IF NOT EXISTS unit_handovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- الربط بالوحدة والبيع/الحجز
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,

  -- تاريخ الاستلام والأطراف
  handover_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_by VARCHAR(255) NOT NULL,       -- يُسجّل "—" إذا لم يُدخل (حقل غير معروض في النموذج)
  delivered_by_phone VARCHAR(30),
  received_by VARCHAR(255) NOT NULL,       -- المستلم (العميل/المشتري)
  received_by_phone VARCHAR(30),

  -- قائمة التحقق (JSONB) — بنية الحقول الحالية في النموذج:
  checklist JSONB DEFAULT '{}',

  notes TEXT,                               -- ملاحظات عامة (غير مستخدم في الواجهة حالياً)
  status VARCHAR(50) NOT NULL DEFAULT 'draft',  -- draft | completed

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_handover_unit UNIQUE (unit_id)
);

-- توثيق الجدول والأعمدة
COMMENT ON TABLE unit_handovers IS 'نموذج استلام الوحدة — معاينة وتوقيع المستلم قبل/عند إتمام البيع';
COMMENT ON COLUMN unit_handovers.unit_id IS 'الوحدة المسلّمة';
COMMENT ON COLUMN unit_handovers.building_id IS 'العمارة';
COMMENT ON COLUMN unit_handovers.sale_id IS 'رقم عملية البيع إن وُجدت';
COMMENT ON COLUMN unit_handovers.reservation_id IS 'رقم الحجز إن وُجد';
COMMENT ON COLUMN unit_handovers.handover_date IS 'تاريخ الاستلام';
COMMENT ON COLUMN unit_handovers.delivered_by IS 'اسم المسلّم (يُسجّل "—" إذا لم يُدخل)';
COMMENT ON COLUMN unit_handovers.delivered_by_phone IS 'جوال المسلّم';
COMMENT ON COLUMN unit_handovers.received_by IS 'اسم المستلم (العميل/المشتري)';
COMMENT ON COLUMN unit_handovers.received_by_phone IS 'جوال المستلم';
COMMENT ON COLUMN unit_handovers.checklist IS 'قائمة التحقق — المفاتيح، الفواتير، الغرف، الأسقف والجبس، الأرضيات، الأفياش، الإنارات، الأدوات الصحية، الأبواب والنوافذ، الدهان، العيوب الإضافية';
COMMENT ON COLUMN unit_handovers.notes IS 'ملاحظات نصية';
COMMENT ON COLUMN unit_handovers.status IS 'draft = مسودة | completed = تم الاستلام';

-- بنية checklist (مرجع للمطور):
-- keys_received (bool), keys_count (text)
-- electricity_reading (text) — فواتير عداد الكهرباء
-- water_reading (text) — فواتير عداد المياه
-- living_room_condition: "ok"|"defect", living_room_notes
-- bedrooms: [{ condition, notes }, ...]
-- kitchen_condition, kitchen_notes
-- bathrooms: [{ condition, notes }, ...]
-- ceilings_gypsum_condition, ceilings_gypsum_notes — الأسقف والجبس
-- ceramic_floors_condition, ceramic_floors_notes — الأرضيات والسيراميك
-- electrical_outlets_condition, electrical_outlets_notes — الأفياش والكهرباء
-- lighting_condition, lighting_notes — الإنارات والليدات
-- sanitary_fixtures_condition, sanitary_fixtures_notes — الأدوات الصحية (مغاسل، كرسي الحمام، خلاطات)
-- doors_windows: "ok"|"defect", doors_windows_notes
-- paint_condition, paint_notes — الدهان والجدران
-- defects (text) — عيوب أو ملاحظات إضافية

-- فهارس
CREATE INDEX IF NOT EXISTS idx_unit_handovers_unit_id ON unit_handovers(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_handovers_building_id ON unit_handovers(building_id);
CREATE INDEX IF NOT EXISTS idx_unit_handovers_handover_date ON unit_handovers(handover_date DESC);
CREATE INDEX IF NOT EXISTS idx_unit_handovers_status ON unit_handovers(status);

-- RLS
ALTER TABLE unit_handovers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view handovers of own buildings"
  ON unit_handovers FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM buildings b WHERE b.id = unit_handovers.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "Owner can insert handovers for own buildings"
  ON unit_handovers FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM buildings b WHERE b.id = unit_handovers.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "Owner can update handovers of own buildings"
  ON unit_handovers FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM buildings b WHERE b.id = unit_handovers.building_id AND b.owner_id = auth.uid())
  );
