# 🔧 دليل إصلاح البيانات الموجودة - Data Recovery & Fix Guide

## ⚠️ تحذير مهم

هذا الدليل **لاستخدام الفريق التقنية فقط**. تطبيق هذه الخطوات بدون معرفة قد تؤدي لفقدان البيانات.

---

## 🚨 السيناريوهات المحتملة

### السيناريو 1: الوحدات الموجودة بأرقام قديمة
```
الوضع الحالي: unit_number = "01-01", "01-02", "02-01", "02-02"
المطلوب: unit_number = "1", "2", "3", "4"
```

### السيناريو 2: أرقام مكررة
```
الوضع الحالي: unit_number = "1", "1", "2", "3"
المطلوب: unit_number = "1", "2", "3", "4"
```

### السيناريو 3: أرقام فارغة
```
الوضع الحالي: unit_number = "1", NULL, "2", NULL, "3"
المطلوب: unit_number = "1", "2", "3"
```

### السيناريو 4: فجوات في التسلسل
```
الوضع الحالي: unit_number = "1", "3", "5", "7"
المطلوب: unit_number = "1", "2", "3", "4"
```

---

## 🔍 التشخيص

### 1. تحديد المشاكل

#### الخطوة 1: فحص يدوي
```sql
-- فحص حالة العمارة
SELECT 
  id,
  name,
  total_units,
  total_floors,
  created_at
FROM buildings
LIMIT 10;
```

#### الخطوة 2: فحص الوحدات
```sql
-- فحص أرقام الوحدات
SELECT 
  building_id,
  id,
  unit_number,
  floor,
  type
FROM units
WHERE building_id = 'YOUR-BUILDING-ID'
ORDER BY CAST(unit_number AS INTEGER);
```

#### الخطوة 3: البحث عن المشاكل
```sql
-- البحث عن الأرقام المكررة
SELECT 
  building_id,
  unit_number,
  COUNT(*) as count
FROM units
GROUP BY building_id, unit_number
HAVING COUNT(*) > 1;

-- البحث عن الأرقام الفارغة
SELECT * 
FROM units 
WHERE unit_number IS NULL 
  OR TRIM(unit_number) = '';

-- البحث عن الفجوات
WITH num_range AS (
  SELECT 
    building_id,
    CAST(unit_number AS INTEGER) as num
  FROM units
  WHERE unit_number ~ '^\d+$'  -- أرقام فقط
)
SELECT 
  building_id,
  COUNT(*) as total_units,
  MAX(num) as max_unit_number
FROM num_range
GROUP BY building_id
HAVING COUNT(*) != MAX(num);
```

---

## 🛠️ الإصلاح التلقائي

### الخيار 1: إعادة إنشاء العمارة (الأفضل)

1. **من الواجهة الأمامية:**
   - اذهب إلى `/dashboard/buildings`
   - احذف العمارة المشكلة
   - أنشئ عمارة جديدة
   - **النتيجة:** جميع الوحدات برقم متسلسل صحيح ✅

### الخيار 2: إعادة ترقيم SQL (للعمائر الكبيرة)

#### ⚠️ قبل البدء:
```sql
-- 1. اصنع نسخة احتياطية
BEGIN;

-- 2. تحقق من البيانات
SELECT COUNT(*) FROM units WHERE building_id = 'TARGET-BUILDING-ID';

-- 3. جدول مؤقت
CREATE TEMP TABLE units_backup AS
SELECT * FROM units 
WHERE building_id = 'TARGET-BUILDING-ID';

-- 4. تحقق من النسخة الاحتياطية
SELECT COUNT(*) FROM units_backup;

-- إذا كان كل شيء تمام، استمر...
```

#### الخطوة 1: حذف الأرقام الفارغة (اختياري)
```sql
DELETE FROM units
WHERE building_id = 'TARGET-BUILDING-ID'
  AND (unit_number IS NULL OR TRIM(unit_number) = '');
```

#### الخطوة 2: إعادة الترقيم
```sql
-- الطريقة 1: إذا كانت جميع الأرقام صحيحة (1, 2, 3, ...)
UPDATE units
SET unit_number = (
  SELECT ROW_NUMBER() OVER (ORDER BY floor, id)::TEXT
  FROM units u
  WHERE u.building_id = units.building_id
    AND u.id = units.id
)
WHERE building_id = 'TARGET-BUILDING-ID';

-- أو الطريقة 2: باستخدام CTE
WITH new_numbers AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY floor, id)::TEXT as new_number
  FROM units
  WHERE building_id = 'TARGET-BUILDING-ID'
)
UPDATE units
SET unit_number = new_numbers.new_number
FROM new_numbers
WHERE units.id = new_numbers.id;
```

#### الخطوة 3: التحقق من النتائج
```sql
SELECT 
  unit_number,
  floor,
  id
FROM units
WHERE building_id = 'TARGET-BUILDING-ID'
ORDER BY CAST(unit_number AS INTEGER);
```

#### الخطوة 4: الانتهاء
```sql
-- إذا كان كل شيء تمام:
COMMIT;

-- أو التراجع:
ROLLBACK;
```

---

## 🆘 حالات طوارئ

### حالة أ: فقدان البيانات عن طريق الخطأ

```sql
-- استعادة من النسخة الاحتياطية
SELECT * FROM units_backup;

-- استعادة البيانات
INSERT INTO units
SELECT * FROM units_backup
ON CONFLICT DO NOTHING;
```

### حالة ب: استعلام خاطئ

```sql
-- التراجع فوراً
ROLLBACK;
```

### حالة ج: قفل الجدول

```sql
-- عرض القفل
SELECT * FROM pg_locks WHERE relation = 'units'::regclass;

-- قتل الجلسة
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query LIKE '%units%';
```

---

## ✅ الفحص بعد الإصلاح

### 1. التحقق من الترقيم
```sql
SELECT 
  unit_number,
  floor,
  COUNT(*) as count
FROM units
WHERE building_id = 'TARGET-BUILDING-ID'
GROUP BY unit_number, floor
HAVING COUNT(*) > 1;
-- يجب أن تكون النتيجة فارغة (no rows)
```

### 2. التحقق من الاكتمال
```sql
WITH numbers AS (
  SELECT CAST(unit_number AS INTEGER) as num
  FROM units
  WHERE building_id = 'TARGET-BUILDING-ID'
)
SELECT 
  COUNT(*) as total,
  MAX(num) as max_number,
  CASE 
    WHEN COUNT(*) = MAX(num) THEN '✅ متسلسل'
    ELSE '❌ فجوات'
  END as status
FROM numbers;
```

### 3. تحديث معلومات العمارة
```sql
UPDATE buildings
SET total_units = (
  SELECT COUNT(*) FROM units 
  WHERE units.building_id = buildings.id
)
WHERE id = 'TARGET-BUILDING-ID';
```

---

## 📊 سيناريوهات الاختبار

### سيناريو الاختبار 1: عمارة صغيرة
```sql
-- عمارة: 2 دور × 3 شقق = 6 وحدات
-- قبل: "01-01", "01-02", "01-03", "02-01", "02-02", "02-03"
-- بعد: "1", "2", "3", "4", "5", "6"
```

### سيناريو الاختبار 2: عمارة متوسطة
```sql
-- عمارة: 5 أدوار × 4 شقق = 20 وحدة
-- قبل: "1"-"20" مع فجوات وتكرار
-- بعد: "1"-"20" متسلسل
```

### سيناريو الاختبار 3: عمارة كبيرة
```sql
-- عمارة: 10 أدوار × 5 شقق = 50 وحدة
-- قبل: أرقام قديمة أو مشكوك فيها
-- بعد: "1"-"50" متسلسل
```

---

## 🚀 الإجراءات الوقائية المستقبلية

### 1. إضافة Trigger في Supabase
```sql
CREATE OR REPLACE FUNCTION check_sequential_numbering()
RETURNS TRIGGER AS $$
BEGIN
  -- فحص تلقائي عند الإدراج
  IF NEW.unit_number IS NULL THEN
    RAISE EXCEPTION 'unit_number cannot be null';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER units_validation
BEFORE INSERT OR UPDATE ON units
FOR EACH ROW
EXECUTE FUNCTION check_sequential_numbering();
```

### 2. إضافة Constraints
```sql
ALTER TABLE units
ADD CONSTRAINT unit_number_not_empty 
CHECK (unit_number IS NOT NULL AND TRIM(unit_number) != '');
```

### 3. إضافة فهرس للأداء
```sql
CREATE INDEX idx_units_building_number 
ON units(building_id, unit_number CAST AS INTEGER);
```

---

## 📞 طلب الدعم

### إذا واجهت مشكلة:

1. **توثيق المشكلة:**
   ```
   - Building ID: ___________
   - المشكلة: (أرقام مكررة / فجوات / فارغة)
   - عدد الوحدات المتأثرة: ___________
   - الوقت التقريبي للحدوث: ___________
   ```

2. **الاتصال بـ:**
   - Dev Team: [email]
   - DBA: [email]
   - Support: [email]

3. **قدم:**
   - لقطة من الخطأ
   - Building ID
   - خطوات إعادة الإنتاج

---

## ✅ قائمة التحقق قبل الإصلاح

- [ ] عمل نسخة احتياطية من البيانات
- [ ] توثيق الحالة الحالية
- [ ] اختبار الاستعلام على بيانات نموذجية أولاً
- [ ] الحصول على موافقة الفريق
- [ ] تشغيل الاستعلام في معاملة (Transaction)
- [ ] التحقق من النتائج
- [ ] توثيق التغييرات
- [ ] أخبر الفريق بالتحديث

---

**آخر تحديث: 17 فبراير 2026** ✅  
**الحالة: نموذج استعداد فقط** ⚠️
