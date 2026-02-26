"use client";

import React, { useRef, useState, useCallback } from "react";
import JSZip from "jszip";
import {
  FaTrashAlt,
  FaDownload,
  FaTimes,
  FaChevronRight,
  FaChevronLeft,
  FaCloudUploadAlt,
  FaCheckSquare,
  FaSquare,
} from "react-icons/fa";

interface GalleryProps {
  title?: string;
  images: string[];
  onAdd: (files: FileList) => void | Promise<void>;
  onDelete: (idx: number) => void | Promise<void>;
  uploading?: boolean;
  emptyMessage?: string;
}

export default function ImagesGallery({
  title,
  images,
  onAdd,
  onDelete,
  uploading = false,
  emptyMessage = "لا توجد صور بعد. اسحب الصور هنا أو انقر للرفع.",
}: GalleryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const handleAddFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      void Promise.resolve(onAdd(files)).then(() => {
        fileInputRef.current && (fileInputRef.current.value = "");
      });
    },
    [onAdd]
  );

  const handleDelete = useCallback(
    async (idx: number) => {
      if (deletingIdx !== null) return;
      setDeletingIdx(idx);
      try {
        await Promise.resolve(onDelete(idx));
      } finally {
        setDeletingIdx(null);
      }
    },
    [onDelete, deletingIdx]
  );

  const getExt = useCallback((blob: Blob): string => {
    const t = blob.type?.split("/")[1];
    if (t === "jpeg" || t === "jpg") return "jpg";
    if (t === "png" || t === "webp" || t === "gif") return t;
    return "jpg";
  }, []);

  /** تحميل صورة واحدة: حفظ باسم على الجهاز عند التوفر، وإلا تحميل عادي */
  const handleDownload = useCallback(
    async (url: string, index?: number) => {
      try {
        const res = await fetch(url, { mode: "cors" });
        if (!res.ok) {
          throw new Error(`Image fetch failed with status ${res.status}`);
        }
        const blob = await res.blob();
        const ext = getExt(blob);
        const suggestedName = `صورة_${(index ?? 0) + 1}.${ext}`;
        const win = window as Window & { showSaveFilePicker?: (opts: { suggestedName?: string; types?: { description: string; accept: Record<string, string[]> }[] }) => Promise<{ createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> }> };
        if (typeof win.showSaveFilePicker === "function") {
          const handle = await win.showSaveFilePicker({
            suggestedName,
            types: [{ description: "صورة", accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif"] } }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } else {
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = objectUrl;
          a.download = suggestedName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(objectUrl);
        }
      } catch (error) {
        const err = error as { name?: string; message?: string };
        // المستخدم أغلق نافذة "حفظ باسم" يدويًا — ليس خطأ فعليًا
        if (err?.name === "AbortError") return;
        // لا نفتح الرابط نهائيا حسب طلب المستخدم
        console.error("تعذر حفظ الصورة على الجهاز.", err?.message ?? error);
      }
    },
    [getExt]
  );

  /** تحميل الكل: حفظ باسم (Save As) عند التوفر، وإلا تحميل zip في مجلد التحميلات */
  const downloadAll = useCallback(async () => {
    if (!images.length || downloadingAll) return;
    setDownloadingAll(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < images.length; i++) {
        const url = images[i]!;
        try {
          const res = await fetch(url, { mode: "cors" });
          const blob = await res.blob();
          const ext = getExt(blob);
          zip.file(`صورة_${i + 1}.${ext}`, blob);
        } catch {
          // تخطي الصورة عند فشل الجلب
        }
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const suggestedName = "معرض_الصور.zip";

      // File System Access API: نافذة "حفظ باسم" (Chrome/Edge)
      const win = window as Window & { showSaveFilePicker?: (opts: { suggestedName?: string; types?: { description: string; accept: Record<string, string[]> }[] }) => Promise<{ createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> }> };
      if (typeof win.showSaveFilePicker === "function") {
        const handle = await win.showSaveFilePicker({
          suggestedName,
          types: [{ description: "ملف مضغوط", accept: { "application/zip": [".zip"] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(zipBlob);
        await writable.close();
      } else {
        const objectUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
      }
    } finally {
      setDownloadingAll(false);
    }
  }, [images, downloadingAll, getExt]);

  const toggleSelect = useCallback((idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(images.map((_, i) => i)));
  }, [images.length]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setSelectMode(false);
  }, []);

  const deleteSelected = useCallback(async () => {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    const indices = Array.from(selected).sort((a, b) => b - a);
    for (const idx of indices) {
      await Promise.resolve(onDelete(idx));
    }
    setSelected(new Set());
    setSelectMode(false);
    setBulkDeleting(false);
  }, [selected, onDelete]);

  const goPrev = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex(lightboxIndex <= 0 ? images.length - 1 : lightboxIndex - 1);
  };
  const goNext = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex(lightboxIndex >= images.length - 1 ? 0 : lightboxIndex + 1);
  };

  const currentUrl = lightboxIndex !== null ? images[lightboxIndex] : null;
  const hasImages = images.length > 0;

  return (
    <div className="w-full" dir="rtl">
      {title && (
        <h2 className="text-lg font-bold text-gray-800 mb-4">{title}</h2>
      )}

      {/* شريط أدوات: رفع مدمج + تحميل الكل + تحديد */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleAddFiles(e.target.files)}
        />
        <div
          className={`
            inline-flex items-center gap-2 rounded-xl border-2 border-dashed transition-all duration-200
            ${dragActive ? "border-red-400 bg-red-50/60" : "border-red-200/80 bg-red-50/30 hover:border-red-300 hover:bg-red-50/50"}
          `}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
            const files = e.dataTransfer.files;
            if (files?.length) handleAddFiles(files);
          }}
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 py-2.5 px-4 text-red-700 hover:text-red-800 font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <span className="animate-spin w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full" />
                جاري الرفع...
              </>
            ) : (
              <>
                <FaCloudUploadAlt className="text-lg" />
                رفع صور
              </>
            )}
          </button>
        </div>

        {hasImages && !selectMode && (
          <>
            <button
              type="button"
              onClick={() => void downloadAll()}
              disabled={downloadingAll}
              className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-white border border-red-200/80 text-red-700 hover:bg-red-50 font-semibold text-sm transition shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              title="حفظ باسم — اختيار مكان واسم الملف (أو تحميل ملف zip)"
            >
              {downloadingAll ? (
                <>
                  <span className="animate-spin w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <FaDownload className="text-sm" />
                  تحميل الكل
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSelectMode(true)}
              className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-white border border-red-200/80 text-red-700 hover:bg-red-50 font-semibold text-sm transition shadow-sm"
              title="تحديد صور للحذف"
            >
              <FaCheckSquare className="text-sm" />
              تحديد
            </button>
          </>
        )}

        {selectMode && (
          <>
            <span className="text-sm text-gray-600 font-medium py-2">
              {selected.size > 0 ? `محدد ${selected.size}` : "اختر الصور"}
            </span>
            {selected.size > 0 && (
              <button
                type="button"
                onClick={selectAll}
                className="inline-flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium"
              >
                تحديد الكل
              </button>
            )}
            <button
              type="button"
              onClick={deleteSelected}
              disabled={selected.size === 0 || bulkDeleting}
              className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-red-500 text-white hover:bg-red-600 font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {bulkDeleting ? (
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <FaTrashAlt className="text-sm" />
              )}
              حذف المحدد {selected.size > 0 ? `(${selected.size})` : ""}
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold text-sm transition"
            >
              إلغاء التحديد
            </button>
          </>
        )}
      </div>

      {/* حالة فارغة: صندوق مدمج مع زر رفع */}
      {!hasImages && !uploading && (
        <div className="rounded-xl bg-white/80 border border-red-100 py-10 px-6 text-center">
          <FaCloudUploadAlt className="text-4xl text-red-300 mx-auto mb-3 opacity-80" />
          <p className="text-red-800 font-medium text-sm">{emptyMessage}</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 px-5 py-2.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition text-sm shadow-lg shadow-red-500/20"
          >
            رفع أول صورة
          </button>
        </div>
      )}

      {/* شبكة الصور */}
      {hasImages && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((url, idx) => (
            <div
              key={idx}
              className={`group relative aspect-square rounded-2xl overflow-hidden border bg-gray-100 shadow-md hover:shadow-xl hover:shadow-red-900/10 transition-all duration-300 ${
                selectMode ? (selected.has(idx) ? "ring-2 ring-red-500 ring-offset-2 border-red-300" : "border-red-100") : "border-red-100"
              }`}
            >
              {selectMode && (
                <button
                  type="button"
                  onClick={() => toggleSelect(idx)}
                  className="absolute top-2 right-2 z-20 w-8 h-8 rounded-lg bg-white/95 shadow flex items-center justify-center text-red-600 hover:bg-red-50 transition"
                  aria-label={selected.has(idx) ? "إلغاء التحديد" : "تحديد"}
                >
                  {selected.has(idx) ? <FaCheckSquare className="text-lg" /> : <FaSquare className="text-lg text-gray-400" />}
                </button>
              )}
              <img
                src={url}
                alt={`صورة ${idx + 1}`}
                className={`w-full h-full object-cover transition-transform duration-300 cursor-pointer ${!selectMode ? "group-hover:scale-110" : ""}`}
                onClick={() => {
                  if (selectMode) toggleSelect(idx);
                  else setLightboxIndex(idx);
                }}
              />
              {!selectMode && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 pointer-events-none">
                  <div className="flex items-center justify-center gap-2 flex-wrap pointer-events-auto">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); void handleDownload(url, idx); }}
                      className="w-10 h-10 rounded-xl bg-white/90 text-gray-800 hover:bg-white flex items-center justify-center shadow-lg transition"
                      title="حفظ الصورة على الجهاز"
                    >
                      <FaDownload className="text-sm" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(idx); }}
                      disabled={deletingIdx === idx}
                      className="w-10 h-10 rounded-xl bg-red-500/90 text-white hover:bg-red-600 flex items-center justify-center shadow-lg transition disabled:opacity-50"
                      title="حذف"
                    >
                      {deletingIdx === idx ? (
                        <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <FaTrashAlt className="text-sm" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* لايت بوكس */}
      {currentUrl && lightboxIndex !== null && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col" dir="ltr">
          <div className="flex items-center justify-between p-4 bg-black/40">
            <span className="text-white font-medium">
              {lightboxIndex + 1} / {images.length}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => lightboxIndex !== null && void handleDownload(currentUrl, lightboxIndex)} className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition" title="حفظ الصورة على الجهاز">
                <FaDownload />
              </button>
              <button type="button" onClick={() => setLightboxIndex(null)} className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition" aria-label="إغلاق">
                <FaTimes className="text-xl" />
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center relative min-h-0 p-4">
            <button type="button" onClick={goPrev} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition z-10" aria-label="السابق">
              <FaChevronRight className="text-xl" />
            </button>
            <img src={currentUrl} alt="معاينة" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl select-none" onClick={(e) => e.stopPropagation()} draggable={false} />
            <button type="button" onClick={goNext} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition z-10" aria-label="التالي">
              <FaChevronLeft className="text-xl" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
