"use client";
// نافذة معاينة الصور (مودال بسيط)
import React, { useState, useEffect } from "react";
import { showToast } from "./toast";
import { FaInfoCircle, FaBuilding, FaShieldAlt, FaMapMarkerAlt, FaUsers, FaTools, FaBolt, FaPhoneAlt, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { FaDoorOpen, FaDoorClosed, FaLayerGroup, FaBuilding as FaBldg } from "react-icons/fa";
import BuildingCard from "@/components/BuildingCard";
import EditableField from "@/components/EditableField";

import { createClient } from "@/lib/supabase/client";
import ImagesGallery from "../images-gallery";
import { useRouter, useSearchParams } from "next/navigation";

// تعريف أنواع البيانات
interface Building {
  id: string;
  name: string;
  plot_number: string;
  neighborhood?: string;
  address?: string;
  description?: string;
  total_floors?: number;
  total_units?: number;
  year_built?: number;
  owner?: string;
  phone?: string;
  image_urls?: string[];
  google_maps_link?: string;
  insurance_available?: boolean;
  insurance_policy_number?: string;
  building_license_number?: string;
  land_area?: string;
  owner_association?: string;
  engineering_office?: string;
  electricity_meter_number?: string;
  unitsperfloor?: number; // عدد الشقق بالدور (الاسم المتوقع في قاعدة البيانات)
  facade?: string; // واجهة العمارة
}

export default function DetailsPage() {
        const router = useRouter();
      // إضافة صور جديدة (معاينة محلية فقط حالياً)
      const [newImages, setNewImages] = useState<string[]>([]);
      const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        const previews = files.map(file => URL.createObjectURL(file));
        setNewImages(previews);
        // هنا يمكنك لاحقاً رفع الصور إلى التخزين وتحديث image_urls في قاعدة البيانات
      };
    // حالة عرض صورة مكبرة
    const [previewImg, setPreviewImg] = useState<string | null>(null);
  // Helper to get unitsPerFloor from floors if not found directly
  function getUnitsPerFloor(building: any) {
    if (building.unitsperfloor) return building.unitsperfloor;
    if (building.unitsPerFloor) return building.unitsPerFloor;
    if (building.units_per_floor) return building.units_per_floor;
    if (building.apartments_per_floor) return building.apartments_per_floor;
    // Try from floors array if exists
    if (Array.isArray(building.floors) && building.floors.length > 0) {
      if (building.floors[0].unitsPerFloor) return building.floors[0].unitsPerFloor;
      if (building.floors[0].units_per_floor) return building.floors[0].units_per_floor;
    }
    return '';
  }
      // حالة الطي لكارد معلومات المبنى
      const [buildingCardOpen, setBuildingCardOpen] = React.useState(true);
      const [basicCardOpen, setBasicCardOpen] = React.useState(true);
      const [facilitiesCardOpen, setFacilitiesCardOpen] = React.useState(true);
      const [locationCardOpen, setLocationCardOpen] = React.useState(true);
      const [associationCardOpen, setAssociationCardOpen] = React.useState(true);
      const [engineeringCardOpen, setEngineeringCardOpen] = React.useState(true);
      const [electricityCardOpen, setElectricityCardOpen] = React.useState(true);
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);

  // تعريف بيانات اتحاد الملاك خارج JSX
  // حالة بيانات اتحاد الملاك قابلة للتعديل
  const [associationData, setAssociationData] = useState({
    iban: "4564564",
    endDate: "2026-02-28",
    startDate: "2026-02-19",
    monthlyFee: 300,
    managerName: "خالد",
    accountNumber: "7867868",
    contactNumber: "565466",
    includesWater: false,
    hasAssociation: true,
    registrationNumber: "887",
    includesElectricity: true,
    registeredUnitsCount: 4,
  });

  // دوال التعديل لكل حقل
  const handleAssocChange = (key: string, value: string | number | boolean) => {
    setAssociationData(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const fetchData = async () => {
      const buildingId = searchParams.get("buildingId");
      if (!buildingId) return;
      const { data, error } = await supabase
        .from("buildings")
        .select("*")
        .eq("id", buildingId)
        .single();
      if (!error) setBuilding(data);
      setLoading(false);
    };
    fetchData();
  }, [searchParams]);

  if (loading || !building) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-lg">
        جاري تحميل بيانات المبنى...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* كارد معلومات أساسية قابل للطي */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-0 mb-8 overflow-hidden">
          {/* هيدر مع خط علوي ملون وأيقونة واسم الكارد وزر الطي */}
          <div className="relative">
            <button
              className="flex flex-col items-center w-full focus:outline-none pt-4 pb-2"
              onClick={() => setBasicCardOpen(v => !v)}
              aria-expanded={basicCardOpen}
            >
              <span className="flex items-center justify-center rounded-full h-16 w-16 bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-lg mb-2">
                <FaInfoCircle className="text-white text-3xl" />
              </span>
              <span className="text-xl font-bold text-indigo-700">معلومات أساسية</span>
              <span className="mt-2">{basicCardOpen ? <FaChevronUp className="text-indigo-400" /> : <FaChevronDown className="text-indigo-400" />}</span>
            </button>
          </div>
          {/* الحقول */}
          {basicCardOpen && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 pb-6">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaBuilding className="text-indigo-400" /> اسم المبنى
                </label>
                <input
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition text-sm"
                  type="text"
                  value={building.name}
                  readOnly
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaMapMarkerAlt className="text-indigo-400" /> رقم القطعة
                </label>
                <input
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition text-sm"
                  type="text"
                  value={building.plot_number}
                  readOnly
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaInfoCircle className="text-indigo-400" /> رقم رخصة البناء
                </label>
                <input
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition text-sm"
                  type="text"
                  value={building.building_license_number ?? '-'}
                  readOnly
                />
              </div>
              {/* رقم الصك */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaInfoCircle className="text-indigo-400" /> رقم الصك
                </label>
                <input
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition text-sm"
                  type="text"
                  value={building.deed_number ?? '-'}
                  readOnly
                />
              </div>
              {/* الحي */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaMapMarkerAlt className="text-indigo-400" /> الحي
                </label>
                <input
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition text-sm"
                  type="text"
                  value={building.neighborhood}
                  readOnly
                />
              </div>
              {/* مساحة الأرض */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaInfoCircle className="text-indigo-400" /> مساحة الأرض (م²)
                </label>
                <input
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition text-sm"
                  type="text"
                  value={building.land_area ?? '-'}
                  readOnly
                />
              </div>
            </div>
          )}
        </div>

        {/* كارد معلومات المبنى قابل للطي */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-0 mb-8 overflow-hidden">
          {/* هيدر مع خط علوي ملون وأيقونة واسم الكارد وزر الطي */}
          <div className="relative">
            <button
              className="flex flex-col items-center w-full focus:outline-none pt-4 pb-2"
              onClick={() => setBuildingCardOpen(v => !v)}
              aria-expanded={buildingCardOpen}
            >
              <span className="flex items-center justify-center rounded-full h-16 w-16 bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg mb-2">
                <FaBuilding className="text-white text-3xl" />
              </span>
              <span className="text-xl font-bold text-blue-700">معلومات المبنى</span>
              <span className="mt-2">{buildingCardOpen ? <FaChevronUp className="text-blue-400" /> : <FaChevronDown className="text-blue-400" />}</span>
            </button>
          </div>
          {/* الحقول */}
          {buildingCardOpen && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 pb-6">
              {/* عدد الأدوار */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaBuilding className="text-blue-400" /> عدد الأدوار
                </label>
                <input
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-sm"
                  type="number"
                  value={building.total_floors ?? ''}
                  readOnly
                />
              </div>
              {/* عدد الوحدات */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaBuilding className="text-blue-400" /> عدد الوحدات
                </label>
                <input
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-sm"
                  type="number"
                  value={building.total_units ?? ''}
                  readOnly
                />
              </div>
              {/* حالة البناء */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaInfoCircle className="text-blue-400" /> حالة البناء
                </label>
                <input
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-sm"
                  type="text"
                  value={building.build_status ?? '-'}
                  readOnly
                />
              </div>
              {/* عدد الشقق بالدور */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaInfoCircle className="text-blue-400" /> عدد الشقق بالدور
                </label>
                <input
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-sm"
                  type="number"
                  value={getUnitsPerFloor(building) ?? ''}
                  readOnly
                />
              </div>
              {/* عدد المواقف */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaInfoCircle className="text-blue-400" /> عدد المواقف
                </label>
                <input
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-sm"
                  type="number"
                  value={building.parking_slots ?? ''}
                  readOnly
                />
              </div>
              {/* عدد غرف السائقين */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaInfoCircle className="text-blue-400" /> عدد غرف السائقين
                </label>
                <input
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-sm"
                  type="number"
                  value={building.driver_rooms ?? ''}
                  readOnly
                />
              </div>
              {/* عدد المصاعد */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaInfoCircle className="text-blue-400" /> عدد المصاعد
                </label>
                <input
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-sm"
                  type="number"
                  value={building.elevators ?? ''}
                  readOnly
                />
              </div>
              {/* اتجاه العمارة */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaInfoCircle className="text-blue-400" /> اتجاه العمارة
                </label>
                <input
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-sm"
                  type="text"
                  value={building.building_facing ?? building.direction ?? '-'}
                  readOnly
                />
              </div>
              {/* واجهة العمارة */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaInfoCircle className="text-blue-400" /> واجهة العمارة
                </label>
                <input
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-sm"
                  type="text"
                  value={building.facade ?? building.building_facing ?? '-'}
                  readOnly
                />
              </div>
              {/* سنة البناء */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaBuilding className="text-blue-400" /> سنة البناء
                </label>
                <input
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-sm"
                  type="number"
                  value={building.year_built ?? ''}
                  readOnly
                />
              </div>
              {/* الوصف */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaBuilding className="text-blue-400" /> الوصف
                </label>
                <input
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-sm"
                  type="text"
                  value={building.description ?? ''}
                  readOnly
                />
              </div>
            </div>
          )}
        </div>

        {/* كارد المرافق والتأمين قابل للطي */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-0 mb-8 overflow-hidden">
          <div className="relative">
            <button
              className="flex flex-col items-center w-full focus:outline-none pt-4 pb-2"
              onClick={() => setFacilitiesCardOpen(v => !v)}
              aria-expanded={facilitiesCardOpen}
            >
              <span className="flex items-center justify-center rounded-full h-16 w-16 bg-gradient-to-br from-green-400 to-green-600 shadow-lg mb-2">
                <FaShieldAlt className="text-white text-3xl" />
              </span>
              <span className="text-xl font-bold text-green-700">المرافق والتأمين</span>
              <span className="mt-2">{facilitiesCardOpen ? <FaChevronUp className="text-green-400" /> : <FaChevronDown className="text-green-400" />}</span>
            </button>
          </div>
          {facilitiesCardOpen && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 pb-6">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700">يوجد تأمين</label>
                <input className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-300 transition text-sm" type="text" value={building.insurance_available ? 'نعم' : 'لا'} readOnly />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700">رقم بوليصة التأمين</label>
                <input className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-300 transition text-sm" type="text" value={building.insurance_policy_number ?? '-'} readOnly />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700">رقم عداد الكهرباء الرئيسي</label>
                <input className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-300 transition text-sm" type="text" value={building.electricity_meter_number ?? '-'} readOnly />
                <button
                  type="button"
                  className="mt-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg border border-green-300 hover:bg-green-200 transition text-sm font-semibold"
                  onClick={() => {
                    showToast('لا توجد صورة بوليصة التأمين غير متوفرة حالياً.');
                  }}
                >
                  معاينة صورة بوليصة التأمين
                </button>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700">رقم عداد المياه الرئيسي</label>
                <input className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-300 transition text-sm" type="text" value={building.water_meter_number ?? '-'} readOnly />
              </div>
            </div>
          )}
        </div>

        {/* كارد الموقع والصور قابل للطي */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-0 mb-8 overflow-hidden">
          <div className="relative">
            <button
              className="flex flex-col items-center w-full focus:outline-none pt-4 pb-2"
              onClick={() => setLocationCardOpen(v => !v)}
              aria-expanded={locationCardOpen}
            >
              <span className="flex items-center justify-center rounded-full h-16 w-16 bg-gradient-to-br from-pink-400 to-pink-600 shadow-lg mb-2">
                <FaMapMarkerAlt className="text-white text-3xl" />
              </span>
              <span className="text-xl font-bold text-pink-700">الموقع والصور</span>
              <span className="mt-2">{locationCardOpen ? <FaChevronUp className="text-pink-400" /> : <FaChevronDown className="text-pink-400" />}</span>
            </button>
          </div>
          {locationCardOpen && (
            <div className="px-6 pb-6">
              {/* تم حذف زر فتح الخريطة بناءً على طلب المستخدم */}
              {building.google_maps_link && (
                <div className="flex items-center gap-3 mb-4 justify-between">
                  <span className="text-base font-semibold text-gray-700">الموقع على الخريطة:</span>
                  <a
                    href={building.google_maps_link}
                    target="_blank"
                    rel="noopener"
                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-br from-pink-500 to-pink-700 text-white rounded-full shadow-lg hover:from-pink-600 hover:to-pink-800 transition text-sm font-bold border-0"
                    style={{ minWidth: '120px', justifyContent: 'center' }}
                  >
                    <FaMapMarkerAlt className="text-white text-lg" />
                    فتح الخريطة
                  </a>
                </div>
              )}
              <div className="flex items-start gap-6 mb-4">
                <div className="flex flex-col flex-1 mt-6 px-6">
                  <span className="text-base font-semibold text-gray-700 mb-4">معرض صور العقار</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full">
                    <button
                      className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-gradient-to-br from-pink-100 to-pink-50 text-pink-700 font-bold border border-pink-200 hover:from-pink-200 hover:to-pink-100 shadow transition group"
                      onClick={() => router.push(`/dashboard/buildings/gallery?buildingId=${building.id}&type=front`)}
                    >
                      <FaDoorClosed className="text-4xl text-pink-400 group-hover:text-pink-600 transition" />
                      <span className="mt-2">الشقة الأمامية</span>
                    </button>
                    <button
                      className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-gradient-to-br from-pink-100 to-pink-50 text-pink-700 font-bold border border-pink-200 hover:from-pink-200 hover:to-pink-100 shadow transition group"
                      onClick={() => router.push(`/dashboard/buildings/gallery?buildingId=${building.id}&type=back`)}
                    >
                      <FaDoorClosed className="text-4xl text-pink-400 group-hover:text-pink-600 transition" />
                      <span className="mt-2">الشقة الخلفية</span>
                    </button>
                    <button
                      className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-gradient-to-br from-pink-100 to-pink-50 text-pink-700 font-bold border border-pink-200 hover:from-pink-200 hover:to-pink-100 shadow transition group"
                      onClick={() => router.push(`/dashboard/buildings/gallery?buildingId=${building.id}&type=annex`)}
                    >
                      <FaDoorClosed className="text-4xl text-pink-400 group-hover:text-pink-600 transition" />
                      <span className="mt-2">الملحق</span>
                    </button>
                    <button
                      className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-gradient-to-br from-pink-100 to-pink-50 text-pink-700 font-bold border border-pink-200 hover:from-pink-200 hover:to-pink-100 shadow transition group"
                      onClick={() => router.push(`/dashboard/buildings/gallery?buildingId=${building.id}&type=building`)}
                    >
                      <FaBldg className="text-4xl text-pink-400 group-hover:text-pink-600 transition" />
                      <span className="mt-2">العمارة</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* كارد اتحاد الملاك قابل للطي */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-0 mb-8 overflow-hidden">
          <div className="relative">
            <button
              className="flex flex-col items-center w-full focus:outline-none pt-4 pb-2"
              onClick={() => setAssociationCardOpen(v => !v)}
              aria-expanded={associationCardOpen}
            >
              <span className="flex items-center justify-center rounded-full h-16 w-16 bg-gradient-to-br from-green-400 to-green-600 shadow-lg mb-2">
                <FaUsers className="text-white text-3xl" />
              </span>
              <span className="text-xl font-bold text-green-700">اتحاد الملاك</span>
              <span className="mt-2">{associationCardOpen ? <FaChevronUp className="text-green-400" /> : <FaChevronDown className="text-green-400" />}</span>
            </button>
          </div>
          {associationCardOpen && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 pb-6">
              <EditableField label="اسم مسؤول الاتحاد" value={associationData.managerName} onChange={v => handleAssocChange('managerName', v)} />
              <EditableField label="رقم تسجيل الاتحاد" value={associationData.registrationNumber} onChange={v => handleAssocChange('registrationNumber', v)} />
              <EditableField label="رقم الحساب" value={associationData.accountNumber} onChange={v => handleAssocChange('accountNumber', v)} />
              <EditableField label="رقم IBAN" value={associationData.iban} onChange={v => handleAssocChange('iban', v)} />
              <EditableField label="رقم التواصل" value={associationData.contactNumber} onChange={v => handleAssocChange('contactNumber', v)} />
              <EditableField label="عدد الوحدات المسجلة" value={associationData.registeredUnitsCount} onChange={v => handleAssocChange('registeredUnitsCount', v)} type="number" />
              <EditableField label="تاريخ البداية" value={associationData.startDate} onChange={v => handleAssocChange('startDate', v)} type="date" />
              <EditableField label="تاريخ النهاية" value={associationData.endDate} onChange={v => handleAssocChange('endDate', v)} type="date" />
              <EditableField label="الرسوم الشهرية" value={associationData.monthlyFee} onChange={v => handleAssocChange('monthlyFee', v)} type="number" />
              <div className="flex items-center gap-2 mt-2">
                <label className="text-sm font-semibold text-gray-700">يشمل الماء</label>
                <input type="checkbox" checked={associationData.includesWater} onChange={e => handleAssocChange('includesWater', e.target.checked)} />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <label className="text-sm font-semibold text-gray-700">يشمل الكهرباء</label>
                <input type="checkbox" checked={associationData.includesElectricity} onChange={e => handleAssocChange('includesElectricity', e.target.checked)} />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <label className="text-sm font-semibold text-gray-700">يوجد اتحاد</label>
                <input type="checkbox" checked={associationData.hasAssociation} onChange={e => handleAssocChange('hasAssociation', e.target.checked)} />
              </div>
            </div>
          )}
        </div>

        {/* كارد المكتب الهندسي قابل للطي */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-0 mb-8 overflow-hidden">
          <div className="relative">
            <button
              className="flex flex-col items-center w-full focus:outline-none pt-4 pb-2"
              onClick={() => setEngineeringCardOpen(v => !v)}
              aria-expanded={engineeringCardOpen}
            >
              <span className="flex items-center justify-center rounded-full h-16 w-16 bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-lg mb-2">
                <FaTools className="text-white text-3xl" />
              </span>
              <span className="text-xl font-bold text-indigo-700">المكتب الهندسي</span>
              <span className="mt-2">{engineeringCardOpen ? <FaChevronUp className="text-indigo-400" /> : <FaChevronDown className="text-indigo-400" />}</span>
            </button>
          </div>
          {engineeringCardOpen && (
            <div className="px-6 pb-6">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700">المكتب الهندسي</label>
                <input className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition text-sm" type="text" value={building.engineering_office ? building.engineering_office : 'لا توجد بيانات'} readOnly />
              </div>
            </div>
          )}
        </div>

        {/* كارد عدادات الكهرباء قابل للطي */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-0 mb-8 overflow-hidden">
          <div className="relative">
            <button
              className="flex flex-col items-center w-full focus:outline-none pt-4 pb-2"
              onClick={() => setElectricityCardOpen(v => !v)}
              aria-expanded={electricityCardOpen}
            >
              <span className="flex items-center justify-center rounded-full h-16 w-16 bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-lg mb-2">
                <FaBolt className="text-white text-3xl" />
              </span>
              <span className="text-xl font-bold text-yellow-700">عدادات الكهرباء</span>
              <span className="mt-2">{electricityCardOpen ? <FaChevronUp className="text-yellow-400" /> : <FaChevronDown className="text-yellow-400" />}</span>
            </button>
          </div>
          {electricityCardOpen && (
            <div className="px-6 pb-6">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700">رقم العداد</label>
                <input className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition text-sm" type="text" value={building.electricity_meter_number ? building.electricity_meter_number : 'لا توجد بيانات'} readOnly />
              </div>
            </div>
          )}
        </div>

        {/* كارد وحدات المبنى */}
      </div>
    </div>
  );
}
