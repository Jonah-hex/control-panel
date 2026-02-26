"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Building2, ArrowRight, User, Zap, DoorOpen } from "lucide-react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { showToast } from "@/app/dashboard/buildings/details/toast";

function EditUnitPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const unitId = searchParams.get("unitId");
  const { can, ready } = useDashboardAuth();

  useEffect(() => {
    if (!ready) return;
    if (!can("units_edit")) {
      showToast("ليس لديك صلاحية تعديل الوحدات.", "error");
      router.replace("/dashboard/units");
    }
  }, [ready, can, router]);
  const [unit, setUnit] = useState<Record<string, unknown> | null>(null);
  const [building, setBuilding] = useState<{ id: string; name?: string; owner_name?: string | null } | null>(null);
  const [form, setForm] = useState({
    unit_number: "",
    floor: "",
    status: "",
    type: "",
    facing: "",
    area: "",
    rooms: "",
    bathrooms: "",
    living_rooms: "",
    kitchens: "",
    maid_room: false,
    driver_room: false,
    ac_type: "",
    price: "",
    description: "",
    owner_name: "",
    electricity_meter_number: "",
    building_id: "",
    entrances: "1",
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!unitId) {
      setFetching(false);
      setError("معرف الوحدة غير موجود في الرابط");
      return;
    }
    const supabase = createClient();
    setFetching(true);
    setError("");

    supabase
      .from("units")
      .select("*")
      .eq("id", unitId)
      .single()
      .then(async ({ data, error: fetchError }) => {
        setFetching(false);
        if (fetchError) {
          setError("تعذر جلب بيانات الوحدة: " + (fetchError.message || "خطأ غير معروف"));
          return;
        }
        if (!data) {
          setError("الوحدة غير موجودة");
          return;
        }
        setUnit(data);
        const bid = String(data.building_id ?? "");
        if (bid) {
          const { data: bData } = await supabase.from("buildings").select("id, name, owner_name").eq("id", bid).single();
          setBuilding(bData ? { id: String(bData.id), name: String(bData.name ?? ""), owner_name: bData.owner_name ?? null } : { id: bid, name: "", owner_name: null });
        } else {
          setBuilding(null);
        }
        setForm({
          unit_number: String(data.unit_number ?? ""),
          floor: String(data.floor ?? ""),
          status: String(data.status ?? "available"),
          type: String(data.type ?? "apartment"),
          facing: String(data.facing ?? "front"),
          area: data.area != null ? String(data.area) : "",
          rooms: data.rooms != null ? String(data.rooms) : "",
          bathrooms: data.bathrooms != null ? String(data.bathrooms) : "",
          living_rooms: data.living_rooms != null ? String(data.living_rooms) : "",
          kitchens: data.kitchens != null ? String(data.kitchens) : "",
          maid_room: !!data.maid_room,
          driver_room: !!data.driver_room,
          ac_type: String(data.ac_type ?? ""),
          price: data.price != null ? String(data.price) : "",
          description: String(data.description ?? ""),
          owner_name: String(data.owner_name ?? ""),
          electricity_meter_number: String(data.electricity_meter_number ?? ""),
          building_id: String(data.building_id ?? ""),
          entrances: data.entrances != null ? String(data.entrances) : "1",
        });
      });
  }, [unitId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, type, value } = e.target;
    if (type === "checkbox") {
      setForm({ ...form, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const toNum = (v: string): number | null => {
    const s = String(v || "").trim();
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const formatPriceWithCommas = (n: number) => (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const parsePriceInput = (s: string) => parseInt(String(s).replace(/[^\d]/g, "")) || 0;

  const performSave = async () => {
    if (!unitId || !form.building_id) return;
    setLoading(true);
    setError("");
    setToast(null);

    const supabase = createClient();
    const updateData: Record<string, unknown> = {
      type: form.type || "apartment",
      facing: form.facing || "front",
      area: toNum(form.area) ?? 0,
      rooms: toNum(form.rooms) ?? 1,
      bathrooms: toNum(form.bathrooms) ?? 1,
      living_rooms: toNum(form.living_rooms) ?? 1,
      kitchens: toNum(form.kitchens) ?? 1,
      owner_name: form.owner_name.trim() || null,
      maid_room: !!form.maid_room,
      driver_room: !!form.driver_room,
      ac_type: form.ac_type || null,
      entrances: toNum(form.entrances) ?? 1,
      price: toNum(form.price) ?? null,
      description: form.description.trim() || null,
      electricity_meter_number: form.electricity_meter_number.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase.from("units").update(updateData).eq("id", unitId);

    if (updateError) {
      setToast({ message: "تعذر حفظ التعديلات: " + (updateError.message || "خطأ غير معروف"), type: "error" });
      setLoading(false);
      return;
    }

    const { count } = await supabase
      .from("units")
      .select("*", { count: "exact", head: true })
      .eq("building_id", form.building_id)
      .eq("status", "reserved");

    await supabase
      .from("buildings")
      .update({ reserved_units: count ?? 0, updated_at: new Date().toISOString() })
      .eq("id", form.building_id);

    setToast({ message: "تم حفظ التعديلات بنجاح", type: "success" });
    setLoading(false);
    setTimeout(() => router.push(`/dashboard/units?buildingId=${form.building_id}`), 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitId || !form.building_id) {
      setError("بيانات غير كاملة للتحديث");
      return;
    }
    await performSave();
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex justify-center items-center">
        <div className="animate-spin w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!unitId || (error && !unit)) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-8 mt-8 border border-gray-200">
        <div className="text-red-600 mb-4">{error || "معرف الوحدة غير صحيح"}</div>
        <Link href="/dashboard/units" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">
          <ArrowRight className="w-4 h-4" />
          رجوع لقائمة الوحدات
        </Link>
      </div>
    );
  }

  if (ready && !can("units_edit")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <p className="text-gray-500">جاري التحويل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      {/* تنبيه يظهر بعد الحفظ */}
      {toast && (
        <div
          role="alert"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-6 py-4 rounded-xl text-white font-bold shadow-lg animate-in fade-in duration-300"
          style={{
            background: toast.type === "success" ? "rgba(16, 185, 129, 0.95)" : "rgba(220, 38, 38, 0.95)",
          }}
        >
          {toast.message}
        </div>
      )}

      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-full h-12 w-12 bg-gradient-to-br from-emerald-400 to-emerald-600">
              <Building2 className="text-white w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">تعديل بيانات الوحدة</h2>
              <p className="text-sm text-gray-500">
                الوحدة {form.unit_number} — الدور {form.floor}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {form.status === "sold" && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm font-medium">
              الوحدة مباعة — العرض فقط، لا يمكن تعديل البيانات
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-bold mb-1">رقم الوحدة</label>
              <input name="unit_number" value={form.unit_number} readOnly className="w-full border border-gray-200 rounded-xl px-4 py-2 bg-gray-50" />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1">الدور</label>
              <input name="floor" value={form.floor} readOnly className="w-full border border-gray-200 rounded-xl px-4 py-2 bg-gray-50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-bold mb-1">نوع الوحدة</label>
              <select name="type" value={form.type} onChange={handleChange} disabled={form.status === "sold"} className={`w-full border border-gray-200 rounded-xl px-4 py-2 ${form.status === "sold" ? "bg-gray-100 cursor-not-allowed" : ""}`}>
                <option value="apartment">شقة</option>
                <option value="studio">ملحق</option>
                <option value="duplex">دوبلكس</option>
                <option value="penthouse">بنتهاوس</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1">واجهة الوحدة</label>
              <select name="facing" value={form.facing} onChange={handleChange} disabled={form.status === "sold"} className={`w-full border border-gray-200 rounded-xl px-4 py-2 ${form.status === "sold" ? "bg-gray-100 cursor-not-allowed" : ""}`}>
                <option value="front">أمامية</option>
                <option value="back">خلفية</option>
                <option value="corner">زاوية</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <User className="w-5 h-5 text-emerald-500" />
            <label className="block text-gray-700 font-bold">اسم المالك</label>
          </div>
          <input
            name="owner_name"
            value={unit?.status === "sold" ? (form.owner_name || "") : (building?.owner_name || form.owner_name || "")}
            readOnly
            placeholder="اسم المالك (من بيانات العمارة)"
            className="w-full border border-gray-200 rounded-xl px-4 py-2 bg-gray-50 cursor-not-allowed"
          />

          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <Zap className="w-5 h-5 text-amber-500" />
            <label className="block text-gray-700 font-bold">رقم عداد الكهرباء</label>
          </div>
          <input
            name="electricity_meter_number"
            value={form.electricity_meter_number}
            onChange={handleChange}
            disabled={form.status === "sold"}
            placeholder="رقم العداد"
            className={`w-full border border-gray-200 rounded-xl px-4 py-2 ${form.status === "sold" ? "bg-gray-100 cursor-not-allowed" : ""}`}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-gray-700 font-bold mb-1">المساحة (م²)</label>
              <input name="area" value={form.area} onChange={handleChange} type="number" min={0} disabled={form.status === "sold"} className={`w-full border border-gray-200 rounded-xl px-4 py-2 ${form.status === "sold" ? "bg-gray-100 cursor-not-allowed" : ""}`} />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1">الغرف</label>
              <input name="rooms" value={form.rooms} onChange={handleChange} type="number" min={0} disabled={form.status === "sold"} className={`w-full border border-gray-200 rounded-xl px-4 py-2 ${form.status === "sold" ? "bg-gray-100 cursor-not-allowed" : ""}`} />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1">الحمامات</label>
              <input name="bathrooms" value={form.bathrooms} onChange={handleChange} type="number" min={0} disabled={form.status === "sold"} className={`w-full border border-gray-200 rounded-xl px-4 py-2 ${form.status === "sold" ? "bg-gray-100 cursor-not-allowed" : ""}`} />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1">المطابخ</label>
              <input name="kitchens" value={form.kitchens} onChange={handleChange} type="number" min={0} disabled={form.status === "sold"} className={`w-full border border-gray-200 rounded-xl px-4 py-2 ${form.status === "sold" ? "bg-gray-100 cursor-not-allowed" : ""}`} />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <DoorOpen className="w-5 h-5 text-orange-500" />
            <label className="block text-gray-700 font-bold">عدد المداخل</label>
          </div>
          <input
            name="entrances"
            value={form.entrances}
            onChange={handleChange}
            type="number"
            min={1}
            disabled={form.status === "sold"}
            className={`w-full border border-gray-200 rounded-xl px-4 py-2 ${form.status === "sold" ? "bg-gray-100 cursor-not-allowed" : ""}`}
          />

          <div>
            <label className="block text-gray-700 font-bold mb-1">غرف المعيشة</label>
            <input name="living_rooms" value={form.living_rooms} onChange={handleChange} type="number" min={0} disabled={form.status === "sold"} className={`w-full border border-gray-200 rounded-xl px-4 py-2 ${form.status === "sold" ? "bg-gray-100 cursor-not-allowed" : ""}`} />
          </div>

          <div className="flex gap-6">
            <label className={`flex items-center gap-2 ${form.status === "sold" ? "cursor-not-allowed opacity-75" : ""}`}>
              <input name="maid_room" type="checkbox" checked={form.maid_room} onChange={handleChange} disabled={form.status === "sold"} className="rounded" />
              <span className="font-medium text-gray-700">غرفة خادمة</span>
            </label>
            <label className={`flex items-center gap-2 ${form.status === "sold" ? "cursor-not-allowed opacity-75" : ""}`}>
              <input name="driver_room" type="checkbox" checked={form.driver_room} onChange={handleChange} disabled={form.status === "sold"} className="rounded" />
              <span className="font-medium text-gray-700">غرفة سائق</span>
            </label>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-1">نوع التكييف</label>
            <select name="ac_type" value={form.ac_type} onChange={handleChange} disabled={form.status === "sold"} className={`w-full border border-gray-200 rounded-xl px-4 py-2 ${form.status === "sold" ? "bg-gray-100 cursor-not-allowed" : ""}`}>
              <option value="">اختر</option>
              <option value="split">سبليت</option>
              <option value="window">شباك</option>
              <option value="splitWindow">سبليت/شباك</option>
              <option value="central">مركزي</option>
              <option value="none">بدون تكييف</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-1">السعر (ر.س)</label>
            <input
              name="price"
              type="text"
              inputMode="numeric"
              value={form.price ? formatPriceWithCommas(parsePriceInput(form.price)) : ""}
              onChange={(e) => setForm({ ...form, price: String(parsePriceInput(e.target.value)) })}
              placeholder="السعر"
              disabled={form.status === "sold"}
              className={`w-full border border-gray-200 rounded-xl px-4 py-2 ${form.status === "sold" ? "bg-gray-100 cursor-not-allowed" : ""}`}
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-1">وصف الوحدة</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={2} placeholder="وصف اختياري" disabled={form.status === "sold"} className={`w-full border border-gray-200 rounded-xl px-4 py-2 ${form.status === "sold" ? "bg-gray-100 cursor-not-allowed" : ""}`} />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {form.status !== "sold" && (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-70 transition"
              >
                {loading ? "جاري الحفظ..." : "حفظ التعديلات"}
              </button>
            )}
            <Link
              href={form.building_id ? `/dashboard/units?buildingId=${form.building_id}` : "/dashboard/units"}
              className={`inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition ${form.status === "sold" ? "flex-1" : ""}`}
            >
              <ArrowRight className="w-4 h-4" />
              {form.status === "sold" ? "رجوع لقائمة الوحدات" : "إلغاء"}
            </Link>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-xs text-gray-500">
          <div>تاريخ الإضافة: {unit?.created_at ? new Date(String(unit.created_at)).toLocaleString("ar-SA") : "—"}</div>
          <div>آخر تعديل: {unit?.updated_at ? new Date(String(unit.updated_at)).toLocaleString("ar-SA") : "—"}</div>
        </div>
      </div>
    </div>
  );
}

export default function EditUnitPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex justify-center items-center">
        <div className="animate-spin w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    }>
      <EditUnitPageContent />
    </Suspense>
  );
}
