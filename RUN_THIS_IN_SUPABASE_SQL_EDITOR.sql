-- ============================================================
-- نفّذ هذا الملف في Supabase لحل خطأ: settlement_account_iban
-- ============================================================
-- 1) افتح مشروعك في Supabase
-- 2) من القائمة: SQL Editor → New query
-- 3) انسخ كل المحتوى من هنا إلى الأسفل (Ctrl+A ثم Ctrl+C)
-- 4) الصق في المحرر ثم اضغط Run
-- ============================================================

ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS closed_at DATE;
ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS realized_profit NUMERIC(15,2);
ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS closing_percentage NUMERIC(5,2);
ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS settlement_method VARCHAR(20);
ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS settlement_account_iban TEXT;
ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS settlement_bank_name TEXT;
ALTER TABLE building_investors ADD COLUMN IF NOT EXISTS settlement_type VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_building_investors_closed_at ON building_investors(closed_at) WHERE closed_at IS NOT NULL;
