-- خطط الاشتراكات واشتراكات المستخدمين
-- تشغيل مرة واحدة في Supabase SQL Editor

-- جدول خطط الاشتراك
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2),
  currency TEXT NOT NULL DEFAULT 'SAR',
  duration_days INTEGER, -- null = لا نهائي (مثل المجاني)
  max_buildings INTEGER, -- null = غير محدود
  max_units_per_building INTEGER,
  features JSONB DEFAULT '[]'::jsonb, -- قائمة ميزات بالعربية
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE subscription_plans IS 'خطط الاشتراك المتاحة في المنصة';
COMMENT ON COLUMN subscription_plans.features IS 'مصفوفة نصوص للميزات (عربي)';

-- جدول اشتراكات المستخدمين
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id) -- مستخدم واحد = اشتراك واحد فعّال (يمكن تعديله لاحقاً لدعم تاريخ)
);

COMMENT ON TABLE user_subscriptions IS 'اشتراك كل مستخدم في خطة';

-- فهارس
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active_sort ON subscription_plans(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_ends_at ON user_subscriptions(ends_at) WHERE ends_at IS NOT NULL;

-- RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- السياسات (DROP أولاً ليكون السكربت قابلاً للتشغيل أكثر من مرة)
DROP POLICY IF EXISTS "subscription_plans_read_active" ON subscription_plans;
CREATE POLICY "subscription_plans_read_active"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "user_subscriptions_own" ON user_subscriptions;
CREATE POLICY "user_subscriptions_own"
  ON user_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- إدراج خطط افتراضية (الرتم الشائع: 18 وحدة/عمارة، والباقي على نفس النسبة)
INSERT INTO subscription_plans (slug, name_ar, name_en, description_ar, price_monthly, price_yearly, duration_days, max_buildings, max_units_per_building, features, is_featured, sort_order)
VALUES
  ('free', 'مجاني', 'Free', 'ابدأ بتجربة المنصة مع إمكانيات أساسية', 0, 0, NULL, 1, 18, '["عمارة واحدة","حتى 18 وحدة لكل عمارة","تقارير أساسية","دعم البريد"]'::jsonb, false, 0),
  ('starter', 'مبتدئ', 'Starter', 'مناسب للمشاريع الصغيرة', 99, 990, 30, 3, 18, '["حتى 3 عماير","حتى 18 وحدة لكل عمارة","تقارير وتنبيهات","دعم فني"]'::jsonb, false, 1),
  ('pro', 'احترافي', 'Pro', 'مدعوم بالذكاء الصناعي — الأفضل للأعمال النامية', 249, 2490, 30, 15, 36, '["حتى 15 عمارة","حتى 36 وحدة لكل عمارة","ذكاء صناعي وتقارير متقدمة","تنبيهات ذكية","دعم أولوية"]'::jsonb, true, 2),
  ('enterprise', 'مؤسسات', 'Enterprise', 'حلول مخصصة مع دعم كامل', 499, 4990, 30, NULL, NULL, '["عماير غير محدودة","وحدات غير محدودة","ذكاء صناعي و APIs","مدير حساب مخصص","SLA مضمون"]'::jsonb, false, 3)
ON CONFLICT (slug) DO NOTHING;

-- تحديث الخطط الموجودة مسبقاً لرتم 18 وحدة (شغّل إن كانت الجداول معبأة سابقاً)
UPDATE subscription_plans SET max_units_per_building = 18, features = '["عمارة واحدة","حتى 18 وحدة لكل عمارة","تقارير أساسية","دعم البريد"]'::jsonb WHERE slug = 'free';
UPDATE subscription_plans SET max_units_per_building = 18, features = '["حتى 3 عماير","حتى 18 وحدة لكل عمارة","تقارير وتنبيهات","دعم فني"]'::jsonb WHERE slug = 'starter';
UPDATE subscription_plans SET max_units_per_building = 36, features = '["حتى 15 عمارة","حتى 36 وحدة لكل عمارة","ذكاء صناعي وتقارير متقدمة","تنبيهات ذكية","دعم أولوية"]'::jsonb WHERE slug = 'pro';

-- trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscription_plans_updated ON subscription_plans;
CREATE TRIGGER subscription_plans_updated
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS user_subscriptions_updated ON user_subscriptions;
CREATE TRIGGER user_subscriptions_updated
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ========== اختياري: تطبيق حد العماير عند الإدراج (طبقة أمان إضافية) ==========
CREATE OR REPLACE FUNCTION check_building_subscription_limit()
RETURNS TRIGGER AS $$
DECLARE
  plan_max_buildings INT;
  current_count INT;
BEGIN
  SELECT sp.max_buildings INTO plan_max_buildings
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = NEW.owner_id AND us.status = 'active'
  LIMIT 1;
  IF plan_max_buildings IS NULL THEN RETURN NEW; END IF; -- غير محدود
  SELECT COUNT(*)::INT INTO current_count FROM buildings WHERE owner_id = NEW.owner_id;
  IF current_count >= plan_max_buildings THEN
    RAISE EXCEPTION 'subscription_building_limit: وصلت إلى حد العماير لخطتك (% عمارة). ترقّى من صفحة الاشتراكات.', plan_max_buildings;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS buildings_check_subscription_limit ON buildings;
CREATE TRIGGER buildings_check_subscription_limit
  BEFORE INSERT ON buildings
  FOR EACH ROW EXECUTE PROCEDURE check_building_subscription_limit();
