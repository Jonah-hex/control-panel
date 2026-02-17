-- ==========================================
-- إصلاح سياسات الأمان لجدول الوحدات
-- Fix Security Policies for Units Table
-- ==========================================

-- حذف جميع السياسات القديمة إن وجدت
-- Delete all old policies if they exist
DROP POLICY IF EXISTS "Users view own units" ON units;
DROP POLICY IF EXISTS "Users insert own units" ON units;
DROP POLICY IF EXISTS "Users update own units" ON units;
DROP POLICY IF EXISTS "Users delete own units" ON units;

-- إضافة سياسات كاملة لجدول الوحدات
-- Complete security policies for units table

-- 1. السماح بعرض الوحدات للمستخدم المالك
CREATE POLICY "Users view own units" ON units
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM buildings 
      WHERE id = units.building_id 
      AND owner_id = auth.uid()
    )
  );

-- 2. السماح بإضافة وحدات جديدة للعمارات الخاصة بالمستخدم
CREATE POLICY "Users insert own units" ON units
  FOR INSERT WITH CHECK (
    EXISTS(
      SELECT 1 FROM buildings 
      WHERE id = units.building_id 
      AND owner_id = auth.uid()
    )
  );

-- 3. السماح بتحديث الوحدات للعمارات الخاصة بالمستخدم
CREATE POLICY "Users update own units" ON units
  FOR UPDATE USING (
    EXISTS(
      SELECT 1 FROM buildings 
      WHERE id = units.building_id 
      AND owner_id = auth.uid()
    )
  );

-- 4. السماح بحذف الوحدات للعمارات الخاصة بالمستخدم
CREATE POLICY "Users delete own units" ON units
  FOR DELETE USING (
    EXISTS(
      SELECT 1 FROM buildings 
      WHERE id = units.building_id 
      AND owner_id = auth.uid()
    )
  );

-- ==========================================
-- التحقق من السياسات
-- Verify Policies
-- ==========================================

-- عرض جميع سياسات جدول units
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'units';
