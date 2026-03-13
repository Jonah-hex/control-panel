"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { X } from "lucide-react";
import { formatDateGregorian } from "@/lib/formatDateGregorian";

const STORAGE_KEY_V1 = "critical-alerts-dismissed-v1";
const STORAGE_KEY = "critical-alerts-dismissed-v2";
const SESSION_LAST_DISMISSED = "last_critical_dismissed_id";
const DUE_SOON_DAYS = 3;
const RES_EXPIRED_MIN_DAYS = 3; /* حجز منتهٍ منذ ≥ 3 أيام */
/** مهمة/موعد: يظهر التنبيه خلال N أيام قبل الموعد، يوم الموعد، وبعده حتى الإغلاق أو الإنهاء */
const TASK_APPT_WINDOW_DAYS = 2;
/** بعد كم يوم يُعاد إظهار نفس التنبيه إن بقيت المشكلة (احترافي + عدم إزعاج يومي) */
const RE_ALERT_DAYS = 7;
const RE_ALERT_MS = RE_ALERT_DAYS * 24 * 60 * 60 * 1000;

type DismissedEntry = { id: string; at: string };

function loadDismissedEntries(): DismissedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      const arr = JSON.parse(rawV2) as unknown;
      if (
        Array.isArray(arr) &&
        arr.length > 0 &&
        typeof arr[0] === "object" &&
        arr[0] !== null &&
        "id" in arr[0] &&
        "at" in arr[0]
      ) {
        return arr as DismissedEntry[];
      }
    }
    const rawV1 = localStorage.getItem(STORAGE_KEY_V1);
    if (!rawV1) return [];
    const oldIds = JSON.parse(rawV1) as string[];
    if (!Array.isArray(oldIds)) return [];
    const now = new Date().toISOString();
    const entries: DismissedEntry[] = oldIds.map((id) => ({ id, at: now }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return entries;
  } catch {
    return [];
  }
}

function saveDismissedEntries(entries: DismissedEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

function isDismissalStillActive(atIso: string): boolean {
  return Date.now() - new Date(atIso).getTime() < RE_ALERT_MS;
}

function activeDismissedIds(entries: DismissedEntry[]): Set<string> {
  const s = new Set<string>();
  for (const e of entries) {
    if (isDismissalStillActive(e.at)) s.add(e.id);
  }
  return s;
}

type AlertItem =
  | {
      id: string;
      kind: "remaining-due";
      title: string;
      body: string;
      href: string;
      urgent: boolean;
    }
  | {
      id: string;
      kind: "reservation-expired";
      title: string;
      body: string;
      href: string;
      urgent: boolean;
    }
  | {
      id: string;
      kind: "task-due";
      title: string;
      body: string;
      href: string;
      urgent: boolean;
    }
  | {
      id: string;
      kind: "appt-due";
      title: string;
      body: string;
      href: string;
      urgent: boolean;
    };

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function CriticalAlertsDock() {
  const { ready, effectiveOwnerId, can, employeePermissions } = useDashboardAuth();
  const supabase = createClient();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [dismissedEntries, setDismissedEntries] = useState<DismissedEntry[]>(() => loadDismissedEntries());
  const [reAlertTick, setReAlertTick] = useState(0);
  const [expanded, setExpanded] = useState(true);

  const canSales = can("sales");
  const canRes =
    employeePermissions === null && can("reservations");
  const canTasksAppts = can("marketing_view");

  const fetchAlerts = useCallback(async () => {
    if (!effectiveOwnerId || !ready) return;
    const out: AlertItem[] = [];
    const today = startOfDay(new Date());

    const { data: buildings } = await supabase
      .from("buildings")
      .select("id, name")
      .eq("owner_id", effectiveOwnerId);
    const list = buildings || [];
    const buildingIds = list.map((b) => b.id);
    const nameById = Object.fromEntries(list.map((b) => [b.id, b.name || "—"]));

    if (buildingIds.length > 0 && canSales) {
      const { data: sales } = await supabase
        .from("sales")
        .select("id, building_id, remaining_payment, remaining_payment_due_date, buyer_name")
        .in("building_id", buildingIds)
        .eq("payment_status", "partial")
        .gt("remaining_payment", 0);

      for (const s of sales || []) {
        if (!s.remaining_payment_due_date) continue;
        const due = startOfDay(new Date(s.remaining_payment_due_date));
        const daysLeft = Math.ceil((due - today) / 86400000);
        if (daysLeft <= DUE_SOON_DAYS) {
          const urgent = daysLeft < 0;
          const amount = Number(s.remaining_payment).toLocaleString("en");
          const bname = nameById[s.building_id] || "—";
          out.push({
            id: `due-${s.id}-${s.remaining_payment_due_date}`,
            kind: "remaining-due",
            urgent,
            title: urgent ? "تأخر استحقاق المتبقي" : "اقتراب استحقاق المتبقي",
            body: `${bname} — ${s.buyer_name || "عميل"} — ${amount} ر.س — الاستحقاق ${formatDateGregorian(s.remaining_payment_due_date)}${urgent ? " (متأخر)" : daysLeft === 0 ? " (اليوم)" : ` (خلال ${daysLeft} أيام)`}`,
            href: "/dashboard/sales",
          });
        }
      }
    }

    if (buildingIds.length > 0 && canRes) {
      const { data: reservations } = await supabase
        .from("reservations")
        .select("id, customer_name, expiry_date, building_id, status")
        .in("building_id", buildingIds);
      const active = ["active", "pending", "confirmed", "reserved"];
      const now = Date.now();
      for (const r of reservations || []) {
        if (!r.expiry_date || !active.includes(r.status)) continue;
        const exp = new Date(r.expiry_date).getTime();
        if (exp >= now) continue;
        const daysOver = Math.floor((now - exp) / 86400000);
        if (daysOver < RES_EXPIRED_MIN_DAYS) continue;
        const bname = nameById[r.building_id] || "—";
        out.push({
          id: `res-exp-${r.id}`,
          kind: "reservation-expired",
          urgent: true,
          title: "حجز منتهٍ ولم يُغلق",
          body: `${bname} — ${r.customer_name} — انتهى الحجز منذ ${daysOver} يومًا (${formatDateGregorian(r.expiry_date)})`,
          href: "/dashboard/reservations",
        });
      }
    }

    /* مهام عالية/عاجلة + مواعيد مجدولة — نافذة ±2 يوم وبعدها متأخرة حتى الإنهاء */
    if (canTasksAppts) {
      const { data: taskRows } = await supabase
        .from("dashboard_tasks")
        .select("id, title, priority, status, scheduled_at, related_building_id, buildings ( name )")
        .eq("owner_id", effectiveOwnerId)
        .in("priority", ["high", "urgent"]);
      const activeTask = ["pending", "accepted", "scheduled"];
      for (const t of taskRows || []) {
        if (!activeTask.includes(t.status as string) || !t.scheduled_at) continue;
        const due = startOfDay(new Date(t.scheduled_at as string));
        const daysUntil = Math.ceil((due - today) / 86400000);
        if (daysUntil > TASK_APPT_WINDOW_DAYS) continue;
        const urgent = daysUntil < 0 || (t.priority as string) === "urgent";
        const bname =
          (t.buildings as { name?: string } | null)?.name ||
          (t.related_building_id ? nameById[t.related_building_id as string] : null) ||
          "—";
        const dateLabel = formatDateGregorian((t.scheduled_at as string).slice(0, 10));
        const pri =
          (t.priority as string) === "urgent" ? "عاجل" : "عالي";
        let when: string;
        if (daysUntil < 0) when = `متأخر ${Math.abs(daysUntil)} يومًا — كان الموعد ${dateLabel}`;
        else if (daysUntil === 0) when = `اليوم — ${dateLabel}`;
        else if (daysUntil === 1) when = `غدًا — ${dateLabel}`;
        else when = `خلال يومين — ${dateLabel}`;
        const dateKey = (t.scheduled_at as string).slice(0, 10);
        out.push({
          id: `task-${t.id}-${dateKey}`,
          kind: "task-due",
          urgent,
          title: `مهمة (${pri}) — اقتراب الموعد`,
          body: `${t.title as string}\n${bname} · ${when}`,
          href: "/dashboard/tasks",
        });
      }

      const { data: apptRows } = await supabase
        .from("dashboard_appointments")
        .select("id, title, scheduled_at, type, building_id, priority, buildings ( name )")
        .eq("owner_id", effectiveOwnerId)
        .eq("status", "scheduled")
        .in("priority", ["high", "urgent"]);
      for (const a of apptRows || []) {
        if (!a.scheduled_at) continue;
        const due = startOfDay(new Date(a.scheduled_at as string));
        const daysUntil = Math.ceil((due - today) / 86400000);
        if (daysUntil > TASK_APPT_WINDOW_DAYS) continue;
        const pri = (a.priority as string) === "urgent" ? "عاجل" : "عالي";
        const urgent = daysUntil < 0 || (a.priority as string) === "urgent";
        const bname =
          (a.buildings as { name?: string } | { name?: string }[] | null)?.name ||
          (Array.isArray(a.buildings) && a.buildings[0]?.name) ||
          (a.building_id ? nameById[a.building_id as string] : null) ||
          "—";
        const dateLabel = formatDateGregorian((a.scheduled_at as string).slice(0, 10));
        let when: string;
        if (daysUntil < 0) when = `متأخر ${Math.abs(daysUntil)} يومًا — ${dateLabel}`;
        else if (daysUntil === 0) when = `اليوم — ${dateLabel}`;
        else if (daysUntil === 1) when = `غدًا — ${dateLabel}`;
        else when = `خلال يومين — ${dateLabel}`;
        const dateKey = (a.scheduled_at as string).slice(0, 16);
        out.push({
          id: `appt-${a.id}-${dateKey}`,
          kind: "appt-due",
          urgent,
          title: `موعد (${pri}) — بالغ الأهمية`,
          body: `${a.title as string}\n${bname} · ${when}`,
          href: "/dashboard/appointments",
        });
      }
    }

    out.sort((a, b) => (b.urgent === a.urgent ? 0 : b.urgent ? 1 : -1));
    setAlerts(out);
    /* لو كان التنبيه مُخفى من جلسة قديمة ولا يوجد last في الجلسة — نسمح بإعادة العرض */
    if (out.length > 0 && typeof window !== "undefined") {
      try {
        if (!sessionStorage.getItem(SESSION_LAST_DISMISSED)) {
          const hidden = out.filter((a) => activeDismissedIds(loadDismissedEntries()).has(a.id));
          if (hidden.length > 0) sessionStorage.setItem(SESSION_LAST_DISMISSED, hidden[0].id);
        }
      } catch {
        /* ignore */
      }
    }
  }, [effectiveOwnerId, ready, canSales, canRes, canTasksAppts]);

  useEffect(() => {
    fetchAlerts();
    const t = setInterval(fetchAlerts, 120000);
    return () => clearInterval(t);
  }, [fetchAlerts]);

  /* إعادة حساب الظهور عند انتهاء فترة الكتم (بدون انتظار جلب) */
  useEffect(() => {
    const t = setInterval(() => setReAlertTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const dismissedActiveSet = useMemo(
    () => activeDismissedIds(dismissedEntries),
    [dismissedEntries, reAlertTick]
  );

  const visible = useMemo(
    () => alerts.filter((a) => !dismissedActiveSet.has(a.id)),
    [alerts, dismissedActiveSet]
  );

  const [cardExiting, setCardExiting] = useState(false);
  const [rowExitingIds, setRowExitingIds] = useState<Set<string>>(new Set());
  const [lastDismissedId, setLastDismissedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLastDismissedId(sessionStorage.getItem(SESSION_LAST_DISMISSED));
    } catch {
      setLastDismissedId(null);
    }
  }, [dismissedEntries, alerts]);

  const commitDismiss = useCallback((id: string) => {
    try {
      sessionStorage.setItem(SESSION_LAST_DISMISSED, id);
    } catch {
      /* ignore */
    }
    setLastDismissedId(id);
    const at = new Date().toISOString();
    setDismissedEntries((prev) => {
      const rest = prev.filter((e) => e.id !== id);
      const next = [...rest, { id, at }];
      saveDismissedEntries(next);
      return next;
    });
    setRowExitingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const dismissCard = (id: string) => {
    setCardExiting(true);
    window.setTimeout(() => {
      commitDismiss(id);
      setCardExiting(false);
    }, 400);
  };

  const dismissRow = useCallback(
    (id: string) => {
      setRowExitingIds((prev) => new Set(prev).add(id));
      window.setTimeout(() => commitDismiss(id), 320);
    },
    [commitDismiss]
  );

  const canRestoreLast =
    !!lastDismissedId &&
    alerts.some((a) => a.id === lastDismissedId) &&
    dismissedActiveSet.has(lastDismissedId) &&
    !cardExiting;

  const restoreLastDismissed = () => {
    if (!lastDismissedId) return;
    setDismissedEntries((prev) => {
      const next = prev.filter((e) => e.id !== lastDismissedId);
      saveDismissedEntries(next);
      return next;
    });
  };

  if (!ready) return null;
  if (visible.length === 0 && !cardExiting && !canRestoreLast) return null;

  const first = visible[0];
  const rest = visible.length - 1;

  return (
    <div
      className="critical-alerts-dock pointer-events-none fixed bottom-4 left-4 right-4 z-[100] flex flex-col items-end gap-2 sm:left-auto sm:right-4 sm:max-w-md print:hidden"
      dir="rtl"
      aria-live="assertive"
    >
      {canRestoreLast && visible.length === 0 && (
        <button
          type="button"
          onClick={restoreLastDismissed}
          className="pointer-events-auto mb-1 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 shadow-md hover:bg-amber-100"
        >
          إظهار آخر تنبيه (تجربة الإغلاق)
        </button>
      )}
      {first && (
        <div
          className={`pointer-events-auto flex w-full max-w-md flex-col items-end gap-1 transition-all duration-300 ease-out ${
            cardExiting ? "critical-alert-card-exit" : ""
          }`}
        >
          {/* سطر مرسل مثل تطبيق رسائل */}
          <div className="flex items-center gap-2 px-1 text-[11px] text-slate-500">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                first.urgent ? "bg-red-500" : "bg-amber-500"
              }`}
            >
              !
            </span>
            <span className="font-medium text-slate-600">النظام</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-400">تنبيه تلقائي</span>
          </div>
          {/* فقاعة رسالة نصية */}
          <div
            className={`relative w-full max-w-full shadow-md transition-opacity duration-300 ${
              first.urgent
                ? "rounded-2xl rounded-es-sm bg-red-50 text-slate-900 ring-1 ring-red-200/80"
                : "rounded-2xl rounded-es-sm bg-[#e8e8ed] text-slate-900 ring-1 ring-slate-200/90"
            }`}
          >
            {/* ذيل فقاعة (جهة المرسل — أسفل يمين في RTL) */}
            <div
              className={`absolute -bottom-1 end-3 h-3 w-3 rotate-45 transition-opacity duration-300 ${
                cardExiting ? "opacity-0" : ""
              } ${first.urgent ? "bg-red-50" : "bg-[#e8e8ed]"}`}
              style={{ clipPath: "polygon(0 0, 100% 100%, 0 100%)" }}
              aria-hidden
            />
            <button
              type="button"
              onClick={() => dismissCard(first.id)}
              disabled={cardExiting}
              className="absolute top-2 end-2 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-black/5 hover:text-slate-700 disabled:pointer-events-none"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="px-4 pb-3 pt-3 pe-11">
              <p className="text-sm font-semibold text-slate-500">
                {first.urgent ? (
                  <span className="text-red-600">⚠ بالغ الأهمية</span>
                ) : (
                  <span className="text-amber-700">تنبيه</span>
                )}
              </p>
              <p className="mt-1.5 text-[15px] font-semibold leading-snug text-slate-900">{first.title}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-700 whitespace-pre-wrap">{first.body}</p>
              <Link
                href={first.href}
                className="mt-3 inline-block text-[13px] font-semibold text-amber-700 hover:text-amber-900 hover:underline"
              >
                اتخاذ إجراء ←
              </Link>
              {rest > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded((e) => !e)}
                  className="mt-2 block text-[12px] text-slate-500 underline hover:text-slate-800"
                >
                  {expanded ? "إخفاء" : "عرض"} {rest} رسائل أخرى
                </button>
              )}
            </div>
          </div>
          {expanded && rest > 0 && (
            <ul className="mt-1 flex w-full flex-col items-end gap-2">
              {visible.slice(1).map((a) => (
                <li
                  key={a.id}
                  className={`relative w-full max-w-full rounded-2xl rounded-es-sm bg-slate-100 px-3 py-2 pe-9 text-start text-[12px] text-slate-700 shadow-sm ring-1 ring-slate-200/80 transition-all ${
                    rowExitingIds.has(a.id) ? "critical-alert-row-exit" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => dismissRow(a.id)}
                    disabled={rowExitingIds.has(a.id)}
                    className="absolute top-1.5 end-1.5 rounded-full p-1 text-slate-400 hover:bg-black/5 disabled:pointer-events-none"
                    aria-label="إغلاق"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <span className="font-semibold text-slate-800">{a.title}</span>
                  <span className="mt-0.5 block text-slate-600">{a.body}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** لاستخدامه في لوحة التحكم: هل يوجد تنبيه حرج (لتوهج الجرس) */
export function useCriticalAlertsCount(
  salesWithRemaining: Array<{
    id: string;
    remaining_payment_due_date?: string | null;
  }>,
  reservations: Array<{
    id: string;
    status: string;
    expiry_date?: string | null;
  }>,
  canSales: boolean,
  canRes: boolean,
  employeePermissions: Record<string, boolean> | null
): number {
  return useMemo(() => {
    let n = 0;
    const today = startOfDay(new Date());
    if (canSales) {
      for (const s of salesWithRemaining) {
        if (!s.remaining_payment_due_date) continue;
        const due = startOfDay(new Date(s.remaining_payment_due_date));
        const daysLeft = Math.ceil((due - today) / 86400000);
        if (daysLeft <= DUE_SOON_DAYS) n += 1;
      }
    }
    if (employeePermissions === null && canRes) {
      const active = ["active", "pending", "confirmed", "reserved"];
      const now = Date.now();
      for (const r of reservations) {
        if (!r.expiry_date || !active.includes(r.status)) continue;
        const exp = new Date(r.expiry_date).getTime();
        if (exp >= now) continue;
        const daysOver = Math.floor((now - exp) / 86400000);
        if (daysOver >= RES_EXPIRED_MIN_DAYS) n += 1;
      }
    }
    return n;
  }, [salesWithRemaining, reservations, canSales, canRes, employeePermissions]);
}
