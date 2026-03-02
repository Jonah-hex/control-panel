-- ============================================================
-- إصلاح المفتاح الأجنبي building_id لجدول maintenance_requests
-- Fix FK: maintenance_requests.building_id → buildings(id)
-- ============================================================
-- نفّذ من Supabase Dashboard → SQL Editor
-- ============================================================

-- إزالة القيد الحالي (قد يكون باسم مختلف أو مرتبطاً بجدول خاطئ)
ALTER TABLE maintenance_requests
  DROP CONSTRAINT IF EXISTS maintenance_requests_building_id_fkey;

ALTER TABLE maintenance_requests
  DROP CONSTRAINT IF EXISTS fk_building_maint;

-- إعادة ربط building_id بجدول buildings في schema public
ALTER TABLE maintenance_requests
  ADD CONSTRAINT maintenance_requests_building_id_fkey
  FOREIGN KEY (building_id)
  REFERENCES public.buildings(id)
  ON DELETE CASCADE;

-- إذا استمر الخطأ: تأكد أن الوحدة مرتبطة بعمارة موجودة في buildings.
-- للتحقق (استبدل UUID الوحدة): SELECT u.id, u.building_id, b.id AS building_exists FROM units u LEFT JOIN buildings b ON b.id = u.building_id WHERE u.id = 'UNIT_UUID';
