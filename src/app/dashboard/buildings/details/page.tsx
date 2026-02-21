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
  street_type?: string; // واجهة العمارة (شارع/شارعين)
  building_facing?: string; // اتجاه العمارة
  deed_number?: string;
  build_status?: string;
  parking_slots?: string;
  driver_rooms?: string;
  elevators?: string;
  water_meter_number?: string;
}

export default function DetailsPage() {
                          // حالة التعديل لكارد الموقع والصور
                          const [isEditingLocationCard, setIsEditingLocationCard] = useState(false);
                        // حالة التعديل لكارد اتحاد الملاك
                        const [isEditingAssociationCard, setIsEditingAssociationCard] = useState(false);
                        const [associationEdit, setAssociationEdit] = useState({
                          managerName: '',
                          registrationNumber: '',
                          accountNumber: '',
                          iban: '',
                          contactNumber: '',
                          registeredUnitsCount: 0,
                          startDate: '',
                          endDate: '',
                          monthlyFee: 0,
                          isAssociationActive: false,
                          includesWater: false,
                          includesElectricity: false,
                          hasAssociation: false,
                        });
            // حالة التعديل لكارد معلومات أساسية
            const [isEditingBasicCard, setIsEditingBasicCard] = useState(false);
            // حالة التعديل لكارد معلومات المبنى
            const [isEditingBuildingCard, setIsEditingBuildingCard] = useState(false);
            const [buildingEdit, setBuildingEdit] = useState({
              total_floors: '',
              total_units: '',
              build_status: '',
              unitsperfloor: '',
              parking_slots: '',
              driver_rooms: '',
              street_type: '',
              building_facing: '',
              elevators: '',
              year_built: '',
              description: '',
            });
            // حالة التعديل لكارد المرافق والتأمين
            const [isEditingFacilitiesCard, setIsEditingFacilitiesCard] = useState(false);
            const [facilitiesEdit, setFacilitiesEdit] = useState({
              insurance_available: '',
              insurance_policy_number: '',
              electricity_meter_number: '',
              water_meter_number: ''
            });
            const [basicEdit, setBasicEdit] = useState({
              name: '',
              plot_number: '',
              building_license_number: '',
              deed_number: '',
              neighborhood: '',
              land_area: '',
            });
          // حالة حقل إضافة الموقع
          const [newMapLink, setNewMapLink] = useState("");
          const [savingMapLink, setSavingMapLink] = useState(false);
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
      // منطق أكورديون: كارد واحد فقط مفتوح
      // القيم: 'basic', 'building', 'facilities', 'location', 'association', 'engineering', 'electricity', أو null
      const [openCard, setOpenCard] = React.useState<string | null>(null);
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
      if (!error) {
        // تحديث تلقائي إذا لم يوجد unitsperfloor
        if (!data.unitsperfloor) {
          let inferred = '';
          if (Array.isArray(data.floors) && data.floors.length > 0) {
            if (data.floors[0].unitsPerFloor) inferred = data.floors[0].unitsPerFloor;
            else if (data.floors[0].units_per_floor) inferred = data.floors[0].units_per_floor;
          }
          if (inferred) {
            await supabase.from("buildings").update({ unitsperfloor: inferred }).eq("id", buildingId);
            setBuilding({ ...data, unitsperfloor: inferred });
          } else {
            setBuilding(data);
          }
        } else {
          setBuilding(data);
        }
        // Parse owner_association JSON and set associationEdit state
        if (data.owner_association) {
          let assocObj = {};
          try {
            assocObj = typeof data.owner_association === 'string' ? JSON.parse(data.owner_association) : data.owner_association;
          } catch (e) {
            assocObj = {};
          }
          setAssociationEdit({
            ...associationEdit,
            ...assocObj
          });
        }
      }
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
          <div className="relative flex items-center justify-between">
            <button
              className="flex flex-col items-center w-full focus:outline-none pt-4 pb-2"
              onClick={() => setOpenCard(openCard === 'basic' ? null : 'basic')}
              aria-expanded={openCard === 'basic'}
            >
              <span className="flex items-center justify-center rounded-full h-16 w-16 bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-lg mb-2">
                <FaInfoCircle className="text-white text-3xl" />
              </span>
              <span className="text-xl font-bold text-indigo-700">معلومات أساسية</span>
              <span className="mt-2">{openCard === 'basic' ? <FaChevronUp className="text-indigo-400" /> : <FaChevronDown className="text-indigo-400" />}</span>
            </button>
            <button
              className="absolute left-4 top-4 text-indigo-500 hover:text-indigo-700 bg-indigo-50 rounded-full p-2 shadow"
              title={isEditingBasicCard ? "إلغاء" : "تعديل"}
              onClick={() => {
                if (!isEditingBasicCard && building) {
                  setBasicEdit({
                    name: building.name ?? '',
                    plot_number: building.plot_number ?? '',
                    building_license_number: building.building_license_number ?? '',
                    deed_number: building.deed_number ?? '',
                    neighborhood: building.neighborhood ?? '',
                    land_area: building.land_area ?? '',
                  });
                }
                setIsEditingBasicCard(v => !v);
              }}
            >
              {isEditingBasicCard ? <FaChevronUp /> : <FaTools />}
            </button>
          </div>
          {openCard === 'basic' && building && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 pb-6">
              {/* اسم المبنى */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaBuilding className="text-indigo-400" /> اسم المبنى
                </label>
                {isEditingBasicCard ? (
                  <input
                    className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition text-sm"
                    type="text"
                    value={basicEdit.name}
                    onChange={e => setBasicEdit({ ...basicEdit, name: e.target.value })}
                  />
                ) : (
                  <input
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition text-sm"
                    type="text"
                    value={building.name ?? ''}
                    readOnly
                  />
                )}
              </div>
              {/* رقم القطعة */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaMapMarkerAlt className="text-indigo-400" /> رقم القطعة
                </label>
                {isEditingBasicCard ? (
                  <input
                    className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition text-sm"
                    type="text"
                    value={basicEdit.plot_number}
                    onChange={e => setBasicEdit({ ...basicEdit, plot_number: e.target.value })}
                  />
                ) : (
                  <input
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition text-sm"
                    type="text"
                    value={building.plot_number ?? ''}
                    readOnly
                  />
                )}
              
              </div>
              {/* رقم رخصة البناء */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaInfoCircle className="text-indigo-400" /> رقم رخصة البناء
                </label>
                {isEditingBasicCard ? (
                  <input
                    className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition text-sm"
                    type="text"
                    value={basicEdit.building_license_number}
                    onChange={e => setBasicEdit({ ...basicEdit, building_license_number: e.target.value })}
                  />
                ) : (
                  <input
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition text-sm"
                    type="text"
                    value={building.building_license_number ?? ''}
                    readOnly
                  />
                )}
              </div>
              {/* رقم الصك */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaInfoCircle className="text-indigo-400" /> رقم الصك
                </label>
                {isEditingBasicCard ? (
                  <input
                    className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition text-sm"
                    type="text"
                    value={basicEdit.deed_number}
                    onChange={e => setBasicEdit({ ...basicEdit, deed_number: e.target.value })}
                  />
                ) : (
                  <input
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition text-sm"
                    type="text"
                    value={building.deed_number ?? ''}
                    readOnly
                  />
                )}
              </div>
              {/* الحي */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaMapMarkerAlt className="text-indigo-400" /> الحي
                </label>
                {isEditingBasicCard ? (
                  <input
                    className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition text-sm"
                    type="text"
                    value={basicEdit.neighborhood}
                    onChange={e => setBasicEdit({ ...basicEdit, neighborhood: e.target.value })}
                  />
                ) : (
                  <input
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition text-sm"
                    type="text"
                    value={building.neighborhood ?? ''}
                    readOnly
                  />
                )}
              </div>
              {/* مساحة الأرض */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaInfoCircle className="text-indigo-400" /> مساحة الأرض (م²)
                </label>
                {isEditingBasicCard ? (
                  <input
                    className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition text-sm"
                    type="text"
                    value={basicEdit.land_area}
                    onChange={e => setBasicEdit({ ...basicEdit, land_area: e.target.value })}
                  />
                ) : (
                  <input
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition text-sm"
                    type="text"
                    value={building.land_area ?? ''}
                    readOnly
                  />
                )}
              </div>
              {/* أزرار الحفظ والإلغاء */}
              {isEditingBasicCard && (
                <div className="col-span-2 flex gap-4 mt-4">
                  <button
                    className="px-5 py-2 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-full shadow-lg hover:from-indigo-600 hover:to-indigo-800 transition text-sm font-bold border-0"
                    onClick={async () => {
                      // حفظ التعديلات في قاعدة البيانات
                      const { error } = await supabase
                        .from('buildings')
                        .update({
                          name: basicEdit.name,
                          plot_number: basicEdit.plot_number,
                          building_license_number: basicEdit.building_license_number,
                          deed_number: basicEdit.deed_number,
                          neighborhood: basicEdit.neighborhood,
                          land_area: basicEdit.land_area,
                        })
                        .eq('id', building.id);
                      if (!error) {
                        setBuilding({ ...building, ...basicEdit });
                        setIsEditingBasicCard(false);
                        showToast('تم حفظ التعديلات بنجاح');
                      } else {
                        showToast('حدث خطأ أثناء الحفظ');
                      }
                    }}
                  >حفظ</button>
                  <button
                    className="px-5 py-2 bg-gray-200 text-gray-700 rounded-full border border-gray-300 hover:bg-gray-300 transition text-sm font-bold"
                    onClick={() => setIsEditingBasicCard(false)}
                  >إلغاء</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* كارد معلومات المبنى قابل للطي */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-0 mb-8 overflow-hidden">
          <div className="relative">
                                    {/* زر التعديل لكارد الموقع والصور */}
            <button
              className="flex flex-col items-center w-full focus:outline-none pt-4 pb-2"
              onClick={() => setOpenCard(openCard === 'building' ? null : 'building')}
              aria-expanded={openCard === 'building'}
            >
              <span className="flex items-center justify-center rounded-full h-16 w-16 bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg mb-2">
                <FaBuilding className="text-white text-3xl" />
              </span>
              <span className="text-xl font-bold text-blue-700">معلومات المبنى</span>
              <span className="mt-2">{openCard === 'building' ? <FaChevronUp className="text-blue-400" /> : <FaChevronDown className="text-blue-400" />}</span>
            </button>
            <button
              className="absolute top-4 left-4 bg-blue-100 text-blue-700 rounded-full p-2 border border-blue-300 hover:bg-blue-200 transition"
              onClick={() => setIsEditingBuildingCard(v => !v)}
              title={isEditingBuildingCard ? 'إغلاق التعديل' : 'تعديل معلومات المبنى'}
            >
              <FaTools />
            </button>
          </div>
          {openCard === 'building' && building && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 pb-6">
              {/* عدد الأدوار */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaBuilding className="text-blue-400" /> عدد الأدوار
                </label>
                {isEditingBuildingCard ? (
                  <input
                    className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-sm"
                    type="number"
                    value={buildingEdit.total_floors}
                    onChange={e => setBuildingEdit({ ...buildingEdit, total_floors: e.target.value })}
                  />
                ) : (
                  <input
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-sm"
                    type="number"
                    value={building.total_floors ?? ''}
                    readOnly
                  />
                )}
              </div>
              {/* عدد الوحدات */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaBuilding className="text-blue-400" /> عدد الوحدات
                </label>
                {isEditingBuildingCard ? (
                  <input
                    className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-sm"
                    type="number"
                    value={buildingEdit.total_units}
                    onChange={e => setBuildingEdit({ ...buildingEdit, total_units: e.target.value })}
                  />
                ) : (
                  <input
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-sm"
                    type="number"
                    value={building.total_units ?? ''}
                    readOnly
                  />
                )}
              </div>
              {/* حالة البناء */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaInfoCircle className="text-blue-400" /> حالة البناء
                </label>
                {isEditingBuildingCard ? (
                  <select
                    className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-sm"
                    value={buildingEdit.build_status}
                    onChange={e => setBuildingEdit({ ...buildingEdit, build_status: e.target.value })}
                  >
                    <option value="">اختر حالة البناء</option>
                    <option value="ready">جاهز</option>
                    <option value="under_construction">تحت الإنشاء</option>
                    <option value="finishing">تشطيب</option>
                    <option value="new_project">أرض مشروع جديد</option>
                    <option value="old">قديم</option>
                  </select>
                ) : (
                  <input
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-sm"
                    type="text"
                    value={(() => {
                      const val = building.build_status;
                      if (val === 'ready') return 'جاهز';
                      if (val === 'under_construction') return 'تحت الإنشاء';
                      if (val === 'finishing') return 'تشطيب';
                      if (val === 'new_project') return 'أرض مشروع جديد';
                      if (val === 'old') return 'قديم';
                      return val || '';
                    })()}
                    readOnly
                  />
                )}
              </div>
              {/* عدد الشقق بالدور */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaInfoCircle className="text-blue-400" /> عدد الشقق بالدور
                </label>
                {isEditingBuildingCard ? (
                  <input
                    className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-sm"
                    type="number"
                    value={buildingEdit.unitsperfloor}
                    onChange={e => setBuildingEdit({ ...buildingEdit, unitsperfloor: e.target.value })}
                  />
                ) : (
                  <input
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-sm"
                    type="number"
                    value={building.unitsperfloor || ''}
                    readOnly
                  />
                )}
              </div>
              {/* عدد المواقف */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaInfoCircle className="text-blue-400" /> عدد المواقف
                </label>
                {isEditingBuildingCard ? (
                  <input
                    className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-sm"
                    type="number"
                    value={buildingEdit.parking_slots}
                    onChange={e => setBuildingEdit({ ...buildingEdit, parking_slots: e.target.value })}
                  />
                ) : (
                  <input
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-sm"
                    type="number"
                    value={building.parking_slots ?? ''}
                    readOnly
                  />
                )}
              </div>
              {/* عدد غرف السائقين */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaInfoCircle className="text-blue-400" /> عدد غرف السائقين
                </label>
                {isEditingBuildingCard ? (
                  <input
                    className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-sm"
                    type="number"
                    value={buildingEdit.driver_rooms}
                    onChange={e => setBuildingEdit({ ...buildingEdit, driver_rooms: e.target.value })}
                  />
                ) : (
                  <input
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-sm"
                    type="number"
                    value={building.driver_rooms ?? ''}
                    readOnly
                  />
                )}
              </div>
              {/* واجهة العمارة */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaInfoCircle className="text-blue-400" /> واجهة العمارة
                </label>
                {isEditingBuildingCard ? (
                  <select
                    className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-sm"
                    value={buildingEdit.street_type}
                    onChange={e => setBuildingEdit({ ...buildingEdit, street_type: e.target.value })}
                  >
                    <option value="">اختر واجهة العمارة</option>
                    <option value="one">شارع واحد</option>
                    <option value="two">شارعين</option>
                  </select>
                ) : (
                  <input
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-sm"
                    type="text"
                    value={(() => {
                      const val = building.street_type;
                      if (val === 'one') return 'شارع واحد';
                      if (val === 'two') return 'شارعين';
                      return val || '';
                    })()}
                    readOnly
                  />
                )}
              </div>
              {/* اتجاه العمارة */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaInfoCircle className="text-blue-400" /> اتجاه العمارة
                </label>
                {isEditingBuildingCard ? (
                  <select
                    className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-sm"
                    value={buildingEdit.building_facing}
                    onChange={e => setBuildingEdit({ ...buildingEdit, building_facing: e.target.value })}
                  >
                    <option value="">اختر اتجاه العمارة</option>
                    <option value="north">شمال</option>
                    <option value="south">جنوب</option>
                    <option value="east">شرق</option>
                    <option value="west">غرب</option>
                    <option value="northeast">شمال شرق</option>
                    <option value="northwest">شمال غرب</option>
                    <option value="southeast">جنوب شرق</option>
                    <option value="southwest">جنوب غرب</option>
                  </select>
                ) : (
                  <input
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-sm"
                    type="text"
                    value={(() => {
                      const val = building.building_facing;
                      if (val === 'north') return 'شمال';
                      if (val === 'south') return 'جنوب';
                      if (val === 'east') return 'شرق';
                      if (val === 'west') return 'غرب';
                      if (val === 'northeast') return 'شمال شرق';
                      if (val === 'northwest') return 'شمال غرب';
                      if (val === 'southeast') return 'جنوب شرق';
                      if (val === 'southwest') return 'جنوب غرب';
                      return val || '';
                    })()}
                    readOnly
                  />
                )}
              </div>
              {/* عدد المصاعد */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaInfoCircle className="text-blue-400" /> عدد المصاعد
                </label>
                {isEditingBuildingCard ? (
                  <input
                    className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-sm"
                    type="number"
                    value={buildingEdit.elevators}
                    onChange={e => setBuildingEdit({ ...buildingEdit, elevators: e.target.value })}
                  />
                ) : (
                  <input
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-sm"
                    type="number"
                    value={building.elevators ?? ''}
                    readOnly
                  />
                )}
              </div>
              {/* سنة البناء */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaBuilding className="text-blue-400" /> سنة البناء
                </label>
                {isEditingBuildingCard ? (
                  <input
                    className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-sm"
                    type="number"
                    value={buildingEdit.year_built}
                    onChange={e => setBuildingEdit({ ...buildingEdit, year_built: e.target.value })}
                  />
                ) : (
                  <input
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-sm"
                    type="number"
                    value={building.year_built ?? ''}
                    readOnly
                  />
                )}
              </div>
              {/* الوصف */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FaBuilding className="text-blue-400" /> الوصف
                </label>
                {isEditingBuildingCard ? (
                  <input
                    className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-sm"
                    type="text"
                    value={buildingEdit.description}
                    onChange={e => setBuildingEdit({ ...buildingEdit, description: e.target.value })}
                  />
                ) : (
                  <input
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-sm"
                    type="text"
                    value={building.description ?? ''}
                    readOnly
                  />
                )}
              </div>
              {/* أزرار الحفظ والإلغاء */}
              {isEditingBuildingCard && (
                <div className="col-span-2 flex gap-4 mt-4">
                  <button
                    className="px-5 py-2 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-full shadow-lg hover:from-blue-600 hover:to-blue-800 transition text-sm font-bold border-0"
                    onClick={async () => {
                      // حفظ التعديلات في قاعدة البيانات
                      const { error } = await supabase
                        .from('buildings')
                        .update({
                          total_floors: Number(buildingEdit.total_floors),
                          total_units: Number(buildingEdit.total_units),
                          build_status: buildingEdit.build_status,
                          unitsperfloor: Number(buildingEdit.unitsperfloor),
                          parking_slots: Number(buildingEdit.parking_slots),
                          driver_rooms: Number(buildingEdit.driver_rooms),
                          street_type: buildingEdit.street_type,
                          building_facing: buildingEdit.building_facing,
                          elevators: Number(buildingEdit.elevators),
                          year_built: Number(buildingEdit.year_built),
                          description: buildingEdit.description,
                        })
                        .eq('id', building.id);
                      if (!error) {
                        setBuilding({
                          ...building,
                          total_floors: Number(buildingEdit.total_floors),
                          total_units: Number(buildingEdit.total_units),
                          build_status: buildingEdit.build_status,
                          unitsperfloor: Number(buildingEdit.unitsperfloor),
                          parking_slots: buildingEdit.parking_slots,
                          driver_rooms: buildingEdit.driver_rooms,
                          street_type: buildingEdit.street_type,
                          building_facing: buildingEdit.building_facing,
                          elevators: buildingEdit.elevators,
                          year_built: Number(buildingEdit.year_built),
                          description: buildingEdit.description,
                        });
                        setIsEditingBuildingCard(false);
                        showToast('تم حفظ التعديلات بنجاح');
                      } else {
                        showToast('حدث خطأ أثناء الحفظ');
                      }
                    }}
                  >حفظ</button>
                  <button
                    className="px-5 py-2 bg-gray-200 text-gray-700 rounded-full border border-gray-300 hover:bg-gray-300 transition text-sm font-bold"
                    onClick={() => setIsEditingBuildingCard(false)}
                  >إلغاء</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* كارد المرافق والتأمين قابل للطي */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-0 mb-8 overflow-hidden">
          <div className="relative">
            <button
              className="flex flex-col items-center w-full focus:outline-none pt-4 pb-2"
              onClick={() => setOpenCard(openCard === 'facilities' ? null : 'facilities')}
              aria-expanded={openCard === 'facilities'}
            >
              <span className="flex items-center justify-center rounded-full h-16 w-16 bg-gradient-to-br from-green-400 to-green-600 shadow-lg mb-2">
                <FaShieldAlt className="text-white text-3xl" />
              </span>
              <span className="text-xl font-bold text-green-700">المرافق والتأمين</span>
              <span className="mt-2">{openCard === 'facilities' ? <FaChevronUp className="text-green-400" /> : <FaChevronDown className="text-green-400" />}</span>
            </button>
            <button
              className="absolute top-4 left-4 bg-green-100 text-green-700 rounded-full p-2 border border-green-300 hover:bg-green-200 transition"
              onClick={() => setIsEditingFacilitiesCard(v => !v)}
              title={isEditingFacilitiesCard ? 'إغلاق التعديل' : 'تعديل المرافق والتأمين'}
            >
              <FaTools />
            </button>

          </div>
          {openCard === 'facilities' && building && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 pb-6">
              {/* يوجد تأمين */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700">يوجد تأمين</label>
                {isEditingFacilitiesCard ? (
                  <select
                    className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 transition text-sm"
                    value={facilitiesEdit.insurance_available}
                    onChange={e => setFacilitiesEdit({ ...facilitiesEdit, insurance_available: e.target.value })}
                  >
                    <option value="">اختر</option>
                    <option value="true">نعم</option>
                    <option value="false">لا</option>
                  </select>
                ) : (
                  <input className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-300 transition text-sm" type="text" value={building.insurance_available ? 'نعم' : 'لا'} readOnly />
                )}
              </div>
              {/* رقم بوليصة التأمين */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700">رقم بوليصة التأمين</label>
                {isEditingFacilitiesCard ? (
                  <input
                    className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 transition text-sm"
                    type="text"
                    value={facilitiesEdit.insurance_policy_number}
                    onChange={e => setFacilitiesEdit({ ...facilitiesEdit, insurance_policy_number: e.target.value })}
                  />
                ) : (
                  <input className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-300 transition text-sm" type="text" value={building.insurance_policy_number ?? ''} readOnly />
                )}
              </div>
              {/* رقم عداد الكهرباء الرئيسي */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700">رقم عداد الكهرباء الرئيسي</label>
                {isEditingFacilitiesCard ? (
                  <input
                    className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 transition text-sm"
                    type="text"
                    value={facilitiesEdit.electricity_meter_number}
                    onChange={e => setFacilitiesEdit({ ...facilitiesEdit, electricity_meter_number: e.target.value })}
                  />
                ) : (
                  <input className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-300 transition text-sm" type="text" value={building.electricity_meter_number ?? ''} readOnly />
                )}
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
              {/* رقم عداد المياه الرئيسي */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700">رقم عداد المياه الرئيسي</label>
                {isEditingFacilitiesCard ? (
                  <input
                    className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 transition text-sm"
                    type="text"
                    value={facilitiesEdit.water_meter_number}
                    onChange={e => setFacilitiesEdit({ ...facilitiesEdit, water_meter_number: e.target.value })}
                  />
                ) : (
                  <input className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-300 transition text-sm" type="text" value={building.water_meter_number ?? ''} readOnly />
                )}
              </div>
              {/* أزرار الحفظ والإلغاء */}
              {isEditingFacilitiesCard && (
                <div className="col-span-2 flex gap-4 mt-4">
                  <button
                    className="px-5 py-2 bg-gradient-to-br from-green-500 to-green-700 text-white rounded-full shadow-lg hover:from-green-600 hover:to-green-800 transition text-sm font-bold border-0"
                    onClick={async () => {
                      const { error } = await supabase
                        .from('buildings')
                        .update({
                          insurance_available: facilitiesEdit.insurance_available === 'true',
                          insurance_policy_number: facilitiesEdit.insurance_policy_number,
                          electricity_meter_number: facilitiesEdit.electricity_meter_number,
                          water_meter_number: facilitiesEdit.water_meter_number,
                        })
                        .eq('id', building.id);
                      if (!error) {
                        setBuilding({
                          ...building,
                          insurance_available: facilitiesEdit.insurance_available === 'true',
                          insurance_policy_number: facilitiesEdit.insurance_policy_number,
                          electricity_meter_number: facilitiesEdit.electricity_meter_number,
                          water_meter_number: facilitiesEdit.water_meter_number,
                        });
                        setIsEditingFacilitiesCard(false);
                        showToast('تم حفظ التعديلات بنجاح');
                      } else {
                        showToast('حدث خطأ أثناء الحفظ');
                      }
                    }}
                  >حفظ</button>
                  <button
                    className="px-5 py-2 bg-gray-200 text-gray-700 rounded-full border border-gray-300 hover:bg-gray-300 transition text-sm font-bold"
                    onClick={() => setIsEditingFacilitiesCard(false)}
                  >إلغاء</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* كارد الموقع والصور قابل للطي */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-0 mb-8 overflow-hidden">
          <div className="relative">
            <button
              className="flex flex-col items-center w-full focus:outline-none pt-4 pb-2"
              onClick={() => setOpenCard(openCard === 'location' ? null : 'location')}
              aria-expanded={openCard === 'location'}
            >
              <span className="flex items-center justify-center rounded-full h-16 w-16 bg-gradient-to-br from-pink-400 to-pink-600 shadow-lg mb-2">
                <FaMapMarkerAlt className="text-white text-3xl" />
              </span>
              <span className="text-xl font-bold text-pink-700">الموقع والصور</span>
              <span className="mt-2">{openCard === 'location' ? <FaChevronUp className="text-pink-400" /> : <FaChevronDown className="text-pink-400" />}</span>
            </button>
          </div>
          {openCard === 'location' && building && (
            <div className="px-6 pb-6">
              {/* تم حذف زر فتح الخريطة بناءً على طلب المستخدم */}
              {building.google_maps_link ? (
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
              ) : (
                <div className="flex flex-col gap-2 mb-4">
                  <span className="text-base font-semibold text-gray-700">لم يتم إضافة موقع على الخريطة بعد</span>
                  <input
                    type="text"
                    className="rounded-lg border border-pink-300 bg-pink-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-300 transition text-sm"
                    placeholder="أدخل رابط الموقع على الخريطة..."
                    value={newMapLink}
                    onChange={e => setNewMapLink(e.target.value)}
                    disabled={savingMapLink}
                  />
                  <button
                    className="px-5 py-2 bg-gradient-to-br from-pink-500 to-pink-700 text-white rounded-full shadow-lg hover:from-pink-600 hover:to-pink-800 transition text-sm font-bold border-0 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ minWidth: '120px', justifyContent: 'center' }}
                    onClick={async () => {
                      if (!newMapLink) return;
                      setSavingMapLink(true);
                      try {
                        const { error } = await supabase
                          .from('buildings')
                          .update({ google_maps_link: newMapLink })
                          .eq('id', building.id);
                        if (error) throw error;
                        setBuilding({ ...building, google_maps_link: newMapLink });
                        setNewMapLink("");
                        showToast("تمت إضافة الموقع بنجاح");
                      } catch (err) {
                        showToast("حدث خطأ أثناء الحفظ");
                      } finally {
                        setSavingMapLink(false);
                      }
                    }}
                    disabled={savingMapLink || !newMapLink}
                  >
                    {savingMapLink ? "...جاري الحفظ" : "إضافة الموقع"}
                  </button>
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
              onClick={() => setOpenCard(openCard === 'association' ? null : 'association')}
              aria-expanded={openCard === 'association'}
            >
              <span className="flex items-center justify-center rounded-full h-16 w-16 bg-gradient-to-br from-green-400 to-green-600 shadow-lg mb-2">
                <FaUsers className="text-white text-3xl" />
              </span>
              <span className="text-xl font-bold text-green-700">اتحاد الملاك</span>
              <span className="mt-2">{openCard === 'association' ? <FaChevronUp className="text-green-400" /> : <FaChevronDown className="text-green-400" />}</span>
            </button>
            <button
              className="absolute top-4 left-4 bg-green-100 text-green-700 rounded-full p-2 border border-green-300 hover:bg-green-200 transition"
              onClick={() => setIsEditingAssociationCard(v => !v)}
              title={isEditingAssociationCard ? 'إغلاق التعديل' : 'تعديل اتحاد الملاك'}
            >
              <FaTools />
            </button>
            {/* Toggle switch for activating/deactivating owner association */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">تفعيل الاتحاد</span>
              <div
                className={`relative w-14 h-7 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full transition-colors ${associationEdit.isAssociationActive ? 'bg-amber-600' : 'bg-gray-200'}`}
                style={{cursor:'pointer'}}
                onClick={() => setAssociationEdit({ ...associationEdit, isAssociationActive: !associationEdit.isAssociationActive })}
              >
                <div className="absolute top-0.5 right-0.5 bg-white border border-gray-300 rounded-full h-6 w-6 transition-transform" style={{transform: associationEdit.isAssociationActive ? 'translateX(-28px)' : 'translateX(0)'}}></div>
              </div>
            </div>
          </div>
          {openCard === 'association' && building && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 pb-6">
              <EditableField label="اسم مسؤول الاتحاد" value={associationEdit.managerName} onChange={v => setAssociationEdit({ ...associationEdit, managerName: v })} disabled={!isEditingAssociationCard} inputClassName={isEditingAssociationCard ? 'bg-green-100 text-green-700 border-green-300 focus:bg-green-200 focus:ring-green-400' : ''} />
              <EditableField label="رقم تسجيل الاتحاد" value={associationEdit.registrationNumber} onChange={v => setAssociationEdit({ ...associationEdit, registrationNumber: v })} disabled={!isEditingAssociationCard} inputClassName={isEditingAssociationCard ? 'bg-green-100 text-green-700 border-green-300 focus:bg-green-200 focus:ring-green-400' : ''} />
              <EditableField label="رقم الحساب" value={associationEdit.accountNumber} onChange={v => setAssociationEdit({ ...associationEdit, accountNumber: v })} disabled={!isEditingAssociationCard} inputClassName={isEditingAssociationCard ? 'bg-green-100 text-green-700 border-green-300 focus:bg-green-200 focus:ring-green-400' : ''} />
              <EditableField label="رقم IBAN" value={associationEdit.iban} onChange={v => setAssociationEdit({ ...associationEdit, iban: v })} disabled={!isEditingAssociationCard} inputClassName={isEditingAssociationCard ? 'bg-green-100 text-green-700 border-green-300 focus:bg-green-200 focus:ring-green-400' : ''} />
              <EditableField label="رقم التواصل" value={associationEdit.contactNumber} onChange={v => setAssociationEdit({ ...associationEdit, contactNumber: v })} disabled={!isEditingAssociationCard} inputClassName={isEditingAssociationCard ? 'bg-green-100 text-green-700 border-green-300 focus:bg-green-200 focus:ring-green-400' : ''} />
              <EditableField label="عدد الوحدات المسجلة" value={associationEdit.registeredUnitsCount} onChange={v => setAssociationEdit({ ...associationEdit, registeredUnitsCount: Number(v) })} type="number" disabled={!isEditingAssociationCard} inputClassName={isEditingAssociationCard ? 'bg-green-100 text-green-700 border-green-300 focus:bg-green-200 focus:ring-green-400' : ''} />
              <EditableField label="تاريخ البداية" value={associationEdit.startDate} onChange={v => setAssociationEdit({ ...associationEdit, startDate: v })} type="date" disabled={!isEditingAssociationCard} inputClassName={isEditingAssociationCard ? 'bg-green-100 text-green-700 border-green-300 focus:bg-green-200 focus:ring-green-400' : ''} />
              <EditableField label="تاريخ النهاية" value={associationEdit.endDate} onChange={v => setAssociationEdit({ ...associationEdit, endDate: v })} type="date" disabled={!isEditingAssociationCard} inputClassName={isEditingAssociationCard ? 'bg-green-100 text-green-700 border-green-300 focus:bg-green-200 focus:ring-green-400' : ''} />
              <EditableField label="الرسوم الشهرية" value={associationEdit.monthlyFee} onChange={v => setAssociationEdit({ ...associationEdit, monthlyFee: Number(v) })} type="number" disabled={!isEditingAssociationCard} inputClassName={isEditingAssociationCard ? 'bg-green-100 text-green-700 border-green-300 focus:bg-green-200 focus:ring-green-400' : ''} />
              <div className="flex items-center gap-4 mt-2">
                <label className="text-sm font-semibold text-gray-700">يشمل الماء</label>
                <div
                  className={`relative w-14 h-7 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full transition-colors ${associationEdit.includesWater ? 'bg-amber-600' : 'bg-gray-200'}`}
                  style={{cursor:'pointer'}}
                  onClick={() => setAssociationEdit({ ...associationEdit, includesWater: !associationEdit.includesWater })}
                >
                  <div className="absolute top-0.5 right-0.5 bg-white border border-gray-300 rounded-full h-6 w-6 transition-transform" style={{transform: associationEdit.includesWater ? 'translateX(-28px)' : 'translateX(0)'}}></div>
                </div>
                <label className="text-sm font-semibold text-gray-700">يشمل الكهرباء</label>
                <div
                  className={`relative w-14 h-7 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full transition-colors ${associationEdit.includesElectricity ? 'bg-amber-600' : 'bg-gray-200'}`}
                  style={{cursor:'pointer'}}
                  onClick={() => setAssociationEdit({ ...associationEdit, includesElectricity: !associationEdit.includesElectricity })}
                >
                  <div className="absolute top-0.5 right-0.5 bg-white border border-gray-300 rounded-full h-6 w-6 transition-transform" style={{transform: associationEdit.includesElectricity ? 'translateX(-28px)' : 'translateX(0)'}}></div>
                </div>
              </div>

              {isEditingAssociationCard && (
                <div className="col-span-2 flex gap-4 mt-4">
                  <button
                    className="px-5 py-2 bg-gradient-to-br from-green-500 to-green-700 text-white rounded-full shadow-lg hover:from-green-600 hover:to-green-800 transition text-sm font-bold border-0"
                    onClick={async () => {
                      const { error } = await supabase
                        .from('buildings')
                        .update({ owner_association: JSON.stringify(associationEdit) })
                        .eq('id', building.id);
                      if (!error) {
                        setBuilding({ ...building, owner_association: JSON.stringify(associationEdit) });
                        setIsEditingAssociationCard(false);
                        showToast('تم حفظ التعديلات بنجاح');
                      } else {
                        showToast('حدث خطأ أثناء الحفظ');
                      }
                    }}
                  >حفظ</button>
                  <button
                    className="px-5 py-2 bg-gray-200 text-gray-700 rounded-full border border-gray-300 hover:bg-gray-300 transition text-sm font-bold"
                    onClick={() => setIsEditingAssociationCard(false)}
                  >إلغاء</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* كارد المكتب الهندسي قابل للطي */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-0 mb-8 overflow-hidden">
          <div className="relative">
            <button
              className="flex flex-col items-center w-full focus:outline-none pt-4 pb-2"
              onClick={() => setOpenCard(openCard === 'engineering' ? null : 'engineering')}
              aria-expanded={openCard === 'engineering'}
            >
              <span className="flex items-center justify-center rounded-full h-16 w-16 bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-lg mb-2">
                <FaTools className="text-white text-3xl" />
              </span>
              <span className="text-xl font-bold text-indigo-700">المكتب الهندسي</span>
              <span className="mt-2">{openCard === 'engineering' ? <FaChevronUp className="text-indigo-400" /> : <FaChevronDown className="text-indigo-400" />}</span>
            </button>
          </div>
          {openCard === 'engineering' && building && (
            <div className="px-6 pb-6 flex flex-wrap gap-4 justify-center items-center">
              <button
                className="px-5 py-2 bg-gradient-to-br from-indigo-400 to-indigo-600 text-white rounded-full shadow-lg hover:from-indigo-500 hover:to-indigo-700 transition text-sm font-bold border-0"
                onClick={() => router.push('/building-deeds')}
              >
                صكوك المبنى
              </button>
              <button className="px-5 py-2 bg-gradient-to-br from-indigo-400 to-indigo-600 text-white rounded-full shadow-lg hover:from-indigo-500 hover:to-indigo-700 transition text-sm font-bold border-0">
                محاضر الفرز
              </button>
              <button className="px-5 py-2 bg-gradient-to-br from-indigo-400 to-indigo-600 text-white rounded-full shadow-lg hover:from-indigo-500 hover:to-indigo-700 transition text-sm font-bold border-0">
                الخرائط الهندسيه
              </button>
              <button className="px-5 py-2 bg-gradient-to-br from-indigo-400 to-indigo-600 text-white rounded-full shadow-lg hover:from-indigo-500 hover:to-indigo-700 transition text-sm font-bold border-0">
                مستندات المبنى
              </button>
            </div>
          )}
        </div>

        {/* كارد عدادات الكهرباء قابل للطي */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-0 mb-8 overflow-hidden">
          <div className="relative">
            <button
              className="flex flex-col items-center w-full focus:outline-none pt-4 pb-2"
              onClick={() => setOpenCard(openCard === 'electricity' ? null : 'electricity')}
              aria-expanded={openCard === 'electricity'}
            >
              <span className="flex items-center justify-center rounded-full h-16 w-16 bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-lg mb-2">
                <FaBolt className="text-white text-3xl" />
              </span>
              <span className="text-xl font-bold text-yellow-700">عدادات الكهرباء</span>
              <span className="mt-2">{openCard === 'electricity' ? <FaChevronUp className="text-yellow-400" /> : <FaChevronDown className="text-yellow-400" />}</span>
            </button>
          </div>
          {openCard === 'electricity' && building && (
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
