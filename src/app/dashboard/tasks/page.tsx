"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  Plus,
  LayoutDashboard,
  User,
  Clock,
  Calendar,
  Building2,
  CheckCircle,
  X,
  Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";

type TaskStatus = "pending" | "accepted" | "scheduled" | "done" | "cancelled";
type TaskPriority = "low" | "normal" | "high" | "urgent";

interface Task {
  id: string;
  owner_id: string;
  title: string;
  body: string | null;
  assigned_to: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  related_building_id: string | null;
  related_type: string | null;
  scheduled_at: string | null;
  created_at: string;
  buildings?: { id: string; name: string } | null;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "قيد الانتظار",
  accepted: "مقبول",
  scheduled: "مجدول",
  done: "منجز",
  cancelled: "ملغي",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "منخفض",
  normal: "عادي",
  high: "عالي",
  urgent: "عاجل",
};

export default function TasksPage() {
  const router = useRouter();
  const supabase = createClient();
  const { can, ready, effectiveOwnerId, user } = useDashboardAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [buildings, setBuildings] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"mine" | "all">("mine");
  const [modalOpen, setModalOpen] = useState(false);
  const [scheduleForTaskId, setScheduleForTaskId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    body: "",
    assigned_to: "",
    priority: "normal" as TaskPriority,
    related_building_id: "",
  });
  const [scheduleForm, setScheduleForm] = useState({
    title: "",
    scheduled_at: "",
    scheduled_time: "09:00",
    type: "viewing" as "viewing" | "meeting" | "maintenance" | "marketing" | "other",
  });
  const [saving, setSaving] = useState(false);

  const canEdit = can("marketing_edit");
  const myId = user?.id;

  const fetchTasks = useCallback(async () => {
    if (!effectiveOwnerId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("dashboard_tasks")
      .select(`
        id, owner_id, title, body, assigned_to, priority, status, related_building_id, related_type, scheduled_at, created_at,
        buildings ( id, name )
      `)
      .eq("owner_id", effectiveOwnerId)
      .order("created_at", { ascending: false });

    if (error) {
      setTasks([]);
      setLoading(false);
      return;
    }
    const normalized = (data || []).map((t: Record<string, unknown>) => ({
      ...t,
      buildings: Array.isArray(t.buildings) ? (t.buildings[0] ?? null) : (t.buildings ?? null)
    })) as Task[];
    setTasks(normalized);
    setLoading(false);
  }, [effectiveOwnerId, supabase]);

  const fetchEmployees = useCallback(async () => {
    if (!effectiveOwnerId) return;
    const { data } = await supabase
      .from("dashboard_employees")
      .select("auth_user_id, full_name")
      .eq("owner_id", effectiveOwnerId)
      .eq("is_active", true)
      .order("full_name");
    setEmployees((data || []).map((r: { auth_user_id: string; full_name: string }) => ({ id: r.auth_user_id, full_name: r.full_name })));
  }, [effectiveOwnerId, supabase]);

  const fetchBuildings = useCallback(async () => {
    if (!effectiveOwnerId) return;
    const { data } = await supabase.from("buildings").select("id, name").eq("owner_id", effectiveOwnerId).order("name");
    setBuildings(data || []);
  }, [effectiveOwnerId, supabase]);

  useEffect(() => {
    if (!ready) return;
    if (!can("marketing_view")) {
      router.replace("/dashboard");
      return;
    }
    fetchEmployees();
    fetchBuildings();
    fetchTasks();
  }, [ready, can, router, fetchTasks, fetchEmployees, fetchBuildings]);

  if (ready && !can("marketing_view")) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <p className="text-gray-500">جاري التحويل...</p>
      </main>
    );
  }

  const filtered =
    filter === "mine" && myId
      ? tasks.filter((t) => t.assigned_to === myId || (!t.assigned_to && canEdit))
      : tasks;

  const openCreate = () => {
    setScheduleForTaskId(null);
    setForm({
      title: "",
      body: "",
      assigned_to: "",
      priority: "normal",
      related_building_id: "",
    });
    setModalOpen(true);
  };

  const saveTask = async () => {
    if (!effectiveOwnerId || !form.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("dashboard_tasks").insert({
      owner_id: effectiveOwnerId,
      title: form.title.trim(),
      body: form.body.trim() || null,
      assigned_to: form.assigned_to || null,
      priority: form.priority,
      status: "pending",
      related_building_id: form.related_building_id || null,
      created_by: myId,
    });
    setSaving(false);
    if (!error) {
      fetchTasks();
      setModalOpen(false);
    }
  };

  const acceptTask = async (id: string) => {
    await supabase.from("dashboard_tasks").update({ status: "accepted" }).eq("id", id);
    fetchTasks();
  };

  const openSchedule = (t: Task) => {
    setScheduleForTaskId(t.id);
    setScheduleForm({
      title: t.title,
      scheduled_at: new Date().toISOString().slice(0, 10),
      scheduled_time: "09:00",
      type: "viewing",
    });
  };

  const saveSchedule = async () => {
    if (!effectiveOwnerId || !scheduleForTaskId || !scheduleForm.title.trim()) return;
    const scheduledAt = `${scheduleForm.scheduled_at}T${scheduleForm.scheduled_time}:00`;
    setSaving(true);
    const { data: appData, error: appError } = await supabase
      .from("dashboard_appointments")
      .insert({
        owner_id: effectiveOwnerId,
        title: scheduleForm.title.trim(),
        scheduled_at: scheduledAt,
        type: scheduleForm.type,
        related_task_id: scheduleForTaskId,
        status: "scheduled",
        created_by: myId,
      })
      .select("id")
      .single();

    if (!appError && appData) {
      await supabase.from("dashboard_tasks").update({ status: "scheduled", scheduled_at: scheduledAt }).eq("id", scheduleForTaskId);
      fetchTasks();
      setScheduleForTaskId(null);
    }
    setSaving(false);
  };

  const setTaskDone = async (id: string) => {
    await supabase.from("dashboard_tasks").update({ status: "done" }).eq("id", id);
    fetchTasks();
  };

  const cancelTask = async (id: string) => {
    if (!confirm("إلغاء هذه المهمة؟")) return;
    await supabase.from("dashboard_tasks").update({ status: "cancelled" }).eq("id", id);
    fetchTasks();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/20 to-orange-50/20 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <CheckSquare className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">المهام والملاحظات</h1>
              <p className="text-sm text-gray-500">توجيهات للموظفين — قبول أو جدولة موعد</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 text-white font-medium text-sm hover:bg-amber-700 transition"
              >
                <Plus className="w-4 h-4" />
                إضافة مهمة / ملاحظة
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
          <button
            type="button"
            onClick={() => setFilter("mine")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              filter === "mine" ? "bg-amber-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            مهامي
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                filter === "all" ? "bg-amber-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              كل المهام
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">جاري التحميل...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              لا توجد مهام {filter === "mine" ? "معيّنة لك" : ""}.
              {canEdit && (
                <button type="button" onClick={openCreate} className="block mt-3 text-amber-600 font-medium hover:underline">
                  إضافة مهمة أو ملاحظة
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((t) => (
                <li key={t.id} className="p-4 hover:bg-gray-50/50 transition">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-800">{t.title}</h3>
                      {t.body && <p className="text-sm text-gray-600 mt-1">{t.body}</p>}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-medium">
                          {PRIORITY_LABELS[t.priority]}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 text-xs">
                          {STATUS_LABELS[t.status]}
                        </span>
                        {t.assigned_to && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <User className="w-3 h-3" />
                            {employees.find((e) => e.id === t.assigned_to)?.full_name ?? "موظف"}
                          </span>
                        )}
                        {t.buildings?.name && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Building2 className="w-3 h-3" />
                            {t.buildings.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {formatDate(t.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.assigned_to === myId && t.status === "pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() => acceptTask(t.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 text-green-800 text-sm font-medium hover:bg-green-200"
                          >
                            <CheckCircle className="w-4 h-4" />
                            قبول
                          </button>
                          <button
                            type="button"
                            onClick={() => openSchedule(t)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-800 text-sm font-medium hover:bg-blue-200"
                          >
                            <Calendar className="w-4 h-4" />
                            جدولة موعد
                          </button>
                        </>
                      )}
                      {t.status === "accepted" && t.assigned_to === myId && (
                        <button
                          type="button"
                          onClick={() => openSchedule(t)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-800 text-sm font-medium hover:bg-blue-200"
                        >
                          <Calendar className="w-4 h-4" />
                          جدولة موعد
                        </button>
                      )}
                      {(t.assigned_to === myId || canEdit) && ["pending", "accepted", "scheduled"].includes(t.status) && (
                        <button
                          type="button"
                          onClick={() => setTaskDone(t.id)}
                          className="p-2 rounded-lg text-green-600 hover:bg-green-50"
                          title="تم"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => cancelTask(t.id)}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                          title="إلغاء"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal-shell max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden" dir="rtl">
            <div className="shrink-0 px-6 pt-6 pb-3 border-b border-slate-100 bg-gradient-to-b from-slate-50/90 to-white rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-800">مهمة / ملاحظة جديدة</h3>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto dashboard-modal-scroll px-6 py-4">
            <div className="space-y-4 pe-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                  placeholder="توجيه لمدير التسويق: متابعة عميل عمارة النخيل"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التفاصيل / الملاحظة</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 resize-none"
                  rows={3}
                  placeholder="وصف المطلوب أو التوجيه..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تعيين لـ</label>
                <select
                  value={form.assigned_to}
                  onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                >
                  <option value="">جميع من لديهم صلاحية</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الأولوية</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                >
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العمارة (اختياري)</label>
                <select
                  value={form.related_building_id}
                  onChange={(e) => setForm((f) => ({ ...f, related_building_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                >
                  <option value="">—</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
            </div>
            <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
              <button
                type="button"
                onClick={saveTask}
                disabled={saving || !form.title.trim()}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white font-medium disabled:opacity-50 shadow-sm"
              >
                {saving ? "جاري الحفظ..." : "إرسال"}
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

      {scheduleForTaskId && (
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal-shell max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden" dir="rtl">
            <div className="shrink-0 px-6 pt-6 pb-3 border-b border-slate-100 bg-gradient-to-b from-slate-50/90 to-white rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-800">جدولة موعد من المهمة</h3>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto dashboard-modal-scroll px-6 py-4">
            <div className="space-y-4 pe-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عنوان الموعد</label>
                <input
                  type="text"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                  <input
                    type="date"
                    value={scheduleForm.scheduled_at}
                    onChange={(e) => setScheduleForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الوقت</label>
                  <input
                    type="time"
                    value={scheduleForm.scheduled_time}
                    onChange={(e) => setScheduleForm((f) => ({ ...f, scheduled_time: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نوع الموعد</label>
                <select
                  value={scheduleForm.type}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, type: e.target.value as typeof scheduleForm.type }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2"
                >
                  <option value="viewing">معاينة</option>
                  <option value="meeting">اجتماع</option>
                  <option value="maintenance">صيانة</option>
                  <option value="marketing">تسويق</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
            </div>
            </div>
            <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
              <button
                type="button"
                onClick={saveSchedule}
                disabled={saving || !scheduleForm.title.trim()}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                <Send className="w-4 h-4" />
                {saving ? "جاري الحفظ..." : "إنشاء الموعد"}
              </button>
              <button
                type="button"
                onClick={() => setScheduleForTaskId(null)}
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
