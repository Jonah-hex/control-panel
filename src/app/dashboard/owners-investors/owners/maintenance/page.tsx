"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { showToast } from "@/app/dashboard/buildings/details/toast";
import {
  ArrowRight,
  Wrench,
  Plus,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  ChevronDown,
  X,
  Building2,
  Home,
} from "lucide-react";

type Priority = "urgent" | "high" | "normal" | "low";
type Status = "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
type Category = "electrical" | "plumbing" | "hvac" | "carpentry" | "general" | string;

interface MaintenanceRequest {
  id: string;
  building_id: string;
  unit_id: string | null;
  title: string;
  description: string;
  priority: Priority | null;
  category: Category | null;
  status: Status | null;
  request_date: string;
  scheduled_date: string | null;
  completion_date: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  notes: string | null;
  completion_notes: string | null;
  created_at: string;
  updated_at: string;
}

const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: "عاجل",
  high: "عالية",
  normal: "عادي",
  low: "منخفضة",
};

const STATUS_LABELS: Record<Status, string> = {
  pending: "قيد الانتظار",
  assigned: "معيّن",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const CATEGORY_LABELS: Record<string, string> = {
  electrical: "كهرباء",
  plumbing: "سباكة",
  hvac: "تكييف",
  carpentry: "نجارة",
  general: "عام",
};

export default function UnitMaintenancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { can, ready, effectiveOwnerId } = useDashboardAuth();

  const unitId = searchParams.get("unitId");
  const buildingId = searchParams.get("buildingId");

  const [unit, setUnit] = useState<{ unit_number: string; floor: number } | null>(null);
  const [buildingName, setBuildingName] = useState<string>("");
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "general" as Category,
    priority: "normal" as Priority,
    scheduled_date: "",
  });

  useEffect(() => {
    if (!ready) return;
    if (!can("owners_view")) {
      router.replace("/dashboard");
      return;
    }
    if (!unitId || !buildingId) {
      router.replace("/dashboard/owners-investors/owners");
      return;
    }
  }, [ready, can, router, unitId, buildingId]);

  useEffect(() => {
    if (!unitId || !buildingId || !effectiveOwnerId) return;

    const fetch = async () => {
      setLoading(true);
      try {
        const [unitRes, buildingRes, requestsRes] = await Promise.all([
          supabase.from("units").select("unit_number, floor").eq("id", unitId).eq("building_id", buildingId).single(),
          supabase.from("buildings").select("name").eq("id", buildingId).eq("owner_id", effectiveOwnerId).single(),
          supabase
            .from("maintenance_requests")
            .select("*")
            .eq("unit_id", unitId)
            .eq("building_id", buildingId)
            .order("request_date", { ascending: false }),
        ]);

        if (unitRes.data) setUnit(unitRes.data as { unit_number: string; floor: number });
        if (buildingRes.data) setBuildingName((buildingRes.data as { name: string }).name || "");
        if (requestsRes.data) setRequests((requestsRes.data as MaintenanceRequest[]) || []);
      } catch {
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [unitId, buildingId, effectiveOwnerId, supabase]);

  const filteredRequests = useMemo(() => {
    if (statusFilter === "all") return requests;
    return requests.filter((r) => r.status === statusFilter);
  }, [requests, statusFilter]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const inSevenDays = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }, []);

  const overdue = useMemo(
    () =>
      requests.filter(
        (r) =>
          r.scheduled_date &&
          r.scheduled_date < today &&
          r.status !== "completed" &&
          r.status !== "cancelled"
      ),
    [requests, today]
  );
  const upcoming = useMemo(
    () =>
      requests.filter(
        (r) =>
          r.scheduled_date &&
          r.scheduled_date >= today &&
          r.scheduled_date <= inSevenDays &&
          r.status !== "completed" &&
          r.status !== "cancelled"
      ),
    [requests, today, inSevenDays]
  );
  const openCount = useMemo(
    () => requests.filter((r) => r.status !== "completed" && r.status !== "cancelled").length,
    [requests]
  );
  const completedCount = useMemo(
    () =>
      requests.filter(
        (r) =>
          r.status === "completed" &&
          r.completion_date &&
          r.completion_date.slice(0, 7) === today.slice(0, 7)
      ).length,
    [requests, today]
  );

  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!unitId || !buildingId) {
      showToast("بيانات الوحدة غير متوفرة");
      return;
    }
    if (!title) {
      showToast("أدخل عنوان الطلب");
      return;
    }
    if (!unit) {
      showToast("تم التحميل بعد — حاول مرة أخرى");
      return;
    }
    setSaving(true);
    try {
      const { data: unitRow, error: unitError } = await supabase
        .from("units")
        .select("id, building_id")
        .eq("id", unitId)
        .maybeSingle();
      if (unitError || !unitRow) {
        showToast("الوحدة غير موجودة");
        setSaving(false);
        return;
      }
      const resolvedBuildingId = (unitRow as { id: string; building_id: string }).building_id;
      if (!resolvedBuildingId) {
        showToast("الوحدة غير مرتبطة بعمارة");
        setSaving(false);
        return;
      }
      const desc = (form.description.trim() || title).slice(0, 5000);
      const scheduledDate =
        form.scheduled_date && form.scheduled_date.trim() && /^\d{4}-\d{2}-\d{2}$/.test(form.scheduled_date.trim())
          ? form.scheduled_date.trim()
          : null;
      const payload = {
        building_id: resolvedBuildingId,
        unit_id: unitId,
        title: title.slice(0, 255),
        description: desc,
        category: form.category || "general",
        priority: form.priority || "normal",
        status: "pending",
        ...(scheduledDate && { scheduled_date: scheduledDate }),
      };
      const { error } = await supabase.from("maintenance_requests").insert(payload);
      if (error) {
        showToast(error.message || "فشل إضافة الطلب");
        setSaving(false);
        return;
      }
      showToast("تم إضافة طلب الصيانة");
      setShowAddModal(false);
      setForm({ title: "", description: "", category: "general", priority: "normal", scheduled_date: "" });
      const { data: list } = await supabase
        .from("maintenance_requests")
        .select("*")
        .eq("unit_id", unitId)
        .eq("building_id", resolvedBuildingId)
        .order("request_date", { ascending: false });
      if (list) setRequests(list as MaintenanceRequest[]);
    } catch {
      showToast("فشل إضافة الطلب");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: Status, completion_date?: string) => {
    try {
      const { error } = await supabase
        .from("maintenance_requests")
        .update({
          status,
          completion_date: status === "completed" ? (completion_date || new Date().toISOString().slice(0, 10)) : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      showToast(status === "completed" ? "تم إكمال الطلب" : "تم تحديث الحالة");
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status,
                completion_date: status === "completed" ? (completion_date || today) : null,
                updated_at: new Date().toISOString(),
              }
            : r
        )
      );
    } catch {
      showToast("فشل التحديث");
    }
  };

  if (!unitId || !buildingId) return null;
  if (!ready || !can("owners_view")) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50/30 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/owners-investors/owners"
              className="inline-flex items-center gap-2 text-slate-600 hover:text-emerald-700 text-sm font-medium"
            >
              <ArrowRight className="w-4 h-4" />
              الملاك
            </Link>
            <span className="text-slate-300">|</span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Wrench className="w-6 h-6 text-emerald-600" />
              صيانة الوحدة
            </h1>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center text-slate-500">
            جاري التحميل...
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-slate-700">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold">{buildingName || "—"}</span>
                <span className="text-slate-400">·</span>
                <Home className="w-4 h-4 text-slate-500" />
                <span>الوحدة {unit?.unit_number ?? "—"} (د{unit?.floor ?? "—"})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                disabled={!unit}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                إضافة طلب صيانة
              </button>
            </div>

            {/* تنبيهات */}
            {(overdue.length > 0 || upcoming.length > 0) && (
              <div className="space-y-3 mb-6">
                {overdue.length > 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-800">طلبات متأخرة ({overdue.length})</p>
                      <p className="text-sm text-red-700 mt-0.5">
                        الموعد المحدد مرّ ولم تُنجز — يفضّل المتابعة أو تحديد موعد جديد.
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-red-800">
                        {overdue.slice(0, 5).map((r) => (
                          <li key={r.id}>
                            {r.title}
                            {r.scheduled_date && (
                              <span className="text-red-600 mr-2">— {r.scheduled_date}</span>
                            )}
                          </li>
                        ))}
                        {overdue.length > 5 && <li>+{overdue.length - 5} أخرى</li>}
                      </ul>
                    </div>
                  </div>
                )}
                {upcoming.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-800">قادمة خلال 7 أيام ({upcoming.length})</p>
                      <ul className="mt-2 space-y-1 text-sm text-amber-800">
                        {upcoming.slice(0, 5).map((r) => (
                          <li key={r.id}>
                            {r.title}
                            {r.scheduled_date && (
                              <span className="text-amber-600 mr-2">— {r.scheduled_date}</span>
                            )}
                          </li>
                        ))}
                        {upcoming.length > 5 && <li>+{upcoming.length - 5} أخرى</li>}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* إحصائيات سريعة */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="rounded-xl bg-white border border-slate-100 p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">مفتوحة</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{openCount}</p>
              </div>
              <div className="rounded-xl bg-white border border-slate-100 p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">مكتملة هذا الشهر</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{completedCount}</p>
              </div>
              <div className="rounded-xl bg-white border border-red-100 p-4 shadow-sm">
                <p className="text-xs font-medium text-red-600 uppercase tracking-wide">متأخرة</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{overdue.length}</p>
              </div>
              <div className="rounded-xl bg-white border border-amber-100 p-4 shadow-sm">
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">قادمة</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{upcoming.length}</p>
              </div>
            </div>

            {/* فلتر الحالة */}
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="all">كل الحالات</option>
                {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 -ml-6 pointer-events-none" />
            </div>

            {/* قائمة الطلبات */}
            <section className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-800">طلبات الصيانة ({filteredRequests.length})</h2>
              </div>
              <div className="overflow-x-auto">
                {filteredRequests.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    لا توجد طلبات صيانة لهذه الوحدة. اضغط "إضافة طلب صيانة" لإنشاء أول طلب.
                  </div>
                ) : (
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-3 text-slate-600 font-semibold text-sm">العنوان</th>
                        <th className="p-3 text-slate-600 font-semibold text-sm">النوع</th>
                        <th className="p-3 text-slate-600 font-semibold text-sm">الأولوية</th>
                        <th className="p-3 text-slate-600 font-semibold text-sm">الحالة</th>
                        <th className="p-3 text-slate-600 font-semibold text-sm">الموعد</th>
                        <th className="p-3 text-slate-600 font-semibold text-sm">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map((r) => (
                        <tr key={r.id} className="border-b border-slate-50 hover:bg-emerald-50/30 transition">
                          <td className="p-3 font-medium text-slate-800">{r.title}</td>
                          <td className="p-3 text-slate-600 text-sm">
                            {r.category ? (CATEGORY_LABELS[r.category] ?? r.category) : "—"}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${
                                r.priority === "urgent"
                                  ? "bg-red-100 text-red-800"
                                  : r.priority === "high"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {r.priority ? PRIORITY_LABELS[r.priority] ?? r.priority : "—"}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${
                                r.status === "completed"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : r.status === "cancelled"
                                    ? "bg-slate-100 text-slate-500"
                                    : r.status === "in_progress"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-amber-50 text-amber-800"
                              }`}
                            >
                              {r.status === "completed" && <CheckCircle className="w-3.5 h-3.5" />}
                              {r.status === "pending" && <Clock className="w-3.5 h-3.5" />}
                              {r.status === "cancelled" && <XCircle className="w-3.5 h-3.5" />}
                              {r.status ? STATUS_LABELS[r.status] ?? r.status : "—"}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 text-sm dir-ltr">
                            {r.scheduled_date ?? (r.completion_date ? `تم ${r.completion_date}` : "—")}
                          </td>
                          <td className="p-3">
                            {r.status !== "completed" && r.status !== "cancelled" && (
                              <div className="flex flex-wrap gap-1">
                                <button
                                  type="button"
                                  onClick={() => updateStatus(r.id, "in_progress")}
                                  className="px-2 py-1 rounded-lg bg-blue-100 text-blue-800 text-xs font-medium hover:bg-blue-200"
                                >
                                  قيد التنفيذ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateStatus(r.id, "completed")}
                                  className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-medium hover:bg-emerald-200"
                                >
                                  إكمال
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateStatus(r.id, "cancelled")}
                                  className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200"
                                >
                                  إلغاء
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      {/* modal إضافة طلب */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 cursor-pointer"
          onClick={() => !saving && setShowAddModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">إضافة طلب صيانة</h3>
              <button
                type="button"
                onClick={() => !saving && setShowAddModal(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">عنوان الطلب *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  placeholder="مثال: إصلاح تسرب المياه"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الوصف</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 min-h-[80px]"
                  placeholder="تفاصيل إضافية..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">النوع</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as Category }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800"
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الأولوية</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as Priority }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800"
                >
                  {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">موعد التنفيذ (اختياري)</label>
                <input
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) => setForm((p) => ({ ...p, scheduled_date: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 dir-ltr"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.title.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? "جاري الحفظ..." : "إضافة الطلب"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
