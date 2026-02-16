# 🎯 نظام فلترة الوحدات - دليل الاستخدام

## 📋 نظرة عامة

تم إنشاء نظام فلترة احترافي للوحدات السكنية يتكامل بشكل كامل مع قاعدة بيانات Supabase.

---

## 🗃️ بنية البيانات (Schema Mapping)

### جدول الوحدات (units)
```sql
CREATE TABLE units (
  id UUID PRIMARY KEY,
  building_id UUID NOT NULL,
  unit_number VARCHAR(50) NOT NULL,
  floor INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'apartment',
  status VARCHAR(50) NOT NULL DEFAULT 'available',  -- 'available', 'reserved', 'sold'
  price DECIMAL(15, 2),
  area DECIMAL(8, 2),
  rooms INTEGER,
  bathrooms INTEGER,
  ...
)
```

### الحالات المدعومة (Status Values)
| القيمة في DB | العرض بالعربية | اللون | الأيقونة |
|-------------|---------------|-------|----------|
| `available` | متاحة | بنفسجي-وردي 💜 | CheckSquare |
| `reserved` | محجوزة | كهرماني 🧡 | Calendar |
| `sold` | مباعة | أحمر-وردي ❤️ | ShoppingCart |

---

## 🔗 آلية العمل

### 1. **من لوحة التحكم**
```tsx
// الكاردات في dashboard/page.tsx
{
  title: 'الشقق المتاحة',
  link: '/dashboard/units?status=available'
}
{
  title: 'الشقق المحجوزة',
  link: '/dashboard/units?status=reserved'
}
{
  title: 'الشقق المباعة',
  link: '/dashboard/units?status=sold'
}
```

### 2. **جلب البيانات من Supabase**
```typescript
// في units/page.tsx
const fetchData = async () => {
  // 1. جلب عماير المستخدم فقط
  const { data: buildingsData } = await supabase
    .from('buildings')
    .select('*')
    .eq('user_id', user.id)

  // 2. جلب الوحدات المفلترة حسب الحالة
  const { data: unitsData } = await supabase
    .from('units')
    .select('*')
    .in('building_id', buildingIds)
    .eq('status', statusFilter)  // ← الفلترة الأساسية
    .order('unit_number', { ascending: true })
}
```

### 3. **Real-time Updates**
```typescript
// اشتراك في التحديثات الفورية
const unitsChannel = supabase
  .channel('units-changes')
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'units' 
  }, () => {
    fetchData()  // إعادة جلب البيانات عند أي تغيير
  })
  .subscribe()
```

---

## 🎨 الواجهة

### صفحة الفلترة (`/dashboard/units`)

#### المكونات:
1. **Header ديناميكي:**
   - أيقونة ولون حسب نوع الفلترة
   - عداد للعماير والوحدات
   - زر رجوع + زر إغلاق

2. **نظام الفلترة:**
   - 🔍 بحث بالاسم أو العنوان
   - 🏠 فلترة حسب نوع الوحدة (apartment, studio, duplex...)
   - 📊 فلترة حسب الحالة (available, reserved, sold)
   - 🔄 زر إعادة تعيين

3. **عرض البيانات:**
   - كارد لكل عمارة تحتوي وحدات مطابقة
   - عرض أول 3 وحدات مع التفاصيل:
     - رقم الوحدة
     - نوع الوحدة
     - رقم الطابق
     - السعر (إن وجد)
   - زر لعرض تفاصيل العمارة الكاملة

---

## 🔍 مثال على الاستخدام

### السيناريو: المستخدم يريد رؤية الشقق المتاحة

1. **المستخدم يضغط على كارد "الشقق المتاحة"** في لوحة التحكم
2. **النظام ينتقل إلى:** `/dashboard/units?status=available`
3. **يتم جلب البيانات:**
   ```typescript
   // جلب جميع الوحدات بحالة 'available'
   .eq('status', 'available')
   ```
4. **يتم عرض:**
   - العماير التي تحتوي على وحدات متاحة فقط
   - عدد الوحدات المتاحة في كل عمارة
   - تفاصيل الوحدات المتاحة

5. **يمكن للمستخدم:**
   - البحث عن عمارة معينة
   - فلترة حسب نوع الوحدة (شقة، استوديو...)
   - التبديل إلى حالة أخرى (محجوزة/مباعة)
   - النقر على عمارة لرؤية تفاصيلها الكاملة

---

## ✅ النقاط المهمة

### تطابق أسماء الحقول:
```typescript
// ✅ صحيح (يطابق schema)
interface Unit {
  floor: number           // NOT floor_number
  type: string            // NOT unit_type
  status: 'available' | 'reserved' | 'sold'
}

// ❌ خطأ
interface Unit {
  floor_number: number    // ✗
  unit_type: string       // ✗
}
```

### قيم الـ Status:
```typescript
// ✅ صحيح (إنجليزي - كما في DB)
status: 'available'
status: 'reserved'
status: 'sold'

// ❌ خطأ
status: 'متاح'         // ✗
status: 'محجوز'        // ✗
status: 'مباع'         // ✗
```

---

## 📊 الإحصائيات في لوحة التحكم

```typescript
// حساب الإحصائيات من جدول units
const availableUnits = units.filter(u => u.status === 'available').length
const reservedUnits = units.filter(u => u.status === 'reserved').length
const soldUnits = units.filter(u => u.status === 'sold').length

// حساب النسب المئوية
const availablePercentage = Math.round((availableUnits / totalUnits) * 100)
const reservedPercentage = Math.round((reservedUnits / totalUnits) * 100)
const soldPercentage = Math.round((soldUnits / totalUnits) * 100)
```

---

## 🎯 الخلاصة

النظام الآن:
- ✅ يستخدم القيم الصحيحة من السكيما (`available`, `reserved`, `sold`)
- ✅ يجلب البيانات بشكل صحيح من Supabase
- ✅ يطبق الفلاتر بدقة
- ✅ يدعم Real-time updates
- ✅ واجهة احترافية ومتناسقة
- ✅ يعمل بكفاءة عالية

تم التأكد من أن جميع الأكواد تستخدم نفس المصطلحات والقيم في كل مكان! 🚀
