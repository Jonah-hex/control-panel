-- تعديل نوع العامود unitsperfloor ليكون BIGINT أو NUMERIC
ALTER TABLE buildings ALTER COLUMN unitsperfloor TYPE BIGINT;
-- أو يمكنك استخدام NUMERIC إذا أردت دعم أرقام عشرية
-- ALTER TABLE buildings ALTER COLUMN unitsperfloor TYPE NUMERIC;
