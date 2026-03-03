-- ==========================================
-- نظام إدارة المستثمرين — قواعد البيانات
-- Investors Management: Building investors + Unit investments
-- ==========================================
-- نفّذ هذا الملف مرة واحدة في Supabase SQL Editor
-- ==========================================

-- 1) مستثمرون بالعمارة: نسبة ربح من بيع العمارة أو نسبة متفق عليها (15%-20%)
CREATE TABLE IF NOT EXISTS building_investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investor_name VARCHAR(255) NOT NULL,
  investor_phone VARCHAR(50),
  investor_email VARCHAR(255),
  investor_id_number VARCHAR(20),
  profit_percentage DECIMAL(5,2) NOT NULL CHECK (profit_percentage >= 0 AND profit_percentage <= 100),
  profit_percentage_to DECIMAL(5,2) CHECK (profit_percentage_to IS NULL OR (profit_percentage_to >= 0 AND profit_percentage_to <= 100)),
  agreement_type VARCHAR(50) NOT NULL DEFAULT 'agreed_percentage' CHECK (agreement_type IN ('agreed_percentage', 'from_building_sales')),
  total_invested_amount DECIMAL(15,2),
  investment_start_date DATE,
  investment_due_date DATE,
  contract_image_path TEXT,
  id_image_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_building_investors_building ON building_investors(building_id);
CREATE INDEX IF NOT EXISTS idx_building_investors_owner ON building_investors(owner_id);

COMMENT ON TABLE building_investors IS 'مستثمرون بالعمارة — نسبة ربح متفق عليها (عادة 15%-20%) أو من مبيعات العمارة';
COMMENT ON COLUMN building_investors.agreement_type IS 'agreed_percentage=نسبة ثابتة متفق عليها، from_building_sales=نسبة من إيرادات بيع الوحدات';

-- 2) استثمار بالوحدات: شراء تحت الإنشاء وإعادة بيع (الربح = سعر إعادة البيع − سعر الشراء)
CREATE TABLE IF NOT EXISTS unit_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investor_name VARCHAR(255) NOT NULL,
  investor_phone VARCHAR(50),
  investor_email VARCHAR(255),
  investor_id_number VARCHAR(20),
  purchase_price DECIMAL(15,2) NOT NULL,
  purchase_date DATE,
  resale_sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'under_construction' CHECK (status IN ('under_construction', 'resold', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unit_investments_unit ON unit_investments(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_investments_building ON unit_investments(building_id);
CREATE INDEX IF NOT EXISTS idx_unit_investments_owner ON unit_investments(owner_id);
CREATE INDEX IF NOT EXISTS idx_unit_investments_resale ON unit_investments(resale_sale_id);

COMMENT ON TABLE unit_investments IS 'استثمار بالوحدات — شراء وحدة تحت الإنشاء وإعادة بيع؛ الربح = سعر البيع للمشتري النهائي − سعر الشراء';
COMMENT ON COLUMN unit_investments.resale_sale_id IS 'عند إعادة بيع الوحدة للمشتري النهائي يُربط بسجل المبيعات';

-- RLS
ALTER TABLE building_investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_investments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "building_investors_select" ON building_investors;
CREATE POLICY "building_investors_select" ON building_investors FOR SELECT USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true WHERE b.id = building_investors.building_id)
);
DROP POLICY IF EXISTS "building_investors_insert" ON building_investors;
CREATE POLICY "building_investors_insert" ON building_investors FOR INSERT WITH CHECK (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true WHERE b.id = building_id)
);
DROP POLICY IF EXISTS "building_investors_update" ON building_investors;
CREATE POLICY "building_investors_update" ON building_investors FOR UPDATE USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true WHERE b.id = building_investors.building_id)
);
DROP POLICY IF EXISTS "building_investors_delete" ON building_investors;
CREATE POLICY "building_investors_delete" ON building_investors FOR DELETE USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true WHERE b.id = building_investors.building_id)
);

DROP POLICY IF EXISTS "unit_investments_select" ON unit_investments;
CREATE POLICY "unit_investments_select" ON unit_investments FOR SELECT USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true WHERE b.id = unit_investments.building_id)
);
DROP POLICY IF EXISTS "unit_investments_insert" ON unit_investments;
CREATE POLICY "unit_investments_insert" ON unit_investments FOR INSERT WITH CHECK (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true WHERE b.id = building_id)
);
DROP POLICY IF EXISTS "unit_investments_update" ON unit_investments;
CREATE POLICY "unit_investments_update" ON unit_investments FOR UPDATE USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true WHERE b.id = unit_investments.building_id)
);
DROP POLICY IF EXISTS "unit_investments_delete" ON unit_investments;
CREATE POLICY "unit_investments_delete" ON unit_investments FOR DELETE USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND e.is_active = true WHERE b.id = unit_investments.building_id)
);

-- تحديث updated_at
CREATE OR REPLACE FUNCTION set_investors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS building_investors_updated ON building_investors;
CREATE TRIGGER building_investors_updated BEFORE UPDATE ON building_investors FOR EACH ROW EXECUTE PROCEDURE set_investors_updated_at();
DROP TRIGGER IF EXISTS unit_investments_updated ON unit_investments;
CREATE TRIGGER unit_investments_updated BEFORE UPDATE ON unit_investments FOR EACH ROW EXECUTE PROCEDURE set_investors_updated_at();
