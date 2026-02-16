# دليل الحقول الجديدة في نظام إدارة العماير

## 📋 الحقول المضافة الجديدة

تم إضافة 5 حقول جديدة مهمة لنظام إدارة العماير لتحسين جمع البيانات الأساسية للمبنى.

---

## 🏗️ 1. حالة البناء (Build Status)

### المعلومات الأساسية:
- **اسم الحقل في Database**: `build_status`
- **نوع البيانات**: VARCHAR(50)
- **القيمة الافتراضية**: 'ready'
- **الحقول المتاحة**:
  - `ready` - جاهز (البناء كامل وجاهز للبيع)
  - `under_construction` - تحت الإنشاء (البناء لم ينته بعد)
  - `finishing` - تشطيب (البناء انتهى والتشطيب جاري)
  - `new_project` - أرض مشروع جديد (أرض عارية للمشروع)

### استخدام في الواجهة:
```tsx
<select value={formData.buildStatus}>
  <option value="ready">جاهز</option>
  <option value="under_construction">تحت الإنشاء</option>
  <option value="finishing">تشطيب</option>
  <option value="new_project">أرض مشروع جديد</option>
</select>
```

### الموقع في الصفحة:
- **الخطوة**: Step 1 (معلومات العمارة الأساسية)
- **الموضع**: بعد حقل "الوصف" مباشرة
- **الأيقونة**: `Building2` من lucide-react

---

## 📏 2. مساحة الأرض (Land Area)

### المعلومات الأساسية:
- **اسم الحقل في Database**: `land_area`
- **نوع البيانات**: DECIMAL(15, 2)
- **الوحدة**: متر مربع (م²)
- **القيمة الافتراضية**: NULL

### استخدام في الواجهة:
```tsx
<input
  type="number"
  value={formData.landArea || ''}
  onChange={(e) => setFormData({...formData, landArea: parseFloat(e.target.value) || 0})}
  step="0.01"
  placeholder="مثال: 500.50"
/>
```

### الموقع في الصفحة:
- **الخطوة**: Step 1 (معلومات العمارة الأساسية)
- **الموضع**: في صف منفصل بعد حالة البناء
- **الأيقونة**: `Ruler` من lucide-react
- **ملاحظة**: يقبل أرقام عشرية وحتى جزء من المئة

---

## 📜 3. رقم رخصة البناء (Building License Number)

### المعلومات الأساسية:
- **اسم الحقل في Database**: `building_license_number`
- **نوع البيانات**: VARCHAR(100)
- **الحقل مطلوب**: نعم (marked as required)
- **القيمة الافتراضية**: NULL

### استخدام في الواجهة:
```tsx
<input
  type="text"
  value={formData.buildingLicenseNumber}
  onChange={(e) => setFormData({...formData, buildingLicenseNumber: e.target.value})}
  required
  placeholder="مثال: 12345/2023"
/>
```

### الموقع في الصفحة:
- **الخطوة**: Step 1 (معلومات العمارة الأساسية)
- **الموضع**: بعد مساحة الأرض
- **الأيقونة**: `FileText` من lucide-react
- **ملاحظة**: رقم فريد يصدره الجهة الحكومية (عادة ما تكون صيغته: رقم/السنة)

---

## 🛡️ 4. توفر التأمين (Insurance Available)

### المعلومات الأساسية:
- **اسم الحقل في Database**: `insurance_available`
- **نوع البيانات**: BOOLEAN
- **القيمة الافتراضية**: FALSE

### استخدام في الواجهة:
```tsx
<div className="flex gap-4">
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="radio"
      checked={formData.insuranceAvailable === true}
      onChange={() => setFormData({...formData, insuranceAvailable: true})}
    />
    <span>نعم</span>
  </label>
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="radio"
      checked={formData.insuranceAvailable === false}
      onChange={() => setFormData({...formData, insuranceAvailable: false, insurancePolicyNumber: ''})}
    />
    <span>لا</span>
  </label>
</div>
```

### الموقع في الصفحة:
- **الخطوة**: Step 1 (معلومات العمارة الأساسية)
- **الموضع**: بعد رقم رخصة البناء
- **نوع الإدخال**: زر راديو (Radio Button) - نعم/لا
- **حقل مشروط**: يظهر حقل رقم البوليصة فقط عند اختيار "نعم"

---

## 📋 5. رقم بوليصة التأمين (Insurance Policy Number)

### المعلومات الأساسية:
- **اسم الحقل في Database**: `insurance_policy_number`
- **نوع البيانات**: VARCHAR(100)
- **الحقل مطلوب**: فقط عند اختيار `insuranceAvailable = true`
- **القيمة الافتراضية**: NULL

### استخدام في الواجهة:
```tsx
{formData.insuranceAvailable && (
  <div>
    <label>رقم بوليصة التأمين <span className="text-red-500">*</span></label>
    <input
      type="text"
      value={formData.insurancePolicyNumber}
      onChange={(e) => setFormData({...formData, insurancePolicyNumber: e.target.value})}
      required={formData.insuranceAvailable}
      placeholder="مثال: POL-2023-12345"
    />
  </div>
)}
```

### الموقع في الصفحة:
- **الخطوة**: Step 1 (معلومات العمارة الأساسية)
- **الموضع**: يظهر مباشرة بعد حقل "هل يوجد تأمين؟"
- **الأيقونة**: `Shield` من lucide-react
- **شرط الظهور**: `formData.insuranceAvailable === true`
- **ملاحظة**: يكون مخفياً وغير مطلوب إذا اختار المستخدم "لا" للتأمين

---

## 📊 ملخص تكامل Database

### SQL Schema Update Script:
```sql
ALTER TABLE buildings
ADD COLUMN IF NOT EXISTS build_status VARCHAR(50) DEFAULT 'ready',
ADD COLUMN IF NOT EXISTS land_area DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS building_license_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS insurance_available BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS insurance_policy_number VARCHAR(100);
```

### الفهارس المضافة:
```sql
CREATE INDEX IF NOT EXISTS idx_buildings_build_status ON buildings(build_status);
CREATE INDEX IF NOT EXISTS idx_buildings_insurance ON buildings(insurance_available);
```

---

## 🔄 تدفق العمل عند الحفظ

عند حفظ بيانات المبنى في Supabase، يتم إدراج جميع الحقول الجديدة:

```typescript
const { data: building, error: buildingError } = await supabase
  .from('buildings')
  .insert([
    {
      // ... حقول أخرى
      build_status: formData.buildStatus,
      land_area: formData.landArea || null,
      building_license_number: formData.buildingLicenseNumber || null,
      insurance_available: formData.insuranceAvailable,
      insurance_policy_number: formData.insuranceAvailable ? formData.insurancePolicyNumber : null,
      // ... المزيد من الحقول
    }
  ])
```

### النقاط المهمة:
- `land_area` تُحفظ كـ NULL إذا لم تُملأ
- `building_license_number` تُحفظ كـ NULL إذا لم تُملأ
- `insurance_policy_number` تُحفظ كـ NULL إذا لم يكن هناك تأمين
- إذا كان هناك تأمين، يجب إدخال رقم البوليصة (حقل مطلوب)

---

## 🎨 تفاصيل التصميم

### الألوان والأيقونات:
- **حالة البناء**: Building2 icon (لون indigo)
- **مساحة الأرض**: Ruler icon (لون indigo)
- **رخصة البناء**: FileText icon (لون indigo)
- **التأمين**: Shield icon (لون indigo)

### التحقق من الصحة:
- جميع الحقول المطلوبة موضحة بـ `<span className="text-red-500">*</span>`
- حقل رقم البوليصة يصبح مطلوباً فقط عند اختيار "نعم" للتأمين

---

## 📝 مثال عملي كامل

```
خطوة الإدخال:
1. اختر حالة البناء: "جاهز"
2. أدخل مساحة الأرض: 500.50 م²
3. أدخل رقم رخصة البناء: 12345/2023
4. اختر: هل يوجد تأمين؟ → "نعم"
5. سيظهر حقل جديد: أدخل رقم بوليصة التأمين: POL-2023-12345

النتيجة في Database:
{
  build_status: 'ready',
  land_area: 500.50,
  building_license_number: '12345/2023',
  insurance_available: true,
  insurance_policy_number: 'POL-2023-12345'
}
```

---

## 🔍 الاستعلام على البيانات

للمقارنة مع حالات محددة:

```sql
-- جميع العماير قيد الإنشاء
SELECT * FROM buildings WHERE build_status = 'under_construction';

-- عماير بها تأمين
SELECT * FROM buildings WHERE insurance_available = TRUE;

-- عماير بمساحة أرض أكبر من 500 متر مربع
SELECT * FROM buildings WHERE land_area > 500;

-- عماير بدون رخصة بناء مسجلة
SELECT * FROM buildings WHERE building_license_number IS NULL;
```

---

## ⚡ ملاحظات الأداء

- تم إضافة فهرس (Index) على `build_status` و `insurance_available` لتحسين سرعة البحث
- تخزين البيانات اختياري (nullable) حيث يحتاج غالباً

---

**آخر تحديث**: 16 Feb 2026
**الصيغة**: 1.0
**الحالة**: ✅ نشط وجاهز للاستخدام
