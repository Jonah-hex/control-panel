-- ==========================================
-- حذف الجداول القديمة بشكل آمن
-- Delete Old Tables Safely
-- ==========================================
-- تحذير: هذا السكريبت سيحذف جميع الجداول والبيانات!
-- Warning: This script will delete all tables and data!

-- إذا كنت تريد حفظ البيانات، قم بعمل backup قبل تشغيل هذا السكريبت
-- If you want to keep your data, make a backup before running this script

-- ==========================================
-- هذا السكريبت سيحذف الجداول التالية (إن وجدت):
-- This script will drop the following tables (if they exist):
-- ==========================================

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS maintenance_requests CASCADE;
DROP TABLE IF EXISTS income CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS buildings CASCADE;

-- ==========================================
-- إذا حذفت الجداول بنجاح، الآن:
-- If the tables are deleted successfully, now:
-- ==========================================
/*

اتبع الخطوات التالية:

1. انسخ محتوى ملف: supabase_schema.sql
2. ألصقه في Supabase > SQL Editor
3. اضغط Execute
4. ✅ تم! جميع الجداول الجديدة جاهزة الآن

---

Follow these steps:

1. Copy the content of: supabase_schema.sql
2. Paste it in Supabase > SQL Editor
3. Click Execute
4. ✅ Done! All new tables are ready now

*/
