# جدول building_investors — أعمدة إغلاق الصفقة والربط مع المنظومة

**لتجنب خطأ `Could not find the 'settlement_account_iban' column` (أو أي عمود آخر) نفّذ ترحيل الأعمدة مرة واحدة في Supabase.**

---

## 1. ترحيل واحد مطلوب

| الملف | الوصف |
|-------|--------|
| **`supabase_migrations/run_building_investors_deal_closing_columns.sql`** | يضيف كل أعمدة إغلاق الصفقة والمخالصة. **نفّذه مرة واحدة في Supabase → SQL Editor.** |

يمكن استخدام الملف الموجود في الجذر أيضاً: **`add_building_investors_deal_closing.sql`** (يجب أن يحتوي نفس الأعمدة).

---

## 2. الأعمدة المضافة بالترحيل (ومطابقة الكود)

| العمود | النوع | الاستخدام في المنظومة |
|--------|--------|------------------------|
| `closed_at` | DATE | تاريخ إغلاق الصفقة — يُقرأ/يُكتب من صفحة المستثمرين؛ يُستخدم في التحليلات وعرض المخالصة. |
| `realized_profit` | NUMERIC(15,2) | الربح المحقق — يُحسب من نسبة الإغلاق؛ يُكتب عند الإغلاق؛ يُعرض في الجدول وعرض المخالصة والتحليلات. |
| `closing_percentage` | NUMERIC(5,2) | نسبة الإغلاق النهائية % — تُدخل عند الإغلاق؛ مصدر حساب الربح المحقق والربط مع التقارير. |
| `settlement_method` | VARCHAR(20) | طريقة المخالصة: `transfer` / `check` / `cash` — يُكتب عند الإغلاق؛ يُعرض في المخالصة. |
| `settlement_account_iban` | TEXT | رقم الحساب أو الآيبان — يُكتب عند اختيار حوالة؛ يُعرض في عرض المخالصة. |
| `settlement_bank_name` | TEXT | اسم البنك — يُكتب عند اختيار حوالة؛ يُعرض في عرض المخالصة. |
| `settlement_type` | VARCHAR(20) | نوع المخالصة: `profit_only` / `with_capital` — يُكتب عند الإغلاق؛ للتحليلات ومفهوم البيع بالكامل. |

---

## 3. الربط مع الصفحات والمعادلات

| المكوّن | الأعمدة المستخدمة |
|---------|-------------------|
| **صفحة المستثمرين** (`/dashboard/owners-investors/investors`) | قراءة: كل الأعمدة أعلاه مع `select("*")`. كتابة عند إغلاق الصفقة: `closed_at`, `realized_profit`, `closing_percentage`, `settlement_method`, `settlement_account_iban`, `settlement_bank_name`, `settlement_type`. |
| **لوحة تحليلات الاستثمار** (`/dashboard/owners-investors/analytics`) | قراءة: `closed_at`, `realized_profit`, `closing_percentage` (وغيرها من الجدول) لاحتساب الملخصات والأرباح المحققة. |
| **الواجهة (BuildingInvestorRow)** | الواجهة في `investors/page.tsx` تعرّف كل الأعمدة أعلاه كاختيارية؛ يجب أن تكون موجودة في الجدول حتى لا يفشل الاستعلام أو التحديث. |

---

## 4. المعادلات الموحّدة

- **الربح المحقق (عمارة):** `realized_profit = total_invested_amount × (closing_percentage / 100)`
- **إجمالي المخالصة (مع رأس المال):** `total_invested_amount + realized_profit`
- مرجع السياسة الكاملة: **`docs/investment-deal-closing-policy.md`**

---

*بعد تنفيذ الترحيل، حدّث schema cache في Supabase إذا لزم (أو أعد تحميل الصفحة) وتأكد أن كل الأعمدة تظهر في Table Editor لجدول `building_investors`.*
