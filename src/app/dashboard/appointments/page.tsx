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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";

type AppointmentType = "viewing" | "meeting" | "maintenance" | "marketing" | "other";
type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";

interface Appointment {
  id: string;
  owner_id: string;
  title: string;
  scheduled_at: string;
  type: AppointmentType;
  building_id: string | null;
  notes: string | null;
  status: AppointmentStatus;
  created_at: string;
  buildings?: { id: string; name: string }[] | null;
}

const TYPE_LABELS: Record<AppointmentType, string> = {
  viewing: "معاينة",
  meeting: "اجتماع",
  maintenance: "صيانة",
  marketing: "تسويق",
  other: "أخرى",
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "مجدول",
  completed: "منتهي",
  cancelled: "ملغي",
  no_show: "لم يحضر",
};

export default function AppointmentsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { can, ready, effectiveOwnerId } = useDashboardAuth();
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
  });
  const [saving, setSaving] = useState(false);

  const canEdit = can("marketing_edit");

  const fetchAppointments = useCallback(async () => {
    if (!effectiveOwnerId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("dashboard_appointments")
      .select(`
        id, owner_id, title, scheduled_at, type, building_id, notes, status, created_at,
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
    });
    setModalOpen(true);
  };

  const saveAppointment = async () => {
    if (!effectiveOwnerId || !form.title.trim()) return;
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
        })
        .eq("id", editingId);
      if (!error) fetchAppointments();
      setSaving(false);
      setModalOpen(false);
      return;
    }
    const { error } = await supabase.from("dashboard_appointments").insert({
      owner_id: effectiveOwnerId,
      title: form.title.trim(),
      scheduled_at: scheduledAt,
      type: form.type,
      building_id: form.building_id || null,
      notes: form.notes.trim() || null,
      status: "scheduled",
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });
    setSaving(false);
    if (!error) {
      fetchAppointments();
      setModalOpen(false);
    }
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
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 hover:bg-gray-50/50 transition"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex flex-col items-center justify-center text-white font-bold text-sm shrink-0">
                      <span>{new Date(a.scheduled_at).getDate()}</span>
                      <span className="text-xs opacity-90">
                        {new Date(a.scheduled_at).toLocaleDateString("en-GB", { month: "short" })}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{a.title}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {formatTime(a.scheduled_at)} · {formatDate(a.scheduled_at)}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 text-xs font-medium">
                          {TYPE_LABELS[a.type]}
                        </span>
                        {a.buildings?.[0]?.name && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Building2 className="w-3 h-3" />
                            {a.buildings[0].name}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 text-xs">
                          {STATUS_LABELS[a.status]}
                        </span>
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2 shrink-0">
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{editingId ? "تعديل الموعد" : "موعد جديد"}</h3>
            <div className="space-y-4">
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
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={saveAppointment}
                disabled={saving || !form.title.trim()}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-50"
              >
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700"
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
