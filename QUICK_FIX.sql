-- ==========================================
-- إصلاح سريع لمشكلة الأعمدة المفقودة
-- Quick Fix for Missing Columns Issue
-- ==========================================

-- الخيار 1: الحد الأدنى (مطلوب للوحدات فقط)
-- Option 1: Minimum Required (For Units Only)

-- حذف جميع السياسات القديمة أولاً
-- Delete all old policies first
DROP POLICY IF EXISTS "Users view own units" ON units;
DROP POLICY IF EXISTS "Users insert own units" ON units;
DROP POLICY IF EXISTS "Users update own units" ON units;
DROP POLICY IF EXISTS "Users delete own units" ON units;

-- إنشاء السياسات الجديدة
-- Create new policies
CREATE POLICY "Users view own units" ON units
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM buildings WHERE id = units.building_id AND owner_id = auth.uid())
  );

CREATE POLICY "Users insert own units" ON units
  FOR INSERT WITH CHECK (
    EXISTS(SELECT 1 FROM buildings WHERE id = units.building_id AND owner_id = auth.uid())
  );

CREATE POLICY "Users update own units" ON units
  FOR UPDATE USING (
    EXISTS(SELECT 1 FROM buildings WHERE id = units.building_id AND owner_id = auth.uid())
  );

CREATE POLICY "Users delete own units" ON units
  FOR DELETE USING (
    EXISTS(SELECT 1 FROM buildings WHERE id = units.building_id AND owner_id = auth.uid())
  );

-- ✅ بعد تنفيذ هذا السكريبت فقط، النظام سيعمل بالكامل!
-- ✅ After running this script only, the system will work completely!

-- ==========================================
-- الخيار 2: إضافة أعمدة إضافية (اختياري)
-- Option 2: Add Extra Columns (Optional)
-- ==========================================

-- إذا أردت تفعيل حفظ جميع الحقول الإضافية (13 عمود)
-- If you want to enable saving all extra fields (13 columns)
-- نفّذ: add_all_missing_columns.sql
-- Run: add_all_missing_columns.sql

-- ==========================================
-- التحقق من النجاح | Verify Success
-- ==========================================

-- عدد السياسات لجدول units (يجب أن يكون 4)
SELECT COUNT(*) AS "عدد السياسات - Policies Count"
FROM pg_policies
WHERE tablename = 'units';

-- عرض جميع السياسات
SELECT policyname AS "اسم السياسة - Policy Name", cmd AS "الأمر - Command"
FROM pg_policies
WHERE tablename = 'units'
ORDER BY cmd;
