"use client";
import React, { useRef, useState } from "react";

interface GalleryProps {
  title: string;
  images: string[];
  onAdd: (files: FileList) => void;
  onDelete: (idx: number) => void;
  onDownload: (url: string) => void;
}

export default function ImagesGallery({ title, images, onAdd, onDelete, onDownload }: GalleryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          onClick={() => fileInputRef.current?.click()}
        >
          إضافة صور
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => e.target.files && onAdd(e.target.files)}
        />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {images.map((url, idx) => (
          <div key={idx} className="relative flex-shrink-0">
            <img
              src={url}
              alt="صورة"
              className="w-36 h-36 rounded-xl object-cover border border-gray-200 shadow-sm cursor-pointer hover:scale-105 transition"
              onClick={() => setPreviewImg(url)}
            />
            <div className="absolute top-2 left-2 flex gap-1">
              <button
                className="bg-white/80 hover:bg-white text-gray-700 rounded-full p-1 shadow text-xs"
                onClick={() => onDownload(url)}
                title="تحميل"
              >
                ⬇️
              </button>
              <button
                className="bg-white/80 hover:bg-white text-red-600 rounded-full p-1 shadow text-xs"
                onClick={() => onDelete(idx)}
                title="حذف"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
      {previewImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setPreviewImg(null)}
        >
          <div className="relative max-w-full max-h-full p-2" onClick={e => e.stopPropagation()}>
            <img
              src={previewImg}
              alt="معاينة صورة"
              className="max-w-[90vw] max-h-[80vh] rounded-2xl shadow-2xl border-4 border-white"
            />
            <button
              className="absolute top-2 left-2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-2 shadow-lg text-xl font-bold"
              onClick={() => setPreviewImg(null)}
              aria-label="إغلاق"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
