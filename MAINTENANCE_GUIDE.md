# 🔧 دليل الصيانة والفحص الدوري - Maintenance & Periodic Checks Guide

## 📋 نظرة عامة / Overview

هذا الدليل يحتوي على خطوات الصيانة الدورية والفحوصات لضمان سلامة سياسة الترقيم المتسلسل العالمي في Supabase.

---

## 🔍 الفحوصات اليومية / Daily Checks

### 1. التحقق من جدول `units`
```sql
-- Check current sequential numbering in Supabase
SELECT 
  building_id,
  COUNT(*) as unit_count,
  MIN(CAST(unit_number AS INTEGER)) as first_number,
  MAX(CAST(unit_number AS INTEGER)) as last_number
FROM units
GROUP BY building_id
ORDER BY building_id;
```

### 2. البحث عن الأرقام المكررة
```sql
-- Find duplicate unit numbers (should return no rows)
SELECT 
  building_id,
  unit_number,
  COUNT(*) as count
FROM units
GROUP BY building_id, unit_number
HAVING COUNT(*) > 1
ORDER BY building_id, unit_number;
```

### 3. البحث عن الأرقام الفارغة
```sql
-- Find empty unit numbers (should return no rows)
SELECT *
FROM units
WHERE unit_number IS NULL 
  OR unit_number = ''
  OR TRIM(unit_number) = '';
```

---

## 📊 الفحوصات الأسبوعية / Weekly Checks

### 1. التحقق من التسلسل
```sql
-- Verify sequential numbering for each building
SELECT 
  building_id,
  ARRAY_AGG(CAST(unit_number AS INTEGER) ORDER BY CAST(unit_number AS INTEGER)) AS numbers,
  COUNT(*) as total
FROM units
GROUP BY building_id
ORDER BY building_id;
```

### 2. البحث عن الفجوات
```sql
-- Find gaps in numbering (if sequence should be 1,2,3...N)
WITH numbered_units AS (
  SELECT 
    building_id,
    CAST(unit_number AS INTEGER) as num,
    ROW_NUMBER() OVER (PARTITION BY building_id ORDER BY CAST(unit_number AS INTEGER)) as rn
  FROM units
)
SELECT 
  building_id,
  num,
  rn,
  num - rn as gap_indicator
FROM numbered_units
WHERE num - rn != 0
ORDER BY building_id, num;
```

### 3. تقرير الحالة العام
```sql
-- General building status report
SELECT 
  b.id,
  b.name,
  b.total_floors,
  b.total_units,
  COUNT(u.id) as actual_units,
  CASE 
    WHEN b.total_units = COUNT(u.id) THEN '✅ متطابق'
    ELSE '⚠️ عدم تطابق'
  END as status
FROM buildings b
LEFT JOIN units u ON b.id = u.building_id
GROUP BY b.id, b.name, b.total_floors, b.total_units
ORDER BY b.id;
```

---

## 🛠️ الإجراءات الإصلاحية / Corrective Actions

### 🚨 حالة 1: وجود أرقام مكررة
```sql
-- Identify duplicates
SELECT unit_number, COUNT(*) 
FROM units 
GROUP BY unit_number 
HAVING COUNT(*) > 1;

-- Solution: Delete one of the duplicates
DELETE FROM units 
WHERE id IN (
  SELECT id FROM units 
  WHERE unit_number = '5' 
  LIMIT 1
);

-- Then re-number the building
-- (Contact development team for automatic re-numbering)
```

### 🚨 حالة 2: أرقام فارغة أو NULL
```sql
-- Find empty numbers
SELECT * FROM units WHERE unit_number IS NULL OR TRIM(unit_number) = '';

-- Solution: Delete or update these records
-- Contact development team for investigation

DELETE FROM units 
WHERE unit_number IS NULL;
```

### 🚨 حالة 3: فجوات في التسلسل
```sql
-- Direct re-numbering approach (if absolutely necessary)
-- ⚠️ WARNING: Run this only after consulting with team

BEGIN;

-- Get all units ordered by building and floor
WITH ordered_units AS (
  SELECT 
    id,
    building_id,
    ROW_NUMBER() OVER (PARTITION BY building_id ORDER BY floor, id) as new_number
  FROM units
)
UPDATE units
SET unit_number = (SELECT new_number FROM ordered_units WHERE ordered_units.id = units.id)::TEXT
FROM ordered_units
WHERE units.id = ordered_units.id;

COMMIT;
```

---

## 📈 مراقبة الأداء / Performance Monitoring

### 1. حجم البيانات
```sql
-- Check current database growth
SELECT 
  COUNT(*) as total_buildings,
  COUNT(DISTINCT u.building_id) as buildings_with_units,
  COUNT(u.id) as total_units
FROM buildings b
LEFT JOIN units u ON b.id = u.building_id;
```

### 2. الوحدات لكل عمارة
```sql
-- Distribution of units per building
SELECT 
  building_id,
  COUNT(*) as unit_count
FROM units
GROUP BY building_id
ORDER BY unit_count DESC
LIMIT 20;
```

### 3. أداء الاستعلامات
```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM units 
WHERE building_id = 'your-building-id'
ORDER BY CAST(unit_number AS INTEGER);
```

---

## 🔐 RLS Policies Check

### التحقق من صلاحيات الصفوف:
```sql
-- Check existing RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('units', 'buildings');
```

### إنشاء سياسات RLS آمنة:
```sql
-- Enable RLS
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- Policy for viewing own building units
CREATE POLICY "Users can view units of their buildings"
ON units FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM buildings 
    WHERE buildings.id = units.building_id 
    AND buildings.owner_id = auth.uid()
  )
);

-- Policy for inserting units to own buildings
CREATE POLICY "Users can insert units in their buildings"
ON units FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM buildings 
    WHERE buildings.id = units.building_id 
    AND buildings.owner_id = auth.uid()
  )
);
```

---

## 📅 جدول الصيانة المقترح / Suggested Maintenance Schedule

| الفحص | التكرار | المسؤول | الإجراء |
|--------|---------|---------|---------|
| التحقق من الأرقام المكررة | يومي | الـ Automation | Alert if found |
| التحقق من الأرقام الفارغة | يومي | الـ Automation | Alert if found |
| تقرير الحالة العام | أسبوعي | DBA | Review & Report |
| فحص الأداء | أسبوعي | DBA | Optimize if needed |
| النسخ الاحتياطية | يومي | Automation | Backup runs |
| مراجعة Logs | أسبوعي | Dev Team | Check for issues |

---

## 🎯 إرشادات سريعة / Quick Reference

### الأرقام الصحيحة ✅
```
✅ "1", "2", "3", "4", ...
✅ جميع الأرقام موجودة
✅ لا توجد أرقام مكررة
✅ لا توجد أرقام فارغة
```

### الأرقام الخاطئة ❌
```
❌ "1", "3", "5" (فجوات)
❌ "1", "1", "2", "3" (تكرار)
❌ "1", "", "3" (فارغ)
❌ NULL (قيمة فارغة)
```

---

## 🆘 استكشاف الأخطاء / Troubleshooting

### المشكلة: "أرقام مكررة"
**الحل:**
1. تحديد الأرقام المكررة
2. حذف السجلات الزائدة
3. إعادة ترقيم العمارة من الواجهة الأمامية
4. التحقق من النتائج

### المشكلة: "أرقام فارغة"
**الحل:**
1. تحديد الوحدات بدون أرقام
2. حذف السجلات المعيبة
3. إعادة إضافة الوحدات من الواجهة الأمامية
4. التحقق من النتائج

### المشكلة: "فجوات في التسلسل"
**الحل:**
1. تشغيل:
   ```tsx
   npm run db:fix-numbering  // (if available)
   ```
2. أو إعادة إنشاء العمارة من الواجهة الأمامية
3. التحقق من النتائج

---

## 📞 جهات الاتصال / Contact & Support

### للمشاكل الفنية:
- **Dev Team:** [contact info]
- **DBA:** [contact info]
- **Support:** [contact info]

### الوثائق ذات الصلة:
- [SEQUENTIAL_NUMBERING_POLICY.md](SEQUENTIAL_NUMBERING_POLICY.md)
- [COMPLETE_SAVE_GUIDE.md](COMPLETE_SAVE_GUIDE.md)
- [src/app/dashboard/buildings/new/page.tsx](src/app/dashboard/buildings/new/page.tsx)

---

## ✅ قائمة تدقيق الصيانة / Maintenance Checklist

```markdown
### اليوم:
- [ ] فحص الأرقام المكررة
- [ ] فحص الأرقام الفارغة
- [ ] فحص حالة الـ Backups

### الأسبوع:
- [ ] تقرير الحالة العام
- [ ] فحص الأداء
- [ ] مراجعة الـ Logs
- [ ] تحديث هذا الملف إن لزم

### الشهر:
- [ ] مراجعة RLS Policies
- [ ] تحديث الحدود والتنبيهات
- [ ] اجتماع الفريق للمناقشة
```

---

**آخر تحديث: 17 فبراير 2026** ✅  
**حالة التطبيق: مطبق وآمن** ✅
