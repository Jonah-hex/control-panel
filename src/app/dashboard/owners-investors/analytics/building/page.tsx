"use client";
/**
 * تحليلات استثمار العمارة فقط — ربح محقق، نسبة الإغلاق، نوع المخالصة، رأس المال القائم
 * مرجع المعادلات: docs/investment-deal-closing-policy.md
 */

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Search,
  Filter,
  Building2,
  PieChart,
  FileCheck,
  ArrowRightLeft,
  ArrowRight,
  Wallet,
  TrendingUp,
} from "lucide-react";

interface Building {
  id: string;
  name: string;
}

interface BuildingInvestorRow {
  id: string;
  building_id: string;
  owner_id: string;
  investor_name: string;
  total_invested_amount: number | null;
  profit_percentage: number;
  profit_percentage_to: number | null;
  investment_start_date: string | null;
  investment_due_date: string | null;
  closed_at?: string | null;
  realized_profit?: number | null;
  closing_percentage?: number | null;
  settlement_type?: string | null;
  transferred_amount?: number | null;
}

const NUM_LOCALE = "en";
function formatNum(n: number): string {
  return n.toLocaleString(NUM_LOCALE);
}

const DONUT_COLORS: Record<string, string> = {
  teal: "#4285F4",
  slate: "#EA4335",
};

function DonutChart({
  segments,
  size,
}: {
  segments: { label: string; value: number; color: string }[];
  size: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const strokeWidth = Math.max(12, size / 10);
  const r = size / 2 - strokeWidth / 2;
  const circum = 2 * Math.PI * r;
  if (total === 0) {
    return (
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm text-slate-400">—</span>
        </div>
      </div>
    );
  }
  let offset = 0;
  const valid = segments.filter((s) => s.value > 0);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} className="block">
        {valid.map((seg, i) => {
          const length = (seg.value / total) * circum;
          const segOffset = -offset;
          offset += length;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={DONUT_COLORS[seg.color] ?? "#94a3b8"}
              strokeWidth={strokeWidth}
              strokeDasharray={`${length} ${circum + 1}`}
              strokeDashoffset={segOffset}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xl font-bold text-slate-800 tabular-nums leading-none">{total}</span>
        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">عقد</span>
      </div>
    </div>
  );
}

type DateRangePreset = "all" | "today" | "yesterday" | "last_7" | "last_14" | "this_month" | "last_30" | "last_month" | "custom";

function getDateRangeForPreset(preset: string): { dateFrom: string; dateTo: string } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const toStr = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (d: Date, n: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };
  switch (preset) {
    case "today":
      return { dateFrom: toStr(today), dateTo: toStr(today) };
    case "yesterday": {
      const y = addDays(today, -1);
      return { dateFrom: toStr(y), dateTo: toStr(y) };
    }
    case "last_7": {
      const from7 = addDays(today, -6);
      return { dateFrom: toStr(from7), dateTo: toStr(today) };
    }
    case "last_14": {
      const from14 = addDays(today, -13);
      return { dateFrom: toStr(from14), dateTo: toStr(today) };
    }
    case "this_month": {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      return { dateFrom: toStr(first), dateTo: toStr(today) };
    }
    case "last_30": {
      const from30 = addDays(today, -29);
      return { dateFrom: toStr(from30), dateTo: toStr(today) };
    }
    case "last_month": {
      const firstLast = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastLast = new Date(today.getFullYear(), today.getMonth(), 0);
      return { dateFrom: toStr(firstLast), dateTo: toStr(lastLast) };
    }
    default:
      return null;
  }
}

const TABLE_PAGE_SIZES = [10, 25, 50, 100] as const;

export default function BuildingAnalyticsPage() {
  const { ready, can, effectiveOwnerId } = useDashboardAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingInvestors, setBuildingInvestors] = useState<BuildingInvestorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBuilding, setFilterBuilding] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [buildingPage, setBuildingPage] = useState(1);
  const [buildingPageSize, setBuildingPageSize] = useState(10);

  const applyDateRangePreset = (preset: DateRangePreset) => {
    setDateRangePreset(preset);
    if (preset === "all" || preset === "custom") {
      if (preset === "all") {
        setDateFrom("");
        setDateTo("");
      }
      return;
    }
    const range = getDateRangeForPreset(preset);
    if (range) {
      setDateFrom(range.dateFrom);
      setDateTo(range.dateTo);
    }
  };

  const supabase = createClient();

  useEffect(() => {
    if (!ready || !effectiveOwnerId) return;
    if (!can("investors_view")) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const { data: bData } = await supabase.from("buildings").select("id, name").eq("owner_id", effectiveOwnerId);
        const buildingList = (bData as Building[]) || [];
        setBuildings(buildingList);

        const { data: biData } = await supabase.from("building_investors").select("*").eq("owner_id", effectiveOwnerId);
        setBuildingInvestors((biData as BuildingInvestorRow[]) || []);
      } catch {
        setBuildingInvestors([]);
        setBuildings([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, effectiveOwnerId, can, supabase]);

  const enrichedBuilding = useMemo(() => {
    return buildingInvestors.map((r) => {
      const capital = Number(r.total_invested_amount) || 0;
      const pctFrom = Number(r.profit_percentage) || 0;
      const pctTo = r.profit_percentage_to != null ? Number(r.profit_percentage_to) : pctFrom;
      const expectedFrom = capital * (pctFrom / 100);
      const expectedTo = capital * (Math.max(pctFrom, pctTo) / 100);
      const closed = !!r.closed_at;
      const realized = closed && r.realized_profit != null ? Math.round(Number(r.realized_profit)) : null;
      const buildingName = buildings.find((b) => b.id === r.building_id)?.name ?? "—";
      return {
        ...r,
        capital,
        expectedFrom,
        expectedTo,
        realized,
        closed,
        buildingName,
      };
    });
  }, [buildingInvestors, buildings]);

  const filteredBuilding = useMemo(() => {
    let list = enrichedBuilding;
    if (filterBuilding) list = list.filter((r) => r.building_id === filterBuilding);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((r) => (r.investor_name || "").toLowerCase().includes(q));
    }
    if (dateFrom) list = list.filter((r) => (r.investment_start_date || "") >= dateFrom);
    if (dateTo) list = list.filter((r) => (r.investment_start_date || "") <= dateTo);
    if (statusFilter === "resold") list = list.filter((r) => r.closed);
    if (statusFilter === "under_construction") list = list.filter((r) => !r.closed);
    return list;
  }, [enrichedBuilding, filterBuilding, searchQuery, dateFrom, dateTo, statusFilter]);

  const summaryBuilding = useMemo(() => {
    const totalInvested = filteredBuilding.reduce((s, r) => s + r.capital, 0);
    const totalRealized = filteredBuilding.reduce((s, r) => s + (r.realized ?? 0), 0);
    const closedCount = filteredBuilding.filter((r) => r.closed).length;
    const openCount = filteredBuilding.filter((r) => !r.closed).length;
    // settlement_type = null يُعامل كـ with_capital للتوافق مع البيانات القديمة (مثل الوحدات)
    const withCapital = filteredBuilding.filter(
      (r) => r.closed && (r.settlement_type === "with_capital" || r.settlement_type == null)
    );
    const profitOnly = filteredBuilding.filter((r) => r.closed && r.settlement_type === "profit_only");
    const paidWithCapital = withCapital.reduce((s, r) => s + r.capital + (r.realized ?? 0), 0);
    const paidProfitOnly = profitOnly.reduce((s, r) => s + (r.realized ?? 0), 0);
    const capitalStillInBuildings = profitOnly.reduce(
      (s, r) => s + Math.max(0, r.capital - (Number(r.transferred_amount) || 0)),
      0
    );
    const closedWithPct = filteredBuilding.filter((r) => r.closed && r.capital > 0 && r.realized != null);
    const avgProfitPct =
      closedWithPct.length > 0
        ? closedWithPct.reduce((a, r) => a + (Number(r.realized) / r.capital) * 100, 0) / closedWithPct.length
        : 0;
    return {
      totalInvested,
      totalRealized,
      closedCount,
      openCount,
      count: filteredBuilding.length,
      paidWithCapital,
      paidProfitOnly,
      totalSettlementPaid: paidWithCapital + paidProfitOnly,
      withCapitalCount: withCapital.length,
      profitOnlyCount: profitOnly.length,
      avgProfitPct,
      capitalStillInBuildings,
    };
  }, [filteredBuilding]);

  const byBuildingOnly = useMemo(() => {
    const map = new Map<string, { invested: number; profit: number; count: number }>();
    filteredBuilding.forEach((r) => {
      const cur = map.get(r.building_id) ?? { invested: 0, profit: 0, count: 0 };
      cur.invested += r.capital;
      cur.profit += r.realized ?? 0;
      cur.count += 1;
      map.set(r.building_id, cur);
    });
    return Array.from(map.entries()).map(([buildingId, v]) => ({
      buildingId,
      buildingName: buildings.find((b) => b.id === buildingId)?.name ?? "—",
      ...v,
    }));
  }, [filteredBuilding, buildings]);

  const maxBar = Math.max(1, ...byBuildingOnly.map((b) => b.profit), ...byBuildingOnly.map((b) => b.invested));

  const buildingTotalPages = Math.max(1, Math.ceil(filteredBuilding.length / buildingPageSize));
  const paginatedBuilding = useMemo(
    () => filteredBuilding.slice((buildingPage - 1) * buildingPageSize, buildingPage * buildingPageSize),
    [filteredBuilding, buildingPage, buildingPageSize]
  );

  useEffect(() => {
    if (buildingPage > buildingTotalPages && buildingTotalPages >= 1) setBuildingPage(1);
  }, [buildingPage, buildingTotalPages]);

  if (!ready || !can("investors_view")) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <p className="text-gray-500">جاري التحميل...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-teal-50/40 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <div className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/70 px-3 sm:px-4 lg:px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:min-h-[72px] shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25 flex-shrink-0">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">تحليلات استثمار العمارة</h1>
                <p className="text-sm text-slate-500 mt-0.5">ربح محقق، نسبة الإغلاق، نوع المخالصة، رأس المال القائم</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/owners-investors/analytics"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                <ArrowRight className="w-4 h-4" />
                كل التحليلات
              </Link>
              <Link
                href="/dashboard/owners-investors/investors"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                <Users className="w-4 h-4" />
                المستثمرون
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                <LayoutDashboard className="w-4 h-4" />
                لوحة التحكم
              </Link>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <p className="text-slate-500">جاري تحميل البيانات...</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">الفلاتر والبحث</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="relative lg:col-span-2">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="بحث باسم المستثمر..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-[46px] pr-10 pl-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <select
                  value={filterBuilding}
                  onChange={(e) => setFilterBuilding(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="">كل العماير</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="all">كل الحالات</option>
                  <option value="resold">مُخالص</option>
                  <option value="under_construction">قائم</option>
                </select>
                <div className="space-y-2 min-w-0">
                  <select
                    value={dateRangePreset}
                    onChange={(e) => applyDateRangePreset(e.target.value as DateRangePreset)}
                    className="w-full min-w-0 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                  >
                    <option value="all">كل المدة</option>
                    <option value="today">اليوم</option>
                    <option value="yesterday">أمس</option>
                    <option value="last_7">آخر 7 أيام</option>
                    <option value="last_14">آخر 14 يوماً</option>
                    <option value="this_month">هذا الشهر</option>
                    <option value="last_30">آخر 30 يوماً</option>
                    <option value="last_month">الشهر الماضي</option>
                    <option value="custom">مخصص (من — إلى)</option>
                  </select>
                  {dateRangePreset === "custom" && (
                    <div className="flex gap-2 items-center">
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => { setDateFrom(e.target.value); setDateRangePreset("custom"); }}
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20"
                        placeholder="من"
                      />
                      <span className="text-slate-400">→</span>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => { setDateTo(e.target.value); setDateRangePreset("custom"); }}
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20"
                        placeholder="إلى"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-md border border-blue-200 p-4">
                <div className="p-2 bg-blue-100 rounded-lg w-fit mb-2">
                  <Wallet className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-gray-600 text-xs font-medium mb-1">إجمالي الاستثمار</p>
                <p className="text-2xl font-bold text-blue-700 dir-ltr tabular-nums">{formatNum(summaryBuilding.totalInvested)} <span className="text-sm font-normal text-slate-500">ر.س</span></p>
              </div>
              <div className="bg-white rounded-xl shadow-md border border-emerald-200 p-4">
                <div className="p-2 bg-emerald-100 rounded-lg w-fit mb-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-gray-600 text-xs font-medium mb-1">إجمالي الربح المحقق</p>
                <p className="text-2xl font-bold text-emerald-700 dir-ltr tabular-nums">+{formatNum(summaryBuilding.totalRealized)} <span className="text-sm font-normal text-slate-500">ر.س</span></p>
              </div>
              <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4">
                <div className="p-2 bg-slate-100 rounded-lg w-fit mb-2">
                  <FileCheck className="w-5 h-5 text-slate-600" />
                </div>
                <p className="text-gray-600 text-xs font-medium mb-1">عقود مغلقة / قائمة</p>
                <p className="text-lg font-bold text-slate-800 tabular-nums">{summaryBuilding.closedCount} مُخالص — {summaryBuilding.openCount} قائم</p>
              </div>
              <div className="bg-white rounded-xl shadow-md border border-teal-200 p-4">
                <div className="p-2 bg-teal-100 rounded-lg w-fit mb-2">
                  <PieChart className="w-5 h-5 text-teal-600" />
                </div>
                <p className="text-gray-600 text-xs font-medium mb-1">متوسط نسبة الربح المحققة</p>
                <p className="text-2xl font-bold text-teal-700 dir-ltr tabular-nums">{summaryBuilding.closedCount === 0 ? "—" : summaryBuilding.avgProfitPct.toFixed(1) + "%"}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md border border-amber-200 p-4">
                <div className="p-2 bg-amber-100 rounded-lg w-fit mb-2">
                  <ArrowRightLeft className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-gray-600 text-xs font-medium mb-1">إجمالي المُخالص</p>
                <p className="text-lg font-bold text-amber-800 dir-ltr tabular-nums">{formatNum(summaryBuilding.totalSettlementPaid)} <span className="text-sm font-normal text-slate-500">ر.س</span></p>
                <p className="text-[11px] text-slate-500 mt-0.5">رأس المال: {formatNum(summaryBuilding.paidWithCapital)} ر.س — الأرباح: {formatNum(summaryBuilding.paidProfitOnly)} ر.س</p>
              </div>
              <div className="bg-white rounded-xl shadow-md border border-amber-200/80 p-4">
                <p className="text-[11px] font-medium text-amber-800 uppercase tracking-wide mb-0.5">رأس المال القائم في العماير</p>
                <p className="text-base font-bold text-amber-800 dir-ltr tabular-nums">{formatNum(summaryBuilding.capitalStillInBuildings)} <span className="text-xs font-normal text-slate-500">ر.س</span></p>
                <p className="text-[11px] text-slate-500 mt-0.5">مخالصات «أرباح فقط» — لم يُسترد</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-teal-600" />
                ملخص حالة الاستثمار (عمارة)
              </h2>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <DonutChart
                  segments={[
                    { label: "عقود مُخالصة", value: summaryBuilding.closedCount, color: "teal" },
                    { label: "عقود قائمة", value: summaryBuilding.openCount, color: "slate" },
                  ]}
                  size={140}
                />
                <div className="flex-1 w-full sm:w-auto space-y-2">
                  {[
                    { label: "عقود مُخالصة", val: summaryBuilding.closedCount, dot: "bg-[#4285F4]" },
                    { label: "عقود قائمة", val: summaryBuilding.openCount, dot: "bg-[#EA4335]" },
                  ].map(({ label, val, dot }) => {
                    const total = summaryBuilding.closedCount + summaryBuilding.openCount;
                    const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0";
                    return (
                      <div key={label} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
                        <span className="text-sm text-slate-700">{label}</span>
                        <span className="text-sm font-semibold text-slate-800 tabular-nums">{val}</span>
                        <span className="text-xs text-slate-400 tabular-nums">({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {byBuildingOnly.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-teal-600" />
                  الاستثمار والربح المحقق حسب العمارة
                </h2>
                <div className="space-y-4">
                  {byBuildingOnly.map((b) => (
                    <div key={b.buildingId}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">{b.buildingName}</span>
                        <span className="text-slate-500 dir-ltr">استثمار: {formatNum(b.invested)} ر.س — ربح: +{formatNum(b.profit)} ر.س</span>
                      </div>
                      <div className="flex gap-1 h-8 rounded-lg overflow-hidden bg-slate-100">
                        <div
                          className="bg-slate-400 min-w-0 transition-all"
                          style={{ width: `${Math.max(5, (b.invested / maxBar) * 50)}%` }}
                          title={`استثمار: ${formatNum(b.invested)}`}
                        />
                        <div
                          className="bg-emerald-500 min-w-0 transition-all"
                          style={{ width: `${Math.max(5, (Math.max(0, b.profit) / maxBar) * 50)}%` }}
                          title={`ربح: ${formatNum(b.profit)}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <h2 className="text-lg font-bold text-slate-800 p-5 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600" />
                استثمار بالعمارة ({filteredBuilding.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                      <th className="text-right p-3 font-semibold">المستثمر</th>
                      <th className="text-right p-3 font-semibold">العمارة</th>
                      <th className="text-right p-3 font-semibold dir-ltr">رأس المال</th>
                      <th className="text-right p-3 font-semibold dir-ltr">الربح المحقق</th>
                      <th className="text-right p-3 font-semibold dir-ltr">نسبة الإغلاق %</th>
                      <th className="text-right p-3 font-semibold">نوع المخالصة</th>
                      <th className="text-right p-3 font-semibold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedBuilding.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-medium text-slate-800">{r.investor_name || "—"}</td>
                        <td className="p-3 text-slate-600">{r.buildingName}</td>
                        <td className="p-3 dir-ltr text-slate-700">{formatNum(r.capital)} ر.س</td>
                        <td className="p-3 dir-ltr">
                          {r.realized != null ? <span className="font-semibold text-emerald-700">+{formatNum(r.realized)} ر.س</span> : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="p-3 dir-ltr">
                          {r.closing_percentage != null ? <span className="font-medium text-teal-700">{Number(r.closing_percentage)}%</span> : "—"}
                        </td>
                        <td className="p-3">
                          {r.settlement_type === "with_capital" ? <span className="text-amber-700 text-xs font-medium">مع رأس المال</span> : r.settlement_type === "profit_only" ? <span className="text-teal-700 text-xs font-medium">أرباح فقط</span> : "—"}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${r.closed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                            {r.closed ? "مُخالص" : "قائم"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredBuilding.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span>عرض</span>
                    <select
                      value={buildingPageSize}
                      onChange={(e) => {
                        setBuildingPageSize(Number(e.target.value));
                        setBuildingPage(1);
                      }}
                      className="rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-0"
                    >
                      {TABLE_PAGE_SIZES.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <span className="font-mono">
                      {((buildingPage - 1) * buildingPageSize + 1).toLocaleString("en")}–
                      {Math.min(buildingPage * buildingPageSize, filteredBuilding.length).toLocaleString("en")} من {filteredBuilding.length.toLocaleString("en")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setBuildingPage((p) => Math.max(1, p - 1))}
                      disabled={buildingPage <= 1}
                      className="min-w-[2.75rem] py-2 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      السابق
                    </button>
                    <span className="px-2 py-1.5 text-sm text-slate-600 font-mono">
                      {buildingPage} / {buildingTotalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBuildingPage((p) => Math.min(buildingTotalPages, p + 1))}
                      disabled={buildingPage >= buildingTotalPages}
                      className="min-w-[2.75rem] py-2 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      التالي
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
