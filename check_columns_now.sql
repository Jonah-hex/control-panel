-- ==========================================
-- التحقق السريع من الأعمدة الموجودة فعلياً
-- Quick Check of Actually Existing Columns
-- ==========================================

-- نفّذ هذا في Supabase لمعرفة الأعمدة الموجودة بالضبط

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'buildings'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ==========================================
-- الناتج سيخبرك بالضبط ما هي الأعمدة المتوفرة
-- The output will tell you exactly which columns are available
-- ==========================================
