-- أولوية الموعد: ربط مع التنبيه الحرج (عالي/عاجل) والجرس (عادي/منخفض)
ALTER TABLE dashboard_appointments ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE dashboard_appointments DROP CONSTRAINT IF EXISTS dashboard_appointments_priority_check;
ALTER TABLE dashboard_appointments ADD CONSTRAINT dashboard_appointments_priority_check
  CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
