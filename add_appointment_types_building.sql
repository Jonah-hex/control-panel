-- إضافة أنواع مواعيد مرتبطة بالعمارة لجدول dashboard_appointments
-- Run this in Supabase SQL Editor if you get constraint errors when saving new appointment types.

ALTER TABLE dashboard_appointments
  DROP CONSTRAINT IF EXISTS dashboard_appointments_type_check;

ALTER TABLE dashboard_appointments
  ADD CONSTRAINT dashboard_appointments_type_check CHECK (
    type IN (
      'viewing',
      'meeting',
      'maintenance',
      'marketing',
      'unit_handover',
      'contract_signing',
      'complaint',
      'owner_meeting',
      'document_delivery',
      'unit_inspection',
      'other'
    )
  );
