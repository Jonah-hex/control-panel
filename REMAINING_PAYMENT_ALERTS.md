# تنبيهات المبلغ المتبقي (الدفع الجزئي)

## البيانات المتوفرة

- **جدول `sales`**: الأعمدة `remaining_payment`, `remaining_payment_due_date`, `payment_status = 'partial'` لتحديد المبيعات ذات المبلغ المتبقي.
- **جدول `activity_logs`**: عند كل نقل ملكية جزئي يُسجَّل سجل بـ `action_type = 'ownership_transferred_partial'` والـ `metadata` يحتوي على:
  - `remaining_payment`, `remaining_payment_due_date`, `sale_id`, `building_id`, `building_name`, `unit_id`, `buyer_name`.

## استخدام التنبيهات

1. **للمالك ومدير المبيعات وأصحاب الصلاحيات**: استعلام المبيعات الجزئية التي لم يُستحق مبلغها بعد أو التي اقترب/ passed تاريخ الاستحقاق:
   - من `sales`: `WHERE payment_status = 'partial' AND remaining_payment > 0`
   - ترشيح حسب `remaining_payment_due_date` لعرض "قادم الاستحقاق" أو "متأخر".

2. **دمج مع نظام الإشعارات**: إن وُجد جدول `notifications` أو بريد إلكتروني، يمكن إنشاء وظيفة (Cron أو Edge Function) تقرأ من `sales` أو `activity_logs` وترسل تنبيهات عند اقتراب أو تجاوز `remaining_payment_due_date`.

3. **لوحة تحكم**: عرض قائمة "مبالغ متبقية" مع تاريخ الاستحقاق وربطها بصفحة المبيعات أو تفاصيل البيع.
