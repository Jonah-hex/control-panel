# حل تحذيرات Supabase Security Advisor (3 أخطاء)

## الخطوة 1: معرفة الأخطاء بالضبط
1. ادخل إلى [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر مشروع **ادارة الحجوزات** (أو المشروع الذي يظهر فيه التحذير)
3. من القائمة الجانبية: **Project Settings** (أو الإعدادات) → **Security Advisor**  
   أو ابحث عن **Security Advisor** في المشروع
4. افتح التقرير واقرأ ما هي الـ **3 errors** (مثلاً: جدول بدون RLS، جدول بدون سياسات، تخزين بدون RLS)

## الخطوة 2: تشغيل سكربت الإصلاح
1. في نفس المشروع: **SQL Editor** → **New query**
2. افتح الملف `fix_security_advisor.sql` من المشروع
3. انسخ محتواه بالكامل والصقه في المحرر
4. اضغط **Run** (أو Ctrl+Enter)
5. تأكد أن التنفيذ انتهى بدون أخطاء (إن ظهر خطأ لجدول غير موجود يمكن تجاهل ذلك الجدول أو تعديل السكربت)

## الخطوة 3: إصلاح التخزين (إن كان أحد الأخطاء عنه)
إذا كان أحد التحذيرات يتعلق بـ **Storage** أو **bucket** (مثل `building-images`):
1. في **SQL Editor** افتح ملف `fix_storage_deeds_policies.sql`
2. نفّذه بنفس الطريقة (نسخ → لصق → Run)

## الخطوة 4: المراجعة مرة أخرى
1. ارجع إلى **Security Advisor**
2. حدّث الصفحة أو أعد فتح التقرير
3. يفترض أن تختفي التحذيرات أو يقل عددها

## تحذير: Table public.subscriptions is public, but RLS has not been enabled
نفّذ الملف **`fix_subscriptions_rls.sql`** في SQL Editor (يفعّل RLS ويضيف سياسة قراءة للمستخدمين المسجلين فقط).

## تحذير: Table public.staff is public, but RLS has not been enabled
نفّذ الملف **`fix_staff_rls.sql`** في SQL Editor (يفعّل RLS ويضيف سياسات بحيث المالك فقط يدير موظفي عماراته). أو شغّل **`fix_security_advisor.sql`** فهو يتضمن إصلاح staff مع بقية الجداول.

## تحذير: Table public.expenses is public, but RLS has not been enabled
نفّذ الملف **`fix_expenses_rls.sql`** في SQL Editor (يفعّل RLS ويضيف سياسات بحيث المالك فقط يدير مصروفات عماراته). أو شغّل **`fix_security_advisor.sql`** فهو يتضمن إصلاح expenses مع بقية الجداول.

## تحذير: Table public.income is public, but RLS has not been enabled
نفّذ الملف **`fix_income_rls.sql`** في SQL Editor (يفعّل RLS ويضيف سياسات بحيث المالك فقط يدير إيرادات عماراته). أو شغّل **`fix_security_advisor.sql`** فهو يتضمن إصلاح income مع بقية الجداول.

## تحذير: Function Search Path Mutable (دوال مثل set_updated_at، handle_new_user)
الدالة لها **search_path** غير ثابت. الحل: نفّذ الملف **`fix_function_search_path.sql`** في SQL Editor؛ يضبط `search_path = public` لجميع الدوال المذكورة في التحذير (بما فيها `handle_new_user` إن وُجدت).

## تحذير: Leaked Password Protection Disabled (Auth)
**حماية كلمات المرور المسربة** معطّلة في المصادقة. الحل من الواجهة (وليس SQL):

1. من المشروع: **Authentication** (المصادقة) → **Providers** (مقدّمو الخدمة)
2. اضغط على **Email** (مقدّم البريد)
3. انزل إلى قسم **Password strength and security** أو **Password requirements**
4. فعّل الخيار **Prevent the use of leaked passwords** (أو "Leaked password protection") ثم احفظ.

**ملاحظة:** هذه الميزة متوفرة فقط في **خطة Pro وما فوق**. إن لم يظهر عندك هذا الخيار فالمشروع غالباً على الخطة المجانية — يمكنك تجاهل التحذير أو ترقية الخطة إن أردت تفعيل الحماية.

## إن استمر تحذير معيّن
- اقرأ نص التحذير في Security Advisor (يذكر عادة اسم الجدول أو الـ bucket)
- تأكد أن الجدول مفعّل عليه **RLS** وأن له **سياسات** مناسبة (SELECT/INSERT/UPDATE/DELETE للمالك فقط أو مع الموظفين)
- يمكنك استخدام سكربت `verify_database_schema.sql` للتحقق من أن RLS مفعّل على الجداول الرئيسية

## مراجع في المشروع
- `fix_security_advisor.sql` — إصلاح RLS والسياسات للجداول الرئيسية
- `fix_function_search_path.sql` — إصلاح تحذير Function Search Path Mutable للدوال
- `fix_storage_deeds_policies.sql` — سياسات تخزين الصكوك
- `fix_employee_rls.sql` — سياسة قراءة الموظف لسجله في `dashboard_employees`
- `fix_units_policies.sql` — سياسات جدول الوحدات
- `fix_rls_policies.sql` — سياسات شاملة لعدة جداول
