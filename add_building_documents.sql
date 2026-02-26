-- ==========================================
-- مجلدات ومستندات العمارة (خرائط هندسية، PDF، أوتوكاد)
-- خاص بكل عمارة: مجلدات افتراضية قابلة لإعادة التسمية + ملفات
-- ==========================================
-- نفّذ في Supabase > SQL Editor

-- 1) جدول مجلدات العمارة (جذر أو داخل مجلد)
CREATE TABLE IF NOT EXISTS building_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES building_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_building_folders_building ON building_folders(building_id);
CREATE INDEX IF NOT EXISTS idx_building_folders_parent ON building_folders(parent_id);

-- 2) جدول مستندات العمارة (ملف داخل مجلد أو في الجذر)
CREATE TABLE IF NOT EXISTS building_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES building_folders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_building_documents_building ON building_documents(building_id);
CREATE INDEX IF NOT EXISTS idx_building_documents_folder ON building_documents(folder_id);

-- 3) RLS
ALTER TABLE building_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_documents ENABLE ROW LEVEL SECURITY;

-- مساعد: المستخدم يملك المبنى أو موظف تابع للمالك
CREATE OR REPLACE FUNCTION building_docs_can_access(bid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM buildings b WHERE b.id = bid AND b.owner_id = auth.uid()
  ) OR EXISTS(
    SELECT 1 FROM buildings b
    JOIN dashboard_employees e ON e.owner_id = b.owner_id AND e.auth_user_id = auth.uid() AND (e.is_active = true OR e.is_active IS NULL)
    WHERE b.id = bid
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "building_folders_select" ON building_folders;
DROP POLICY IF EXISTS "building_folders_insert" ON building_folders;
DROP POLICY IF EXISTS "building_folders_update" ON building_folders;
DROP POLICY IF EXISTS "building_folders_delete" ON building_folders;

CREATE POLICY "building_folders_select" ON building_folders FOR SELECT USING (building_docs_can_access(building_id));
CREATE POLICY "building_folders_insert" ON building_folders FOR INSERT WITH CHECK (building_docs_can_access(building_id));
CREATE POLICY "building_folders_update" ON building_folders FOR UPDATE USING (building_docs_can_access(building_id));
CREATE POLICY "building_folders_delete" ON building_folders FOR DELETE USING (building_docs_can_access(building_id));

DROP POLICY IF EXISTS "building_documents_select" ON building_documents;
DROP POLICY IF EXISTS "building_documents_insert" ON building_documents;
DROP POLICY IF EXISTS "building_documents_update" ON building_documents;
DROP POLICY IF EXISTS "building_documents_delete" ON building_documents;

CREATE POLICY "building_documents_select" ON building_documents FOR SELECT USING (building_docs_can_access(building_id));
CREATE POLICY "building_documents_insert" ON building_documents FOR INSERT WITH CHECK (building_docs_can_access(building_id));
CREATE POLICY "building_documents_update" ON building_documents FOR UPDATE USING (building_docs_can_access(building_id));
CREATE POLICY "building_documents_delete" ON building_documents FOR DELETE USING (building_docs_can_access(building_id));

-- 4) Storage: إنشاء bucket "building-documents" من لوحة Supabase (Storage) يدوياً إن لم يكن موجوداً.
-- المسار المقترح: {building_id}/{folder_id أو 'root'}/{unique}_{file_name}
-- أضف سياسات الوصول للـ bucket من Dashboard > Storage > building-documents > Policies بنفس منطق building_images (المالك والموظفون).
