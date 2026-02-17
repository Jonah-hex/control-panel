# ✅ خطوات تطبيق قاعدة البيانات
# Database Setup Steps

## 🎯 الهدف | Goal
تجهيز قاعدة بيانات Supabase لحفظ جميع بيانات العمارة بشكل صحيح

---

## 📝 الخطوات المطلوبة | Required Steps

### 1️⃣ تطبيق سياسات RLS لجدول الوحدات (مطلوب - REQUIRED)

#### ⚠️ لماذا مطلوب؟
بدون هذه السياسات، سيفشل حفظ الوحدات مع خطأ:
```
new row violates row-level security policy for table "units"
```

#### 📋 الخطوات:

1. افتح لوحة تحكم Supabase
   - اذهب إلى: https://supabase.com/dashboard
   - اختر مشروعك

2. افتح SQL Editor
   - من القائمة الجانبية: SQL Editor
   - انقر على: New Query

3. انسخ والصق محتوى هذا الملف:
   ```
   fix_units_policies.sql
   ```

4. اضغط RUN أو Ctrl+Enter

5. تحقق من النجاح:
   - يجب أن ترى: "Success. No rows returned"
   - أي رسالة خطأ تعني وجود مشكلة

---

### 2️⃣ التحقق من السكيما (اختياري - OPTIONAL)

#### 📋 الخطوات:

1. في SQL Editor، نفّذ:
   ```
   verify_database_schema.sql
   ```

2. راجع النتائج:
   - تأكد من وجود جميع الأعمدة في جدول buildings
   - تأكد من وجود جميع الأعمدة في جدول units
   - تأكد من وجود 4 سياسات لجدول units (SELECT, INSERT, UPDATE, DELETE)

---

### 3️⃣ إضافة عمود العنوان (اختياري جداً - VERY OPTIONAL)

#### ⚠️ ملاحظة:
النظام يعمل بدون هذا العمود حالياً. فقط نفّذ هذا إذا أردت إضافة حقل العنوان.

#### 📋 الخطوات:

1. في SQL Editor، نفّذ:
   ```
   add_address_column.sql
   ```

2. بعد التطبيق، فعّل السطر في الكود:
   - افتح: `src/app/dashboard/buildings/new/page.tsx`
   - ابحث عن: `// address: سيتم إضافته لاحقاً`
   - احذف `//` لتفعيل السطر

---

## ✅ التحقق من النجاح | Verify Success

### اختبار بسيط:

1. اذهب إلى: `/dashboard/buildings/new`
2. املأ البيانات الأساسية
3. اضغط على "حفظ العمارة"
4. إذا ظهرت رسالة "تم إضافة العمارة والوحدات بنجاح!" ✅
   - معناه: كل شيء يعمل بشكل صحيح!

### إذا ظهر خطأ:

#### خطأ: "row-level security policy"
❌ **المشكلة:** لم يتم تطبيق fix_units_policies.sql
✅ **الحل:** نفّذ الخطوة 1️⃣ أعلاه

#### خطأ: "Could not find the 'address' column"
❌ **المشكلة:** عمود address غير موجود لكن الكود يحاول استخدامه
✅ **الحل:** تأكد أن السطر معلّق في الكود (يبدأ بـ //)

#### خطأ: "duplicate key value"
❌ **المشكلة:** رقم الوحدة مكرر
✅ **الحل:** استخدم أرقام وحدات مختلفة

---

## 📊 ملخص البيانات المحفوظة | Data Summary

### جدول Buildings:
- ✅ 37 حقل أساسي
- ✅ 12 حقل في owner_association (JSONB)
- ✅ صفيف floors_data (JSONB)
- ✅ صفيف image_urls

### جدول Units:
- ✅ 17 حقل لكل وحدة
- ✅ رابط مع العمارة (building_id)

### الإجمالي:
- **66+ حقل** يتم حفظه لكل عمارة
- **17 حقل** إضافي لكل وحدة

---

## 🚀 البدء السريع | Quick Start

```sql
-- 1. نفّذ هذا في Supabase SQL Editor
-- (من ملف fix_units_policies.sql)

DROP POLICY IF EXISTS "Users view own units" ON units;

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
```

اضغط RUN - وانتهيت! ✅

---

## 📞 الدعم | Support

إذا واجهت أي مشكلة:
1. راجع console.log في المتصفح (F12)
2. راجع ملف COMPLETE_SAVE_GUIDE.md للتفاصيل الكاملة
3. تأكد من تطبيق fix_units_policies.sql

---

📅 آخر تحديث: 2026-02-17
✅ جاهز للاستخدام الفوري
