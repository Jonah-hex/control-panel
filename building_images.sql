-- جدول صور المباني مع دعم تصنيفات الصور وربطها بكل مبنى
CREATE TABLE IF NOT EXISTS building_images (
    id SERIAL PRIMARY KEY,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('front', 'back', 'annex', 'building')),
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
--
-- building_id: يربط الصورة بمبنى محدد
-- type: تصنيف الصورة (الشقة الأمامية، الخلفية، الملحق، العمارة)
-- url: رابط الصورة (على التخزين أو السيرفر)
-- كل مبنى يمكن أن يكون له عدة صور في كل تصنيف
