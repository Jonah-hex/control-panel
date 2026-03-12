-- تحديث أنواع المواعيد المسموحة في dashboard_appointments
-- (موعد افراغ، معاينة فاحص، مراجعه مكتب هندسي، تسليم وحدة + الأنواع السابقة المتبقية)

ALTER TABLE dashboard_appointments
  DROP CONSTRAINT IF EXISTS dashboard_appointments_type_check;

ALTER TABLE dashboard_appointments
  ADD CONSTRAINT dashboard_appointments_type_check CHECK (
    type IN (
      'handover_appointment',
      'inspector_viewing',
      'engineering_review',
      'unit_delivery',
      'viewing',
      'maintenance',
      'marketing',
      'contract_signing',
      'other',
      -- للتوافق مع بيانات قديمة إن وُجدت
      'meeting',
      'unit_handover',
      'complaint',
      'owner_meeting',
      'document_delivery',
      'unit_inspection'
    )
  );
