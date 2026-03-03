# إصلاح تحذيرات Security Linter (Supabase)

## 1. Function Search Path Mutable (الدوال الثلاث)

**التحذير:** الدوال التالية بدون `search_path` ثابت:  
`set_investors_updated_at`, `check_building_subscription_limit`, `building_docs_can_access`

**الحل:** نفّذ في Supabase → SQL Editor الملف:

```
fix_function_search_path.sql
```

هذا السكربت يطبّق `ALTER FUNCTION ... SET search_path = public` على كل الدوال المذكورة (بما فيها الدوال الأخرى في القائمة).

تم أيضاً إضافة `SET search_path = public` في تعريفات:
- `add_building_documents.sql` → دالة `building_docs_can_access`
- `subscription_plans_and_users.sql` → دالة `check_building_subscription_limit`

---

## 2. Leaked Password Protection Disabled (Auth)

**التحذير:** حماية كلمات المرور المسربة معطّلة (HaveIBeenPwned).

**الحل (من لوحة Supabase):**

1. اذهب إلى **Authentication** → **Providers** → **Email**
2. فعّل **Enable email confirmations** إذا لزم
3. من **Project Settings** → **Auth** ابحث عن خيار **Leaked password protection** أو **Password strength** وفعّله

أو من الوثائق:  
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

---

بعد تنفيذ السكربت وتفعيل حماية كلمات المرور، أعد فحص الـ linter للتأكد من زوال التحذيرات.
