"use client";
// نافذة معاينة الصور (مودال بسيط)
import React, { useState, useEffect, Suspense } from "react";
import { showToast } from "./toast";
import { FaInfoCircle, FaBuilding, FaShieldAlt, FaMapMarkerAlt, FaUsers, FaTools, FaBolt, FaPhoneAlt, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { FaDoorOpen, FaDoorClosed, FaLayerGroup, FaBuilding as FaBldg, FaUserShield } from "react-icons/fa";
import BuildingCard from "@/components/BuildingCard";

import { createClient } from "@/lib/supabase/client";
import ImagesGallery from "../images-gallery";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown, LayoutDashboard, ArrowRight, Building2, Pencil, X, Check } from "lucide-react";

// تعريف أنواع البيانات
interface Building {
  id: string;
  name: string;
  owner_name?: string | null;
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
  guard_name?: string | null;
  guard_phone?: string | null;
  guard_room_number?: string | null;
  guard_id_photo?: string | null;
  guard_shift?: string | null;
  guard_has_salary?: boolean;
  guard_salary_amount?: number | string | null;
}

function DetailsContent() {
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
  const [isEditingGuardCard, setIsEditingGuardCard] = useState(false);
            const [facilitiesEdit, setFacilitiesEdit] = useState({
              insurance_available: '',
              insurance_policy_number: '',
              electricity_meter_number: '',
              water_meter_number: ''
            });
            const [basicEdit, setBasicEdit] = useState({
              name: '',
              owner_name: '',
              plot_number: '',
              building_license_number: '',
              deed_number: '',
              neighborhood: '',
              land_area: '',
            });
          // حالة حقل إضافة الموقع
          const [newMapLink, setNewMapLink] = useState("");
          const [savingMapLink, setSavingMapLink] = useState(false);
          const [isEditingMapLink, setIsEditingMapLink] = useState(false);
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
  const [quickAccessOpen, setQuickAccessOpen] = useState(false);
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<Array<{ id: string; unit_number: string; floor: number | string; electricity_meter_number?: string | null }>>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [editingMeter, setEditingMeter] = useState<string | null>(null);
  const [meterDraft, setMeterDraft] = useState("");
  const [guardIdPreview, setGuardIdPreview] = useState<string | null>(null);
  const [savingGuardPhoto, setSavingGuardPhoto] = useState(false);
  const [guardEdit, setGuardEdit] = useState({
    guard_name: '',
    guard_phone: '',
    guard_room_number: '',
    guard_shift: '',
    guard_has_salary: false,
    guard_salary_amount: '' as string | number,
  });

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
          let assocObj: Record<string, unknown> = {};
          try {
            assocObj = typeof data.owner_association === 'string' ? JSON.parse(data.owner_association) : data.owner_association;
          } catch (e) {
            assocObj = {};
          }
          const hasAssociation = (assocObj.hasAssociation ?? assocObj.isAssociationActive ?? false) as boolean;
          setAssociationEdit({
            ...associationEdit,
            managerName: (assocObj.managerName ?? '') as string,
            registrationNumber: (assocObj.registrationNumber ?? '') as string,
            accountNumber: (assocObj.accountNumber ?? '') as string,
            iban: (assocObj.iban ?? '') as string,
            contactNumber: (assocObj.contactNumber ?? '') as string,
            registeredUnitsCount: Number(assocObj.registeredUnitsCount) || 0,
            startDate: (assocObj.startDate ?? '') as string,
            endDate: (assocObj.endDate ?? '') as string,
            monthlyFee: Number(assocObj.monthlyFee) || 0,
            isAssociationActive: !!assocObj.isAssociationActive,
            includesWater: !!assocObj.includesWater,
            includesElectricity: !!assocObj.includesElectricity,
            hasAssociation,
          });
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [searchParams]);

  // فتح كارد اتحاد الملاك عند القدوم من رابط يحتوي على #card-association (مثل تنبيهات اللوحة)
  useEffect(() => {
    if (typeof window === 'undefined' || !building?.id) return;
    if (window.location.hash === '#card-association') {
      setOpenCard('association');
      setTimeout(() => document.getElementById('card-association')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }
  }, [building?.id]);

  // جلب وحدات المبنى عند فتح كارد عدادات الكهرباء
  useEffect(() => {
    if (!building?.id || openCard !== "electricity") return;
    setUnitsLoading(true);
    supabase
      .from("units")
      .select("id, unit_number, floor, electricity_meter_number")
      .eq("building_id", building.id)
      .order("floor", { ascending: true })
      .order("unit_number", { ascending: true })
      .then(({ data, error }) => {
        setUnitsLoading(false);
        if (!error && data) {
          const sorted = [...data].sort((a, b) => {
            const fA = Number(a.floor) ?? 0;
            const fB = Number(b.floor) ?? 0;
            if (fA !== fB) return fA - fB;
            const uA = Number(a.unit_number) || 0;
            const uB = Number(b.unit_number) || 0;
            return uA - uB;
          });
          setUnits(sorted);
        } else setUnits([]);
      });
  }, [building?.id, openCard]);

  // مزامنة حقل رابط الخريطة عند فتح كارد الموقع
  useEffect(() => {
    if (openCard === 'location' && building) {
      setNewMapLink(building.google_maps_link || '');
      setIsEditingMapLink(false);
    }
  }, [openCard, building?.id, building?.google_maps_link]);

  // مزامنة بيانات الحارس للتعديل
  useEffect(() => {
    if (building && openCard === 'guard') {
      setGuardEdit({
        guard_name: building.guard_name ?? '',
        guard_phone: building.guard_phone ?? '',
        guard_room_number: building.guard_room_number ?? '',
        guard_shift: building.guard_shift ?? '',
        guard_has_salary: !!building.guard_has_salary,
        guard_salary_amount: building.guard_salary_amount ?? '',
      });
    }
  }, [building?.id, openCard, building?.guard_name, building?.guard_phone, building?.guard_room_number, building?.guard_shift, building?.guard_has_salary, building?.guard_salary_amount]);

  // مزامنة حقول تعديل معلومات المبنى (بما فيها حالة البناء) من بيانات المبنى المحملة
  useEffect(() => {
    if (building && openCard === 'building') {
      setBuildingEdit({
        total_floors: building.total_floors != null ? String(building.total_floors) : '',
        total_units: building.total_units != null ? String(building.total_units) : '',
        build_status: building.build_status ?? '',
        unitsperfloor: building.unitsperfloor != null ? String(building.unitsperfloor) : '',
        parking_slots: building.parking_slots != null ? String(building.parking_slots) : '',
        driver_rooms: building.driver_rooms != null ? String(building.driver_rooms) : '',
        street_type: building.street_type ?? '',
        building_facing: building.building_facing ?? '',
        elevators: building.elevators != null ? String(building.elevators) : '',
        year_built: building.year_built != null ? String(building.year_built) : '',
        description: building.description ?? '',
      });
    }
  }, [building?.id, openCard, building?.total_floors, building?.total_units, building?.build_status, building?.unitsperfloor, building?.parking_slots, building?.driver_rooms, building?.street_type, building?.building_facing, building?.elevators, building?.year_built, building?.description]);

  const saveUnitMeter = async (unitId: string, value: string) => {
    const v = value.trim() || null;
    const { error } = await supabase
      .from("units")
      .update({ electricity_meter_number: v, updated_at: new Date().toISOString() })
      .eq("id", unitId);
    if (!error) {
      setUnits(prev => prev.map(u => u.id === unitId ? { ...u, electricity_meter_number: v } : u));
      setEditingMeter(null);
      setMeterDraft("");
      showToast("تم حفظ رقم العداد بنجاح");
    } else showToast("فشل حفظ رقم العداد");
  };

  const saveGuardPhoto = async (dataUrl: string) => {
    if (!building?.id) return;
    setSavingGuardPhoto(true);
    try {
      const { error } = await supabase
        .from("buildings")
        .update({ guard_id_photo: dataUrl, updated_at: new Date().toISOString() })
        .eq("id", building.id);
      if (error) throw error;
      setBuilding({ ...building, guard_id_photo: dataUrl });
      showToast("تم حفظ صورة الهوية بنجاح");
    } catch {
      showToast("فشل حفظ صورة الهوية");
    } finally {
      setSavingGuardPhoto(false);
    }
  };

  if (loading || !building) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-lg">
        جاري تحميل بيانات المبنى...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      {/* شريط علوي */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto order-2 sm:order-1">
            <Link
              href="/dashboard/buildings"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition text-sm font-medium"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              رجوع
            </Link>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-50 border border-teal-100 min-w-0 flex-1 sm:flex-initial">
              <Building2 className="w-5 h-5 text-teal-600 flex-shrink-0" />
              <span className="font-bold text-teal-800 truncate">
                {building?.name || "تفاصيل المبنى"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2 justify-between sm:justify-end">
            <div className="relative">
              <button
                onClick={() => setQuickAccessOpen((v) => !v)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition text-sm font-semibold"
              >
                الوصول السريع
                <ChevronDown className={`w-4 h-4 transition-transform ${quickAccessOpen ? "rotate-180" : ""}`} />
              </button>
              {quickAccessOpen && (
                <>
                  <div className="fixed inset-0 z-40 cursor-pointer" onClick={() => setQuickAccessOpen(false)} aria-hidden="true" />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50" dir="rtl">
                    {[
                      { id: "card-basic", key: "basic", label: "معلومات أساسية", icon: FaInfoCircle },
                      { id: "card-building", key: "building", label: "معلومات المبنى", icon: FaBuilding },
                      { id: "card-facilities", key: "facilities", label: "المرافق والتأمين", icon: FaShieldAlt },
                      { id: "card-guard", key: "guard", label: "بيانات الحارس", icon: FaUserShield },
                      { id: "card-location", key: "location", label: "الموقع والصور", icon: FaMapMarkerAlt },
                      { id: "card-association", key: "association", label: "اتحاد الملاك", icon: FaUsers },
                      { id: "card-engineering", key: "engineering", label: "المكتب الهندسي", icon: FaTools },
                      { id: "card-electricity", key: "electricity", label: "عدادات الكهرباء", icon: FaBolt },
                    ].map(({ id, key, label, icon: Icon }) => (
                      <button
                        key={key}
                        type="button"
                        className="flex items-center gap-2 px-4 py-2.5 text-slate-700 hover:bg-slate-50 transition text-sm w-full text-right"
                        onClick={() => {
                          setOpenCard(key);
                          setQuickAccessOpen(false);
                          // تأخير التمرير بعد توسيع الكارد
                          setTimeout(() => {
                            document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }, 120);
                        }}
                      >
                        <Icon className="w-4 h-4 text-teal-500" />
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition text-sm font-semibold shadow-sm"
            >
              <LayoutDashboard className="w-4 h-4" />
              لوحة التحكم
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* كارد معلومات أساسية قابل للطي */}
        <div id="card-basic" className="rounded-2xl mb-8 overflow-hidden border border-indigo-200/60 shadow-xl shadow-indigo-900/5 bg-gradient-to-b from-white to-indigo-50/30">
          <div className="relative flex items-center justify-between">
            <button
              type="button"
              className="flex flex-col items-center w-full focus:outline-none pt-5 pb-3 cursor-pointer select-none hover:opacity-95 transition-opacity"
              onClick={() => setOpenCard(openCard === 'basic' ? null : 'basic')}
              aria-expanded={openCard === 'basic'}
            >
              <span className="flex items-center justify-center rounded-full h-16 w-16 bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-lg shadow-indigo-500/25 mb-2 ring-4 ring-indigo-100">
                <FaInfoCircle className="text-white text-3xl" />
              </span>
              <span className="text-xl font-bold bg-gradient-to-l from-indigo-700 to-indigo-600 bg-clip-text text-transparent">معلومات أساسية</span>
              <span className="mt-2 text-indigo-500">{openCard === 'basic' ? <FaChevronUp className="text-indigo-500" /> : <FaChevronDown className="text-indigo-500" />}</span>
            </button>
            {openCard === 'basic' && (
              <button
                className="absolute left-4 top-4 text-indigo-500 hover:text-indigo-700 bg-indigo-50 rounded-full p-2 shadow"
                title={isEditingBasicCard ? "إلغاء" : "تعديل"}
                onClick={() => {
                  if (!isEditingBasicCard && building) {
                    setBasicEdit({
                      name: building.name ?? '',
                      owner_name: building.owner_name ?? '',
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
            )}
          </div>
          {openCard === 'basic' && building && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-5 pb-5">
              {/* اسم المبنى */}
              <div className="rounded-xl bg-white/90 border border-indigo-100 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">اسم المبنى</p>
                {isEditingBasicCard ? (
                  <input
                    className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-indigo-500 rounded-none"
                    type="text"
                    value={basicEdit.name ?? ''}
                    onChange={e => setBasicEdit({ ...basicEdit, name: e.target.value })}
                  />
                ) : (
                  <p className="text-gray-800 font-medium">{building.name ?? '—'}</p>
                )}
              </div>
              {/* اسم المالك */}
              <div className="rounded-xl bg-white/90 border border-indigo-100 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">اسم المالك</p>
                {isEditingBasicCard ? (
                  <input
                    className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-indigo-500 rounded-none"
                    type="text"
                    value={basicEdit.owner_name ?? ''}
                    onChange={e => setBasicEdit({ ...basicEdit, owner_name: e.target.value })}
                  />
                ) : (
                  <p className="text-gray-800 font-medium">{building.owner_name ?? '—'}</p>
                )}
              </div>
              {/* رقم القطعة */}
              <div className="rounded-xl bg-white/90 border border-indigo-100 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">رقم القطعة</p>
                {isEditingBasicCard ? (
                  <input
                    className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-indigo-500 rounded-none"
                    type="text"
                    value={basicEdit.plot_number ?? ''}
                    onChange={e => setBasicEdit({ ...basicEdit, plot_number: e.target.value })}
                  />
                ) : (
                  <p className="text-gray-800 font-medium">{building.plot_number ?? '—'}</p>
                )}
              </div>
              {/* رقم رخصة البناء */}
              <div className="rounded-xl bg-white/90 border border-indigo-100 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">رقم رخصة البناء</p>
                {isEditingBasicCard ? (
                  <input
                    className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-indigo-500 rounded-none"
                    type="text"
                    value={basicEdit.building_license_number ?? ''}
                    onChange={e => setBasicEdit({ ...basicEdit, building_license_number: e.target.value })}
                  />
                ) : (
                  <p className="text-gray-800 font-medium">{building.building_license_number ?? '—'}</p>
                )}
              </div>
              {/* رقم الصك */}
              <div className="rounded-xl bg-white/90 border border-indigo-100 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">رقم الصك</p>
                {isEditingBasicCard ? (
                  <input
                    className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-indigo-500 rounded-none"
                    type="text"
                    value={basicEdit.deed_number}
                    onChange={e => setBasicEdit({ ...basicEdit, deed_number: e.target.value })}
                  />
                ) : (
                  <p className="text-gray-800 font-medium">{building.deed_number ?? '—'}</p>
                )}
              </div>
              {/* الحي */}
              <div className="rounded-xl bg-white/90 border border-indigo-100 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">الحي</p>
                {isEditingBasicCard ? (
                  <input
                    className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-indigo-500 rounded-none"
                    type="text"
                    value={basicEdit.neighborhood ?? ''}
                    onChange={e => setBasicEdit({ ...basicEdit, neighborhood: e.target.value })}
                  />
                ) : (
                  <p className="text-gray-800 font-medium">{building.neighborhood ?? '—'}</p>
                )}
              </div>
              {/* مساحة الأرض */}
              <div className="rounded-xl bg-white/90 border border-indigo-100 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">مساحة الأرض (م²)</p>
                {isEditingBasicCard ? (
                  <input
                    className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-indigo-500 rounded-none"
                    type="text"
                    value={basicEdit.land_area ?? ''}
                    onChange={e => setBasicEdit({ ...basicEdit, land_area: e.target.value })}
                  />
                ) : (
                  <p className="text-gray-800 font-medium">{building.land_area ?? '—'}</p>
                )}
              </div>
              {/* أزرار الحفظ والإلغاء */}
              {isEditingBasicCard && (
                <div className="col-span-2 flex gap-4 mt-2">
                  <button
                    className="px-5 py-2 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-full shadow-lg hover:from-indigo-600 hover:to-indigo-800 transition text-sm font-bold border-0"
                    onClick={async () => {
                      const { error } = await supabase
                        .from('buildings')
                        .update({
                          name: basicEdit.name,
                          owner_name: basicEdit.owner_name || null,
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
        <div id="card-building" className="rounded-2xl mb-8 overflow-hidden border border-blue-200/60 shadow-xl shadow-blue-900/5 bg-gradient-to-b from-white to-blue-50/30">
          <div className="relative">
            <button
              type="button"
              className="flex flex-col items-center w-full focus:outline-none pt-5 pb-3 cursor-pointer select-none hover:opacity-95 transition-opacity"
              onClick={() => setOpenCard(openCard === 'building' ? null : 'building')}
              aria-expanded={openCard === 'building'}
            >
              <span className="flex items-center justify-center rounded-full h-16 w-16 bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/25 mb-2 ring-4 ring-blue-100">
                <FaBuilding className="text-white text-3xl" />
              </span>
              <span className="text-xl font-bold bg-gradient-to-l from-blue-700 to-blue-600 bg-clip-text text-transparent">معلومات المبنى</span>
              <span className="mt-2 text-blue-500">{openCard === 'building' ? <FaChevronUp className="text-blue-500" /> : <FaChevronDown className="text-blue-500" />}</span>
            </button>
            {openCard === 'building' && (
              <button
                className="absolute top-4 left-4 bg-blue-100 text-blue-700 rounded-full p-2 border border-blue-300 hover:bg-blue-200 transition"
                onClick={() => setIsEditingBuildingCard(v => !v)}
                title={isEditingBuildingCard ? 'إغلاق التعديل' : 'تعديل معلومات المبنى'}
              >
                <FaTools />
              </button>
            )}
          </div>
          {openCard === 'building' && building && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-5 pb-5">
              <div className="rounded-xl bg-white/90 border border-blue-100 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">عدد الأدوار</p>
                {isEditingBuildingCard ? (
                  <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-blue-500 rounded-none" type="number" value={buildingEdit.total_floors ?? ''} onChange={e => setBuildingEdit({ ...buildingEdit, total_floors: e.target.value })} />
                ) : (
                  <p className="text-gray-800 font-medium">{building.total_floors ?? '—'}</p>
                )}
              </div>
              <div className="rounded-xl bg-white/90 border border-blue-100 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">عدد الوحدات</p>
                {isEditingBuildingCard ? (
                  <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-blue-500 rounded-none" type="number" value={buildingEdit.total_units ?? ''} onChange={e => setBuildingEdit({ ...buildingEdit, total_units: e.target.value })} />
                ) : (
                  <p className="text-gray-800 font-medium">{building.total_units ?? '—'}</p>
                )}
              </div>
              <div className="rounded-xl bg-white/90 border border-blue-100 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">حالة البناء</p>
                {isEditingBuildingCard ? (
                  <select className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-blue-500 rounded-none" value={buildingEdit.build_status ?? ''} onChange={e => setBuildingEdit({ ...buildingEdit, build_status: e.target.value })}>
                    <option value="">اختر حالة البناء</option>
                    <option value="ready">جاهز</option>
                    <option value="under_construction">تحت الإنشاء</option>
                    <option value="finishing">تشطيب</option>
                    <option value="new_project">أرض مشروع جديد</option>
                    <option value="old">قديم</option>
                  </select>
                ) : (
                  <p className="text-gray-800 font-medium">
                    {(() => {
                      const s = building.build_status;
                      if (!s) return '—';
                      if (s === 'ready') return 'جاهز';
                      if (s === 'under_construction') return 'تحت الإنشاء';
                      if (s === 'finishing') return 'تشطيب';
                      if (s === 'new_project') return 'أرض مشروع جديد';
                      if (s === 'old') return 'قديم';
                      return s;
                    })()}
                  </p>
                )}
              </div>
              <div className="rounded-xl bg-white/90 border border-blue-100 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">عدد الشقق بالدور</p>
                {isEditingBuildingCard ? (
                  <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-blue-500 rounded-none" type="number" value={buildingEdit.unitsperfloor ?? ''} onChange={e => setBuildingEdit({ ...buildingEdit, unitsperfloor: e.target.value })} />
                ) : (
                  <p className="text-gray-800 font-medium">{building.unitsperfloor ?? '—'}</p>
                )}
              </div>
              <div className="rounded-xl bg-white/90 border border-blue-100 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">عدد المواقف</p>
                {isEditingBuildingCard ? (
                  <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-blue-500 rounded-none" type="number" value={buildingEdit.parking_slots ?? ''} onChange={e => setBuildingEdit({ ...buildingEdit, parking_slots: e.target.value })} />
                ) : (
                  <p className="text-gray-800 font-medium">{building.parking_slots ?? '—'}</p>
                )}
              </div>
              <div className="rounded-xl bg-white/90 border border-blue-100 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">عدد غرف السائقين</p>
                {isEditingBuildingCard ? (
                  <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-blue-500 rounded-none" type="number" value={buildingEdit.driver_rooms ?? ''} onChange={e => setBuildingEdit({ ...buildingEdit, driver_rooms: e.target.value })} />
                ) : (
                  <p className="text-gray-800 font-medium">{building.driver_rooms ?? '—'}</p>
                )}
              </div>
              <div className="rounded-xl bg-white/90 border border-blue-100 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">واجهة العمارة</p>
                {isEditingBuildingCard ? (
                  <select className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-blue-500 rounded-none" value={buildingEdit.street_type ?? ''} onChange={e => setBuildingEdit({ ...buildingEdit, street_type: e.target.value })}>
                    <option value="">اختر واجهة العمارة</option>
                    <option value="one">شارع واحد</option>
                    <option value="two">شارعين</option>
                  </select>
                ) : (
                  <p className="text-gray-800 font-medium">{building.street_type === 'one' ? 'شارع واحد' : building.street_type === 'two' ? 'شارعين' : building.street_type || '—'}</p>
                )}
              </div>
              <div className="rounded-xl bg-white/90 border border-blue-100 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">اتجاه العمارة</p>
                {isEditingBuildingCard ? (
                  <select className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-blue-500 rounded-none" value={buildingEdit.building_facing ?? ''} onChange={e => setBuildingEdit({ ...buildingEdit, building_facing: e.target.value })}>
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
                  <p className="text-gray-800 font-medium">
                    {building.building_facing === 'north' ? 'شمال' : building.building_facing === 'south' ? 'جنوب' : building.building_facing === 'east' ? 'شرق' : building.building_facing === 'west' ? 'غرب' : building.building_facing === 'northeast' ? 'شمال شرق' : building.building_facing === 'northwest' ? 'شمال غرب' : building.building_facing === 'southeast' ? 'جنوب شرق' : building.building_facing === 'southwest' ? 'جنوب غرب' : building.building_facing || '—'}
                  </p>
                )}
              </div>
              <div className="rounded-xl bg-white/90 border border-blue-100 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">عدد المصاعد</p>
                {isEditingBuildingCard ? (
                  <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-blue-500 rounded-none" type="number" value={buildingEdit.elevators ?? ''} onChange={e => setBuildingEdit({ ...buildingEdit, elevators: e.target.value })} />
                ) : (
                  <p className="text-gray-800 font-medium">{building.elevators ?? '—'}</p>
                )}
              </div>
              <div className="rounded-xl bg-white/90 border border-blue-100 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">سنة البناء</p>
                {isEditingBuildingCard ? (
                  <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-blue-500 rounded-none" type="number" value={buildingEdit.year_built ?? ''} onChange={e => setBuildingEdit({ ...buildingEdit, year_built: e.target.value })} />
                ) : (
                  <p className="text-gray-800 font-medium">{building.year_built ?? '—'}</p>
                )}
              </div>
              <div className="rounded-xl bg-white/90 border border-blue-100 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">الوصف</p>
                {isEditingBuildingCard ? (
                  <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-blue-500 rounded-none" type="text" value={buildingEdit.description ?? ''} onChange={e => setBuildingEdit({ ...buildingEdit, description: e.target.value })} />
                ) : (
                  <p className="text-gray-800 font-medium">{building.description ?? '—'}</p>
                )}
              </div>
              {isEditingBuildingCard && (
                <div className="col-span-2 flex gap-4 mt-2">
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
        <div id="card-facilities" className="rounded-2xl mb-8 overflow-hidden border border-green-200/60 shadow-xl shadow-green-900/5 bg-gradient-to-b from-white to-green-50/30">
          <div className="relative">
            <button
              type="button"
              className="flex flex-col items-center w-full focus:outline-none pt-5 pb-3 cursor-pointer select-none hover:opacity-95 transition-opacity"
              onClick={() => setOpenCard(openCard === 'facilities' ? null : 'facilities')}
              aria-expanded={openCard === 'facilities'}
            >
              <span className="flex items-center justify-center rounded-full h-16 w-16 bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/25 mb-2 ring-4 ring-green-100">
                <FaShieldAlt className="text-white text-3xl" />
              </span>
              <span className="text-xl font-bold bg-gradient-to-l from-green-700 to-green-600 bg-clip-text text-transparent">المرافق والتأمين</span>
              <span className="mt-2 text-green-500">{openCard === 'facilities' ? <FaChevronUp className="text-green-500" /> : <FaChevronDown className="text-green-500" />}</span>
            </button>
            {openCard === 'facilities' && (
              <button
                className="absolute top-4 left-4 bg-green-100 text-green-700 rounded-full p-2 border border-green-300 hover:bg-green-200 transition"
                onClick={() => setIsEditingFacilitiesCard(v => !v)}
                title={isEditingFacilitiesCard ? 'إغلاق التعديل' : 'تعديل المرافق والتأمين'}
              >
                <FaTools />
              </button>
            )}

          </div>
          {openCard === 'facilities' && building && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-5 pb-5">
              <div className="rounded-xl bg-white/90 border border-green-100 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">يوجد تأمين</p>
                {isEditingFacilitiesCard ? (
                  <select className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-green-500 rounded-none" value={facilitiesEdit.insurance_available ?? ''} onChange={e => setFacilitiesEdit({ ...facilitiesEdit, insurance_available: e.target.value })}>
                    <option value="">اختر</option>
                    <option value="true">نعم</option>
                    <option value="false">لا</option>
                  </select>
                ) : (
                  <p className="text-gray-800 font-medium">{building.insurance_available ? 'نعم' : 'لا'}</p>
                )}
              </div>
              <div className="rounded-xl bg-white/90 border border-green-100 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">رقم بوليصة التأمين</p>
                {isEditingFacilitiesCard ? (
                  <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-green-500 rounded-none" type="text" value={facilitiesEdit.insurance_policy_number ?? ''} onChange={e => setFacilitiesEdit({ ...facilitiesEdit, insurance_policy_number: e.target.value })} />
                ) : (
                  <p className="text-gray-800 font-medium">{building.insurance_policy_number ?? '—'}</p>
                )}
              </div>
              <div className="rounded-xl bg-white/90 border border-green-100 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">رقم عداد الكهرباء الرئيسي</p>
                {isEditingFacilitiesCard ? (
                  <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-green-500 rounded-none" type="text" value={facilitiesEdit.electricity_meter_number ?? ''} onChange={e => setFacilitiesEdit({ ...facilitiesEdit, electricity_meter_number: e.target.value })} />
                ) : (
                  <p className="text-gray-800 font-medium">{building.electricity_meter_number ?? '—'}</p>
                )}
              </div>
              <div className="rounded-xl bg-white/90 border border-green-100 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">رقم عداد المياه الرئيسي</p>
                {isEditingFacilitiesCard ? (
                  <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-green-500 rounded-none" type="text" value={facilitiesEdit.water_meter_number ?? ''} onChange={e => setFacilitiesEdit({ ...facilitiesEdit, water_meter_number: e.target.value })} />
                ) : (
                  <p className="text-gray-800 font-medium">{building.water_meter_number ?? '—'}</p>
                )}
              </div>
              {(building.insurance_available || facilitiesEdit.insurance_available === 'true') && (
                <div className="md:col-span-2">
                  <button type="button" className="w-full px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold text-sm shadow-md hover:from-green-600 hover:to-green-700 transition" onClick={() => showToast('لا توجد صورة بوليصة التأمين غير متوفرة حالياً.')}>
                    معاينة صورة بوليصة التأمين
                  </button>
                </div>
              )}
              {isEditingFacilitiesCard && (
                <div className="col-span-2 flex gap-4 mt-2">
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

        {/* كارد بيانات الحارس */}
        <div id="card-guard" className="rounded-2xl mb-8 overflow-hidden border border-amber-200/60 shadow-xl shadow-amber-900/5 bg-gradient-to-b from-white to-amber-50/30">
          <div className="relative">
            <button
              type="button"
              className="flex flex-col items-center w-full focus:outline-none pt-5 pb-3 cursor-pointer select-none hover:opacity-95 transition-opacity"
              onClick={() => setOpenCard(openCard === 'guard' ? null : 'guard')}
              aria-expanded={openCard === 'guard'}
            >
              <span className="flex items-center justify-center rounded-full h-16 w-16 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 mb-2 ring-4 ring-amber-100">
                <FaUserShield className="text-white text-3xl" />
              </span>
              <span className="text-xl font-bold bg-gradient-to-l from-amber-700 to-orange-700 bg-clip-text text-transparent">بيانات الحارس</span>
              <span className="mt-2 text-amber-500">{openCard === 'guard' ? <FaChevronUp className="text-amber-500" /> : <FaChevronDown className="text-amber-500" />}</span>
            </button>
            {openCard === 'guard' && (
              <button
                className="absolute top-4 left-4 bg-amber-100 text-amber-700 rounded-full p-2 border border-amber-300 hover:bg-amber-200 transition"
                onClick={() => setIsEditingGuardCard(v => !v)}
                title={isEditingGuardCard ? 'إغلاق التعديل' : 'تعديل بيانات الحارس'}
              >
                <FaTools />
              </button>
            )}
          </div>
          {openCard === 'guard' && building && (
            <div className="px-5 pb-5">
              {(!building.guard_name && !building.guard_phone && !building.guard_room_number) && !isEditingGuardCard ? (
                <div className="rounded-xl bg-amber-50/80 border border-amber-200/80 px-6 py-8 text-center">
                  <FaUserShield className="text-4xl text-amber-400 mx-auto mb-3 opacity-80" />
                  <p className="text-amber-800 font-medium">لم يتم إدخال بيانات الحارس بعد</p>
                  <button type="button" className="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition" onClick={() => setIsEditingGuardCard(true)}>إضافة بيانات الحارس</button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row gap-5 items-start">
                    {/* صورة الهوية بمقاس الهوية الوطنية 60×40 مم — رفع/معاينة */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-2">
                      <div
                        className="rounded-lg overflow-hidden border-2 border-amber-200 bg-amber-50 shadow-md flex items-center justify-center"
                        style={{ width: '60mm', height: '40mm', minWidth: 120, minHeight: 80 }}
                      >
                        {building.guard_id_photo ? (
                          <button
                            type="button"
                            onClick={() => setGuardIdPreview(building.guard_id_photo || null)}
                            className="w-full h-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 rounded-lg"
                            title="معاينة صورة الهوية"
                          >
                            <img
                              src={building.guard_id_photo}
                              alt="صورة هوية الحارس"
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ) : (
                          <span className="text-amber-600/70 text-xs">لا توجد صورة</span>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        id="guard-id-photo-input"
                        className="hidden"
                        disabled={savingGuardPhoto}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file || !building?.id) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const dataUrl = ev.target?.result as string;
                            if (dataUrl) saveGuardPhoto(dataUrl);
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                      <label
                        htmlFor="guard-id-photo-input"
                        className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 border border-amber-200 rounded-lg hover:bg-amber-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingGuardPhoto ? 'جاري الحفظ...' : building.guard_id_photo ? 'تغيير الصورة' : 'رفع الصورة'}
                      </label>
                    </div>
                    <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                      <div className="rounded-xl bg-white/90 border border-amber-100 px-4 py-2 shadow-sm">
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">اسم الحارس</p>
                        {isEditingGuardCard ? (
                          <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-amber-500 rounded-none" type="text" value={guardEdit.guard_name ?? ''} onChange={e => setGuardEdit({ ...guardEdit, guard_name: e.target.value })} />
                        ) : (
                          <p className="text-gray-800 font-medium">{building.guard_name || '—'}</p>
                        )}
                      </div>
                      <div className="rounded-xl bg-white/90 border border-amber-100 px-4 py-2 shadow-sm">
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">رقم الجوال</p>
                        {isEditingGuardCard ? (
                          <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-amber-500 rounded-none" type="text" value={guardEdit.guard_phone ?? ''} onChange={e => setGuardEdit({ ...guardEdit, guard_phone: e.target.value })} />
                        ) : (
                          <a href={building.guard_phone ? `tel:${building.guard_phone}` : '#'} className="text-gray-800 font-medium hover:text-amber-600 transition flex items-center gap-2">
                            {building.guard_phone || '—'}
                            {building.guard_phone && <FaPhoneAlt className="text-amber-500 text-sm" />}
                          </a>
                        )}
                      </div>
                      <div className="rounded-xl bg-white/90 border border-amber-100 px-4 py-2 shadow-sm">
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">رقم غرفة الحارس</p>
                        {isEditingGuardCard ? (
                          <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-amber-500 rounded-none" type="text" value={guardEdit.guard_room_number ?? ''} onChange={e => setGuardEdit({ ...guardEdit, guard_room_number: e.target.value })} />
                        ) : (
                          <p className="text-gray-800 font-medium">{building.guard_room_number || '—'}</p>
                        )}
                      </div>
                      <div className="rounded-xl bg-white/90 border border-amber-100 px-4 py-2 shadow-sm">
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">الوردية</p>
                        {isEditingGuardCard ? (
                          <select className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-amber-500 rounded-none" value={guardEdit.guard_shift ?? ''} onChange={e => setGuardEdit({ ...guardEdit, guard_shift: e.target.value })}>
                            <option value="">—</option>
                            <option value="day">نهار</option>
                            <option value="night">ليل</option>
                            <option value="permanent">24 ساعة</option>
                          </select>
                        ) : (
                          <p className="text-gray-800 font-medium">
                            {building.guard_shift === 'day' ? 'نهار' : building.guard_shift === 'night' ? 'ليل' : building.guard_shift === 'permanent' ? '24 ساعة' : building.guard_shift || '—'}
                          </p>
                        )}
                      </div>
                      <div className="rounded-xl bg-white/90 border border-amber-100 px-4 py-2 shadow-sm">
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">يتقاضى راتب</p>
                        {isEditingGuardCard ? (
                          <div className="flex items-center gap-2">
                            <button type="button" className={`rounded-lg px-2 py-1.5 text-sm font-medium transition ${guardEdit.guard_has_salary ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700'}`} onClick={() => setGuardEdit({ ...guardEdit, guard_has_salary: true })}>نعم</button>
                            <button type="button" className={`rounded-lg px-2 py-1.5 text-sm font-medium transition ${!guardEdit.guard_has_salary ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700'}`} onClick={() => setGuardEdit({ ...guardEdit, guard_has_salary: false })}>لا</button>
                          </div>
                        ) : (
                          <p className="text-gray-800 font-medium">{building.guard_has_salary ? 'نعم' : 'لا'}</p>
                        )}
                      </div>
                      {(isEditingGuardCard ? guardEdit.guard_has_salary : building.guard_has_salary) && (
                        <div className="rounded-xl bg-white/90 border border-amber-100 px-4 py-2 shadow-sm">
                          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">مبلغ الراتب (ر.س)</p>
                          {isEditingGuardCard ? (
                            <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-amber-500 rounded-none" type="number" value={guardEdit.guard_salary_amount ?? ''} onChange={e => setGuardEdit({ ...guardEdit, guard_salary_amount: e.target.value })} />
                          ) : (
                            <p className="text-gray-800 font-medium">{building.guard_salary_amount != null ? Number(building.guard_salary_amount).toLocaleString('ar-SA') : '—'}</p>
                          )}
                        </div>
                      )}
                      {isEditingGuardCard && (
                        <div className="sm:col-span-2 flex gap-3 mt-1">
                          <button type="button" className="px-4 py-2 bg-gradient-to-br from-amber-500 to-amber-700 text-white rounded-xl text-sm font-bold hover:from-amber-600 hover:to-amber-800 transition" onClick={async () => {
                            const { error } = await supabase.from('buildings').update({
                              guard_name: guardEdit.guard_name || null,
                              guard_phone: guardEdit.guard_phone || null,
                              guard_room_number: guardEdit.guard_room_number || null,
                              guard_shift: guardEdit.guard_shift || null,
                              guard_has_salary: guardEdit.guard_has_salary,
                              guard_salary_amount: guardEdit.guard_has_salary && guardEdit.guard_salary_amount !== '' ? Number(guardEdit.guard_salary_amount) : null,
                              updated_at: new Date().toISOString(),
                            }).eq('id', building.id);
                            if (!error) {
                              setBuilding({ ...building, ...guardEdit, guard_salary_amount: guardEdit.guard_has_salary ? guardEdit.guard_salary_amount : null });
                              setIsEditingGuardCard(false);
                              showToast('تم حفظ بيانات الحارس');
                            } else showToast('فشل الحفظ');
                          }}>حفظ</button>
                          <button type="button" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-300 transition" onClick={() => { setIsEditingGuardCard(false); setGuardEdit({ guard_name: building.guard_name ?? '', guard_phone: building.guard_phone ?? '', guard_room_number: building.guard_room_number ?? '', guard_shift: building.guard_shift ?? '', guard_has_salary: !!building.guard_has_salary, guard_salary_amount: building.guard_salary_amount ?? '' }); }}>إلغاء</button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* مودال معاينة صورة هوية الحارس — مقاس الهوية الوطنية */}
        {guardIdPreview && (
          <>
            <div
              className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm cursor-pointer"
              onClick={() => setGuardIdPreview(null)}
              aria-hidden="true"
            />
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 cursor-pointer" onClick={() => setGuardIdPreview(null)}>
              <div className="relative flex flex-col items-center" onClick={e => e.stopPropagation()}>
                <img
                  src={guardIdPreview}
                  alt="معاينة صورة هوية الحارس"
                  className="rounded-lg border-2 border-amber-200 bg-amber-50 shadow-2xl"
                  style={{ width: '60mm', height: '40mm', minWidth: 560, minHeight: 373 }}
                />
                <button
                  type="button"
                  onClick={() => setGuardIdPreview(null)}
                  className="absolute -top-2 -left-2 w-10 h-10 rounded-full bg-white shadow-lg text-gray-700 hover:bg-gray-100 flex items-center justify-center font-bold text-xl"
                  aria-label="إغلاق"
                >
                  ×
                </button>
              </div>
            </div>
          </>
        )}

        {/* كارد الموقع والصور قابل للطي */}
        <div id="card-location" className="rounded-2xl mb-8 overflow-hidden border border-pink-200/60 shadow-xl shadow-pink-900/5 bg-gradient-to-b from-white to-pink-50/30">
          <div className="relative">
            <button
              type="button"
              className="flex flex-col items-center w-full focus:outline-none pt-5 pb-3 cursor-pointer select-none hover:opacity-95 transition-opacity"
              onClick={() => setOpenCard(openCard === 'location' ? null : 'location')}
              aria-expanded={openCard === 'location'}
            >
              <span className="flex items-center justify-center rounded-full h-16 w-16 bg-gradient-to-br from-pink-400 to-pink-600 shadow-lg shadow-pink-500/25 mb-2 ring-4 ring-pink-100">
                <FaMapMarkerAlt className="text-white text-3xl" />
              </span>
              <span className="text-xl font-bold bg-gradient-to-l from-pink-700 to-pink-600 bg-clip-text text-transparent">الموقع والصور</span>
              <span className="mt-2 text-pink-500">{openCard === 'location' ? <FaChevronUp className="text-pink-500" /> : <FaChevronDown className="text-pink-500" />}</span>
            </button>
          </div>
          {openCard === 'location' && building && (
            <div className="px-5 pb-5 space-y-4">
              <div className="rounded-xl bg-white/90 border border-pink-100 px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold text-pink-600 uppercase tracking-wide mb-2">الموقع على الخريطة</p>
                {!isEditingMapLink ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    {building.google_maps_link ? (
                      <a href={building.google_maps_link} target="_blank" rel="noopener" className="inline-flex items-center gap-2 w-fit px-4 py-2 bg-gradient-to-br from-pink-500 to-pink-700 text-white rounded-full shadow hover:from-pink-600 hover:to-pink-800 transition text-sm font-bold">
                        <FaMapMarkerAlt className="text-white text-lg" />
                        فتح الخريطة
                      </a>
                    ) : (
                      <span className="text-gray-500 text-sm font-medium">لا يوجد رابط للموقع</span>
                    )}
                    <button
                      type="button"
                      className="flex-shrink-0 w-10 h-10 rounded-full bg-pink-500 hover:bg-pink-600 text-white flex items-center justify-center transition"
                      title={building.google_maps_link ? "تحديث الرابط" : "إضافة الموقع"}
                      onClick={() => setIsEditingMapLink(true)}
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      className="flex-1 min-w-0 rounded-full border border-pink-200 bg-pink-50/50 px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 transition"
                      placeholder="أدخل رابط Google Maps..."
                      value={newMapLink ?? ''}
                      onChange={e => setNewMapLink(e.target.value)}
                      disabled={savingMapLink}
                      dir="ltr"
                    />
                    <button
                      type="button"
                      className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition"
                      title="إلغاء"
                      onClick={() => { setIsEditingMapLink(false); setNewMapLink(building.google_maps_link || ''); }}
                      disabled={savingMapLink}
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      className="flex-shrink-0 w-10 h-10 rounded-full bg-pink-500 hover:bg-pink-600 text-white flex items-center justify-center transition disabled:opacity-60 disabled:cursor-not-allowed"
                      title="حفظ الرابط"
                      onClick={async () => {
                        const link = newMapLink.trim() || null;
                        setSavingMapLink(true);
                        try {
                          const { error } = await supabase
                            .from('buildings')
                            .update({ google_maps_link: link, updated_at: new Date().toISOString() })
                            .eq('id', building.id);
                          if (error) throw error;
                          setBuilding({ ...building, google_maps_link: link ?? undefined });
                          setNewMapLink(link || '');
                          setIsEditingMapLink(false);
                          showToast(link ? "تم حفظ رابط الموقع بنجاح" : "تم حذف رابط الموقع");
                        } catch (err) {
                          showToast("حدث خطأ أثناء الحفظ");
                        } finally {
                          setSavingMapLink(false);
                        }
                      }}
                      disabled={savingMapLink}
                    >
                      {savingMapLink ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <Check className="w-5 h-5" />}
                    </button>
                  </div>
                )}
              </div>
              <div className="rounded-xl bg-white/90 border border-pink-100 px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold text-pink-600 uppercase tracking-wide mb-3">معرض صور العقار</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full">
                  <button
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white/90 border border-pink-100 text-pink-700 font-bold hover:bg-pink-50 shadow-sm transition group"
                    onClick={() => router.push(`/dashboard/buildings/gallery?buildingId=${building.id}&type=front`)}
                    >
                      <FaDoorClosed className="text-4xl text-pink-400 group-hover:text-pink-600 transition" />
                      <span className="mt-2">الشقة الأمامية</span>
                    </button>
                  <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white/90 border border-pink-100 text-pink-700 font-bold hover:bg-pink-50 shadow-sm transition group" onClick={() => router.push(`/dashboard/buildings/gallery?buildingId=${building.id}&type=back`)}>
                    <FaDoorClosed className="text-4xl text-pink-400 group-hover:text-pink-600 transition" />
                    <span className="mt-2">الشقة الخلفية</span>
                  </button>
                  <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white/90 border border-pink-100 text-pink-700 font-bold hover:bg-pink-50 shadow-sm transition group" onClick={() => router.push(`/dashboard/buildings/gallery?buildingId=${building.id}&type=annex`)}>
                    <FaDoorClosed className="text-4xl text-pink-400 group-hover:text-pink-600 transition" />
                    <span className="mt-2">الملحق</span>
                  </button>
                  <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white/90 border border-pink-100 text-pink-700 font-bold hover:bg-pink-50 shadow-sm transition group" onClick={() => router.push(`/dashboard/buildings/gallery?buildingId=${building.id}&type=building`)}>
                    <FaBldg className="text-4xl text-pink-400 group-hover:text-pink-600 transition" />
                    <span className="mt-2">العمارة</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* كارد اتحاد الملاك قابل للطي */}
        <div id="card-association" className="rounded-2xl mb-8 overflow-hidden border border-emerald-200/60 shadow-xl shadow-emerald-900/5 bg-gradient-to-b from-white to-emerald-50/30">
          <div className="relative">
            <button
              type="button"
              className="flex flex-col items-center w-full focus:outline-none pt-5 pb-3 cursor-pointer select-none hover:opacity-95 transition-opacity"
              onClick={() => setOpenCard(openCard === 'association' ? null : 'association')}
              aria-expanded={openCard === 'association'}
            >
              <span className="flex items-center justify-center rounded-full h-16 w-16 bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/25 mb-2 ring-4 ring-emerald-100">
                <FaUsers className="text-white text-3xl" />
              </span>
              <span className="text-xl font-bold bg-gradient-to-l from-emerald-700 to-emerald-600 bg-clip-text text-transparent">اتحاد الملاك</span>
              <span className="mt-2 text-emerald-500">{openCard === 'association' ? <FaChevronUp className="text-emerald-500" /> : <FaChevronDown className="text-emerald-500" />}</span>
            </button>
            {openCard === 'association' && (
              <button
                className="absolute top-4 left-4 bg-emerald-100 text-emerald-700 rounded-full p-2 border border-emerald-300 hover:bg-emerald-200 transition"
                onClick={() => setIsEditingAssociationCard(v => !v)}
                title={isEditingAssociationCard ? 'إغلاق التعديل' : 'تعديل اتحاد الملاك'}
              >
                <FaTools />
              </button>
            )}
          </div>
          {openCard === 'association' && building && (
            <div className="px-5 pb-5">
              <div className="rounded-xl bg-white/90 border border-emerald-100 px-4 py-3 shadow-sm mb-4">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">حالة الاتحاد</p>
                <div className="flex items-center gap-3">
                  <div className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${associationEdit.hasAssociation ? 'bg-amber-600' : 'bg-gray-200'}`} onClick={() => { const next = !associationEdit.hasAssociation; setAssociationEdit({ ...associationEdit, hasAssociation: next }); if (next) setIsEditingAssociationCard(true); }}>
                    <div className="absolute top-0.5 right-0.5 bg-white border border-gray-300 rounded-full h-6 w-6 transition-transform" style={{ transform: associationEdit.hasAssociation ? 'translateX(-28px)' : 'translateX(0)' }} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/90 border border-emerald-100 px-4 py-2 shadow-sm">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">اسم مسؤول الاتحاد</p>
                  {isEditingAssociationCard ? (
                    <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-emerald-500 rounded-none" type="text" value={associationEdit.managerName ?? ''} onChange={e => setAssociationEdit({ ...associationEdit, managerName: e.target.value })} />
                  ) : (
                    <p className="text-gray-800 font-medium">{associationEdit.managerName || '—'}</p>
                  )}
                </div>
                <div className="rounded-xl bg-white/90 border border-emerald-100 px-4 py-2 shadow-sm">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">رقم تسجيل الاتحاد</p>
                  {isEditingAssociationCard ? (
                    <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-emerald-500 rounded-none" type="text" value={associationEdit.registrationNumber ?? ''} onChange={e => setAssociationEdit({ ...associationEdit, registrationNumber: e.target.value })} />
                  ) : (
                    <p className="text-gray-800 font-medium">{associationEdit.registrationNumber || '—'}</p>
                  )}
                </div>
                <div className="rounded-xl bg-white/90 border border-emerald-100 px-4 py-2 shadow-sm">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">رقم الحساب</p>
                  {isEditingAssociationCard ? (
                    <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-emerald-500 rounded-none" type="text" value={associationEdit.accountNumber ?? ''} onChange={e => setAssociationEdit({ ...associationEdit, accountNumber: e.target.value })} />
                  ) : (
                    <p className="text-gray-800 font-medium">{associationEdit.accountNumber || '—'}</p>
                  )}
                </div>
                <div className="rounded-xl bg-white/90 border border-emerald-100 px-4 py-2 shadow-sm">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">رقم IBAN</p>
                  {isEditingAssociationCard ? (
                    <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-emerald-500 rounded-none" type="text" value={associationEdit.iban ?? ''} onChange={e => setAssociationEdit({ ...associationEdit, iban: e.target.value })} />
                  ) : (
                    <p className="text-gray-800 font-medium">{associationEdit.iban || '—'}</p>
                  )}
                </div>
                <div className="rounded-xl bg-white/90 border border-emerald-100 px-4 py-2 shadow-sm">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">رقم التواصل</p>
                  {isEditingAssociationCard ? (
                    <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-emerald-500 rounded-none" type="text" value={associationEdit.contactNumber ?? ''} onChange={e => setAssociationEdit({ ...associationEdit, contactNumber: e.target.value })} />
                  ) : (
                    <p className="text-gray-800 font-medium">{associationEdit.contactNumber || '—'}</p>
                  )}
                </div>
                <div className="rounded-xl bg-white/90 border border-emerald-100 px-4 py-2 shadow-sm">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">عدد الوحدات المسجلة</p>
                  {isEditingAssociationCard ? (
                    <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-emerald-500 rounded-none" type="number" value={associationEdit.registeredUnitsCount ?? 0} onChange={e => setAssociationEdit({ ...associationEdit, registeredUnitsCount: Number(e.target.value) })} />
                  ) : (
                    <p className="text-gray-800 font-medium">{associationEdit.registeredUnitsCount ?? '—'}</p>
                  )}
                </div>
                <div className="rounded-xl bg-white/90 border border-emerald-100 px-4 py-2 shadow-sm">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">تاريخ البداية</p>
                  {isEditingAssociationCard ? (
                    <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-emerald-500 rounded-none" type="date" value={associationEdit.startDate ?? ''} onChange={e => setAssociationEdit({ ...associationEdit, startDate: e.target.value })} />
                  ) : (
                    <p className="text-gray-800 font-medium">{associationEdit.startDate || '—'}</p>
                  )}
                </div>
                <div className="rounded-xl bg-white/90 border border-emerald-100 px-4 py-2 shadow-sm">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">تاريخ النهاية</p>
                  {isEditingAssociationCard ? (
                    <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-emerald-500 rounded-none" type="date" value={associationEdit.endDate ?? ''} onChange={e => setAssociationEdit({ ...associationEdit, endDate: e.target.value })} />
                  ) : (
                    <p className="text-gray-800 font-medium">{associationEdit.endDate || '—'}</p>
                  )}
                </div>
                <div className="rounded-xl bg-white/90 border border-emerald-100 px-4 py-2 shadow-sm">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">الرسوم الشهرية</p>
                  {isEditingAssociationCard ? (
                    <input className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 text-gray-800 font-medium text-sm py-0.5 focus:outline-none focus:ring-0 focus:border-emerald-500 rounded-none" type="number" value={associationEdit.monthlyFee ?? 0} onChange={e => setAssociationEdit({ ...associationEdit, monthlyFee: Number(e.target.value) })} />
                  ) : (
                    <p className="text-gray-800 font-medium">{associationEdit.monthlyFee ?? '—'}</p>
                  )}
                </div>
                <div className="rounded-xl bg-white/90 border border-emerald-100 px-4 py-2 shadow-sm col-span-2">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">يشمل الماء / يشمل الكهرباء</p>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">يشمل الماء</span>
                      <div className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${associationEdit.includesWater ? 'bg-amber-600' : 'bg-gray-200'}`} onClick={() => setAssociationEdit({ ...associationEdit, includesWater: !associationEdit.includesWater })}>
                        <div className="absolute top-0.5 right-0.5 bg-white border border-gray-300 rounded-full h-6 w-6 transition-transform" style={{ transform: associationEdit.includesWater ? 'translateX(-28px)' : 'translateX(0)' }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">يشمل الكهرباء</span>
                      <div className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${associationEdit.includesElectricity ? 'bg-amber-600' : 'bg-gray-200'}`} onClick={() => setAssociationEdit({ ...associationEdit, includesElectricity: !associationEdit.includesElectricity })}>
                        <div className="absolute top-0.5 right-0.5 bg-white border border-gray-300 rounded-full h-6 w-6 transition-transform" style={{ transform: associationEdit.includesElectricity ? 'translateX(-28px)' : 'translateX(0)' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {isEditingAssociationCard && (
                  <div className="col-span-2 flex gap-4 mt-2">
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
            </div>
          )}
        </div>

        {/* كارد المكتب الهندسي قابل للطي */}
        <div id="card-engineering" className="rounded-2xl mb-8 overflow-hidden border border-teal-200/60 shadow-xl shadow-teal-900/5 bg-gradient-to-b from-white to-teal-50/30">
          <div className="relative">
            <button
              type="button"
              className="flex flex-col items-center w-full focus:outline-none pt-5 pb-3 cursor-pointer select-none hover:opacity-95 transition-opacity"
              onClick={() => setOpenCard(openCard === 'engineering' ? null : 'engineering')}
              aria-expanded={openCard === 'engineering'}
            >
              <span className="flex items-center justify-center rounded-full h-16 w-16 bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg shadow-teal-500/25 mb-2 ring-4 ring-teal-100">
                <FaTools className="text-white text-3xl" />
              </span>
              <span className="text-xl font-bold bg-gradient-to-l from-teal-700 to-teal-600 bg-clip-text text-transparent">المكتب الهندسي</span>
              <span className="mt-2 text-teal-500">{openCard === 'engineering' ? <FaChevronUp className="text-teal-500" /> : <FaChevronDown className="text-teal-500" />}</span>
            </button>
          </div>
          {openCard === 'engineering' && building && (
            <div className="px-5 pb-5">
              <div className="rounded-xl bg-white/90 border border-teal-100 px-4 py-4 shadow-sm flex flex-col items-center justify-center">
                <div className="flex flex-wrap gap-3 justify-center">
                  <button className="px-4 py-2 bg-white border border-teal-200 text-teal-700 rounded-xl hover:bg-teal-50 transition text-sm font-bold" onClick={() => router.push(`/building-deeds?buildingId=${building.id}`)}>
                    الصكوك ومحاضر الفرز
                  </button>
                  <button className="px-4 py-2 bg-white border border-teal-200 text-teal-700 rounded-xl hover:bg-teal-50 transition text-sm font-bold">
                    الخرائط الهندسيه
                  </button>
                  <button className="px-4 py-2 bg-white border border-teal-200 text-teal-700 rounded-xl hover:bg-teal-50 transition text-sm font-bold">
                    مستندات المبنى
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* كارد عدادات الكهرباء قابل للطي */}
        <div id="card-electricity" className="rounded-2xl mb-8 overflow-hidden border border-amber-200/60 shadow-xl shadow-amber-900/5 bg-gradient-to-b from-white to-amber-50/30">
          <div className="relative">
            <button
              type="button"
              className="flex flex-col items-center w-full focus:outline-none pt-5 pb-3 cursor-pointer select-none hover:opacity-95 transition-opacity"
              onClick={() => setOpenCard(openCard === 'electricity' ? null : 'electricity')}
              aria-expanded={openCard === 'electricity'}
            >
              <span className="flex items-center justify-center rounded-full h-16 w-16 bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/25 mb-2 ring-4 ring-amber-100">
                <FaBolt className="text-white text-3xl" />
              </span>
              <span className="text-xl font-bold bg-gradient-to-l from-amber-700 to-amber-600 bg-clip-text text-transparent">عدادات الكهرباء</span>
              <span className="mt-2 text-amber-500">{openCard === 'electricity' ? <FaChevronUp className="text-amber-500" /> : <FaChevronDown className="text-amber-500" />}</span>
            </button>
          </div>
          {openCard === 'electricity' && building && (
            <div className="px-5 pb-5">
              <div className="rounded-xl bg-white/90 border border-amber-100 px-4 py-4 shadow-sm">
                {unitsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full" />
                  </div>
                ) : units.length === 0 ? (
                  <p className="text-slate-500 text-sm py-4">لا توجد وحدات مسجلة لهذا المبنى.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-amber-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-yellow-50 to-amber-50 text-slate-700 border-b border-slate-200">
                        <th className="px-4 py-3 text-right font-semibold">رقم الوحدة</th>
                        <th className="px-4 py-3 text-right font-semibold">الدور</th>
                        <th className="px-4 py-3 text-right font-semibold">رقم عداد الكهرباء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {units.map((unit, index) => (
                        <tr key={unit.id} className="border-b border-slate-100 hover:bg-slate-50/50" data-seq={index + 1}>
                          <td className="px-4 py-3 text-slate-800 font-medium">{unit.unit_number}</td>
                          <td className="px-4 py-3 text-slate-700">{unit.floor}</td>
                          <td className="px-4 py-3">
                            {editingMeter === unit.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={meterDraft ?? ''}
                                  onChange={(e) => setMeterDraft(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveUnitMeter(unit.id, meterDraft);
                                    if (e.key === "Escape") { setEditingMeter(null); setMeterDraft(""); }
                                  }}
                                  className="flex-1 min-w-0 rounded-lg border border-yellow-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-yellow-400"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => saveUnitMeter(unit.id, meterDraft)}
                                  className="px-3 py-1.5 rounded-lg bg-yellow-500 text-white text-xs font-semibold hover:bg-yellow-600"
                                >
                                  حفظ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setEditingMeter(null); setMeterDraft(""); }}
                                  className="px-2 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs hover:bg-slate-200"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMeter(unit.id);
                                  setMeterDraft(unit.electricity_meter_number || "");
                                }}
                                className="text-right w-full px-3 py-2 rounded-lg border border-dashed border-slate-200 text-slate-600 hover:border-yellow-400 hover:bg-yellow-50/50 hover:text-slate-800 transition text-sm font-mono"
                              >
                                {unit.electricity_meter_number || "إضافة رقم العداد"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* كارد وحدات المبنى */}
      </div>
    </div>
  );
}

function DetailsFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex justify-center items-center py-24">
      <div className="animate-spin w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full" />
    </div>
  );
}

export default function DetailsPage() {
  return (
    <Suspense fallback={<DetailsFallback />}>
      <DetailsContent />
    </Suspense>
  );
}
