-- إضافة عامود street_type (شارع أو شارعين)
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS street_type VARCHAR(50) DEFAULT 'one';

-- إضافة عامود building_direction (اتجاه العمارة: شمال، جنوب، شرق، غرب...)
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_direction VARCHAR(50) DEFAULT 'north';

-- يمكنك تعديل القيم الافتراضية حسب الحاجة
-- الآن كل عامود منفصل ويمكنك استخدامهما في النموذج والحفظ والعرض
