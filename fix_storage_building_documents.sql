-- ==========================================
-- سياسات التخزين لمجلدات ومستندات العمارة (خرائط هندسية)
-- Storage RLS for building-documents bucket
-- ==========================================
-- 1) إنشاء الـ bucket من لوحة Supabase: Storage > New bucket > اسم: building-documents، Public: لا
-- 2) نفّذ هذا الملف في Supabase > SQL Editor

DROP POLICY IF EXISTS "Allow authenticated uploads building-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated select building-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update building-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete building-documents" ON storage.objects;

CREATE POLICY "Allow authenticated uploads building-documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'building-documents');

CREATE POLICY "Allow authenticated select building-documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'building-documents');

CREATE POLICY "Allow authenticated update building-documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'building-documents')
WITH CHECK (bucket_id = 'building-documents');

CREATE POLICY "Allow authenticated delete building-documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'building-documents');
