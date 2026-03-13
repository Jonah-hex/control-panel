"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Plus,
  LayoutDashboard,
  Building2,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  Eye,
  FileText,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { showToast } from "@/app/dashboard/buildings/details/toast";

type AppointmentType =
  | "handover_appointment"
  | "inspector_viewing"
  | "engineering_review"
  | "unit_delivery"
  | "viewing"
  | "maintenance"
  | "marketing"
  | "contract_signing"
  | "other";
type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";
type AppointmentPriority = "low" | "normal" | "high" | "urgent";

interface Appointment {
  id: string;
  owner_id: string;
  title: string;
  scheduled_at: string;
  type: AppointmentType;
  building_id: string | null;
  notes: string | null;
  status: AppointmentStatus;
  priority?: AppointmentPriority;
  created_at: string;
  created_by?: string | null;
  created_by_name?: string | null;
  buildings?: { id: string; name: string }[] | null;
}

const TYPE_LABELS: Record<AppointmentType, string> = {
  handover_appointment: "موعد افراغ",
  inspector_viewing: "معاينة فاحص",
  engineering_review: "مراجعه مكتب هندسي",
  unit_delivery: "تسليم وحدة",
  viewing: "معاينة",
  maintenance: "صيانة",
  marketing: "تسويق",
  contract_signing: "توقيع عقد",
  other: "أخرى",
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "مجدول",
  completed: "منتهي",
  cancelled: "ملغي",
  no_show: "لم يحضر",
};

const PRIORITY_LABELS: Record<AppointmentPriority, string> = {
  low: "منخفض",
  normal: "عادي",
  high: "عالي — تنبيه حرج عند اقتراب الموعد",
  urgent: "عاجل — تنبيه حرج",
};

export default function AppointmentsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { can, ready, effectiveOwnerId, currentUserDisplayName } = useDashboardAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [buildings, setBuildings] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    scheduled_at: "",
    scheduled_time: "09:00",
    type: "viewing" as AppointmentType,
    building_id: "",
    notes: "",
    priority: "normal" as AppointmentPriority,
  });
  const [saving, setSaving] = useState(false);
  const [viewingAppointment, setViewingAppointment] = useState<Appointment | null>(null);

  const canEdit = can("marketing_edit");

  const fetchAppointments = useCallback(async () => {
    if (!effectiveOwnerId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("dashboard_appointments")
      .select(`
        id, owner_id, title, scheduled_at, type, building_id, notes, status, priority, created_at, created_by, created_by_name,
        buildings ( id, name )
      `)
      .eq("owner_id", effectiveOwnerId)
      .order("scheduled_at", { ascending: true });
    setLoading(false);
    if (error) {
      setAppointments([]);
      return;
    }
    setAppointments((data as Appointment[]) || []);
  }, [effectiveOwnerId, supabase]);

  const fetchBuildings = useCallback(async () => {
    if (!effectiveOwnerId) return;
    const { data } = await supabase
      .from("buildings")
      .select("id, name")
      .eq("owner_id", effectiveOwnerId)
      .order("name");
    setBuildings(data || []);
  }, [effectiveOwnerId, supabase]);

  useEffect(() => {
    if (!ready) return;
    if (!can("marketing_view")) {
      router.replace("/dashboard");
      return;
    }
    fetchBuildings();
    fetchAppointments();
  }, [ready, can, router, fetchAppointments, fetchBuildings]);

  if (ready && !can("marketing_view")) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <p className="text-gray-500">جاري التحويل...</p>
      </main>
    );
  }

  const now = new Date().toISOString();
  const filtered =
    filter === "upcoming"
      ? appointments.filter((a) => a.status === "scheduled" && a.scheduled_at >= now)
      : filter === "past"
        ? appointments.filter((a) => a.scheduled_at < now || a.status !== "scheduled")
        : appointments;

  const openCreate = () => {
    setEditingId(null);
    setForm({
      title: "",
      scheduled_at: new Date().toISOString().slice(0, 10),
      scheduled_time: "09:00",
      type: "viewing",
      building_id: "",
      notes: "",
      priority: "normal",
    });
    setModalOpen(true);
  };

  const openEdit = (a: Appointment) => {
    setEditingId(a.id);
    const d = new Date(a.scheduled_at);
    setForm({
      title: a.title,
      scheduled_at: d.toISOString().slice(0, 10),
      scheduled_time: d.toTimeString().slice(0, 5),
      type: a.type,
      building_id: a.building_id || "",
      notes: a.notes || "",
      priority: (a.priority as AppointmentPriority) || "normal",
    });
    setModalOpen(true);
  };

  const saveAppointment = async () => {
    if (!effectiveOwnerId || !form.title.trim()) {
      showToast("أدخل عنوان الموعد", "error");
      return;
    }
    const scheduledAt = `${form.scheduled_at}T${form.scheduled_time}:00`;
    setSaving(true);
    if (editingId) {
      const { error } = await supabase
        .from("dashboard_appointments")
        .update({
          title: form.title.trim(),
          scheduled_at: scheduledAt,
          type: form.type,
          building_id: form.building_id || null,
          notes: form.notes.trim() || null,
          priority: form.priority,
        })
        .eq("id", editingId);
      setSaving(false);
      if (error) {
        showToast(error.message || "فشل تحديث الموعد", "error");
        return;
      }
      showToast("تم تحديث الموعد", "success");
      fetchAppointments();
      setModalOpen(false);
      setEditingId(null);
      return;
    }
    const { error } = await supabase.from("dashboard_appointments").insert({
      owner_id: effectiveOwnerId,
      title: form.title.trim(),
      scheduled_at: scheduledAt,
      type: form.type,
      building_id: form.building_id || null,
      notes: form.notes.trim() || null,
      priority: form.priority,
      status: "scheduled",
      created_by: (await supabase.auth.getUser()).data.user?.id,
      created_by_name: currentUserDisplayName?.trim() || null,
    });
    setSaving(false);
    if (error) {
      showToast(error.message || "فشل حفظ الموعد", "error");
      return;
    }
    showToast("تم حفظ الموعد", "success");
    fetchAppointments();
    setModalOpen(false);
    setEditingId(null);
  };

  const setStatus = async (id: string, status: AppointmentStatus) => {
    await supabase.from("dashboard_appointments").update({ status }).eq("id", id);
    fetchAppointments();
  };

  const deleteAppointment = async (id: string) => {
    if (!confirm("حذف هذا الموعد؟")) return;
    await supabase.from("dashboard_appointments").delete().eq("id", id);
    fetchAppointments();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };
  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">المواعيد</h1>
              <p className="text-sm text-gray-500">جدولة المواعيد ومعاينات واجتماعات</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                إضافة موعد
              </button>
            )}
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
            >
              <LayoutDashboard className="w-4 h-4" />
              لوحة التحكم
            </Link>
          </div>
        </header>

        <div className="flex gap-2 mb-6">
          {(["upcoming", "past", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f === "upcoming" ? "القادمة" : f === "past" ? "السابقة" : "الكل"}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">جاري التحميل...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              لا توجد مواعيد {filter === "upcoming" ? "قادمة" : filter === "past" ? "سابقة" : ""}.
              {canEdit && (
                <button type="button" onClick={openCreate} className="block mt-3 text-blue-600 font-medium hover:underline">
                  إضافة موعد جديد
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((a) => (
                <li
                  key={a.id}
                  className="group flex flex-col sm:flex-row sm:items-center gap-3 p-4 hover:bg-gray-50/50 transition"
                >
                  <button
                    type="button"
                    onClick={() => setViewingAppointment(a)}
                    className="flex items-center gap-4 flex-1 min-w-0 text-right rounded-xl hover:bg-blue-50/50 transition-colors -m-2 p-2 sm:-m-1 sm:p-1"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex flex-col items-center justify-center text-white font-bold text-sm shrink-0">
                      <span>{new Date(a.scheduled_at).getDate()}</span>
                      <span className="text-xs opacity-90">
                        {new Date(a.scheduled_at).toLocaleDateString("en-GB", { month: "short" })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-800">{a.title}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3 shrink-0" />
                        {formatTime(a.scheduled_at)} · {formatDate(a.scheduled_at)}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 text-xs font-medium">
                          {TYPE_LABELS[a.type as AppointmentType] ?? "أخرى"}
                        </span>
                        {a.buildings?.[0]?.name && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Building2 className="w-3 h-3 shrink-0" />
                            {a.buildings[0].name}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 text-xs">
                          {STATUS_LABELS[a.status]}
                        </span>
                        {(a.priority === "high" || a.priority === "urgent") && (
                          <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 text-xs font-medium">
                            {a.priority === "urgent" ? "عاجل" : "عالي"}
                          </span>
                        )}
                        {(a.priority === "low" || !a.priority || a.priority === "normal") && a.status === "scheduled" && (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-xs">
                            {PRIORITY_LABELS[(a.priority as AppointmentPriority) || "normal"].split(" —")[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    <Eye className="w-5 h-5 text-slate-400 shrink-0 ms-auto opacity-60 group-hover:opacity-100 transition-opacity" aria-hidden />
                  </button>
                  {canEdit && (
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {a.status === "scheduled" && (
                        <>
                          <button
                            type="button"
                            onClick={() => setStatus(a.id, "completed")}
                            className="p-2 rounded-lg text-green-600 hover:bg-green-50"
                            title="تم"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatus(a.id, "cancelled")}
                            className="p-2 rounded-lg text-amber-600 hover:bg-amber-50"
                            title="إلغاء"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => openEdit(a)}
                        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAppointment(a.id)}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* بطاقة عرض تفاصيل الموعد */}
      {viewingAppointment && (
        <div
          className="dashboard-modal-overlay"
          onClick={() => setViewingAppointment(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="appointment-detail-title"
        >
          <div
            className="dashboard-modal-shell max-w-md w-full max-h-[90vh] overflow-y-auto overflow-x-hidden dashboard-modal-scroll"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 id="appointment-detail-title" className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                تفاصيل الموعد
              </h2>
              <button
                type="button"
                onClick={() => setViewingAppointment(null)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex flex-col items-center justify-center text-white font-bold text-sm shrink-0">
                  <span className="text-xl leading-tight">{new Date(viewingAppointment.scheduled_at).getDate()}</span>
                  <span className="text-xs opacity-90">
                    {new Date(viewingAppointment.scheduled_at).toLocaleDateString("en-GB", { month: "short" })}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-gray-800 leading-snug">{viewingAppointment.title}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                    <Clock className="w-4 h-4 shrink-0" />
                    {formatTime(viewingAppointment.scheduled_at)} · {formatDate(viewingAppointment.scheduled_at)}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 text-xs font-medium">
                      {TYPE_LABELS[viewingAppointment.type] ?? "أخرى"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
                      {STATUS_LABELS[viewingAppointment.status]}
                    </span>
                  </div>
                </div>
              </div>

              {viewingAppointment.buildings?.[0]?.name && (
                <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-100">
                  <Building2 className="w-5 h-5 text-slate-500 shrink-0" />
                  <span className="text-sm font-medium text-slate-800">{viewingAppointment.buildings[0].name}</span>
                </div>
              )}

              <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-100">
                <User className="w-5 h-5 text-slate-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 mb-0.5">منشئ الموعد</p>
                  <p className="text-sm font-medium text-slate-800">
                    {viewingAppointment.created_by_name && viewingAppointment.created_by_name.trim()
                      ? viewingAppointment.created_by_name.trim()
                      : "—"}
                  </p>
                </div>
              </div>

              {viewingAppointment.notes && viewingAppointment.notes.trim() && (
                <div className="rounded-xl border border-slate-100 bg-amber-50/50 p-4">
                  <div className="flex items-center gap-2 text-amber-800 font-medium text-sm mb-2">
                    <FileText className="w-4 h-4 shrink-0" />
                    ملاحظات
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{viewingAppointment.notes.trim()}</p>
                </div>
              )}

              {(!viewingAppointment.notes || !viewingAppointment.notes.trim()) && (
                <p className="text-xs text-slate-400 py-1">لا توجد ملاحظات</p>
              )}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-100 px-5 py-4 flex gap-3 rounded-b-2xl">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setViewingAppointment(null);
                    openEdit(viewingAppointment);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 font-medium text-sm hover:bg-blue-100 transition"
                >
                  <Edit2 className="w-4 h-4" />
                  تعديل الموعد
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewingAppointment(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium text-sm hover:bg-slate-100 transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="dashboard-modal-overlay">
          <div
            className="dashboard-modal-shell max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden"
            dir="rtl"
          >
            <div className="shrink-0 px-6 pt-6 pb-3 border-b border-slate-100 bg-gradient-to-b from-slate-50/90 to-white rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-800">{editingId ? "تعديل الموعد" : "موعد جديد"}</h3>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto dashboard-modal-scroll dashboard-modal-scroll-gutter-auto px-6 py-4">
            <div className="space-y-4 pe-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                  placeholder="مثال: معاينة عمارة النخيل"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                  <input
                    type="date"
                    value={form.scheduled_at}
                    onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الوقت</label>
                  <input
                    type="time"
                    value={form.scheduled_time}
                    onChange={(e) => setForm((f) => ({ ...f, scheduled_time: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">النوع</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AppointmentType }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                >
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العمارة (اختياري)</label>
                <select
                  value={form.building_id}
                  onChange={(e) => setForm((f) => ({ ...f, building_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                >
                  <option value="">—</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الأولوية</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as AppointmentPriority }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                >
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  عالي/عاجل: تنبيه بالغ الأهمية عند اقتراب الموعد. عادي/منخفض: تذكير في جرس التنبيهات.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 resize-none"
                  rows={2}
                  placeholder="ملاحظات إضافية"
                />
              </div>
            </div>
            </div>
            <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
              <button
                type="button"
                onClick={saveAppointment}
                disabled={saving || !form.title.trim()}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-50 shadow-sm"
              >
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-gray-700 shadow-sm"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
