-- حقل صورة الهوية عند نقل الملكية
-- نفّذ مرة واحدة من Supabase Dashboard > SQL Editor

ALTER TABLE units ADD COLUMN IF NOT EXISTS transfer_id_image_url TEXT;

-- transfer_id_image_url: رابط صورة هوية المشتري المرفقة
