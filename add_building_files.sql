-- ==========================================
-- إنشاء جدول ملفات كروكيات ومخططات المباني + RLS
-- نفّذ في Supabase > SQL Editor
-- ==========================================

-- 1) إنشاء الجدول
CREATE TABLE IF NOT EXISTS building_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('architectural', 'structural', 'electrical', 'plumbing', 'general', 'other')),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT DEFAULT 0,
    file_type TEXT NOT NULL,
    uploaded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2) تفعيل RLS
ALTER TABLE building_files ENABLE ROW LEVEL SECURITY;

-- 3) حذف سياسات قديمة إن وُجدت
DROP POLICY IF EXISTS "building_files_select_policy" ON building_files;
DROP POLICY IF EXISTS "building_files_insert_policy" ON building_files;
DROP POLICY IF EXISTS "building_files_delete_policy" ON building_files;

-- 4) العرض: المالك أو الموظف التابع
CREATE POLICY "building_files_select_policy" ON building_files FOR SELECT USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = building_files.building_id AND b.owner_id = auth.uid())
  OR EXISTS(SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND (e.is_active = true OR e.is_active IS NULL) WHERE b.id = building_files.building_id)
);

-- 5) الإدراج
CREATE POLICY "building_files_insert_policy" ON building_files FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = building_files.building_id AND b.owner_id = auth.uid())
  OR EXISTS(SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND (e.is_active = true OR e.is_active IS NULL) WHERE b.id = building_files.building_id)
);

-- 6) الحذف
CREATE POLICY "building_files_delete_policy" ON building_files FOR DELETE USING (
  EXISTS(SELECT 1 FROM buildings b WHERE b.id = building_files.building_id AND b.owner_id = auth.uid())
  OR EXISTS(SELECT 1 FROM buildings b JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND (e.is_active = true OR e.is_active IS NULL) WHERE b.id = building_files.building_id)
);

-- 7) إنشاء Storage bucket (نفّذ هذا يدوياً من Supabase Dashboard > Storage > New bucket)
-- اسم الباكت: building-files
-- Public: false (private)
-- أو نفّذ الأمر التالي:
INSERT INTO storage.buckets (id, name, public) VALUES ('building-files', 'building-files', false) ON CONFLICT (id) DO NOTHING;

-- 8) سياسات Storage للباكت building-files
DROP POLICY IF EXISTS "building_files_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "building_files_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "building_files_storage_delete" ON storage.objects;

CREATE POLICY "building_files_storage_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'building-files' AND auth.role() = 'authenticated'
);
CREATE POLICY "building_files_storage_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'building-files' AND auth.role() = 'authenticated'
);
CREATE POLICY "building_files_storage_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'building-files' AND auth.role() = 'authenticated'
);
