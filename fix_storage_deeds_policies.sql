-- ==========================================
-- إصلاح سياسات التخزين لرفع ملفات الصكوك PDF
-- Fix Storage RLS for building-images bucket (deeds upload)
-- ==========================================
-- نفّذ هذا الملف في Supabase > SQL Editor
-- Run this in Supabase Dashboard > SQL Editor

-- حذف سياسات قديمة قد تتعارض (اختياري)
DROP POLICY IF EXISTS "Allow authenticated uploads building-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated select building-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update building-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete building-images" ON storage.objects;

-- 1. السماح للمستخدمين المسجلين برفع ملفات إلى bucket building-images
CREATE POLICY "Allow authenticated uploads building-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'building-images');

-- 2. السماح بقراءة/عرض الملفات (مطلوب للـ getPublicUrl وعرض PDF)
CREATE POLICY "Allow authenticated select building-images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'building-images');

-- 3. السماح بتحديث الملفات (مطلوب عند استخدام upsert: true)
CREATE POLICY "Allow authenticated update building-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'building-images')
WITH CHECK (bucket_id = 'building-images');

-- 4. السماح بحذف الملفات (اختياري، للتحديث/استبدال)
CREATE POLICY "Allow authenticated delete building-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'building-images');

-- ملاحظة: إذا كان المستخدم غير مسجل (anon) ويحتاج الوصول،
-- استبدل TO authenticated بـ TO anon في السياسات أعلاه.
-- لكن يُفضّل أن يكون رفع الصكوك للمستخدمين المسجلين فقط.
