# سياسات RLS في Supabase

توثيق الجداول الحساسة وسياسات Row-Level Security (RLS) المتوقعة لضمان تطابق الصلاحيات مع منطق التطبيق.

## الجداول الأساسية

### 1. `buildings`
- **الوصول:** المالك (`owner_id = auth.uid()`) أو موظف نشط تابع لنفس المالك
- **الملفات:** `add_employee_invite_and_rls.sql`
- **السياسات:** `Users can view/create/update/delete their own buildings`

### 2. `units`
- **الوصول:** عبر `building_id` → `buildings.owner_id`
- **الملفات:** `add_employee_invite_and_rls.sql`, `fix_units_policies.sql`
- **السياسات:** `Users can view/create/update/delete units in their buildings`

### 3. `sales`
- **الوصول:** المالك أو موظف لديه صلاحية `sales` (عمارات المالك)
- **الملفات:** `fix_sales_rls_employees.sql`
- **السياسات:** `sales_select_policy`, `sales_insert_policy`, `sales_update_policy`, `sales_delete_policy`

### 4. `reservations`
- **الوصول:** المالك أو موظف تابع له (عمارات المالك)
- **الملفات:** `reservations_system_migration.sql`
- **السياسات:** `reservations_select_policy`, `reservations_insert_policy`, `reservations_update_policy`, `reservations_delete_policy`

### 5. `reservation_marketers`
- **الوصول:** المالك (`owner_id = auth.uid()`) أو موظف تابع له
- **الملفات:** `reservations_system_migration.sql`
- **السياسات:** `marketers_owner_only`

### 6. `activity_logs`
- **الوصول:** المالك أو موظف تابع له (حسب `building_id` في metadata)
- **الملفات:** `add_activity_logs_insert_policy.sql`

### 7. `dashboard_tasks`, `dashboard_appointments`
- **الوصول:** المالك أو موظف تابع له
- **الملفات:** `create_dashboard_tasks_and_appointments.sql`

### 8. `building_folders`, `building_documents`
- **الوصول:** عبر دالة `building_docs_can_access(building_id)`
- **الملفات:** `add_building_documents.sql`

### 9. `income`, `expenses`, `maintenance_requests`
- **الوصول:** المالك أو موظف تابع له (عبر عمارات المالك)
- **الملفات:** `fix_income_rls.sql`, `fix_expenses_rls.sql`, `fix_maintenance_rls_employees.sql`

## فحص السياسات الحالية

```sql
-- عرض جميع سياسات RLS لجدول معين
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'sales';
```

## التحقق من تطبيق RLS

1. **تفعيل RLS:** `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`
2. **التأكد من وجود سياسات:** كل عملية (SELECT, INSERT, UPDATE, DELETE) يجب أن تغطيها سياسة
3. **اختبار بصلاحية موظف:** الدخول بحساب موظف ذي صلاحيات محدودة والتحقق من رؤية البيانات الصحيحة فقط

## الجداول التي تحتاج مراجعة

| الجدول | الحالة | ملاحظات |
|--------|--------|---------|
| `building_investors` | مراجعة | يجب التقييد بـ owner_id أو عمارات المالك |
| `unit_investments` | مراجعة | نفس الفكرة |
| `dashboard_employees` | مراجعة | سياسة `employee_select_own_row` للقراءة فقط |

## مراجع

- `fix_storage_deeds_policies.sql` — سياسات التخزين (building-images)
- `fix_storage_building_documents.sql` — سياسات التخزين (building-documents)
- `fix_subscriptions_rls.sql` — جدول الاشتراكات
