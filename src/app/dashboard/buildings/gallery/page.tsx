"use client";

import { useRouter, useSearchParams } from "next/navigation";
import ImagesGallery from "../images-gallery";
import { createClient } from "@/lib/supabase/client";
import React, { useState, Suspense, useEffect } from "react";
import { showToast } from "../details/toast";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FaMapMarkerAlt, FaDoorClosed, FaBuilding, FaHome } from "react-icons/fa";

const typeMeta: Record<
  string,
  { title: string; icon: React.ComponentType<{ className?: string }> }
> = {
  front: { title: "الشقة الأمامية", icon: FaDoorClosed },
  back: { title: "الشقة الخلفية", icon: FaDoorClosed },
  annex: { title: "الملحق", icon: FaHome },
  building: { title: "العمارة", icon: FaBuilding },
};

function GalleryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "building";
  const buildingId = searchParams.get("buildingId") || "";
  const supabase = createClient();

  const [images, setImages] = useState<{ id: number; url: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [buildingName, setBuildingName] = useState<string>("");

  useEffect(() => {
    if (!buildingId) return;
    supabase
      .from("buildings")
      .select("name")
      .eq("id", buildingId)
      .single()
      .then(({ data }) => {
        if (data?.name) setBuildingName(data.name);
      });
  }, [buildingId]);

  useEffect(() => {
    if (!buildingId) return;
    setLoading(true);
    const load = async () => {
      const { data: rows, error } = await supabase
        .from("building_images")
        .select("id, url")
        .eq("building_id", buildingId)
        .eq("type", type)
        .order("created_at", { ascending: false });
      if (error) {
        setLoading(false);
        return;
      }
      if (!rows?.length) {
        setImages([]);
        setLoading(false);
        return;
      }
      // إذا كان url مساراً (بدون http) نستخدم روابط موقع موقعة لعرض الصور (يعمل مع الـ bucket الخاص)
      const withDisplayUrls = await Promise.all(
        rows.map(async (row) => {
          const url = row.url ?? "";
          if (url.startsWith("http://") || url.startsWith("https://")) {
            return { id: row.id, url };
          }
          const { data: signed } = await supabase.storage
            .from("building-images")
            .createSignedUrl(url, 3600);
          return { id: row.id, url: signed?.signedUrl ?? url };
        })
      );
      setImages(withDisplayUrls);
      setLoading(false);
    };
    load();
  }, [buildingId, type]);

  const handleAdd = async (files: FileList) => {
    if (!buildingId) return;
    setUploading(true);
    let added = 0;
    let uploadOrInsertFailed = false;
    try {
      for (const file of Array.from(files)) {
        const filePath = `${buildingId}/${type}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("building-images")
          .upload(filePath, file);
        if (uploadError) {
          uploadOrInsertFailed = true;
          continue;
        }
        // تخزين المسار فقط لتمكين استخدام الروابط الموقعة لاحقاً (يعمل مع الـ bucket العام والخاص)
        const { error: insertError } = await supabase
          .from("building_images")
          .insert({ building_id: buildingId, type, url: filePath });
        if (insertError) {
          uploadOrInsertFailed = true;
          continue;
        }
        added++;
      }
      // إعادة جلب القائمة مع تحويل المسارات إلى روابط عرض (موقع موقعة أو عامة)
      const { data: rows, error } = await supabase
        .from("building_images")
        .select("id, url")
        .eq("building_id", buildingId)
        .eq("type", type)
        .order("created_at", { ascending: false });
      if (!error && rows?.length) {
        const withDisplayUrls = await Promise.all(
          rows.map(async (row) => {
            const url = row.url ?? "";
            if (url.startsWith("http://") || url.startsWith("https://")) {
              return { id: row.id, url };
            }
            const { data: signed } = await supabase.storage
              .from("building-images")
              .createSignedUrl(url, 3600);
            return { id: row.id, url: signed?.signedUrl ?? url };
          })
        );
        setImages(withDisplayUrls);
      }
      if (added > 0) showToast("تم رفع الصور بنجاح", "success");
      else if (uploadOrInsertFailed) showToast("فشل رفع الصور. تحقق من الصلاحيات والتخزين.", "error");
    } catch {
      showToast("فشل رفع بعض الصور", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (idx: number) => {
    const img = images[idx];
    if (!img) return;
    const { error } = await supabase
      .from("building_images")
      .delete()
      .eq("id", img.id);
    if (!error) {
      setImages((prev) => prev.filter((_, i) => i !== idx));
      showToast("تم حذف الصورة", "success");
    } else {
      showToast("فشل حذف الصورة", "error");
    }
  };

  const handleDownload = (url: string) => {
    window.open(url, "_blank");
  };

  const handleShareCopy = () => {
    showToast("تم نسخ الرابط", "success");
  };

  const currentMeta = typeMeta[type] || typeMeta.building;
  const IconComponent = currentMeta.icon;

  if (!buildingId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-red-50/30 flex items-center justify-center p-6" dir="rtl">
        <div className="text-center">
          <p className="text-gray-600 font-medium mb-4">لم يتم تحديد مبنى.</p>
          <Link
            href="/dashboard/buildings"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition"
          >
            العودة للعمارات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-red-50/30 p-4 sm:p-6 lg:p-8"
      dir="rtl"
    >
      <div className="max-w-6xl mx-auto">
        {/* هيدر: رجوع + اسم المبنى + تبويبات النوع */}
        <header className="rounded-2xl border border-red-200/60 shadow-xl shadow-red-900/5 bg-gradient-to-b from-white to-red-50/30 overflow-hidden mb-8">
          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Link
                  href={`/dashboard/buildings/details?buildingId=${buildingId}#card-location`}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/90 border border-red-200/70 text-red-700 hover:bg-red-50 hover:border-red-300 transition shadow-sm"
                  title="رجوع لتفاصيل المبنى — كارد الموقع والصور"
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/25 flex-shrink-0">
                  <FaMapMarkerAlt className="text-white text-xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-800 truncate">
                    معرض الصور — {buildingName || "المبنى"}
                  </h1>
                  <p className="text-sm text-red-700/80 mt-0.5">
                    رفع ومعاينة وتحميل صور العقار
                  </p>
                </div>
              </div>
            </div>

            {/* تبويبات نوع المعرض */}
            <div className="flex flex-wrap gap-2 mt-6">
              {(Object.keys(typeMeta) as Array<keyof typeof typeMeta>).map(
                (key) => {
                  const meta = typeMeta[key];
                  const Icon = meta.icon;
                  const isActive = type === key;
                  return (
                    <Link
                      key={key}
                      href={`/dashboard/buildings/gallery?buildingId=${buildingId}&type=${key}`}
                      className={`
                        inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition
                        ${
                          isActive
                            ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
                            : "bg-white/90 border border-red-200/70 text-red-700 hover:bg-red-50 hover:border-red-300"
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      {meta.title}
                    </Link>
                  );
                }
              )}
            </div>
          </div>
        </header>

        {/* عنوان القسم الحالي */}
        <div className="flex items-center gap-2 mb-6">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-100 text-red-600">
            <IconComponent className="w-5 h-5" />
          </span>
          <h2 className="text-lg font-bold text-gray-800">
            {currentMeta.title}
          </h2>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-red-200/60 bg-white/80 p-12 flex flex-col items-center justify-center gap-4">
            <span className="animate-spin w-12 h-12 border-2 border-red-400 border-t-transparent rounded-full" />
            <p className="text-red-700 font-medium">جاري تحميل الصور...</p>
          </div>
        ) : (
          <ImagesGallery
            images={images.map((img) => img.url)}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onDownload={handleDownload}
            onShareCopy={handleShareCopy}
            uploading={uploading}
            emptyMessage={`لا توجد صور في «${currentMeta.title}» بعد. اسحب الصور هنا أو انقر للرفع.`}
          />
        )}
      </div>
    </div>
  );
}

export default function GalleryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-red-50/30 flex justify-center items-center" dir="rtl">
          <span className="animate-spin w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <GalleryContent />
    </Suspense>
  );
}
