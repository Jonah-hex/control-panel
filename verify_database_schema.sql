-- ==========================================
-- سكريبت التحقق من قاعدة البيانات
-- Database Verification Script
-- ==========================================

-- 1. التحقق من وجود جدول buildings مع جميع الأعمدة المطلوبة
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'buildings'
ORDER BY ordinal_position;

-- 2. التحقق من وجود جدول units مع جميع الأعمدة المطلوبة
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'units'
ORDER BY ordinal_position;

-- 3. التحقق من الفهارس
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('buildings', 'units')
ORDER BY tablename, indexname;

-- 4. التحقق من سياسات الأمان RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename IN ('buildings', 'units')
ORDER BY tablename, cmd;

-- 5. التحقق من تفعيل RLS
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('buildings', 'units');

-- ==========================================
-- الأعمدة المطلوبة في جدول buildings
-- Required columns in buildings table
-- ==========================================
/*
MUST HAVE COLUMNS:
1. id (UUID)
2. name (VARCHAR)
3. plot_number (VARCHAR)
4. neighborhood (VARCHAR)
5. address (TEXT) - OPTIONAL
6. description (TEXT)
7. total_floors (INTEGER)
8. total_units (INTEGER)
9. reserved_units (INTEGER)
10. parking_slots (INTEGER)
11. driver_rooms (INTEGER)
12. elevators (INTEGER)
13. street_type (VARCHAR)
14. building_facing (VARCHAR)
15. year_built (INTEGER)
16. phone (VARCHAR)
17. build_status (VARCHAR)
18. deed_number (VARCHAR)
19. land_area (DECIMAL)
20. building_license_number (VARCHAR)
21. insurance_available (BOOLEAN)
22. insurance_policy_number (VARCHAR)
23. has_main_water_meter (BOOLEAN)
24. water_meter_number (VARCHAR)
25. has_main_electricity_meter (BOOLEAN)
26. electricity_meter_number (VARCHAR)
27. guard_name (VARCHAR)
28. guard_phone (VARCHAR)
29. guard_room_number (VARCHAR)
30. guard_id_photo (TEXT)
31. guard_shift (VARCHAR)
32. guard_has_salary (BOOLEAN)
33. guard_salary_amount (DECIMAL)
34. google_maps_link (TEXT)
35. image_urls (TEXT[])
36. floors_data (JSONB)
37. owner_association (JSONB)
38. owner_id (UUID)
39. created_at (TIMESTAMP)
40. updated_at (TIMESTAMP)
*/

-- ==========================================
-- الأعمدة المطلوبة في جدول units
-- Required columns in units table
-- ==========================================
/*
MUST HAVE COLUMNS:
1. id (UUID)
2. building_id (UUID)
3. unit_number (VARCHAR)
4. floor (INTEGER)
5. type (VARCHAR)
6. facing (VARCHAR)
7. area (DECIMAL)
8. rooms (INTEGER)
9. bathrooms (INTEGER)
10. living_rooms (INTEGER)
11. kitchens (INTEGER)
12. maid_room (BOOLEAN)
13. driver_room (BOOLEAN)
14. entrances (INTEGER)
15. ac_type (VARCHAR)
16. status (VARCHAR)
17. price (DECIMAL)
18. description (TEXT)
19. created_at (TIMESTAMP)
20. updated_at (TIMESTAMP)
*/
