"use client";
import { useRouter, useSearchParams } from "next/navigation";
import ImagesGallery from "../images-gallery";
import { createClient } from "@/lib/supabase/client";
import React, { useState, Suspense } from "react";

const typeTitles: Record<string, string> = {
  front: "الشقة الأمامية",
  back: "الشقة الخلفية",
  annex: "الملحق",
  building: "العمارة"
};

function GalleryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "building";
  const buildingId = searchParams.get("buildingId") || "";
  const supabase = createClient();
  const [images, setImages] = useState<{id: number, url: string}[]>([]);
  const [loading, setLoading] = useState(true);

  // جلب الصور من قاعدة البيانات عند تحميل الصفحة أو تغيير التصنيف
  React.useEffect(() => {
    if (!buildingId) return;
    setLoading(true);
    supabase
      .from("building_images")
      .select("id, url")
      .eq("building_id", buildingId)
      .eq("type", type)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setImages(data);
        setLoading(false);
      });
  }, [buildingId, type]);

  // رفع الصور
  const handleAdd = async (files: FileList) => {
    if (!buildingId) return;
    for (const file of Array.from(files)) {
      // رفع الصورة إلى supabase storage (يفترض وجود bucket باسم 'building-images')
      const filePath = `${buildingId}/${type}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('building-images').upload(filePath, file);
      if (!uploadError) {
        // الحصول على رابط الصورة
        const { data: urlData } = supabase.storage.from('building-images').getPublicUrl(filePath);
        const url = urlData?.publicUrl;
        if (url) {
          // إضافة السجل في قاعدة البيانات
          await supabase.from('building_images').insert({ building_id: buildingId, type, url });
        }
      }
    }
    // إعادة تحميل الصور
    const { data } = await supabase
      .from("building_images")
      .select("id, url")
      .eq("building_id", buildingId)
      .eq("type", type)
      .order("created_at", { ascending: false });
    if (data) setImages(data);
  };

  // حذف الصورة
  const handleDelete = async (idx: number) => {
    const img = images[idx];
    if (!img) return;
    await supabase.from('building_images').delete().eq('id', img.id);
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-10 px-4 flex flex-col items-center">
      <button
        className="mb-6 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-gray-700 font-bold"
        onClick={() => router.back()}
      >عودة</button>
      <div className="w-full max-w-2xl">
        <h2 className="text-2xl font-bold text-pink-700 mb-6 text-center">{typeTitles[type] || "معرض الصور"}</h2>
        {loading ? (
          <div className="text-center text-gray-500 py-10">جاري تحميل الصور...</div>
        ) : (
          <ImagesGallery
            title=""
            images={images.map(img => img.url)}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onDownload={handleDownload}
          />
        )}
      </div>
    </div>
  );
}

export default function GalleryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex justify-center items-center py-24">
        <div className="animate-spin w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full" />
      </div>
    }>
      <GalleryContent />
    </Suspense>
  );
}
