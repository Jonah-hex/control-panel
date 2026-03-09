"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { useMarketingReportsData } from "@/hooks/useMarketingReportsData";
import { PageLoadingSkeleton } from "@/components/dashboard/PageLoadingSkeleton";
import { showToast } from "@/app/dashboard/buildings/details/toast";
import {
  LayoutDashboard,
  FileText,
  LineChart,
  Calendar,
  TrendingUp,
  Printer,
  ChevronLeft,
  BarChart3,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
  Download,
  Home,
  Award,
  Building2,
  RefreshCw,
} from "lucide-react";
import { RiyalIcon } from "@/components/icons/RiyalIcon";

const RIYAL = "ر.س";

type PeriodKey = "all" | "month" | "quarter" | "year" | "custom";

function getPeriodBounds(period: PeriodKey, customFrom?: string, customTo?: string): { from: Date; to: Date } {
  if (period === "custom" && customFrom && customTo) {
    let from = new Date(customFrom + "T00:00:00");
    let to = new Date(customTo + "T23:59:59");
    if (isNaN(from.getTime())) from = new Date(2000, 0, 1);
    if (isNaN(to.getTime())) to = new Date();
    if (from.getTime() > to.getTime()) [from, to] = [to, from];
    return { from, to };
  }
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let from: Date;
  switch (period) {
    case "month":
      from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      break;
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3) + 1;
      from = new Date(now.getFullYear(), (q - 1) * 3, 1, 0, 0, 0);
      break;
    }
    case "year":
      from = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      break;
    default:
      from = new Date(2000, 0, 1);
  }
  return { from, to };
}

/** تاريخ ميلادي بأرقام إنجليزية */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
}

/** أرقام إنجليزية (ميلادي) */
function formatNum(n: number): string {
  return n.toLocaleString("en");
}

/** تنسيق مبلغ بدقة 3 خانات عشرية (لمطابقة الحاسبة) */
function formatMoney(n: number): string {
  return Number(n).toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

/** دوائر SVG لتقرير الحجوزات (نشط، مكتمل، ملغى) */
function DonutChart({
  active,
  completed,
  cancelled,
  size = 160,
  strokeWidth = 24,
}: {
  active: number;
  completed: number;
  cancelled: number;
  size?: number;
  strokeWidth?: number;
}) {
  const total = active + completed + cancelled;
  const cx = size / 2;
  const cy = size / 2;
  const R = (size - strokeWidth) / 2;
  const r = R - strokeWidth;
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const point = (radius: number, deg: number) => ({
    x: cx + radius * Math.cos(toRad(deg)),
    y: cy + radius * Math.sin(toRad(deg)),
  });
  const segments: { from: number; to: number; color: string }[] = [];
  if (total > 0) {
    let acc = 0;
    if (active > 0) {
      segments.push({ from: (acc / total) * 360, to: ((acc += active) / total) * 360, color: "#f59e0b" });
    }
    if (completed > 0) {
      segments.push({ from: (acc / total) * 360, to: ((acc += completed) / total) * 360, color: "#059669" });
    }
    if (cancelled > 0) {
      segments.push({ from: (acc / total) * 360, to: 360, color: "#94a3b8" });
    }
  }
  return (
    <svg width={size} height={size} className="shrink-0">
      {total === 0 ? (
        <circle cx={cx} cy={cy} r={R - strokeWidth / 2} fill="#f1f5f9" stroke="#e2e8f0" strokeWidth={strokeWidth} />
      ) : (
        segments.map((seg, i) => {
          const p1o = point(R, seg.from);
          const p2o = point(R, seg.to);
          const p1i = point(r, seg.from);
          const p2i = point(r, seg.to);
          const large = seg.to - seg.from > 180 ? 1 : 0;
          const d = [
            `M ${p1o.x} ${p1o.y}`,
            `A ${R} ${R} 0 ${large} 1 ${p2o.x} ${p2o.y}`,
            `L ${p2i.x} ${p2i.y}`,
            `A ${r} ${r} 0 ${large} 0 ${p1i.x} ${p1i.y}`,
            "Z",
          ].join(" ");
          return <path key={i} d={d} fill={seg.color} stroke="white" strokeWidth={2} />;
        })
      )}
      <text x={cx} y={cy + 5} textAnchor="middle" className="font-bold fill-slate-700" style={{ fontSize: total > 0 ? "1.25rem" : "0.875rem" }}>
        {total > 0 ? formatNum(total) : "0"}
      </text>
    </svg>
  );
}

/** شريط أفقي لمقارنة الحالات */
/** شارت المبالغ المتبقية — نصف دائرة (قوس) + رقم بارز */
function RemainingAmountChart({ remaining, height = 100 }: { remaining: number; height?: number }) {
  const width = height * 2;
  const cx = width / 2;
  const cy = height;
  const R = height - 10;
  const strokeW = 14;
  const toRad = (deg: number) => ((deg - 180) * Math.PI) / 180;
  const x1 = cx + R * Math.cos(toRad(0));
  const y1 = cy + R * Math.sin(toRad(0));
  const x2 = cx + R * Math.cos(toRad(180));
  const y2 = cy + R * Math.sin(toRad(180));
  const arcD = `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`;
  return (
    <svg width={width} height={height + 32} className="shrink-0">
      <path d={arcD} fill="none" stroke="#e2e8f0" strokeWidth={strokeW} strokeLinecap="round" />
      {remaining > 0 && <path d={arcD} fill="none" stroke="#d97706" strokeWidth={strokeW} strokeLinecap="round" />}
      <text x={cx} y={cy - 2} textAnchor="middle" className="font-bold fill-slate-800" style={{ fontSize: "1.1rem" }}>
        {formatNum(remaining)}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="fill-slate-500" style={{ fontSize: "0.65rem" }}>
        ر.س متبقية
      </text>
    </svg>
  );
}

/** دونات صافي الدخل: عمولة + صافي بعد العمولة + المتبقي على العملاء (اختياري) */
function NetIncomeDonut({ revenue, commission, remaining = 0, size = 120, strokeWidth = 18 }: { revenue: number; commission: number; remaining?: number; size?: number; strokeWidth?: number }) {
  const net = Math.max(0, revenue - commission);
  const totalCircle = revenue + remaining;
  const cx = size / 2;
  const cy = size / 2;
  const R = (size - strokeWidth) / 2;
  const r = R - strokeWidth;
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const point = (radius: number, deg: number) => ({ x: cx + radius * Math.cos(toRad(deg)), y: cy + radius * Math.sin(toRad(deg)) });
  const segments: { from: number; to: number; color: string }[] = [];
  if (totalCircle > 0) {
    let acc = 0;
    if (commission > 0) segments.push({ from: (acc / totalCircle) * 360, to: ((acc += commission) / totalCircle) * 360, color: "#d97706" });
    if (net > 0) segments.push({ from: (acc / totalCircle) * 360, to: ((acc += net) / totalCircle) * 360, color: "#059669" });
    if (remaining > 0) segments.push({ from: (acc / totalCircle) * 360, to: 360, color: "#ea580c" });
  }
  return (
    <svg width={size} height={size} className="shrink-0">
      {totalCircle === 0 ? (
        <circle cx={cx} cy={cy} r={R - strokeWidth / 2} fill="#f1f5f9" stroke="#e2e8f0" strokeWidth={strokeWidth} />
      ) : (
        segments.map((seg, i) => {
          const p1o = point(R, seg.from);
          const p2o = point(R, seg.to);
          const p1i = point(r, seg.from);
          const p2i = point(r, seg.to);
          const large = seg.to - seg.from > 180 ? 1 : 0;
          const d = [`M ${p1o.x} ${p1o.y}`, `A ${R} ${R} 0 ${large} 1 ${p2o.x} ${p2o.y}`, `L ${p2i.x} ${p2i.y}`, `A ${r} ${r} 0 ${large} 0 ${p1i.x} ${p1i.y}`, "Z"].join(" ");
          return <path key={i} d={d} fill={seg.color} stroke="white" strokeWidth={2} />;
        })
      )}
      <text x={cx} y={cy + 4} textAnchor="middle" className="font-bold fill-slate-700" style={{ fontSize: "0.75rem" }}>
        {formatNum(totalCircle)}
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" className="fill-slate-500" style={{ fontSize: "0.6rem" }}>
        ر.س
      </text>
    </svg>
  );
}

function StatusBarChart({ active, completed, cancelled, maxBar = 120 }: { active: number; completed: number; cancelled: number; maxBar?: number }) {
  const total = active + completed + cancelled;
  if (total === 0) return <div className="text-sm text-slate-400">لا توجد حجوزات</div>;
  const scale = maxBar / Math.max(total, 1);
  const wActive = Math.max(active * scale, active > 0 ? 8 : 0);
  const wCompleted = Math.max(completed * scale, completed > 0 ? 8 : 0);
  const wCancelled = Math.max(cancelled * scale, cancelled > 0 ? 8 : 0);
  return (
    <div className="flex items-center gap-2 w-full max-w-xs">
      <div className="flex rounded-lg overflow-hidden bg-slate-100 flex-1 min-w-0 h-7" style={{ maxWidth: maxBar }}>
        {active > 0 && <div className="h-full bg-amber-500 min-w-[2px]" style={{ width: wActive }} title={`نشط: ${active}`} />}
        {completed > 0 && <div className="h-full bg-emerald-500 min-w-[2px]" style={{ width: wCompleted }} title={`مكتمل: ${completed}`} />}
        {cancelled > 0 && <div className="h-full bg-slate-400 min-w-[2px]" style={{ width: wCancelled }} title={`ملغى: ${cancelled}`} />}
      </div>
      <span className="text-xs text-slate-500 shrink-0">{formatNum(total)}</span>
    </div>
  );
}

/** شارت تقرير المبيعات — دونات واحدة: إيرادات مدفوع بالكامل + جزئي + عمولات */
function SalesReportChart({
  paymentFull,
  paymentPartial,
  revenueFull,
  revenuePartial,
  totalCommission,
}: {
  paymentFull: number;
  paymentPartial: number;
  revenueFull: number;
  revenuePartial: number;
  totalCommission: number;
}) {
  const totalRevenue = revenueFull + revenuePartial;
  const totalCircle = totalRevenue + totalCommission;
  const size = 200;
  const strokeWidth = 28;
  const cx = size / 2;
  const cy = size / 2;
  const R = (size - strokeWidth) / 2;
  const r = R - strokeWidth;
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const point = (radius: number, deg: number) => ({ x: cx + radius * Math.cos(toRad(deg)), y: cy + radius * Math.sin(toRad(deg)) });
  const segments: { from: number; to: number; color: string }[] = [];
  if (totalCircle > 0) {
    let acc = 0;
    if (revenueFull > 0) segments.push({ from: (acc / totalCircle) * 360, to: ((acc += revenueFull) / totalCircle) * 360, color: "#059669" });
    if (revenuePartial > 0) segments.push({ from: (acc / totalCircle) * 360, to: ((acc += revenuePartial) / totalCircle) * 360, color: "#d97706" });
    if (totalCommission > 0) segments.push({ from: (acc / totalCircle) * 360, to: 360, color: "#b45309" });
  }
  const pctFull = totalCircle > 0 ? (revenueFull / totalCircle) * 100 : 0;
  const pctPartial = totalCircle > 0 ? (revenuePartial / totalCircle) * 100 : 0;
  const pctCommission = totalCircle > 0 ? (totalCommission / totalCircle) * 100 : 0;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-8 p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-amber-50/30 border border-slate-200">
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-medium text-slate-600">توزيع الإيرادات والعمولات</p>
        <svg width={size} height={size} className="shrink-0">
          {totalCircle === 0 ? (
            <circle cx={cx} cy={cy} r={R - strokeWidth / 2} fill="#f1f5f9" stroke="#e2e8f0" strokeWidth={strokeWidth} />
          ) : (
            segments.map((seg, i) => {
              const p1o = point(R, seg.from);
              const p2o = point(R, seg.to);
              const p1i = point(r, seg.from);
              const p2i = point(r, seg.to);
              const large = seg.to - seg.from > 180 ? 1 : 0;
              const d = [`M ${p1o.x} ${p1o.y}`, `A ${R} ${R} 0 ${large} 1 ${p2o.x} ${p2o.y}`, `L ${p2i.x} ${p2i.y}`, `A ${r} ${r} 0 ${large} 0 ${p1i.x} ${p1i.y}`, "Z"].join(" ");
              return <path key={i} d={d} fill={seg.color} stroke="white" strokeWidth={2} />;
            })
          )}
          <text x={cx} y={cy - 4} textAnchor="middle" className="font-bold fill-slate-700" style={{ fontSize: "1.25rem" }}>{formatNum(totalRevenue)}</text>
          <text x={cx} y={cy + 14} textAnchor="middle" className="fill-slate-500" style={{ fontSize: "0.65rem" }}>ر.س إيرادات</text>
        </svg>
      </div>
      <div className="flex-1 w-full max-w-md space-y-3">
        <p className="text-sm font-medium text-slate-600">حالة الدفع (عدد الصفقات)</p>
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <div className="flex rounded-lg overflow-hidden h-10 bg-slate-100 w-full">
            {revenueFull > 0 && <div className="h-full bg-emerald-500 min-w-[4px]" style={{ width: `${totalCircle > 0 ? (revenueFull / totalCircle) * 100 : 0}%` }} title={`مدفوع بالكامل: ${formatNum(revenueFull)}`} />}
            {revenuePartial > 0 && <div className="h-full bg-amber-500 min-w-[4px]" style={{ width: `${totalCircle > 0 ? (revenuePartial / totalCircle) * 100 : 0}%` }} title={`جزئي: ${formatNum(revenuePartial)}`} />}
            {totalCommission > 0 && <div className="h-full bg-amber-700 min-w-[4px]" style={{ width: `${totalCircle > 0 ? (totalCommission / totalCircle) * 100 : 0}%` }} title={`عمولات: ${formatNum(totalCommission)}`} />}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mt-3 pt-3 border-t border-slate-100 text-sm text-slate-600">
            <span className="flex items-center gap-1.5 shrink-0"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> مدفوع بالكامل {formatNum(revenueFull)} <span className="text-slate-400">({pctFull.toFixed(1)}%)</span></span>
            <span className="flex items-center gap-1.5 shrink-0"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> جزئي {formatNum(revenuePartial)} <span className="text-slate-400">({pctPartial.toFixed(1)}%)</span></span>
            <span className="flex items-center gap-1.5 shrink-0"><span className="w-2.5 h-2.5 rounded-full bg-amber-700" /> عمولات {formatNum(totalCommission)} <span className="text-slate-400">({pctCommission.toFixed(1)}%)</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketingReportsPage() {
  const router = useRouter();
  const { can, ready, effectiveOwnerId } = useDashboardAuth();
  const { data, loading, error: fetchError, refetch: fetchData } = useMarketingReportsData({
    ownerId: effectiveOwnerId,
    enabled: ready && !!effectiveOwnerId && can("marketing_view"),
  });
  const { reservations, sales, marketers, buildingsMap, unitsMap, unitsStatusCounts } = data;
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [reservationsTableExpanded, setReservationsTableExpanded] = useState(false);
  const [salesTableExpanded, setSalesTableExpanded] = useState(false);
  const TABLE_PAGE_SIZES = [10, 25, 50, 100] as const;
  const [byBuildingPage, setByBuildingPage] = useState(1);
  const [byBuildingPageSize, setByBuildingPageSize] = useState(10);
  const [remainingPage, setRemainingPage] = useState(1);
  const [remainingPageSize, setRemainingPageSize] = useState(10);
  const [marketersPage, setMarketersPage] = useState(1);
  const [marketersPageSize, setMarketersPageSize] = useState(10);

  const { from: periodFrom, to: periodTo } = useMemo(
    () => getPeriodBounds(period, customDateFrom, customDateTo),
    [period, customDateFrom, customDateTo]
  );

  const isInPeriod = useCallback(
    (dateStr: string | null) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= periodFrom && d <= periodTo;
    },
    [periodFrom, periodTo]
  );

  const filteredReservations = useMemo(() => {
    let list = period === "all" ? reservations : reservations.filter((r) => isInPeriod(r.reservation_date));
    if (selectedBuildingId) list = list.filter((r) => r.building_id === selectedBuildingId);
    return list;
  }, [reservations, period, isInPeriod, selectedBuildingId]);

  const filteredSales = useMemo(() => {
    let list = period === "all" ? sales : sales.filter((s) => isInPeriod(s.sale_date));
    if (selectedBuildingId) list = list.filter((s) => s.building_id === selectedBuildingId);
    return list;
  }, [sales, period, isInPeriod, selectedBuildingId]);

  /** صفقات لديها مبلغ متبقٍ فقط — لجدول تقرير المبالغ المتبقية */
  const salesWithRemaining = useMemo(
    () => filteredSales.filter((s) => (s.remaining_payment ?? 0) > 0),
    [filteredSales]
  );

  const stats = useMemo(() => {
    // — معادلات التقرير (ديناميكية مع الفترة المحددة) —
    // الحجوزات: ترشيح حسب reservation_date. العرابين: غير مستردة + غير مكتملة فقط (تفادي الازدواج مع المبيعات).
    // المبيعات: totalRevenue = Σ sale_price، totalCollected = Σ (sale_price - remaining_payment)، totalRemaining = Σ remaining_payment → totalRevenue = totalCollected + totalRemaining.
    // معدل التحويل: (حجوزات مكتملة / حجوزات غير ملغاة) × 100. العمولات: من sales مرتبطة بحجز (sale_id) للمسوق.
    const activeStatuses = ["active", "pending", "confirmed", "reserved"];
    const active = filteredReservations.filter((r) => activeStatuses.includes(r.status)).length;
    const completed = filteredReservations.filter((r) => r.status === "completed").length;
    const cancelled = filteredReservations.filter((r) => r.status === "cancelled").length;
    // إجمالي العرابين غير المستردة والتي لم تُحسب بعد ضمن مبيعات مكتملة (حجوزات نشطة أو ملغاة بدون استرداد فقط)
    const totalDeposits = filteredReservations
      .filter((r) => r.status !== "completed" && !r.deposit_refunded)
      .reduce((sum, r) => sum + (r.deposit_amount ?? 0), 0);
    // المنطق الثابت: العمولة من المبلغ المحصل. مثال: بيع 520,000 — عمولة 20,000 — صافي الشقة 500,000. إذن: صافي بعد العمولة = المحصّل − العمولة. نسبة العمولة = (العمولة ÷ المحصّل) × 100.
    const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.sale_price ?? 0), 0);
    const totalCollected = filteredSales.reduce((sum, s) => sum + ((s.sale_price ?? 0) - (s.remaining_payment ?? 0)), 0);
    const totalCommission = filteredSales.reduce((sum, s) => sum + (s.commission_amount ?? 0), 0);
    const totalRemaining = filteredSales.reduce((sum, s) => sum + (s.remaining_payment ?? 0), 0);
    const statsCompleted = filteredReservations.filter((r) => r.status === "completed").length;
    const nonCancelledRes = filteredReservations.filter((r) => r.status !== "cancelled");
    const conversionRate = nonCancelledRes.length ? (statsCompleted / nonCancelledRes.length) * 100 : 0;
    const paymentFull = filteredSales.filter((s) => s.payment_status === "completed").length;
    const paymentPartial = filteredSales.filter((s) => s.payment_status === "partial").length;
    const byMarketer: Record<string, { reservations: number; completed: number; commission: number }> = {};
    marketers.forEach((m) => {
      byMarketer[m.id] = { reservations: 0, completed: 0, commission: 0 };
    });
    filteredReservations.forEach((r) => {
      if (r.marketer_id && byMarketer[r.marketer_id]) {
        byMarketer[r.marketer_id].reservations += 1;
        if (r.status === "completed") byMarketer[r.marketer_id].completed += 1;
      }
    });
    filteredSales.forEach((s) => {
      const res = reservations.find((r) => r.sale_id === s.id && r.marketer_id);
      if (res?.marketer_id && byMarketer[res.marketer_id]) {
        byMarketer[res.marketer_id].commission += s.commission_amount ?? 0;
      }
    });
    const buildingIds = Object.keys(buildingsMap);
    const byBuilding: Array<{ buildingId: string; buildingName: string; reservations: number; sales: number; revenue: number }> = buildingIds.map((buildingId) => ({
      buildingId,
      buildingName: buildingsMap[buildingId] ?? "—",
      reservations: filteredReservations.filter((r) => r.building_id === buildingId).length,
      sales: filteredSales.filter((s) => s.building_id === buildingId).length,
      revenue: filteredSales.filter((s) => s.building_id === buildingId).reduce((sum, s) => sum + (s.sale_price ?? 0), 0),
    }));
    const monthKeys = new Set<string>();
    filteredReservations.forEach((r) => {
      if (r.reservation_date) monthKeys.add(r.reservation_date.slice(0, 7));
    });
    filteredSales.forEach((s) => {
      if (s.sale_date) monthKeys.add(s.sale_date.slice(0, 7));
    });
    const monthlyBreakdown: Array<{ monthKey: string; monthLabel: string; reservations: number; sales: number; revenue: number }> = Array.from(monthKeys)
      .sort()
      .reverse()
      .slice(0, 12)
      .map((monthKey) => {
        const [y, m] = monthKey.split("-");
        const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
        const monthLabel = d.toLocaleDateString("en-GB", { year: "numeric", month: "short" });
        return {
          monthKey,
          monthLabel,
          reservations: filteredReservations.filter((r) => r.reservation_date?.slice(0, 7) === monthKey).length,
          sales: filteredSales.filter((s) => s.sale_date?.slice(0, 7) === monthKey).length,
          revenue: filteredSales.filter((s) => s.sale_date?.slice(0, 7) === monthKey).reduce((sum, s) => sum + (s.sale_price ?? 0), 0),
        };
      });
    const topMarketersBySales = marketers
      .map((m) => ({ ...m, ...byMarketer[m.id], completed: byMarketer[m.id]?.completed ?? 0, commission: byMarketer[m.id]?.commission ?? 0, reservations: byMarketer[m.id]?.reservations ?? 0 }))
      .filter((m) => m.completed > 0)
      .sort((a, b) => b.completed - a.completed || (b.commission ?? 0) - (a.commission ?? 0));
    return {
      totalReservations: filteredReservations.length,
      active,
      completed: statsCompleted,
      cancelled,
      totalDeposits,
      totalSales: filteredSales.length,
      totalRevenue,
      totalCommission,
      totalCollected,
      totalRemaining,
      conversionRate,
      paymentFull,
      paymentPartial,
      byMarketer,
      byBuilding,
      monthlyBreakdown,
      topMarketersBySales,
    };
  }, [filteredReservations, filteredSales, marketers, reservations, buildingsMap]);

  const byBuildingTotalPages = Math.max(1, Math.ceil((stats?.byBuilding?.length ?? 0) / byBuildingPageSize));
  const paginatedByBuilding = useMemo(
    () => (stats?.byBuilding ?? []).slice((byBuildingPage - 1) * byBuildingPageSize, byBuildingPage * byBuildingPageSize),
    [stats?.byBuilding, byBuildingPage, byBuildingPageSize]
  );
  const remainingTotalPages = Math.max(1, Math.ceil(salesWithRemaining.length / remainingPageSize));
  const paginatedRemaining = useMemo(
    () => salesWithRemaining.slice((remainingPage - 1) * remainingPageSize, remainingPage * remainingPageSize),
    [salesWithRemaining, remainingPage, remainingPageSize]
  );
  const marketersTotalPages = Math.max(1, Math.ceil((stats?.topMarketersBySales?.length ?? 0) / marketersPageSize));
  const paginatedMarketers = useMemo(
    () => (stats?.topMarketersBySales ?? []).slice((marketersPage - 1) * marketersPageSize, marketersPage * marketersPageSize),
    [stats?.topMarketersBySales, marketersPage, marketersPageSize]
  );

  useEffect(() => {
    if (byBuildingPage > byBuildingTotalPages && byBuildingTotalPages >= 1) setByBuildingPage(1);
  }, [byBuildingPage, byBuildingTotalPages]);
  useEffect(() => {
    if (remainingPage > remainingTotalPages && remainingTotalPages >= 1) setRemainingPage(1);
  }, [remainingPage, remainingTotalPages]);
  useEffect(() => {
    if (marketersPage > marketersTotalPages && marketersTotalPages >= 1) setMarketersPage(1);
  }, [marketersPage, marketersTotalPages]);

  useEffect(() => {
    if (!ready) return;
    if (!can("marketing_view")) {
      router.replace("/dashboard");
      return;
    }
  }, [ready, can, router]);

  useEffect(() => {
    if (fetchError) showToast(fetchError, "error");
  }, [fetchError]);

  const handlePrint = () => {
    window.print();
  };

  const exportCsv = (name: string, headers: string[], rows: string[][]) => {
    const line = (arr: string[]) => arr.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",");
    const csv = "\uFEFF" + [line(headers), ...rows.map((r) => line(r))].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${name}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportReservations = () => {
    const headers = ["التاريخ", "العمارة", "الوحدة", "الحالة", "العربون"];
    const rows = filteredReservations.slice(0, 500).map((r) => [
      formatDate(r.reservation_date),
      buildingsMap[r.building_id] ?? "",
      r.unit_id && unitsMap[r.unit_id] ? `${unitsMap[r.unit_id].unit_number} (د${unitsMap[r.unit_id].floor})` : "",
      r.status === "completed" ? "مكتمل" : r.status === "cancelled" ? "ملغى" : "نشط",
      r.deposit_amount != null ? String(r.deposit_amount) : "",
    ]);
    exportCsv("reservations", headers, rows);
    showToast("تم تصدير الحجوزات", "success");
  };

  const handleExportSales = () => {
    const headers = ["تاريخ البيع", "العمارة", "الوحدة", "سعر البيع", "المحصّل", "المتبقي", "العمولة"];
    const rows = filteredSales.slice(0, 500).map((s) => [
      formatDate(s.sale_date),
      buildingsMap[s.building_id] ?? "",
      s.unit_id && unitsMap[s.unit_id] ? `${unitsMap[s.unit_id].unit_number} (د${unitsMap[s.unit_id].floor})` : "",
      String(s.sale_price ?? ""),
      String((s.sale_price ?? 0) - (s.remaining_payment ?? 0)),
      String(s.remaining_payment ?? ""),
      String(s.commission_amount ?? ""),
    ]);
    exportCsv("sales", headers, rows);
    showToast("تم تصدير المبيعات", "success");
  };

  const handleExportMarketers = () => {
    const headers = ["المسوق", "عدد الحجوزات", "مبيعات مكتملة", "إجمالي العمولة"];
    const rows = marketers.map((m) => [
      m.name,
      String(stats.byMarketer[m.id]?.reservations ?? 0),
      String(stats.byMarketer[m.id]?.completed ?? 0),
      String(stats.byMarketer[m.id]?.commission ?? 0),
    ]);
    exportCsv("marketers", headers, rows);
    showToast("تم تصدير أداء المسوقين", "success");
  };

  const periodLabel: Record<PeriodKey, string> = {
    all: "كل الفترات",
    month: "هذا الشهر",
    quarter: "هذا الربع",
    year: "هذه السنة",
    custom: customDateFrom && customDateTo ? `${customDateFrom} → ${customDateTo}` : "مخصص",
  };

  if (ready && !can("reservations")) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <p className="text-gray-500">جاري التحويل...</p>
      </main>
    );
  }

  return (
    <main className="reports-print min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-amber-50/40 p-4 sm:p-6 lg:p-8 print:bg-white print:p-0" dir="rtl">
      <div className="max-w-6xl mx-auto relative">
        {/* هيدر موحد — نفس مقاس إدارة العماير */}
        <header className="relative rounded-2xl overflow-hidden mb-8 shadow-lg border border-gray-200/90 bg-gradient-to-br from-white to-gray-50 print:shadow-none print:border print:mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-10 print:opacity-0" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_70%_0%,rgba(245,158,11,0.08),transparent)] print:opacity-0" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-4 sm:px-5 sm:py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25 ring-1 ring-white/70 print:shadow-none">
                <LineChart className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-800 tracking-tight leading-tight">تقارير التسويق والمبيعات</h1>
                <p className="text-xs text-gray-500 mt-0.5">تحليل خاص بقسم التسويق والمبيعات فقط: حجوزات، مبيعات، عرابين، عمولات المسوقين، صافي الدخل — لا يشمل تحليل الملاك أو المستثمرين</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0 print:hidden">
              <Link
                href="/dashboard/marketing"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm shadow-sm hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
                إدارة التسويق والمبيعات
              </Link>
              <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
                <LayoutDashboard className="w-4 h-4" />
                لوحة التحكم
              </Link>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600"
              >
                <Printer className="w-4 h-4" />
                طباعة
              </button>
            </div>
          </div>
        </header>

        {/* Period filter */}
        <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
          <span className="text-sm font-medium text-slate-600">الفترة:</span>
          {(["all", "month", "quarter", "year"] as PeriodKey[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                period === p ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p === "all" ? "كل الفترات" : p === "month" ? "هذا الشهر" : p === "quarter" ? "هذا الربع" : "هذه السنة"}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPeriod("custom")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              period === "custom" ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            مخصص
          </button>
          {period === "custom" && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <span className="text-slate-500">→</span>
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>

        {/* Building filter — لا يؤثر على نمط الفترة (شهري/ربعي/سنوي) */}
        <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
          <span className="text-sm font-medium text-slate-600">العمارة:</span>
          <select
            value={selectedBuildingId ?? ""}
            onChange={(e) => setSelectedBuildingId(e.target.value ? e.target.value : null)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 min-w-[180px]"
          >
            <option value="">كل العماير</option>
            {Object.entries(buildingsMap).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          {selectedBuildingId && (
            <button
              type="button"
              onClick={() => setSelectedBuildingId(null)}
              className="text-xs text-slate-500 hover:text-amber-600 underline"
            >
              إظهار الكل
            </button>
          )}
        </div>

        {fetchError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-red-800">{fetchError}</p>
            <button
              type="button"
              onClick={() => fetchData()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة المحاولة
            </button>
          </div>
        )}
        {loading ? (
          <PageLoadingSkeleton message="جارٍ تحميل التقرير..." size="md" variant="amber" />
        ) : (
          <>
            {/* Executive summary */}
            <section className="mb-8">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-l from-amber-50/40 to-transparent">
                  <BarChart3 className="w-5 h-5 text-amber-600" />
                  الملخص التنفيذي
                </h2>
                {selectedBuildingId && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-sm font-medium border border-slate-200">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    عرض التقرير لعمارة: {buildingsMap[selectedBuildingId] ?? "—"}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-amber-600" />
                    </span>
                    <span className="text-xs font-medium text-slate-500 truncate min-w-0">الحجوزات ({periodLabel[period]})</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{formatNum(stats.totalReservations)}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    نشط: {formatNum(stats.active)} · مكتمل: {formatNum(stats.completed)} · ملغى: {formatNum(stats.cancelled)}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <RiyalIcon className="w-5 h-5 text-emerald-600" />
                    </span>
                    <span className="text-xs font-medium text-slate-500 truncate min-w-0">إجمالي العرابين</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">
                    {formatNum(stats.totalDeposits)} <span className="text-sm font-normal text-slate-500">{RIYAL}</span>
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </span>
                    <span className="text-xs font-medium text-slate-500 truncate min-w-0">المبيعات ({periodLabel[period]})</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{formatNum(stats.totalSales)}</p>
                  <p className="text-xs text-slate-500 mt-1">صفقة</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <RiyalIcon className="w-5 h-5 text-emerald-600" />
                    </span>
                    <span className="text-xs font-medium text-slate-500 truncate min-w-0">إجمالي الإيرادات</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">
                    {formatNum(stats.totalRevenue)} <span className="text-sm font-normal text-slate-500">{RIYAL}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">إجمالي قيمة عقود البيع (يشمل المبلغ المحصّل والمتبقي)</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <p className="text-xs text-slate-500 mb-1">معدل التحويل (حجز ← بيع)</p>
                  <p className="text-xl font-bold text-slate-800">{stats.conversionRate.toFixed(1)}%</p>
                  <p className="text-xs text-slate-400 mt-0.5">نسبة الحجوزات التي تحوّلت لمبيعات</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <p className="text-xs text-slate-500 mb-1">إجمالي عمولات المسوقين</p>
                  <p className="text-xl font-bold text-amber-700 dir-ltr">{formatNum(stats.totalCommission)} {RIYAL}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <p className="text-xs text-slate-500 mb-1">حالة الدفع (صفقات)</p>
                  <p className="text-sm font-medium text-slate-700">مدفوع بالكامل: {formatNum(stats.paymentFull)} · جزئي: {formatNum(stats.paymentPartial)}</p>
                </div>
              </div>
            </section>

            {/* Units summary — حالة حية (لا ترتبط بفترة التقرير) */}
            <section className="mb-8">
              <h2 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-l from-amber-50/40 to-transparent">
                <Home className="w-5 h-5 text-amber-600" />
                ملخص الوحدات
              </h2>
              <p className="text-xs text-slate-500 mb-3">حالة الوحدات الحالية لجميع العماير (لا ترتبط بفترة التقرير أعلاه)</p>
              {(() => {
                const totalUnits = unitsStatusCounts.available + unitsStatusCounts.reserved + unitsStatusCounts.sold;
                const pctAvailable = totalUnits > 0 ? (unitsStatusCounts.available / totalUnits) * 100 : 0;
                const pctReserved = totalUnits > 0 ? (unitsStatusCounts.reserved / totalUnits) * 100 : 0;
                const pctSold = totalUnits > 0 ? (unitsStatusCounts.sold / totalUnits) * 100 : 0;
                return (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-5">
                    <div className="flex rounded-lg overflow-hidden h-8 bg-slate-100 w-full mb-4">
                      {unitsStatusCounts.available > 0 && <div className="h-full bg-emerald-500 min-w-[4px]" style={{ width: `${pctAvailable}%` }} title={`متاحة: ${unitsStatusCounts.available}`} />}
                      {unitsStatusCounts.reserved > 0 && <div className="h-full bg-amber-500 min-w-[4px]" style={{ width: `${pctReserved}%` }} title={`محجوزة: ${unitsStatusCounts.reserved}`} />}
                      {unitsStatusCounts.sold > 0 && <div className="h-full bg-slate-500 min-w-[4px]" style={{ width: `${pctSold}%` }} title={`مباعة: ${unitsStatusCounts.sold}`} />}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-emerald-700">{formatNum(unitsStatusCounts.available)}</p>
                        <p className="text-xs text-slate-500 mt-1">متاحة <span className="text-slate-400">({pctAvailable.toFixed(0)}%)</span></p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-amber-700">{formatNum(unitsStatusCounts.reserved)}</p>
                        <p className="text-xs text-slate-500 mt-1">محجوزة <span className="text-slate-400">({pctReserved.toFixed(0)}%)</span></p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-700">{formatNum(unitsStatusCounts.sold)}</p>
                        <p className="text-xs text-slate-500 mt-1">مباعة <span className="text-slate-400">({pctSold.toFixed(0)}%)</span></p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </section>

            {/* By building */}
            {stats.byBuilding.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-l from-amber-50/40 to-transparent">
                  <Building2 className="w-5 h-5 text-amber-600" />
                  توزيع الحجوزات والمبيعات حسب العمارة
                </h2>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-right py-2.5 px-3 font-semibold text-slate-600">العمارة</th>
                        <th className="text-center py-2.5 px-3 font-semibold text-slate-600">الحجوزات</th>
                        <th className="text-center py-2.5 px-3 font-semibold text-slate-600">المبيعات</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-slate-600">الإيرادات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedByBuilding.map((b) => (
                        <tr key={b.buildingId} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-medium text-slate-800">{b.buildingName}</td>
                          <td className="py-2 px-3 text-center">{formatNum(b.reservations)}</td>
                          <td className="py-2 px-3 text-center">{formatNum(b.sales)}</td>
                          <td className="py-2 px-3 dir-ltr text-emerald-700">{formatNum(b.revenue)} {RIYAL}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {stats.byBuilding.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        <span>عرض</span>
                        <select
                          value={byBuildingPageSize}
                          onChange={(e) => { setByBuildingPageSize(Number(e.target.value)); setByBuildingPage(1); }}
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-0 transition-all duration-200"
                        >
                          {TABLE_PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <span className="font-mono">
                          {((byBuildingPage - 1) * byBuildingPageSize + 1).toLocaleString("en")}–
                          {Math.min(byBuildingPage * byBuildingPageSize, stats.byBuilding.length).toLocaleString("en")} من {stats.byBuilding.length.toLocaleString("en")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setByBuildingPage((p) => Math.max(1, p - 1))} disabled={byBuildingPage <= 1} className="min-w-[2.75rem] py-2 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-0">السابق</button>
                        <span className="px-2 py-1.5 text-sm text-slate-600 font-mono">{byBuildingPage.toLocaleString("en")} / {byBuildingTotalPages.toLocaleString("en")}</span>
                        <button type="button" onClick={() => setByBuildingPage((p) => Math.min(byBuildingTotalPages, p + 1))} disabled={byBuildingPage >= byBuildingTotalPages} className="min-w-[2.75rem] py-2 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-0">التالي</button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Monthly breakdown */}
            {stats.monthlyBreakdown.length > 1 && (
              <section className="mb-8">
                <h2 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-l from-amber-50/40 to-transparent">
                  <Calendar className="w-5 h-5 text-amber-600" />
                  التقرير الشهري
                </h2>
                <p className="text-sm text-slate-500 mb-4">آخر 12 شهراً حسب البيانات في الفترة المحددة.</p>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-right py-2.5 px-3 font-semibold text-slate-600">الشهر</th>
                        <th className="text-center py-2.5 px-3 font-semibold text-slate-600">الحجوزات</th>
                        <th className="text-center py-2.5 px-3 font-semibold text-slate-600">المبيعات</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-slate-600">الإيرادات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.monthlyBreakdown.map((row) => (
                        <tr key={row.monthKey} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-medium text-slate-800">{row.monthLabel}</td>
                          <td className="py-2 px-3 text-center">{formatNum(row.reservations)}</td>
                          <td className="py-2 px-3 text-center">{formatNum(row.sales)}</td>
                          <td className="py-2 px-3 dir-ltr text-emerald-700">{formatNum(row.revenue)} {RIYAL}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Reservations report — charts + compact table */}
            <section className="mb-8">
              <h2 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-l from-amber-50/40 to-transparent">
                <FileText className="w-5 h-5 text-amber-600" />
                تقرير الحجوزات
              </h2>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50/80 to-white flex items-center gap-3">
                  <FileText className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">ملخص الحجوزات</p>
                    <p className="text-xs text-slate-500 mt-0.5">توزيع حالات الحجوزات والتفاصيل في الفترة المحددة</p>
                  </div>
                </div>
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-sm font-medium text-slate-600">توزيع الحالات</p>
                      <DonutChart active={stats.active} completed={stats.completed} cancelled={stats.cancelled} size={160} strokeWidth={26} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-4">
                      <div>
                        <p className="text-sm font-medium text-slate-600 mb-2">شريط توزيع الحالات</p>
                        <StatusBarChart active={stats.active} completed={stats.completed} cancelled={stats.cancelled} maxBar={220} />
                      </div>
                      {(() => {
                        const total = stats.active + stats.completed + stats.cancelled;
                        const pctActive = total > 0 ? (stats.active / total) * 100 : 0;
                        const pctCompleted = total > 0 ? (stats.completed / total) * 100 : 0;
                        const pctCancelled = total > 0 ? (stats.cancelled / total) * 100 : 0;
                        return (
                          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600 pt-3 border-t border-slate-100">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" /> نشط {formatNum(stats.active)} <span className="text-slate-400">({pctActive.toFixed(1)}%)</span></span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" /> مكتمل {formatNum(stats.completed)} <span className="text-slate-400">({pctCompleted.toFixed(1)}%)</span></span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" /> ملغى {formatNum(stats.cancelled)} <span className="text-slate-400">({pctCancelled.toFixed(1)}%)</span></span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setReservationsTableExpanded(!reservationsTableExpanded)}
                    className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-slate-600 hover:bg-slate-50 transition print:hidden"
                  >
                    <span>آخر الحجوزات — {formatNum(filteredReservations.length)} حجز</span>
                    <span className="text-amber-600">{reservationsTableExpanded ? "إخفاء التفاصيل" : "عرض التفاصيل"}</span>
                  </button>
                  {(reservationsTableExpanded || filteredReservations.length <= 5) && (
                    <div className="overflow-x-auto max-h-[18rem] overflow-y-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                          <tr>
                            <th className="text-right py-2 px-3 font-semibold text-slate-600">التاريخ</th>
                            <th className="text-right py-2 px-3 font-semibold text-slate-600">العمارة / الوحدة</th>
                            <th className="text-right py-2 px-3 font-semibold text-slate-600">الحالة</th>
                            <th className="text-right py-2 px-3 font-semibold text-slate-600">العربون</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredReservations.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-slate-500">
                                لا توجد حجوزات في الفترة المحددة
                              </td>
                            </tr>
                          ) : (
                            filteredReservations
                              .slice(0, reservationsTableExpanded ? 100 : 8)
                              .map((r) => (
                                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                  <td className="py-2 px-3 text-slate-700">{formatDate(r.reservation_date)}</td>
                                  <td className="py-2 px-3">
                                    {buildingsMap[r.building_id] ?? "—"} / {r.unit_id && unitsMap[r.unit_id] ? `${unitsMap[r.unit_id].unit_number} (د${unitsMap[r.unit_id].floor})` : "—"}
                                  </td>
                                  <td className="py-2 px-3">
                                    <span
                                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                        r.status === "completed" ? "bg-emerald-100 text-emerald-700" : r.status === "cancelled" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-700"
                                      }`}
                                    >
                                      {r.status === "completed" ? "مكتمل" : r.status === "cancelled" ? "ملغى" : "نشط"}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 dir-ltr">{r.deposit_amount != null ? `${formatNum(r.deposit_amount)} ${RIYAL}` : "—"}</td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {!reservationsTableExpanded && filteredReservations.length > 5 && (
                    <p className="text-xs text-slate-500 px-4 py-2 border-t border-slate-100">عرض 8 من {formatNum(filteredReservations.length)} — انقر «عرض التفاصيل» للمزيد</p>
                  )}
                  {reservationsTableExpanded && filteredReservations.length > 100 && (
                    <p className="text-xs text-slate-500 px-4 py-2 border-t border-slate-100">عرض أول 100 حجز من أصل {formatNum(filteredReservations.length)}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Sales report */}
            <section className="mb-8">
              <h2 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-l from-amber-50/40 to-transparent">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                تقرير المبيعات
              </h2>
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200 min-w-[10rem]">
                  <p className="text-xs text-slate-500">عدد الصفقات</p>
                  <p className="text-xl font-bold text-slate-800">{formatNum(stats.totalSales)}</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200 min-w-[10rem]">
                  <p className="text-xs text-slate-500">إجمالي الإيرادات</p>
                  <p className="text-xl font-bold text-emerald-700">{formatNum(stats.totalRevenue)} {RIYAL}</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200 min-w-[10rem]">
                  <p className="text-xs text-slate-500">إجمالي العمولات</p>
                  <p className="text-xl font-bold text-amber-700">{formatNum(stats.totalCommission)} {RIYAL}</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 min-w-[10rem]">
                  <p className="text-xs text-slate-600">مدفوع بالكامل</p>
                  <p className="text-xl font-bold text-emerald-700">{formatNum(stats.paymentFull)}</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 min-w-[10rem]">
                  <p className="text-xs text-slate-600">دفع جزئي (يوجد متبقي)</p>
                  <p className="text-xl font-bold text-amber-700">{formatNum(stats.paymentPartial)}</p>
                </div>
              </div>
              {/* شارت + جدول التفاصيل — في صندوق واحد */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {filteredSales.length > 0 && (() => {
                  const revenueFull = filteredSales.filter((s) => s.payment_status === "completed").reduce((sum, s) => sum + (s.sale_price ?? 0), 0);
                  const revenuePartial = filteredSales.filter((s) => s.payment_status === "partial").reduce((sum, s) => sum + (s.sale_price ?? 0), 0);
                  return (
                    <div className="p-5 sm:p-6 border-b border-slate-100">
                      <SalesReportChart
                        paymentFull={stats.paymentFull}
                        paymentPartial={stats.paymentPartial}
                        revenueFull={revenueFull}
                        revenuePartial={revenuePartial}
                        totalCommission={stats.totalCommission}
                      />
                    </div>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => setSalesTableExpanded(!salesTableExpanded)}
                  className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-slate-600 hover:bg-slate-50 transition print:hidden border-b border-slate-100"
                >
                  <span>تفاصيل الصفقات — {formatNum(filteredSales.length)} صفقة</span>
                  <span className="text-amber-600">{salesTableExpanded ? "إخفاء التفاصيل" : "عرض التفاصيل"}</span>
                </button>
                {(salesTableExpanded || filteredSales.length <= 6) && (
                  <div className="overflow-x-auto max-h-[20rem] overflow-y-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
                        <tr>
                          <th className="text-right py-2.5 px-3 font-semibold text-slate-600">تاريخ البيع</th>
                          <th className="text-right py-2.5 px-3 font-semibold text-slate-600">العمارة / الوحدة</th>
                          <th className="text-right py-2.5 px-3 font-semibold text-slate-600">سعر البيع</th>
                          <th className="text-right py-2.5 px-3 font-semibold text-slate-600">المحصّل</th>
                          <th className="text-right py-2.5 px-3 font-semibold text-slate-600">المتبقي</th>
                          <th className="text-right py-2.5 px-3 font-semibold text-slate-600">العمولة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSales.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-500">
                              لا توجد مبيعات في الفترة المحددة
                            </td>
                          </tr>
                        ) : (
                          filteredSales.slice(0, salesTableExpanded ? 100 : 6).map((s) => (
                            <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <td className="py-2 px-3 text-slate-700">{formatDate(s.sale_date)}</td>
                              <td className="py-2 px-3">
                                {buildingsMap[s.building_id] ?? "—"} / {s.unit_id && unitsMap[s.unit_id] ? `${unitsMap[s.unit_id].unit_number} (د${unitsMap[s.unit_id].floor})` : "—"}
                              </td>
                              <td className="py-2 px-3 dir-ltr font-medium">{formatNum(s.sale_price)} {RIYAL}</td>
                              <td className="py-2 px-3 dir-ltr text-emerald-600">{formatNum((s.sale_price ?? 0) - (s.remaining_payment ?? 0))} {RIYAL}</td>
                              <td className="py-2 px-3 dir-ltr text-amber-700">{(s.remaining_payment ?? 0) > 0 ? `${formatNum(s.remaining_payment ?? 0)} ${RIYAL}` : "—"}</td>
                              <td className="py-2 px-3 dir-ltr text-amber-700">{s.commission_amount != null ? `${formatNum(s.commission_amount)} ${RIYAL}` : "—"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                {!salesTableExpanded && filteredSales.length > 6 && (
                  <p className="text-xs text-slate-500 px-4 py-2 border-t border-slate-100">عرض 6 من {formatNum(filteredSales.length)} — انقر «عرض التفاصيل» للمزيد</p>
                )}
                {salesTableExpanded && filteredSales.length > 100 && (
                  <p className="text-xs text-slate-500 px-4 py-2 border-t border-slate-100">عرض أول 100 صفقة من أصل {formatNum(filteredSales.length)}</p>
                )}
              </div>
            </section>

            {/* Remaining amounts report — صفقات لديها متبقٍ فقط + شارت جديد */}
            <section className="mb-8">
              <h2 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-l from-amber-50/40 to-transparent">
                <Wallet className="w-5 h-5 text-amber-600" />
                تقرير المبالغ المتبقية
              </h2>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-5 sm:p-6">
                  <RemainingAmountChart remaining={stats.totalRemaining} height={88} />
                </div>
                {salesWithRemaining.length === 0 ? (
                  <div className="border-t border-slate-100 px-5 py-8 text-center text-slate-500 text-sm">
                    لا توجد صفقات لديها مبلغ متبقٍ في الفترة المحددة (جميع المبيعات مدفوعة بالكامل).
                  </div>
                ) : (
                  <div className="border-t border-slate-100">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-right py-2 px-3 font-semibold text-slate-600">تاريخ البيع</th>
                            <th className="text-right py-2 px-3 font-semibold text-slate-600">العمارة / الوحدة</th>
                            <th className="text-right py-2 px-3 font-semibold text-slate-600">سعر البيع</th>
                            <th className="text-right py-2 px-3 font-semibold text-slate-600">المتبقي</th>
                            <th className="text-right py-2 px-3 font-semibold text-slate-600">استحقاق المتبقي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedRemaining.map((s) => (
                            <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <td className="py-2 px-3 text-slate-700">{formatDate(s.sale_date)}</td>
                              <td className="py-2 px-3">
                                {buildingsMap[s.building_id] ?? "—"} / {s.unit_id && unitsMap[s.unit_id] ? `${unitsMap[s.unit_id].unit_number} (د${unitsMap[s.unit_id].floor})` : "—"}
                              </td>
                              <td className="py-2 px-3 dir-ltr font-medium">{formatNum(s.sale_price)} {RIYAL}</td>
                              <td className="py-2 px-3 dir-ltr text-amber-700 font-medium">{formatNum(s.remaining_payment ?? 0)} {RIYAL}</td>
                              <td className="py-2 px-3 text-slate-600">{s.remaining_payment_due_date ? formatDate(s.remaining_payment_due_date) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        <span>عرض</span>
                        <select
                          value={remainingPageSize}
                          onChange={(e) => { setRemainingPageSize(Number(e.target.value)); setRemainingPage(1); }}
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-0 transition-all duration-200"
                        >
                          {TABLE_PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <span className="font-mono">
                          {((remainingPage - 1) * remainingPageSize + 1).toLocaleString("en")}–
                          {Math.min(remainingPage * remainingPageSize, salesWithRemaining.length).toLocaleString("en")} من {salesWithRemaining.length.toLocaleString("en")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setRemainingPage((p) => Math.max(1, p - 1))} disabled={remainingPage <= 1} className="min-w-[2.75rem] py-2 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-0">السابق</button>
                        <span className="px-2 py-1.5 text-sm text-slate-600 font-mono">{remainingPage.toLocaleString("en")} / {remainingTotalPages.toLocaleString("en")}</span>
                        <button type="button" onClick={() => setRemainingPage((p) => Math.min(remainingTotalPages, p + 1))} disabled={remainingPage >= remainingTotalPages} className="min-w-[2.75rem] py-2 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-0">التالي</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Net income report — المحصّل − العمولة = صافي بعد العمولة (العمولة من المبلغ المحصل) */}
            <section className="mb-8">
              <h2 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-l from-amber-50/40 to-transparent">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                تقرير صافي الدخل
              </h2>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50/80 to-white flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">ملخص صافي الدخل</p>
                    <p className="text-xs text-slate-500 mt-0.5">إجمالي المبيعات والمحصّل والمتبقي والعمولات والصافي في الفترة المحددة</p>
                  </div>
                </div>
                <div className="p-5 sm:p-6">
                  {(() => {
                    const totalRevenue = Number(stats.totalRevenue);
                    const collected = Number(stats.totalCollected);
                    const remaining = Number(stats.totalRemaining);
                    const commission = Number(stats.totalCommission);
                    const netAfterCommission = Math.max(0, collected - commission);
                    const totalCircle = totalRevenue;
                    const pctCollected = totalCircle > 0 ? (collected / totalCircle) * 100 : 0;
                    const pctRemaining = totalCircle > 0 ? (remaining / totalCircle) * 100 : 0;
                    const pctCommission = totalCircle > 0 ? (commission / totalCircle) * 100 : 0;
                    const pctNet = totalCircle > 0 ? (netAfterCommission / totalCircle) * 100 : 0;
                    return (
                      <>
                        {/* 1. إجمالي المبيعات بالكامل — أساس التقرير */}
                        <div className="rounded-xl border-2 border-slate-300 bg-gradient-to-r from-slate-50 to-white p-5 mb-5">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-1">إجمالي المبيعات بالكامل</p>
                              <p className="text-2xl font-bold text-slate-800 dir-ltr">{formatNum(totalRevenue)} {RIYAL}</p>
                            </div>
                          </div>
                        </div>

                        {/* 2 + 3: المحصّل | المتبقي على العملاء */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                          <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4">
                            <p className="text-xs font-medium text-slate-600 mb-1">المتبقي على العملاء</p>
                            <p className="text-xl font-bold text-orange-600 dir-ltr">{formatNum(remaining)} {RIYAL}</p>
                            <p className="text-xs text-slate-400 mt-1 dir-ltr">{pctRemaining.toFixed(1)}% من إجمالي المبيعات</p>
                          </div>
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                            <p className="text-xs font-medium text-slate-600 mb-1">المحصّل</p>
                            <p className="text-xl font-bold text-emerald-700 dir-ltr">{formatMoney(collected)} {RIYAL}</p>
                            <p className="text-xs text-slate-400 mt-1 dir-ltr">{pctCollected.toFixed(1)}% من إجمالي المبيعات</p>
                          </div>
                        </div>

                        {/* 4 + 5: عمولات المسوقين | صافي بعد العمولة */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                            <p className="text-xs font-medium text-slate-600 mb-1">عمولات المسوقين</p>
                            <p className="text-xl font-bold text-amber-700 dir-ltr">− {formatMoney(commission)} {RIYAL}</p>
                            <p className="text-xs text-slate-400 mt-1 dir-ltr">{pctCommission.toFixed(2)}% من إجمالي المبيعات</p>
                          </div>
                          <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/60 p-4">
                            <p className="text-xs font-medium text-emerald-700 mb-1">صافي الدخل الحالي</p>
                            <p className="text-xl font-bold text-emerald-800 dir-ltr">{formatMoney(netAfterCommission)} {RIYAL}</p>
                            <p className="text-xs text-slate-400 mt-1">صافي ما تم تحصيله فعليًا حتى الآن</p>
                          </div>
                        </div>

                        {/* الدونات: توزيع إجمالي المبيعات */}
                        {totalRevenue > 0 && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-6 pt-5 border-t border-slate-100">
                            <div className="flex flex-col items-center gap-2">
                              <p className="text-sm font-medium text-slate-600">توزيع إجمالي المبيعات</p>
                              <NetIncomeDonut
                                revenue={collected}
                                commission={commission}
                                remaining={remaining}
                                size={140}
                                strokeWidth={22}
                              />
                            </div>
                            <div className="flex-1 flex flex-col gap-2.5">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                                <span className="text-slate-600">صافي بعد العمولة — {formatMoney(netAfterCommission)} {RIYAL}</span>
                                <span className="text-slate-400 dir-ltr">({pctNet.toFixed(2)}%)</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                                <span className="text-slate-600">عمولات — {formatMoney(commission)} {RIYAL}</span>
                                <span className="text-slate-400 dir-ltr">({pctCommission.toFixed(2)}%)</span>
                              </div>
                              {remaining > 0 && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                                  <span className="text-slate-600">المتبقي على العملاء — {formatNum(remaining)} {RIYAL}</span>
                                  <span className="text-slate-400 dir-ltr">({pctRemaining.toFixed(2)}%)</span>
                                </div>
                              )}
                              <div className="mt-1 rounded-lg h-3 bg-slate-100 overflow-hidden flex w-full max-w-sm">
                                {netAfterCommission > 0 && <div className="h-full bg-emerald-500" style={{ width: `${pctNet}%` }} title="صافي بعد العمولة" />}
                                {commission > 0 && <div className="h-full bg-amber-500" style={{ width: `${pctCommission}%` }} title="عمولات" />}
                                {remaining > 0 && <div className="h-full bg-orange-500" style={{ width: `${pctRemaining}%` }} title="المتبقي" />}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </section>

            {/* أداء المسوقين — أفضل المسوقين حسب المبيعات */}
            <section className="mb-8">
              <h2 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-l from-amber-50/40 to-transparent">
                <Users className="w-5 h-5 text-amber-600" />
                أداء المسوقين
              </h2>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50/80 to-white flex items-center gap-3">
                  <Award className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">أفضل المسوقين حسب المبيعات</p>
                  </div>
                </div>
                {stats.topMarketersBySales.length === 0 ? (
                  <div className="px-5 py-8 text-center text-slate-500 text-sm">لا يوجد مسوقون لديهم مبيعات في الفترة</div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[400px]">
                        <thead>
                          <tr className="text-right text-xs font-semibold text-slate-500 border-b border-slate-100">
                            <th className="py-2.5 px-3">المسوق</th>
                            <th className="py-2.5 px-3">عدد الحجوزات</th>
                            <th className="py-2.5 px-3">مبيعات مكتملة</th>
                            <th className="py-2.5 px-3">العمولة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedMarketers.map((m, i) => {
                            const globalIndex = (marketersPage - 1) * marketersPageSize + i;
                            const medal = globalIndex === 0 ? "🥇" : globalIndex === 1 ? "🥈" : globalIndex === 2 ? "🥉" : null;
                            return (
                              <tr key={m.id} className={`${globalIndex < 3 ? "bg-amber-50/30" : ""} hover:bg-slate-50/50 transition`}>
                                <td className="py-3 px-3">
                                  <span className="inline-flex items-center gap-2">
                                    {medal ? <span className="text-base">{medal}</span> : <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center">{globalIndex + 1}</span>}
                                    <span className="font-medium text-slate-800">{m.name}</span>
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-slate-600 dir-ltr">{formatNum(m.reservations ?? 0)}</td>
                                <td className="py-3 px-3 text-slate-600 dir-ltr">{formatNum(m.completed)}</td>
                                <td className="py-3 px-3 dir-ltr text-sm font-bold text-amber-700">{formatNum(m.commission ?? 0)} {RIYAL}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        <span>عرض</span>
                        <select
                          value={marketersPageSize}
                          onChange={(e) => { setMarketersPageSize(Number(e.target.value)); setMarketersPage(1); }}
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-0 transition-all duration-200"
                        >
                          {TABLE_PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <span className="font-mono">
                          {((marketersPage - 1) * marketersPageSize + 1).toLocaleString("en")}–
                          {Math.min(marketersPage * marketersPageSize, stats.topMarketersBySales.length).toLocaleString("en")} من {stats.topMarketersBySales.length.toLocaleString("en")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setMarketersPage((p) => Math.max(1, p - 1))} disabled={marketersPage <= 1} className="min-w-[2.75rem] py-2 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-0">السابق</button>
                        <span className="px-2 py-1.5 text-sm text-slate-600 font-mono">{marketersPage.toLocaleString("en")} / {marketersTotalPages.toLocaleString("en")}</span>
                        <button type="button" onClick={() => setMarketersPage((p) => Math.min(marketersTotalPages, p + 1))} disabled={marketersPage >= marketersTotalPages} className="min-w-[2.75rem] py-2 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-0">التالي</button>
                      </div>
                    </div>
                  </>
                )}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 print:hidden">
                  <Link href="/dashboard/marketing/marketers" className="text-sm text-amber-600 hover:underline font-medium">
                    عرض وإدارة جميع المسوقين ←
                  </Link>
                </div>
              </div>
            </section>

          </>
        )}
      </div>
    </main>
  );
}
