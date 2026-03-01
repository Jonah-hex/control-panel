"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { showToast } from "@/app/dashboard/buildings/details/toast";
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  Home,
  User,
  Phone,
  Calendar,
  Key,
  Zap,
  Droplets,
  DoorOpen,
  PaintBucket,
  AlertCircle,
  Layers,
  LayoutGrid,
  Plug,
  Bath,
  Lightbulb,
} from "lucide-react";

interface Unit {
  id: string;
  building_id: string;
  unit_number: string;
  floor: number;
  status: string;
  area: number;
  rooms: number;
  bathrooms: number;
  living_rooms: number;
  kitchens: number;
  owner_name?: string | null;
  owner_phone?: string | null;
  electricity_meter_number?: string | null;
}

interface Building {
  id: string;
  name: string;
}

interface Reservation {
  id: string;
  customer_name: string;
  customer_phone: string | null;
}

interface HandoverChecklist {
  keys_received?: boolean;
  keys_count?: string;
  electricity_reading?: string;
  water_reading?: string;
  living_room_condition?: "ok" | "defect";
  living_room_notes?: string;
  bedrooms?: { condition: "ok" | "defect"; notes: string }[];
  kitchen_condition?: "ok" | "defect";
  kitchen_notes?: string;
  bathrooms?: { condition: "ok" | "defect"; notes: string }[];
  ceilings_gypsum_condition?: "ok" | "defect";
  ceilings_gypsum_notes?: string;
  ceramic_floors_condition?: "ok" | "defect";
  ceramic_floors_notes?: string;
  electrical_outlets_condition?: "ok" | "defect";
  electrical_outlets_notes?: string;
  lighting_condition?: "ok" | "defect";
  lighting_notes?: string;
  sanitary_fixtures_condition?: "ok" | "defect";
  sanitary_fixtures_notes?: string;
  doors_windows?: "ok" | "defect";
  doors_windows_notes?: string;
  paint_condition?: "ok" | "defect";
  paint_notes?: string;
  defects?: string;
}

const defaultChecklist = (rooms: number, bathrooms: number): HandoverChecklist => ({
  keys_received: false,
  keys_count: "",
  electricity_reading: "",
  water_reading: "",
  living_room_condition: "ok",
  living_room_notes: "",
  bedrooms: Array.from({ length: Math.max(1, Number(rooms) || 1) }, () => ({ condition: "ok" as const, notes: "" })),
  kitchen_condition: "ok",
  kitchen_notes: "",
  bathrooms: Array.from({ length: Math.max(1, Number(bathrooms) || 1) }, () => ({ condition: "ok" as const, notes: "" })),
  ceilings_gypsum_condition: "ok",
  ceilings_gypsum_notes: "",
  ceramic_floors_condition: "ok",
  ceramic_floors_notes: "",
  electrical_outlets_condition: "ok",
  electrical_outlets_notes: "",
  lighting_condition: "ok",
  lighting_notes: "",
  sanitary_fixtures_condition: "ok",
  sanitary_fixtures_notes: "",
  doors_windows: "ok",
  doors_windows_notes: "",
  paint_condition: "ok",
  paint_notes: "",
  defects: "",
});

export default function UnitHandoverPage() {
  const params = useParams();
  const router = useRouter();
  const unitId = params?.unitId as string | undefined;
  const { can, ready } = useDashboardAuth();

  const [unit, setUnit] = useState<Unit | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [existingHandover, setExistingHandover] = useState<{ id: string; checklist: HandoverChecklist | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [handoverDate, setHandoverDate] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [receivedByPhone, setReceivedByPhone] = useState("");
  const [checklist, setChecklist] = useState<HandoverChecklist>(defaultChecklist(1, 1));
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"draft" | "completed">("draft");

  useEffect(() => {
    if (!unitId || !ready) return;
    if (ready && !can("sales")) {
      showToast("ليس لديك صلاحية الوصول لنموذج الاستلام.", "error");
      router.replace("/dashboard/sales");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      try {
        const { data: unitData, error: unitErr } = await supabase
          .from("units")
          .select("id, building_id, unit_number, floor, status, area, rooms, bathrooms, living_rooms, kitchens, owner_name, owner_phone, electricity_meter_number")
          .eq("id", unitId)
          .single();

        if (unitErr || !unitData) {
          setError("الوحدة غير موجودة أو لا توجد صلاحية.");
          setUnit(null);
          setLoading(false);
          return;
        }

        setUnit(unitData as Unit);

        const buildingId = unitData.building_id;
        const { data: buildingData } = await supabase.from("buildings").select("id, name").eq("id", buildingId).single();
        setBuilding((buildingData as Building) || null);

        const { data: resData } = await supabase
          .from("reservations")
          .select("id, customer_name, customer_phone")
          .eq("unit_id", unitId)
          .in("status", ["active", "completed"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setReservation((resData as Reservation) || null);

        const { data: handoverData } = await supabase
          .from("unit_handovers")
          .select("id, handover_date, received_by, received_by_phone, checklist, notes, status")
          .eq("unit_id", unitId)
          .maybeSingle();

        const today = new Date().toISOString().slice(0, 16);
        setHandoverDate(today);
        setReceivedBy(resData?.customer_name || unitData.owner_name || "");
        setReceivedByPhone(resData?.customer_phone || unitData.owner_phone || "");

        if (handoverData) {
          setExistingHandover({ id: handoverData.id, checklist: (handoverData.checklist as HandoverChecklist) || null });
          const c = (handoverData.checklist as HandoverChecklist) || {};
          setChecklist({ ...defaultChecklist(Number(unitData.rooms) || 1, Number(unitData.bathrooms) || 1), ...c });
          if (handoverData.handover_date) setHandoverDate(new Date(handoverData.handover_date).toISOString().slice(0, 16));
          if (handoverData.received_by) setReceivedBy(String(handoverData.received_by));
          if (handoverData.received_by_phone) setReceivedByPhone(String(handoverData.received_by_phone));
          if (handoverData.notes) setNotes(String(handoverData.notes));
          if (handoverData.status === "completed" || handoverData.status === "draft") setStatus(handoverData.status);
        } else {
          setChecklist(defaultChecklist(Number(unitData.rooms) || 1, Number(unitData.bathrooms) || 1));
        }
      } catch (e) {
        setError("حدث خطأ أثناء تحميل البيانات.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [unitId, ready, can, router]);

  const handleSave = async (asCompleted: boolean) => {
    if (!unit || !building) return;
    setSaving(true);
    const supabase = createClient();

    try {
      const payload = {
        unit_id: unit.id,
        building_id: unit.building_id,
        sale_id: null,
        reservation_id: reservation?.id || null,
        handover_date: handoverDate ? new Date(handoverDate).toISOString() : new Date().toISOString(),
        delivered_by: "—",
        delivered_by_phone: null,
        received_by: receivedBy.trim() || "—",
        received_by_phone: receivedByPhone.trim() || null,
        checklist: checklist as unknown as Record<string, unknown>,
        notes: notes.trim() || null,
        status: asCompleted ? "completed" : "draft",
        updated_at: new Date().toISOString(),
      };

      if (existingHandover?.id) {
        const { error: updateErr } = await supabase.from("unit_handovers").update(payload).eq("id", existingHandover.id);
        if (updateErr) throw updateErr;
        showToast(asCompleted ? "تم حفظ نموذج الاستلام وإكماله." : "تم حفظ المسودة.", "success");
      } else {
        const { error: insertErr } = await supabase.from("unit_handovers").insert(payload);
        if (insertErr) throw insertErr;
        showToast(asCompleted ? "تم تسجيل استلام الوحدة وإكمال النموذج." : "تم حفظ المسودة.", "success");
      }

      router.push("/dashboard/sales");
    } catch (e: unknown) {
      const err = e as { message?: string };
      showToast(err?.message || "فشل الحفظ.", "error");
    } finally {
      setSaving(false);
    }
  };

  const updateChecklist = <K extends keyof HandoverChecklist>(key: K, value: HandoverChecklist[K]) => {
    setChecklist((prev) => ({ ...prev, [key]: value }));
  };

  const updateBedroom = (index: number, field: "condition" | "notes", value: string) => {
    setChecklist((prev) => {
      const next = [...(prev.bedrooms || [])];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, bedrooms: next };
    });
  };

  const updateBathroom = (index: number, field: "condition" | "notes", value: string) => {
    setChecklist((prev) => {
      const next = [...(prev.bathrooms || [])];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, bathrooms: next };
    });
  };

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50" dir="rtl">
        <p className="text-slate-500">جاري التحميل...</p>
      </main>
    );
  }

  if (!unitId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50" dir="rtl">
        <p className="text-slate-500">معرف الوحدة غير صالح.</p>
        <Link href="/dashboard/sales" className="mr-4 text-amber-600 hover:underline">العودة للمبيعات</Link>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50" dir="rtl">
        <div className="animate-spin w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full" />
      </main>
    );
  }

  if (error || !unit) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6" dir="rtl">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-slate-600 mb-4">{error || "الوحدة غير موجودة."}</p>
          <Link href="/dashboard/sales" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600">
            <ArrowRight className="w-4 h-4" /> العودة لإدارة التسويق والمبيعات
          </Link>
        </div>
      </main>
    );
  }

  const roomsCount = Math.max(1, Number(unit.rooms) || 1);
  const bathroomsCount = Math.max(1, Number(unit.bathrooms) || 1);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-sky-50/40 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/sales"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 print:hidden"
            >
              <ArrowRight className="w-4 h-4" />
              إدارة التسويق والمبيعات
            </Link>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-amber-600" />
              نموذج استلام الوحدة
            </h1>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-500" />
                <span className="font-semibold text-slate-800">{building?.name ?? "—"}</span>
              </div>
              <span className="text-slate-400">|</span>
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5 text-slate-500" />
                <span className="font-semibold text-slate-800">الوحدة {unit.unit_number} — الطابق {unit.floor}</span>
              </div>
              {unit.area > 0 && (
                <>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-600 text-sm">{Number(unit.area)} م²</span>
                </>
              )}
            </div>
          </div>

          <form
            className="p-6 space-y-8"
            onSubmit={(e) => { e.preventDefault(); handleSave(false); }}
          >
            <section className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                تاريخ الإستلام
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ الاستلام</label>
                  <input
                    type="datetime-local"
                    value={handoverDate}
                    onChange={(e) => setHandoverDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">المستلم (العميل/المشتري)</label>
                  <input
                    type="text"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    placeholder="اسم المستلم"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> جوال المستلم</label>
                  <input
                    type="tel"
                    value={receivedByPhone}
                    onChange={(e) => setReceivedByPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 dir-ltr"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Key className="w-4 h-4" />
                المفاتيح والعدادات
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="keys_received"
                    checked={!!checklist.keys_received}
                    onChange={(e) => updateChecklist("keys_received", e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <label htmlFor="keys_received" className="text-sm font-medium text-slate-700">تم استلام المفاتيح</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">عدد المفاتيح</label>
                  <input
                    type="text"
                    value={checklist.keys_count ?? ""}
                    onChange={(e) => updateChecklist("keys_count", e.target.value)}
                    placeholder="—"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> فواتير عداد الكهرباء</label>
                  <input
                    type="text"
                    value={checklist.electricity_reading ?? ""}
                    onChange={(e) => updateChecklist("electricity_reading", e.target.value)}
                    placeholder="—"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 dir-ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1"><Droplets className="w-3.5 h-3.5" /> فواتير عداد المياه</label>
                  <input
                    type="text"
                    value={checklist.water_reading ?? ""}
                    onChange={(e) => updateChecklist("water_reading", e.target.value)}
                    placeholder="—"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 dir-ltr"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <DoorOpen className="w-4 h-4" />
                حالة الغرف والمرافق
              </h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">الصالة</label>
                <div className="flex flex-wrap gap-4 items-center">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="living_room" checked={checklist.living_room_condition === "ok"} onChange={() => updateChecklist("living_room_condition", "ok")} className="text-amber-600" />
                    <span className="text-sm">سليم</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="living_room" checked={checklist.living_room_condition === "defect"} onChange={() => updateChecklist("living_room_condition", "defect")} className="text-amber-600" />
                    <span className="text-sm">يوجد عيب</span>
                  </label>
                  <input
                    type="text"
                    value={checklist.living_room_notes ?? ""}
                    onChange={(e) => updateChecklist("living_room_notes", e.target.value)}
                    placeholder="ملاحظات"
                    className="flex-1 min-w-[180px] border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {Array.from({ length: roomsCount }, (_, i) => (
                <div key={i}>
                  <label className="block text-sm font-medium text-slate-700 mb-2">غرفة النوم {roomsCount > 1 ? i + 1 : ""}</label>
                  <div className="flex flex-wrap gap-4 items-center">
                    <label className="inline-flex items-center gap-2">
                      <input type="radio" name={`bedroom_${i}`} checked={(checklist.bedrooms?.[i]?.condition ?? "ok") === "ok"} onChange={() => updateBedroom(i, "condition", "ok")} className="text-amber-600" />
                      <span className="text-sm">سليم</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="radio" name={`bedroom_${i}`} checked={(checklist.bedrooms?.[i]?.condition ?? "ok") === "defect"} onChange={() => updateBedroom(i, "condition", "defect")} className="text-amber-600" />
                      <span className="text-sm">يوجد عيب</span>
                    </label>
                    <input
                      type="text"
                      value={checklist.bedrooms?.[i]?.notes ?? ""}
                      onChange={(e) => updateBedroom(i, "notes", e.target.value)}
                      placeholder="ملاحظات"
                      className="flex-1 min-w-[180px] border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">المطبخ</label>
                <div className="flex flex-wrap gap-4 items-center">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="kitchen" checked={checklist.kitchen_condition === "ok"} onChange={() => updateChecklist("kitchen_condition", "ok")} className="text-amber-600" />
                    <span className="text-sm">سليم</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="kitchen" checked={checklist.kitchen_condition === "defect"} onChange={() => updateChecklist("kitchen_condition", "defect")} className="text-amber-600" />
                    <span className="text-sm">يوجد عيب</span>
                  </label>
                  <input
                    type="text"
                    value={checklist.kitchen_notes ?? ""}
                    onChange={(e) => updateChecklist("kitchen_notes", e.target.value)}
                    placeholder="ملاحظات"
                    className="flex-1 min-w-[180px] border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {Array.from({ length: bathroomsCount }, (_, i) => (
                <div key={i}>
                  <label className="block text-sm font-medium text-slate-700 mb-2">دورة المياه {bathroomsCount > 1 ? i + 1 : ""}</label>
                  <div className="flex flex-wrap gap-4 items-center">
                    <label className="inline-flex items-center gap-2">
                      <input type="radio" name={`bath_${i}`} checked={(checklist.bathrooms?.[i]?.condition ?? "ok") === "ok"} onChange={() => updateBathroom(i, "condition", "ok")} className="text-amber-600" />
                      <span className="text-sm">سليم</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="radio" name={`bath_${i}`} checked={(checklist.bathrooms?.[i]?.condition ?? "ok") === "defect"} onChange={() => updateBathroom(i, "condition", "defect")} className="text-amber-600" />
                      <span className="text-sm">يوجد عيب</span>
                    </label>
                    <input
                      type="text"
                      value={checklist.bathrooms?.[i]?.notes ?? ""}
                      onChange={(e) => updateBathroom(i, "notes", e.target.value)}
                      placeholder="ملاحظات"
                      className="flex-1 min-w-[180px] border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><Layers className="w-4 h-4" /> الأسقف والجبس</label>
                <div className="flex flex-wrap gap-4 items-center">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="ceilings_gypsum" checked={checklist.ceilings_gypsum_condition === "ok"} onChange={() => updateChecklist("ceilings_gypsum_condition", "ok")} className="text-amber-600" />
                    <span className="text-sm">سليم</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="ceilings_gypsum" checked={checklist.ceilings_gypsum_condition === "defect"} onChange={() => updateChecklist("ceilings_gypsum_condition", "defect")} className="text-amber-600" />
                    <span className="text-sm">يوجد عيب</span>
                  </label>
                  <input
                    type="text"
                    value={checklist.ceilings_gypsum_notes ?? ""}
                    onChange={(e) => updateChecklist("ceilings_gypsum_notes", e.target.value)}
                    placeholder="ملاحظات"
                    className="flex-1 min-w-[180px] border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><LayoutGrid className="w-4 h-4" /> الأرضيات والسيراميك</label>
                <div className="flex flex-wrap gap-4 items-center">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="ceramic_floors" checked={checklist.ceramic_floors_condition === "ok"} onChange={() => updateChecklist("ceramic_floors_condition", "ok")} className="text-amber-600" />
                    <span className="text-sm">سليم</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="ceramic_floors" checked={checklist.ceramic_floors_condition === "defect"} onChange={() => updateChecklist("ceramic_floors_condition", "defect")} className="text-amber-600" />
                    <span className="text-sm">يوجد عيب</span>
                  </label>
                  <input
                    type="text"
                    value={checklist.ceramic_floors_notes ?? ""}
                    onChange={(e) => updateChecklist("ceramic_floors_notes", e.target.value)}
                    placeholder="ملاحظات"
                    className="flex-1 min-w-[180px] border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><Plug className="w-4 h-4" /> الأفياش والكهرباء</label>
                <div className="flex flex-wrap gap-4 items-center">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="electrical_outlets" checked={checklist.electrical_outlets_condition === "ok"} onChange={() => updateChecklist("electrical_outlets_condition", "ok")} className="text-amber-600" />
                    <span className="text-sm">سليم</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="electrical_outlets" checked={checklist.electrical_outlets_condition === "defect"} onChange={() => updateChecklist("electrical_outlets_condition", "defect")} className="text-amber-600" />
                    <span className="text-sm">يوجد عيب</span>
                  </label>
                  <input
                    type="text"
                    value={checklist.electrical_outlets_notes ?? ""}
                    onChange={(e) => updateChecklist("electrical_outlets_notes", e.target.value)}
                    placeholder="ملاحظات"
                    className="flex-1 min-w-[180px] border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><Lightbulb className="w-4 h-4" /> الإنارات والليدات</label>
                <div className="flex flex-wrap gap-4 items-center">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="lighting" checked={checklist.lighting_condition === "ok"} onChange={() => updateChecklist("lighting_condition", "ok")} className="text-amber-600" />
                    <span className="text-sm">سليم</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="lighting" checked={checklist.lighting_condition === "defect"} onChange={() => updateChecklist("lighting_condition", "defect")} className="text-amber-600" />
                    <span className="text-sm">يوجد عيب</span>
                  </label>
                  <input
                    type="text"
                    value={checklist.lighting_notes ?? ""}
                    onChange={(e) => updateChecklist("lighting_notes", e.target.value)}
                    placeholder="ملاحظات"
                    className="flex-1 min-w-[180px] border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><Bath className="w-4 h-4" /> الأدوات الصحية</label>
                <div className="flex flex-wrap gap-4 items-center">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="sanitary_fixtures" checked={checklist.sanitary_fixtures_condition === "ok"} onChange={() => updateChecklist("sanitary_fixtures_condition", "ok")} className="text-amber-600" />
                    <span className="text-sm">سليم</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="sanitary_fixtures" checked={checklist.sanitary_fixtures_condition === "defect"} onChange={() => updateChecklist("sanitary_fixtures_condition", "defect")} className="text-amber-600" />
                    <span className="text-sm">يوجد عيب</span>
                  </label>
                  <input
                    type="text"
                    value={checklist.sanitary_fixtures_notes ?? ""}
                    onChange={(e) => updateChecklist("sanitary_fixtures_notes", e.target.value)}
                    placeholder="ملاحظات (مغاسل، كرسي الحمام، خلاطات...)"
                    className="flex-1 min-w-[180px] border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">الأبواب والنوافذ</label>
                <div className="flex flex-wrap gap-4 items-center">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="dw" checked={checklist.doors_windows === "ok"} onChange={() => updateChecklist("doors_windows", "ok")} className="text-amber-600" />
                    <span className="text-sm">سليم</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="dw" checked={checklist.doors_windows === "defect"} onChange={() => updateChecklist("doors_windows", "defect")} className="text-amber-600" />
                    <span className="text-sm">يوجد عيب</span>
                  </label>
                  <input
                    type="text"
                    value={checklist.doors_windows_notes ?? ""}
                    onChange={(e) => updateChecklist("doors_windows_notes", e.target.value)}
                    placeholder="ملاحظات"
                    className="flex-1 min-w-[180px] border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><PaintBucket className="w-4 h-4" /> الدهان والجدران</label>
                <div className="flex flex-wrap gap-4 items-center">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="paint" checked={checklist.paint_condition === "ok"} onChange={() => updateChecklist("paint_condition", "ok")} className="text-amber-600" />
                    <span className="text-sm">سليم</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="paint" checked={checklist.paint_condition === "defect"} onChange={() => updateChecklist("paint_condition", "defect")} className="text-amber-600" />
                    <span className="text-sm">يوجد عيب</span>
                  </label>
                  <input
                    type="text"
                    value={checklist.paint_notes ?? ""}
                    onChange={(e) => updateChecklist("paint_notes", e.target.value)}
                    placeholder="ملاحظات"
                    className="flex-1 min-w-[180px] border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> عيوب أو ملاحظات إضافية</label>
                <textarea
                  value={checklist.defects ?? ""}
                  onChange={(e) => updateChecklist("defects", e.target.value)}
                  placeholder="أي عيوب أو ملاحظات أخرى..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </section>

            <section>
              <label className="block text-sm font-medium text-slate-700 mb-2">توقيع المستلم</label>
              <div className="border-b-2 border-slate-300 min-h-[3rem]" />
              <p className="text-xs text-slate-600 mt-4 leading-relaxed">
                <strong>ملاحظة:</strong> يعدّ هذا الاستلام بمثابة معاينة تامة لحالة الوحدة من قبل المستلم. وبالتوقيع أعلاه يُقر المستلم باستلام الوحدة بحالتها الراهنة وخلو مسؤولية الشركة من أي التزامات لاحقة تتعلق بحالة الوحدة أو عيوب الاستخدام التي قد تظهر بعد تاريخ التوقيع.
              </p>
            </section>

            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100 print:hidden">
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-60"
              >
                <ClipboardCheck className="w-4 h-4" />
                {saving ? "جاري الحفظ..." : "حفظ وإكمال الاستلام"}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-60"
              >
                حفظ كمسودة
              </button>
              <Link
                href="/dashboard/sales"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50"
              >
                إلغاء
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
