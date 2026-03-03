-- استثناء حساب مطور النظام من حد العماير (لا تخضع لقوانين الاشتراك)
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor

CREATE OR REPLACE FUNCTION check_building_subscription_limit()
RETURNS TRIGGER AS $$
DECLARE
  plan_max_buildings INT;
  current_count INT;
BEGIN
  -- استثناء: حساب مطور النظام — لا تخضع لقوانين الاشتراك
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.owner_id AND email = 'albeladi220@gmail.com') THEN
    RETURN NEW;
  END IF;

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
