# سياسات RLS في Supabase

هذا الملف يوثق سياسات Row Level Security (RLS) المطلوبة للجداول الحساسة في لوحة التحكم، بما يتوافق مع نموذج الصلاحيات والمالك الفعلي.

## نموذج الصلاحيات

- **المالك (owner):** يمتلك العماير وله صلاحيات كاملة على بياناته.
- **الموظف (employee):** مرتبط بـ `owner_id` عبر جدول `dashboard_employees`، ولديه صلاحيات محددة حسب `permissions`.

الاستعلامات في التطبيق تستخدم `effectiveOwnerId` (إما `auth.uid()` للمالك أو `employee.owner_id` للموظف) لترشيح البيانات.

---

## الجداول التي تحتاج RLS

### 1. buildings

| العملية | السياسة المطلوبة |
|---------|------------------|
| SELECT  | المالك أو الموظف النشط المرتبط بـ `owner_id` |
| INSERT  | `auth.uid() = owner_id` (فقط المالك يُنشئ عمارة) |
| UPDATE  | المالك أو موظف لديه `buildings_edit` |
| DELETE  | المالك أو موظف لديه `buildings_delete` |

**اقتراح سياسة SELECT:**
```sql
CREATE POLICY "buildings_select" ON buildings FOR SELECT
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM dashboard_employees
    WHERE owner_id = buildings.owner_id
      AND auth_user_id = auth.uid()
      AND is_active = true
  )
);
```

---

### 2. units

الوحدات مرتبطة بـ `building_id`. يجب أن تكون العمارة مملوكة للمالك الفعلي.

| العملية | السياسة المطلوبة |
|---------|------------------|
| SELECT  | العمارة `owner_id` يطابق المالك أو الموظف النشط |
| INSERT  | العمارة مملوكة للمستخدم |
| UPDATE  | العمارة مملوكة + صلاحية `units_edit` |
| DELETE  | العمارة مملوكة + صلاحية حذف |

**اقتراح سياسة SELECT:**
```sql
CREATE POLICY "units_select" ON units FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM buildings b
    WHERE b.id = units.building_id
      AND (
        b.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM dashboard_employees e
          WHERE e.owner_id = b.owner_id
            AND e.auth_user_id = auth.uid()
            AND e.is_active = true
        )
      )
  )
);
```

---

### 3. sales

المبيعات مرتبطة بـ `building_id`.

| العملية | السياسة المطلوبة |
|---------|------------------|
| SELECT  | العمارة مملوكة للمالك الفعلي |
| INSERT  | العمارة مملوكة + صلاحية `sales` أو `marketing_complete_sale` |
| UPDATE  | نفس الشرط |
| DELETE  | المالك فقط عادةً |

---

### 4. reservations

الحجوزات مرتبطة بـ `building_id`.

| العملية | السياسة المطلوبة |
|---------|------------------|
| SELECT  | العمارة مملوكة للمالك الفعلي |
| INSERT  | صلاحية `reservations` |
| UPDATE  | صلاحية `reservations` أو `marketing_cancel_reservation` |
| DELETE  | المالك أو صلاحيات محددة |

---

### 5. reservation_marketers

مرتبط بـ `owner_id` مباشرة.

| العملية | السياسة المطلوبة |
|---------|------------------|
| SELECT  | `owner_id = auth.uid()` أو موظف مرتبط |
| INSERT  | نفس الشرط |
| UPDATE  | نفس الشرط |
| DELETE  | نفس الشرط |

---

### 6. building_investors, unit_investments

مرتبطان بـ `owner_id` و `building_id`.

| العملية | السياسة المطلوبة |
|---------|------------------|
| SELECT  | `owner_id` يطابق المالك الفعلي |
| INSERT  | المالك فقط |
| UPDATE  | المالك أو صلاحية `investors_edit` |
| DELETE  | المالك |

---

### 7. activity_logs

يتم الترشيح حالياً في التطبيق حسب `building_id` في `metadata`. يمكن استخدام سياسة أوسع:

| العملية | السياسة المطلوبة |
|---------|------------------|
| SELECT  | المستخدم مسجل دخول (أو ربط بعمارات المالك) |
| INSERT  | المستخدم مسجل دخول |

> **ملاحظة:** التطبيق يفلتر النشاطات حسب عمارات المالك. يمكن جعل RLS يعتمد على وجود المستخدم في `dashboard_employees` أو كمالك لعمارة.

---

### 8. dashboard_employees

| العملية | السياسة المطلوبة |
|---------|------------------|
| SELECT  | `owner_id = auth.uid()` (المالك يرى موظفيه فقط) |
| INSERT  | `owner_id = auth.uid()` |
| UPDATE  | `owner_id = auth.uid()` |
| DELETE  | `owner_id = auth.uid()` |

الموظف نفسه يمكن أن يقرأ سجله (`auth_user_id = auth.uid()`) للتحقق من صلاحياته.

---

### 9. building_folders, building_documents

مرتبطة بـ `building_id`. نفس منطق `units`.

---

### 10. dashboard_tasks, dashboard_appointments

مرتبطة بـ `owner_id` أو `building_id`. ترشيح حسب المالك الفعلي.

---

### 11. maintenance_requests

مرتبطة بـ `building_id` و `unit_id`. نفس منطق العمارات.

---

### 12. user_sessions, login_attempts, locked_accounts, user_security_settings

جداول أمان مرتبطة بـ `auth.uid()`. السياسة: `auth.uid() = user_id` أو ما يعادله.

---

### 13. subscription_plans, user_subscriptions

- `subscription_plans`: قراءة عامة (أو سياسة SELECT للجميع).
- `user_subscriptions`: `user_id = auth.uid()` أو ربط مع `owner_id` إذا كان الميدان مختلفاً.

---

## خطوات التطبيق

1. تفعيل RLS على كل جدول:
   ```sql
   ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
   ```

2. إنشاء السياسات حسب الجدول (استخدم الاقتراحات أعلاه كأساس).

3. اختبار السياسات بحساب مالك وموظف وحرمان موظف معطل.

4. التأكد من أن الاستعلامات في التطبيق تستخدم `effectiveOwnerId` و `building_id` بشكل صحيح؛ RLS يعمل كمصفاة إضافية ولا يعوض عن ترشيح خاطئ في الكود.

---

## مراجع

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- `src/hooks/useDashboardAuth.ts` — كيفية تحديد المالك الفعلي والصلاحيات
- `src/hooks/useBuildings.ts`, `useStatistics.ts`, `useUnits.ts` — أمثلة على جلب البيانات المفلترة
