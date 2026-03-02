-- ============================================================
-- جدول ضمانات المبنى — سكيمة وأعمدة خاصة للضمانات
-- Building warranties table — own schema and columns for correct save
-- ============================================================
-- التشغيل: Supabase Dashboard → SQL Editor → الصق ثم Run
-- ============================================================

CREATE TABLE IF NOT EXISTS building_warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  structural_warranty_years INTEGER,
  plumbing_electrical_warranty_years INTEGER,
  outlets_circuits_warranty_years INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(building_id)
);

COMMENT ON TABLE building_warranties IS 'ضمانات المبنى — هيكل إنشائي، سباكة وكهرباء، أفياش وقواطع';
COMMENT ON COLUMN building_warranties.building_id IS 'المبنى';
COMMENT ON COLUMN building_warranties.structural_warranty_years IS 'ضمان الهيكل الإنشائي (سنة)';
COMMENT ON COLUMN building_warranties.plumbing_electrical_warranty_years IS 'ضمان تأسيس السباكة والكهرباء (سنة)';
COMMENT ON COLUMN building_warranties.outlets_circuits_warranty_years IS 'ضمان الأفيش والقواطع (سنة)';

CREATE INDEX IF NOT EXISTS idx_building_warranties_building_id ON building_warranties(building_id);

-- RLS
ALTER TABLE building_warranties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view warranties of own buildings"
  ON building_warranties FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM buildings b WHERE b.id = building_warranties.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "Owner can insert warranties for own buildings"
  ON building_warranties FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM buildings b WHERE b.id = building_warranties.building_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "Owner can update warranties of own buildings"
  ON building_warranties FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM buildings b WHERE b.id = building_warranties.building_id AND b.owner_id = auth.uid())
  );

-- (اختياري) نقل البيانات من أعمدة buildings إن وُجدت
-- INSERT INTO building_warranties (building_id, structural_warranty_years, plumbing_electrical_warranty_years, outlets_circuits_warranty_years, updated_at)
-- SELECT id, structural_warranty_years, plumbing_electrical_warranty_years, outlets_circuits_warranty_years, updated_at
-- FROM buildings
-- WHERE structural_warranty_years IS NOT NULL OR plumbing_electrical_warranty_years IS NOT NULL OR outlets_circuits_warranty_years IS NOT NULL
-- ON CONFLICT (building_id) DO UPDATE SET
--   structural_warranty_years = EXCLUDED.structural_warranty_years,
--   plumbing_electrical_warranty_years = EXCLUDED.plumbing_electrical_warranty_years,
--   outlets_circuits_warranty_years = EXCLUDED.outlets_circuits_warranty_years,
--   updated_at = NOW();
