# تطبيق تحديثات قاعدة البيانات على Supabase
## Applying Database Updates to Supabase

---

## الطريقة الأولى: إضافة العمود الناقص فقط (الطريقة الآمنة)
### Method 1: Add Missing Column Only (Safe Method)

إذا كان لديك بيانات موجودة ولا تريد حذفها، استخدم هذا الأمر فقط:

```sql
-- إضافة عمود address إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='buildings' AND column_name='address'
    ) THEN
        ALTER TABLE buildings ADD COLUMN address TEXT;
    END IF;
END $$;
```

---

## الطريقة الثانية: إنشاء الجدول من الصفر (للبيئات الجديدة)
### Method 2: Create Table from Scratch (For New Environments)

⚠️ **تحذير:** هذا سيحذف جميع البيانات الموجودة! استخدمه فقط في بيئة التطوير أو إذا لم يكن لديك بيانات مهمة.

استخدم الملف: `update_buildings_schema.sql`

---

## خطوات التطبيق على Supabase:
### Steps to Apply on Supabase:

### 1. الدخول إلى Supabase Dashboard
- افتح مشروعك في https://supabase.com
- اذهب إلى **SQL Editor** من القائمة الجانبية

### 2. تنفيذ الكود
#### إذا اخترت الطريقة الأولى (الآمنة):
```sql
-- فقط إضافة العمود الناقص
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='buildings' AND column_name='address'
    ) THEN
        ALTER TABLE buildings ADD COLUMN address TEXT;
    END IF;
END $$;
```

#### إذا اخترت الطريقة الثانية (إعادة إنشاء):
1. انسخ محتوى ملف `update_buildings_schema.sql`
2. الصقه في SQL Editor
3. اضغط **Run**

### 3. التحقق من النجاح
```sql
-- تحقق من أعمدة الجدول
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'buildings'
ORDER BY ordinal_position;
```

---

## الأعمدة الموجودة الآن في جدول buildings:
### Current Columns in buildings Table:

### معلومات أساسية (Basic Information):
- `id` - UUID (Primary Key)
- `name` - VARCHAR(255) - اسم العمارة
- `plot_number` - VARCHAR(100) - رقم القطعة
- `neighborhood` - VARCHAR(255) - الحي
- `address` - TEXT - العنوان الكامل ✨ **جديد**
- `description` - TEXT - الوصف
- `phone` - VARCHAR(20) - رقم الهاتف

### تفاصيل البناء (Building Details):
- `total_floors` - INTEGER - عدد الأدوار
- `total_units` - INTEGER - إجمالي الوحدات
- `reserved_units` - INTEGER - الوحدات المحجوزة
- `parking_slots` - INTEGER - مواقف السيارات
- `driver_rooms` - INTEGER - غرف السائقين
- `elevators` - INTEGER - عدد المصاعد
- `street_type` - VARCHAR(50) - نوع الشارع
- `building_facing` - VARCHAR(50) - واجهة البناء
- `year_built` - INTEGER - سنة البناء

### معلومات قانونية (Legal Information):
- `build_status` - VARCHAR(50) - حالة البناء
- `deed_number` - VARCHAR(100) - رقم الصك
- `land_area` - DECIMAL(10,2) - مساحة الأرض
- `building_license_number` - VARCHAR(100) - رقم رخصة البناء

### التأمين (Insurance):
- `insurance_available` - BOOLEAN - يوجد تأمين
- `insurance_policy_number` - VARCHAR(100) - رقم بوليصة التأمين

### العدادات (Utility Meters):
- `has_main_water_meter` - BOOLEAN - عداد مياه رئيسي
- `water_meter_number` - VARCHAR(100) - رقم عداد المياه
- `has_main_electricity_meter` - BOOLEAN - عداد كهرباء رئيسي
- `electricity_meter_number` - VARCHAR(100) - رقم عداد الكهرباء

### معلومات الحارس (Guard Information):
- `guard_name` - VARCHAR(255) - اسم الحارس
- `guard_phone` - VARCHAR(20) - هاتف الحارس
- `guard_room_number` - VARCHAR(50) - رقم غرفة الحارس
- `guard_id_photo` - TEXT - صورة هوية الحارس
- `guard_shift` - VARCHAR(50) - وردية الحارس
- `guard_has_salary` - BOOLEAN - يوجد راتب
- `guard_salary_amount` - DECIMAL(15,2) - مبلغ الراتب

### بيانات إضافية (Additional Data):
- `google_maps_link` - TEXT - رابط خرائط جوجل
- `image_urls` - TEXT[] - مصفوفة روابط الصور
- `floors_data` - JSONB - بيانات الطوابق والوحدات
- `owner_association` - JSONB - معلومات اتحاد الملاك

### معلومات النظام (System Information):
- `owner_id` - UUID - معرف المالك
- `created_at` - TIMESTAMP - تاريخ الإنشاء
- `updated_at` - TIMESTAMP - تاريخ التحديث

---

## owner_association JSONB Structure:
```json
{
  "hasAssociation": true,
  "managerName": "اسم المدير",
  "registrationNumber": "رقم التسجيل",
  "registeredUnitsCount": 20,
  "iban": "SA0000000000000000000000",
  "accountNumber": "1234567890",
  "contactNumber": "+966500000000",
  "startDate": "2024-01-01",
  "endDate": "2025-01-01",
  "monthlyFee": 500.00,
  "includesElectricity": true,
  "includesWater": true
}
```

---

## التحقق من نجاح الحفظ:
### Verify Successful Save:

```sql
-- عرض آخر عمارة تم إضافتها
SELECT 
  id,
  name,
  address,
  plot_number,
  neighborhood,
  total_floors,
  total_units,
  owner_association->>'hasAssociation' as has_association,
  owner_association->>'managerName' as manager_name,
  created_at
FROM buildings
ORDER BY created_at DESC
LIMIT 1;
```

---

## ملاحظات مهمة:
### Important Notes:

1. ✅ **جميع الحقول الآن محفوظة بالكامل** - All fields are now saved completely
2. ✅ **تم إضافة عمود address** - Address column added
3. ✅ **معلومات اتحاد الملاك منظمة في JSONB** - Owner association organized in JSONB
4. ✅ **جميع البيانات من الخطوات الخمس محفوظة** - All data from 5 steps saved
5. ⚠️ **تأكد من تطبيق السكريبت على Supabase قبل الحفظ** - Apply script to Supabase before saving

---

## في حالة حدوث خطأ:
### In Case of Error:

إذا ظهر خطأ مثل: `Could not find the 'address' column`

قم بتنفيذ:
```sql
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS address TEXT;
```

ثم أعد المحاولة.
