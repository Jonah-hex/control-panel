# هوية التصميم — لوحة التحكم

هذا المستند يحدد **أنماط التصميم المعتمدة** في المنصة بحيث تُطبَّق بشكل موحّد عند إضافة عناصر مشابهة (جداول مع تقسيم صفحات، قوائم، أزرار تحكم، هيدرات الصفحات).

---

## 1. الهيدر الموحد (صفحات الداشبورد)

نمط ثابت لجميع هيدرات الصفحات (إدارة العماير، الوحدات، الحجوزات، المبيعات، التسويق، التقارير، إلخ):

- **الحاوية الخارجية:**  
  `header` مع:  
  `relative rounded-2xl overflow-hidden mb-8 shadow-lg border border-gray-200/90 bg-gradient-to-br from-white to-gray-50`

- **طبقات تدرج خفيفة (لون الصفحة):**  
  طبقة ملوّنة `opacity-10` + طبقة شعاعية خفيفة فوق الخلفية.

- **المحتوى الداخلي:**  
  `div` مع:  
  `relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-4 sm:px-5 sm:py-4`

- **الأيقونة:**  
  حاوية: `flex-shrink-0 w-11 h-11 rounded-2xl` مع تدرج لوني حسب الصفحة، أيقونة داخلها: `w-5 h-5 text-white`.

- **العنوان:**  
  `h1`: `text-lg sm:text-xl font-bold text-gray-800 tracking-tight leading-tight`  
  الوصف: `p` مع `text-xs text-gray-500 mt-0.5`.

- **منطقة الأزرار:**  
  `flex items-center gap-2 flex-wrap flex-shrink-0`؛ أزرار ثانوية: `px-4 py-2.5 rounded-xl bg-white border border-slate-200` مع `hover:bg-slate-50 hover:border-slate-300 transition-all duration-200`.

- **حاوية الصفحة:**  
  الصفحة: `min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8`؛ المحتوى: `div` مع `max-w-7xl mx-auto` (أو `max-w-6xl` حيث يُحدد).

**مرجع:** صفحة إدارة العماير (`/dashboard/buildings`)، الوحدات، الحجوزات، المبيعات، التسويق، التقارير.

---

## 2. التقسيم (Pagination)

عند وجود جدول مع **عرض صفوف** و**أزرار السابق / التالي**:

- **قائمة «عرض» (select):**
  - `rounded-2xl` — أطراف شبه بيضاوية
  - `px-3 py-2` — padding مريح
  - `border border-slate-200`
  - `shadow-sm`
  - `focus:outline-none focus:ring-0` — بدون توهج أزرق عند التركيز
  - `transition-all duration-200`

- **أزرار «السابق» و«التالي»:**
  - `rounded-2xl` — أطراف شبه بيضاوية
  - `min-w-[2.75rem] py-2 px-3`
  - `border border-slate-200` مع `hover:border-slate-300`
  - `shadow-sm` و `hover:shadow`
  - `focus:outline-none focus:ring-0`
  - `disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm`
  - `transition-all duration-200`

**مثال معتمد:** الحجوزات (`/dashboard/reservations`)، المبيعات (`/dashboard/sales`).

---

## 3. حلقة التركيز (Focus Ring)

في كل المنصة:

- **لا يُستخدم** توهج أزرق أو حلقة تركيز حول الحقول عند النقر أو التنقل بالتاب.
- **الحقول:** `input`, `select`, `textarea`, `button` — تطبيق `focus:outline-none focus:ring-0` (أو عبر القاعدة العامة في `globals.css`).

---

## 4. القوائم والأزرار الصغيرة في الشريط السفلي

- الحاوية السفلية للجدول: `border-t border-slate-100 bg-slate-50/50` مع `flex flex-wrap items-center justify-between gap-3 px-4 py-3`.
- النص الذي يعرض النطاق: `font-mono` مع `toLocaleString("en")` للأرقام.
- رقم الصفحة: `ص X / Y` بنفس الخط واللون المتناسق.

---

## 5. اعتماد النمط عند إضافة عناصر مشابهة

عند إضافة:
- جدول جديد مع تقسيم صفحات، أو
- شريط تحكم (عرض 10 / 25 / 50 / 100 + السابق / التالي)، أو
- قوائم منسدلة أو أزرار تحكم بجانب الجداول

يُفضّل **نسخ النمط** من صفحة الحجوزات أو المبيعات (الكلاسات أعلاه) لضمان تناسق الهوية البصرية.

---

*آخر تحديث: توحيد نمط الهيدر (مقاس، padding، أيقونة 11×11، عنوان text-lg sm:text-xl) لجميع صفحات الداشبورد.*
