-- تتبع من أضاف العمارة (المالك أو الموظف) لعرضه في سجل النشاط
-- Run this once to add columns to buildings table

ALTER TABLE buildings
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

COMMENT ON COLUMN buildings.created_by IS 'معرف المستخدم الذي أضاف العمارة (auth.uid() عند الإدراج)';
COMMENT ON COLUMN buildings.created_by_name IS 'اسم من أضاف العمارة للعرض في النشاط (مالك أو موظف)';
