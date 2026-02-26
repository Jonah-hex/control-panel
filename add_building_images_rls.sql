-- ==========================================
-- إنشاء جدول صور المباني + تفعيل RLS وسياسات الوصول
-- Building images: كل مبنى له صوره بشكل مستقل (building_id + type)
-- ==========================================
-- نفّذ في Supabase > SQL Editor

-- 0) إنشاء الجدول إن لم يكن موجوداً
CREATE TABLE IF NOT EXISTS building_images (
    id SERIAL PRIMARY KEY,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('front', 'back', 'annex', 'building')),
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1) تفعيل RLS على الجدول
ALTER TABLE building_images ENABLE ROW LEVEL SECURITY;

-- 2) حذف سياسات قديمة إن وُجدت
DROP POLICY IF EXISTS "building_images_select_policy" ON building_images;
DROP POLICY IF EXISTS "building_images_insert_policy" ON building_images;
DROP POLICY IF EXISTS "building_images_delete_policy" ON building_images;

-- 3) السماح بالعرض: المالك أو الموظف التابع له يمكنه رؤية صور مبناه فقط
CREATE POLICY "building_images_select_policy" ON building_images FOR SELECT USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = building_images.building_id AND b.owner_id = auth.uid())
  OR EXISTS(SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND (e.is_active = true OR e.is_active IS NULL) WHERE b.id = building_images.building_id)
);

-- 4) السماح بالإدراج: نفس شرط الوصول للمبنى
CREATE POLICY "building_images_insert_policy" ON building_images FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = building_images.building_id AND b.owner_id = auth.uid())
  OR EXISTS(SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND (e.is_active = true OR e.is_active IS NULL) WHERE b.id = building_images.building_id)
);

-- 5) السماح بالحذف: نفس شرط الوصول للمبنى
CREATE POLICY "building_images_delete_policy" ON building_images FOR DELETE USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = building_images.building_id AND b.owner_id = auth.uid())
  OR EXISTS(SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND (e.is_active = true OR e.is_active IS NULL) WHERE b.id = building_images.building_id)
);

-- ملاحظة: تأكد أن bucket "building-images" في Storage موجود. السياسات في fix_storage_deeds_policies.sql تسمح بالرفع والقراءة.
