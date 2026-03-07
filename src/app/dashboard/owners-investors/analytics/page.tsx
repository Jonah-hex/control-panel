"use client";
/**
 * تحليلات الاستثمار الموحدة: وحدات + عمارة
 * مرجع المعادلات والربط: docs/investment-deal-closing-policy.md
 *
 * معادلات التحقق (نسبة خطأ 0%):
 * وحدات: رأس_المال = purchase_price | الربح_المحقق = sale_price − purchase_price (فقط عند resale_sale_id موجود و status === "resold")
 * عمارة: رأس_المال = total_invested_amount | الربح_المحقق = realized_profit من DB (عند closed_at)
 */

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  BarChart3,
  Search,
  Filter,
  Building2,
  DollarSign,
  PieChart,
  Wallet,
  ArrowRightLeft,
  FileCheck,
  X,
} from "lucide-react";

interface Building {
  id: string;
  name: string;
}

interface UnitRow {
  id: string;
  building_id: string;
  price: number | null;
}

interface UnitInvestmentRow {
  id: string;
  building_id: string;
  unit_id: string;
  investor_name: string;
  purchase_price: number;
  purchase_date: string | null;
  resale_sale_id: string | null;
  status: string;
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

interface SaleRow {
  id: string;
  sale_price: number;
}

const NUM_LOCALE = "en";
function formatNum(n: number): string {
  return n.toLocaleString(NUM_LOCALE);
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

function daysBetween(start: string, end: string): number {
  const a = new Date(start + "T12:00:00").getTime();
  const b = new Date(end + "T12:00:00").getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/* ألوان بأسلوب Google Chrome */
const DONUT_COLORS: Record<string, string> = {
  emerald: "#34A853",
  amber: "#FBBC05",
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
        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">صفقة استثمار</span>
      </div>
    </div>
  );
}

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

type InvestmentTypeFilter = "all" | "units" | "building";
type DateRangePreset = "all" | "today" | "yesterday" | "last_7" | "last_14" | "this_month" | "last_30" | "last_month" | "custom";

export default function InvestmentAnalyticsPage() {
  const { ready, can, effectiveOwnerId } = useDashboardAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [unitInvestments, setUnitInvestments] = useState<UnitInvestmentRow[]>([]);
  const [buildingInvestors, setBuildingInvestors] = useState<BuildingInvestorRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBuilding, setFilterBuilding] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<InvestmentTypeFilter>("all");
  const [kpiDetailCard, setKpiDetailCard] = useState<"capital" | "profit" | "closed" | "avgPct" | "settlement" | null>(null);

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
        const buildingIds = buildingList.map((b: { id: string }) => b.id);

        if (buildingIds.length > 0) {
          const [{ data: sData }, { data: uData }] = await Promise.all([
            supabase.from("sales").select("id, sale_price").in("building_id", buildingIds),
            supabase.from("units").select("id, building_id, price").in("building_id", buildingIds),
          ]);
          setSales((sData as SaleRow[]) || []);
          setUnits((uData as UnitRow[]) || []);
        } else {
          setSales([]);
          setUnits([]);
        }

        const { data: uiData } = await supabase.from("unit_investments").select("*").eq("owner_id", effectiveOwnerId);
        setUnitInvestments((uiData as UnitInvestmentRow[]) || []);

        const { data: biData } = await supabase.from("building_investors").select("*").eq("owner_id", effectiveOwnerId);
        setBuildingInvestors((biData as BuildingInvestorRow[]) || []);
      } catch {
        setUnitInvestments([]);
        setBuildingInvestors([]);
        setBuildings([]);
        setSales([]);
        setUnits([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, effectiveOwnerId, can, supabase]);

  const enrichedUnits = useMemo(() => {
    return unitInvestments.map((r) => {
      const resalePrice = r.resale_sale_id ? sales.find((s) => s.id === r.resale_sale_id)?.sale_price ?? null : null;
      const capital = Number(r.purchase_price) || 0;
      const closed = r.status === "resold" && resalePrice != null;
      const profit = closed ? Math.round(Number(resalePrice) - capital) : null;
      const purchaseDate = r.purchase_date || "";
      const endDate = r.resale_sale_id ? new Date().toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      const days = purchaseDate && endDate ? daysBetween(purchaseDate, endDate) : 0;
      return {
        ...r,
        resalePrice: closed ? resalePrice : null,
        profit,
        buildingName: buildings.find((b) => b.id === r.building_id)?.name ?? "—",
        days,
        type: "unit" as const,
      };
    });
  }, [unitInvestments, sales, buildings]);

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
        type: "building" as const,
      };
    });
  }, [buildingInvestors, buildings]);

  const filteredUnits = useMemo(() => {
    let list = enrichedUnits;
    if (filterBuilding) list = list.filter((r) => r.building_id === filterBuilding);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((r) => (r.investor_name || "").toLowerCase().includes(q));
    }
    if (dateFrom) list = list.filter((r) => (r.purchase_date || "") >= dateFrom);
    if (dateTo) list = list.filter((r) => (r.purchase_date || "") <= dateTo);
    if (statusFilter === "resold") list = list.filter((r) => r.status === "resold");
    if (statusFilter === "under_construction") list = list.filter((r) => r.status === "under_construction");
    return list;
  }, [enrichedUnits, filterBuilding, searchQuery, dateFrom, dateTo, statusFilter]);

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

  const summaryUnits = useMemo(() => {
    const totalInvested = filteredUnits.reduce((s, r) => s + (Number(r.purchase_price) || 0), 0);
    const totalProfit = filteredUnits.reduce((s, r) => s + (r.profit ?? 0), 0);
    const resoldCount = filteredUnits.filter((r) => r.status === "resold").length;
    const underCount = filteredUnits.filter((r) => r.status === "under_construction").length;
    const withDuration = filteredUnits.filter((r) => r.days > 0);
    const avgDays = withDuration.length > 0 ? Math.round(withDuration.reduce((a, r) => a + r.days, 0) / withDuration.length) : 0;
    const closedWithProfit = filteredUnits.filter((r) => r.status === "resold" && (Number(r.purchase_price) || 0) > 0 && r.profit != null);
    const avgProfitPct =
      closedWithProfit.length > 0
        ? closedWithProfit.reduce((a, r) => a + ((Number(r.profit) / Number(r.purchase_price)) * 100), 0) / closedWithProfit.length
        : 0;
    return { totalInvested, totalProfit, resoldCount, underCount, avgDays, count: filteredUnits.length, avgProfitPct };
  }, [filteredUnits]);

  const summaryBuilding = useMemo(() => {
    const totalInvested = filteredBuilding.reduce((s, r) => s + r.capital, 0);
    const totalRealized = filteredBuilding.reduce((s, r) => s + (r.realized ?? 0), 0);
    const closedCount = filteredBuilding.filter((r) => r.closed).length;
    const openCount = filteredBuilding.filter((r) => !r.closed).length;
    const withCapital = filteredBuilding.filter((r) => r.closed && r.settlement_type === "with_capital");
    const profitOnly = filteredBuilding.filter((r) => r.closed && r.settlement_type === "profit_only");
    const paidWithCapital = withCapital.reduce((s, r) => s + r.capital + (r.realized ?? 0), 0);
    const paidProfitOnly = profitOnly.reduce((s, r) => s + (r.realized ?? 0), 0);
    /** رأس المال القائم في العماير = مجموع (رأس المال − المُنقَل) لمخالصات «أرباح فقط» */
    const capitalStillInBuildings = profitOnly.reduce((s, r) => s + Math.max(0, r.capital - (Number(r.transferred_amount) || 0)), 0);
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
      withCapitalCount: withCapital.length,
      profitOnlyCount: profitOnly.length,
      avgProfitPct,
      capitalStillInBuildings,
    };
  }, [filteredBuilding]);

  const unifiedSummary = useMemo(() => {
    const totalCapital = summaryUnits.totalInvested + summaryBuilding.totalInvested;
    const totalRealizedProfit = summaryUnits.totalProfit + summaryBuilding.totalRealized;
    const totalClosedCount = summaryUnits.resoldCount + summaryBuilding.closedCount;
    const totalOpenCount = summaryUnits.underCount + summaryBuilding.openCount;
    const totalSettlementPaid = summaryBuilding.paidWithCapital + summaryBuilding.paidProfitOnly;
    return {
      totalCapital,
      totalRealizedProfit,
      totalClosedCount,
      totalOpenCount,
      totalSettlementPaid,
      unitsCapital: summaryUnits.totalInvested,
      buildingCapital: summaryBuilding.totalInvested,
      unitsProfit: summaryUnits.totalProfit,
      buildingProfit: summaryBuilding.totalRealized,
      unitsCount: summaryUnits.count,
      buildingCount: summaryBuilding.count,
      capitalStillInBuildings: summaryBuilding.capitalStillInBuildings,
    };
  }, [summaryUnits, summaryBuilding]);

  /** ملخص العرض حسب اختيار نوع الاستثمار — تتغير القراءات مع تغيير الفلتر */
  const displaySummary = useMemo(() => {
    if (typeFilter === "units") {
      const avgPct = summaryUnits.resoldCount ? summaryUnits.avgProfitPct : 0;
      return {
        totalCapital: summaryUnits.totalInvested,
        totalRealizedProfit: summaryUnits.totalProfit,
        totalClosedCount: summaryUnits.resoldCount,
        totalOpenCount: summaryUnits.underCount,
        avgProfitPct: avgPct,
        avgDays: summaryUnits.avgDays,
        totalSettlementPaid: 0,
        unitsCapital: summaryUnits.totalInvested,
        buildingCapital: 0,
        unitsProfit: summaryUnits.totalProfit,
        buildingProfit: 0,
        withCapitalCount: 0,
        profitOnlyCount: 0,
        paidWithCapital: 0,
        paidProfitOnly: 0,
        unitsCount: summaryUnits.count,
        buildingCount: 0,
        capitalStillInBuildings: 0,
        label: "وحدات فقط",
      };
    }
    if (typeFilter === "building") {
      return {
        totalCapital: summaryBuilding.totalInvested,
        totalRealizedProfit: summaryBuilding.totalRealized,
        totalClosedCount: summaryBuilding.closedCount,
        totalOpenCount: summaryBuilding.openCount,
        avgProfitPct: summaryBuilding.avgProfitPct,
        avgDays: 0,
        totalSettlementPaid: summaryBuilding.paidWithCapital + summaryBuilding.paidProfitOnly,
        unitsCapital: 0,
        buildingCapital: summaryBuilding.totalInvested,
        unitsProfit: 0,
        buildingProfit: summaryBuilding.totalRealized,
        withCapitalCount: summaryBuilding.withCapitalCount,
        profitOnlyCount: summaryBuilding.profitOnlyCount,
        paidWithCapital: summaryBuilding.paidWithCapital,
        paidProfitOnly: summaryBuilding.paidProfitOnly,
        unitsCount: 0,
        buildingCount: summaryBuilding.count,
        capitalStillInBuildings: summaryBuilding.capitalStillInBuildings,
        label: "عمارة فقط",
      };
    }
    const nUnit = summaryUnits.resoldCount;
    const nBuild = summaryBuilding.closedCount;
    const total = nUnit + nBuild;
    const avgPct = total ? (summaryUnits.avgProfitPct * nUnit + summaryBuilding.avgProfitPct * nBuild) / total : 0;
    return {
      ...unifiedSummary,
      avgProfitPct: avgPct,
      avgDays: summaryUnits.avgDays,
      withCapitalCount: summaryBuilding.withCapitalCount,
      profitOnlyCount: summaryBuilding.profitOnlyCount,
      paidWithCapital: summaryBuilding.paidWithCapital,
      paidProfitOnly: summaryBuilding.paidProfitOnly,
      unitsCount: summaryUnits.count,
      buildingCount: summaryBuilding.count,
      capitalStillInBuildings: summaryBuilding.capitalStillInBuildings,
      label: "وحدات + عمارة",
    };
  }, [typeFilter, summaryUnits, summaryBuilding, unifiedSummary]);

  const byBuildingMerged = useMemo(() => {
    const map = new Map<string, { invested: number; profit: number; countUnits: number; countBuilding: number }>();
    if (typeFilter === "all" || typeFilter === "units") {
      filteredUnits.forEach((r) => {
        const cur = map.get(r.building_id) ?? { invested: 0, profit: 0, countUnits: 0, countBuilding: 0 };
        cur.invested += Number(r.purchase_price || 0);
        cur.profit += r.profit ?? 0;
        cur.countUnits += 1;
        map.set(r.building_id, cur);
      });
    }
    if (typeFilter === "all" || typeFilter === "building") {
      filteredBuilding.forEach((r) => {
        const cur = map.get(r.building_id) ?? { invested: 0, profit: 0, countUnits: 0, countBuilding: 0 };
        cur.invested += r.capital;
        cur.profit += r.realized ?? 0;
        cur.countBuilding += 1;
        map.set(r.building_id, cur);
      });
    }
    return Array.from(map.entries()).map(([buildingId, v]) => ({
      buildingId,
      buildingName: buildings.find((b) => b.id === buildingId)?.name ?? "—",
      ...v,
    }));
  }, [typeFilter, filteredUnits, filteredBuilding, buildings]);

  const maxBar = Math.max(1, ...byBuildingMerged.map((b) => b.profit), ...byBuildingMerged.map((b) => b.invested));

  /** صافي دخل المالك الأول: مرتبط بفلتر العمارة — توتال سعر الوحدات، إيرادات إعادة البيع، مخالصات، وصافي */
  const ownerNetMetrics = useMemo(() => {
    const unitsFiltered = filterBuilding ? units.filter((u) => u.building_id === filterBuilding) : units;
    const unitInvFiltered = filterBuilding ? unitInvestments.filter((r) => r.building_id === filterBuilding) : unitInvestments;
    const buildingInvFiltered = filterBuilding ? buildingInvestors.filter((r) => r.building_id === filterBuilding) : buildingInvestors;

    const totalUnitValue = unitsFiltered.reduce((s, u) => s + (Number(u.price) || 0), 0);
    const resoldList = unitInvFiltered.filter((r) => r.status === "resold" && r.resale_sale_id);
    const resaleRevenue = resoldList.reduce((s, r) => s + (sales.find((sx) => sx.id === r.resale_sale_id)?.sale_price ?? 0), 0);
    const unitInvestorProfit = resoldList.reduce((s, r) => {
      const salePrice = sales.find((sx) => sx.id === r.resale_sale_id)?.sale_price ?? 0;
      const purchasePrice = Number(r.purchase_price) || 0;
      return s + Math.round(salePrice - purchasePrice);
    }, 0);
    const buildingSettlements = buildingInvFiltered
      .filter((r) => !!r.closed_at)
      .reduce((s, r) => {
        const cap = Number(r.total_invested_amount) || 0;
        const real = Number(r.realized_profit) || 0;
        return s + (r.settlement_type === "with_capital" ? cap + real : real);
      }, 0);
    const netProfitOwner = resaleRevenue - unitInvestorProfit - buildingSettlements;
    return {
      totalUnitValue,
      resaleRevenue,
      unitInvestorProfit,
      buildingSettlements,
      netProfitOwner,
      resoldCount: resoldList.length,
    };
  }, [units, unitInvestments, sales, buildingInvestors, filterBuilding]);

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
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/25 flex-shrink-0">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">تحليلات الملاك والمستثمرين</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/owners-investors/investors"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                <Users className="w-4 h-4" />
                المستثمرون (وحدات وعمارة)
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
          <div className="flex items-center justify-center py-20">
            <p className="text-slate-500">جاري تحميل البيانات...</p>
          </div>
        ) : (
          <>
            {/* نطاق التقرير — تحليل الملاك والمستثمرين فقط */}
            <div className="mb-6 rounded-xl border border-teal-200/80 bg-teal-50/50 px-4 py-3 text-sm text-slate-700">
              <span className="font-medium text-teal-800">نطاق التحليل:</span> هذا التحليل خاص بالملاك والمستثمرين فقط (استثمارات الوحدات والعمارة، أرباح محققة، مخالصات، صافي المنشأة). لتقارير الحجوزات والمبيعات وأداء المسوقين → <Link href="/dashboard/marketing/reports" className="text-teal-700 font-medium hover:underline">تقارير التسويق والمبيعات</Link>.
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">الفلاتر والبحث</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as InvestmentTypeFilter)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="all">كل الأنواع (وحدات + عمارة)</option>
                  <option value="units">استثمار بالوحدات فقط</option>
                  <option value="building">استثمار بالعمارة فقط</option>
                </select>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="بحث باسم المستثمر..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-10 pl-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
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
                  <option value="resold">مُخالص / مغلق</option>
                  <option value="under_construction">تحت الإنشاء / قائم</option>
                </select>
                <div className="lg:col-span-2 space-y-2">
                  <select
                    value={dateRangePreset}
                    onChange={(e) => applyDateRangePreset(e.target.value as DateRangePreset)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
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

            {/* ملخصات — نفس شكل بطاقات لوحة التحكم، مرتبطة مع الشارت */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
              <div role="button" tabIndex={0} onClick={() => setKpiDetailCard("capital")} onKeyDown={(e) => e.key === "Enter" && setKpiDetailCard("capital")} className="group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-blue-200 hover:border-opacity-100 cursor-pointer">
                <div className="absolute inset-0 opacity-5"><div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-600" /></div>
                <div className="relative p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg group-hover:scale-110 transition-transform duration-300">
                      <Wallet className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-gray-600 text-xs font-medium mb-1">إجمالي الاستثمار</p>
                  <p className="text-2xl font-bold text-blue-700 dir-ltr tabular-nums mb-3">{formatNum(displaySummary.totalCapital)} <span className="text-sm font-normal text-slate-500">ر.س</span></p>
                  <div className="flex items-end gap-0.5 h-10">
                    {[40, 65, 50, 75, 60, 85, 70].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-blue-400 to-indigo-500 rounded-t transition-all duration-500 group-hover:opacity-90" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
              <div role="button" tabIndex={0} onClick={() => setKpiDetailCard("profit")} onKeyDown={(e) => e.key === "Enter" && setKpiDetailCard("profit")} className="group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-emerald-200 hover:border-opacity-100 cursor-pointer">
                <div className="absolute inset-0 opacity-5"><div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-600" /></div>
                <div className="relative p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-2 bg-emerald-100 rounded-lg group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                  <p className="text-gray-600 text-xs font-medium mb-1">إجمالي الربح المحقق</p>
                  <p className="text-2xl font-bold text-emerald-700 dir-ltr tabular-nums mb-3">+{formatNum(displaySummary.totalRealizedProfit)} <span className="text-sm font-normal text-slate-500">ر.س</span></p>
                  <div className="flex items-end gap-0.5 h-10">
                    {[50, 70, 60, 80, 70, 90, 75].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-emerald-400 to-teal-500 rounded-t transition-all duration-500 group-hover:opacity-90" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
              <div role="button" tabIndex={0} onClick={() => setKpiDetailCard("closed")} onKeyDown={(e) => e.key === "Enter" && setKpiDetailCard("closed")} className="group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200 hover:border-opacity-100 cursor-pointer">
                <div className="absolute inset-0 opacity-5"><div className="absolute inset-0 bg-gradient-to-br from-slate-400 to-slate-600" /></div>
                <div className="relative p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-2 bg-slate-100 rounded-lg group-hover:scale-110 transition-transform duration-300">
                      <FileCheck className="w-5 h-5 text-slate-600" />
                    </div>
                  </div>
                  <p className="text-gray-600 text-xs font-medium mb-1">صفقات مغلقة / قائمة</p>
                  <p className="text-lg font-bold text-slate-800 tabular-nums mb-3">{displaySummary.totalClosedCount} <span className="text-sm font-normal text-slate-500">مُخالص</span> — {displaySummary.totalOpenCount} <span className="text-sm font-normal text-slate-500">قائم</span></p>
                  <div className="flex items-end gap-0.5 h-10">
                    {[55, 72, 58, 78, 65, 88, 72].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-slate-300 to-slate-400 rounded-t transition-all duration-500 group-hover:opacity-90" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
              <div role="button" tabIndex={0} onClick={() => setKpiDetailCard("avgPct")} onKeyDown={(e) => e.key === "Enter" && setKpiDetailCard("avgPct")} className="group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-teal-200 hover:border-opacity-100 cursor-pointer">
                <div className="absolute inset-0 opacity-5"><div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-cyan-600" /></div>
                <div className="relative p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-2 bg-teal-100 rounded-lg group-hover:scale-110 transition-transform duration-300">
                      <PieChart className="w-5 h-5 text-teal-600" />
                    </div>
                  </div>
                  <p className="text-gray-600 text-xs font-medium mb-1">متوسط نسبة الربح المحققة</p>
                  <p className="text-2xl font-bold text-teal-700 dir-ltr tabular-nums mb-3">{displaySummary.totalClosedCount === 0 ? "—" : displaySummary.avgProfitPct.toFixed(1) + "%"}</p>
                  <div className="flex items-end gap-0.5 h-10">
                    {[45, 68, 52, 72, 62, 82, 68].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-teal-400 to-cyan-500 rounded-t transition-all duration-500 group-hover:opacity-90" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
              <div role="button" tabIndex={0} onClick={() => setKpiDetailCard("settlement")} onKeyDown={(e) => e.key === "Enter" && setKpiDetailCard("settlement")} className="group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-amber-200 hover:border-opacity-100 cursor-pointer">
                <div className="absolute inset-0 opacity-5"><div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500" /></div>
                <div className="relative p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-2 bg-amber-100 rounded-lg group-hover:scale-110 transition-transform duration-300">
                      <ArrowRightLeft className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-gray-600 text-xs font-medium mb-1">إجمالي المُخالص (عمارة)</p>
                  <p className="text-lg font-bold text-slate-800 dir-ltr tabular-nums mb-3">{formatNum(displaySummary.totalSettlementPaid)} <span className="text-sm font-normal text-slate-500">ر.س</span></p>
                  <div className="flex items-end gap-0.5 h-10">
                    {[35, 58, 45, 65, 55, 75, 60].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-amber-400 to-orange-500 rounded-t transition-all duration-500 group-hover:opacity-90" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* مودال ملخص بيانات الكارد */}
            {kpiDetailCard && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setKpiDetailCard(null)} role="dialog" aria-modal="true" aria-label="ملخص بيانات المؤشر">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800">
                      {kpiDetailCard === "capital" && "إجمالي الاستثمار"}
                      {kpiDetailCard === "profit" && "إجمالي الربح المحقق"}
                      {kpiDetailCard === "closed" && "صفقات مغلقة / قائمة"}
                      {kpiDetailCard === "avgPct" && "متوسط نسبة الربح المحققة"}
                      {kpiDetailCard === "settlement" && "إجمالي المُخالص (عمارة)"}
                    </h3>
                    <button type="button" onClick={() => setKpiDetailCard(null)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="إغلاق">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="text-sm text-slate-600 space-y-2">
                    {kpiDetailCard === "capital" && (
                      <>
                        <p className="font-medium text-slate-800">البيانات الفعلية:</p>
                        <p className="dir-ltr">عقود استثمار بيع الوحدات: {formatNum(displaySummary.unitsCapital)} ر.س ({displaySummary.unitsCount} وحدة)</p>
                        <p className="dir-ltr">عقود استثمار بالعماير: {formatNum(displaySummary.buildingCapital)} ر.س ({displaySummary.buildingCount} عقد)</p>
                        <p className="dir-ltr font-semibold border-t border-slate-200 pt-2 mt-2">الإجمالي: {formatNum(displaySummary.totalCapital)} ر.س</p>
                      </>
                    )}
                    {kpiDetailCard === "profit" && (
                      <>
                        <p className="font-medium text-slate-800">البيانات الفعلية:</p>
                        <p className="dir-ltr">ربح الوحدات المُخالصة: {formatNum(displaySummary.unitsProfit)} ر.س</p>
                        <p className="dir-ltr">ربح عقود العمارة المُخالصة: {formatNum(displaySummary.buildingProfit)} ر.س</p>
                        <p className="dir-ltr font-semibold border-t border-slate-200 pt-2 mt-2">الإجمالي: +{formatNum(displaySummary.totalRealizedProfit)} ر.س</p>
                      </>
                    )}
                    {kpiDetailCard === "closed" && (
                      <>
                        <p className="font-medium text-slate-800">البيانات الفعلية:</p>
                        <p>صفقات مُخالصة: {displaySummary.totalClosedCount} (وحدات مُخالصة + عقود عمارة مغلقة)</p>
                        <p>صفقات قائمة: {displaySummary.totalOpenCount} (وحدات تحت الإنشاء + عقود عمارة قائمة)</p>
                      </>
                    )}
                    {kpiDetailCard === "avgPct" && (
                      <>
                        <p className="font-medium text-slate-800">البيانات الفعلية:</p>
                        <p>متوسط نسبة الربح: {displaySummary.totalClosedCount === 0 ? "—" : displaySummary.avgProfitPct.toFixed(1) + "%"}</p>
                        <p>عدد الصفقات المُغلقة المستخدمة في الحساب: {displaySummary.totalClosedCount}</p>
                      </>
                    )}
                    {kpiDetailCard === "settlement" && (
                      <>
                        <p className="font-medium text-slate-800">البيانات الفعلية:</p>
                        <p className="dir-ltr">مخالصات مع رأس المال: {formatNum(displaySummary.paidWithCapital)} ر.س ({displaySummary.withCapitalCount} صفقة)</p>
                        <p className="dir-ltr">مخالصات أرباح فقط: {formatNum(displaySummary.paidProfitOnly)} ر.س ({displaySummary.profitOnlyCount} صفقة)</p>
                        <p className="dir-ltr font-semibold border-t border-slate-200 pt-2 mt-2">الإجمالي: {formatNum(displaySummary.totalSettlementPaid)} ر.س</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ملخص حالة الاستثمار — دونات */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-teal-600" />
                ملخص حالة الاستثمار
              </h2>
              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                <DonutChart
                  segments={[
                    { label: "وحدات مُخالصة", value: summaryUnits.resoldCount, color: "emerald" },
                    { label: "وحدات تحت الإنشاء", value: summaryUnits.underCount, color: "amber" },
                    { label: "عقود مُخالصة", value: summaryBuilding.closedCount, color: "teal" },
                    { label: "عقود قائمة", value: summaryBuilding.openCount, color: "slate" },
                  ]}
                  size={140}
                />
                {(() => {
                  const totalCount = summaryUnits.resoldCount + summaryUnits.underCount + summaryBuilding.closedCount + summaryBuilding.openCount;
                  const rows = [
                    { label: "وحدات مُخالصة", val: summaryUnits.resoldCount, dot: "bg-[#34A853]" },
                    { label: "وحدات تحت الإنشاء", val: summaryUnits.underCount, dot: "bg-[#FBBC05]" },
                    { label: "عقود مُخالصة", val: summaryBuilding.closedCount, dot: "bg-[#4285F4]" },
                    { label: "عقود قائمة", val: summaryBuilding.openCount, dot: "bg-[#EA4335]" },
                  ];
                  return (
                    <div className="flex-1 w-full sm:w-auto space-y-2 min-w-0">
                      {rows.map(({ label, val, dot }) => {
                        const pct = totalCount > 0 ? ((val / totalCount) * 100).toFixed(1) : "0";
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
                  );
                })()}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 shadow-sm">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">إجمالي (وحدات)</p>
                  <p className="text-base font-bold text-slate-800 dir-ltr tabular-nums leading-tight">{formatNum(displaySummary.unitsCapital)} <span className="text-xs font-normal text-slate-500">ر.س</span></p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{displaySummary.unitsCount} وحدة</p>
                </div>
                <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 shadow-sm">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">إجمالي (عماير)</p>
                  <p className="text-base font-bold text-slate-800 dir-ltr tabular-nums leading-tight">{formatNum(displaySummary.buildingCapital)} <span className="text-xs font-normal text-slate-500">ر.س</span></p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{displaySummary.buildingCount} مستثمر</p>
                </div>
                <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2.5 shadow-sm">
                  <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-wide mb-0.5">الربح المحقق</p>
                  <p className="text-base font-bold text-emerald-800 dir-ltr tabular-nums leading-tight">+{formatNum(displaySummary.totalRealizedProfit)} <span className="text-xs font-normal text-slate-500">ر.س</span></p>
                  <p className="text-[11px] text-slate-500 mt-0.5">وحدات {formatNum(displaySummary.unitsProfit)} — عمارة {formatNum(displaySummary.buildingProfit)}</p>
                </div>
                <div className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 shadow-sm">
                  <p className="text-[11px] font-medium text-amber-800 uppercase tracking-wide mb-0.5">مخالصة مع رأس المال</p>
                  <p className="text-base font-bold text-amber-800 dir-ltr tabular-nums leading-tight">{formatNum(displaySummary.paidWithCapital)} <span className="text-xs font-normal text-slate-500">ر.س</span></p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{displaySummary.withCapitalCount} صفقة</p>
                </div>
                <div className="rounded-lg border border-teal-200/80 bg-teal-50/90 px-3 py-2.5 shadow-sm">
                  <p className="text-[11px] font-medium text-teal-800 uppercase tracking-wide mb-0.5">مخالصة أرباح فقط</p>
                  <p className="text-base font-bold text-teal-800 dir-ltr tabular-nums leading-tight">{formatNum(displaySummary.paidProfitOnly)} <span className="text-xs font-normal text-slate-500">ر.س</span></p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{displaySummary.profitOnlyCount} صفقة</p>
                </div>
                <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 shadow-sm">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">إجمالي مخالصات العماير</p>
                  <p className="text-base font-bold text-slate-800 dir-ltr tabular-nums leading-tight">{formatNum(displaySummary.totalSettlementPaid)} <span className="text-xs font-normal text-slate-500">ر.س</span></p>
                </div>
                {(typeFilter === "all" || typeFilter === "building") && (
                  <div className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 shadow-sm">
                    <p className="text-[11px] font-medium text-amber-800 uppercase tracking-wide mb-0.5">رأس المال القائم في العماير</p>
                    <p className="text-base font-bold text-amber-800 dir-ltr tabular-nums leading-tight">{formatNum(displaySummary.capitalStillInBuildings ?? 0)} <span className="text-xs font-normal text-slate-500">ر.س</span></p>
                    <p className="text-[11px] text-slate-500 mt-0.5">مخالصات «أرباح فقط» — لم يُسترد</p>
                  </div>
                )}
              </div>
            </div>

            {/* رسم: استثمار وأرباح حسب العمارة (موحد) */}
            {(typeFilter === "all" || typeFilter === "units" || typeFilter === "building") && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-teal-600" />
                  الاستثمار والربح المحقق حسب العمارة
                </h2>
                {byBuildingMerged.length === 0 ? (
                  <p className="text-slate-500 text-sm py-4">لا توجد بيانات بعد تطبيق الفلاتر.</p>
                ) : (
                  <div className="space-y-4">
                    {byBuildingMerged.map((b) => (
                      <div key={b.buildingId}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-slate-700">{b.buildingName}</span>
                          <span className="text-slate-500 dir-ltr">استثمار: {formatNum(b.invested)} ر.س — ربح محقق: +{formatNum(b.profit)} ر.س</span>
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
                )}
              </div>
            )}

            {/* جدول استثمارات الوحدات */}
            {(typeFilter === "all" || typeFilter === "units") && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                <h2 className="text-lg font-bold text-slate-800 p-5 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-teal-600" />
                  استثمار بالوحدات ({filteredUnits.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                        <th className="text-right p-3 font-semibold">المستثمر</th>
                        <th className="text-right p-3 font-semibold">العمارة</th>
                        <th className="text-right p-3 font-semibold dir-ltr">رأس المال</th>
                        <th className="text-right p-3 font-semibold dir-ltr">الربح المحقق</th>
                        <th className="text-right p-3 font-semibold dir-ltr">نسبة الربح %</th>
                        <th className="text-right p-3 font-semibold">مدة (يوم)</th>
                        <th className="text-right p-3 font-semibold">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUnits.slice(0, 50).map((r) => {
                        const capital = Number(r.purchase_price) || 0;
                        const profitVal = r.profit ?? 0;
                        const profitPct = capital > 0 && r.status === "resold" ? (profitVal / capital) * 100 : null;
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-medium text-slate-800">{r.investor_name || "—"}</td>
                            <td className="p-3 text-slate-600">{r.buildingName}</td>
                            <td className="p-3 dir-ltr text-slate-700">{formatNum(capital)} ر.س</td>
                            <td className="p-3 dir-ltr">
                              {r.profit != null ? <span className="font-semibold text-emerald-700">+{formatNum(r.profit)} ر.س</span> : "—"}
                            </td>
                            <td className="p-3 dir-ltr">{profitPct != null ? <span className="font-medium text-teal-700">{profitPct.toFixed(1)}%</span> : "—"}</td>
                            <td className="p-3 text-slate-600">{r.days}</td>
                            <td className="p-3">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${r.status === "resold" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                                {r.status === "resold" ? "مُخالص" : "تحت الإنشاء"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filteredUnits.length > 50 && <p className="text-xs text-slate-500 p-3 border-t border-slate-100">عرض 50 من {filteredUnits.length}</p>}
              </div>
            )}

            {/* جدول استثمار العمارة */}
            {(typeFilter === "all" || typeFilter === "building") && (
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
                      {filteredBuilding.slice(0, 50).map((r) => (
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
                {filteredBuilding.length > 50 && <p className="text-xs text-slate-500 p-3 border-t border-slate-100">عرض 50 من {filteredBuilding.length}</p>}
              </div>
            )}

            {/* داشبورد صافي دخل المالك الأول */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6 mt-8">
              <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-slate-600" />
                ملخص تحليل الاستثمار للمنشأة
              </h2>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 shadow-sm">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">إجمالي سعر بيع وحدات العمارة</p>
                  <p className="text-base font-bold text-slate-800 dir-ltr tabular-nums leading-tight">{formatNum(ownerNetMetrics.totalUnitValue)} <span className="text-xs font-normal text-slate-500">ر.س</span></p>
                </div>
                <div className="rounded-lg border border-sky-200/80 bg-sky-50/80 px-3 py-2.5 shadow-sm">
                  <p className="text-[11px] font-medium text-sky-700 uppercase tracking-wide mb-0.5">إيرادات إعادة البيع</p>
                  <p className="text-base font-bold text-sky-800 dir-ltr tabular-nums leading-tight">{formatNum(ownerNetMetrics.resaleRevenue)} <span className="text-xs font-normal text-slate-500">ر.س</span></p>
                </div>
                <div className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 shadow-sm">
                  <p className="text-[11px] font-medium text-amber-800 uppercase tracking-wide mb-0.5">ربح مستثمرين الوحدات (مُخالص)</p>
                  <p className="text-base font-bold text-amber-800 dir-ltr tabular-nums leading-tight">{formatNum(ownerNetMetrics.unitInvestorProfit)} <span className="text-xs font-normal text-slate-500">ر.س</span></p>
                </div>
                <div className="rounded-lg border border-orange-200/80 bg-orange-50/90 px-3 py-2.5 shadow-sm">
                  <p className="text-[11px] font-medium text-orange-800 uppercase tracking-wide mb-0.5">مخالصات العماير</p>
                  <p className="text-base font-bold text-orange-800 dir-ltr tabular-nums leading-tight">{formatNum(ownerNetMetrics.buildingSettlements)} <span className="text-xs font-normal text-slate-500">ر.س</span></p>
                </div>
                <div className="rounded-lg border border-slate-200/80 bg-slate-100/90 px-3 py-2.5 shadow-sm lg:col-span-2">
                  <p className="text-[11px] font-medium text-slate-600 uppercase tracking-wide mb-0.5">صافي استثمار المنشأة</p>
                  <p className={`text-lg font-bold dir-ltr tabular-nums leading-tight ${ownerNetMetrics.netProfitOwner >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {ownerNetMetrics.netProfitOwner >= 0 ? "+" : ""}{formatNum(ownerNetMetrics.netProfitOwner)} <span className="text-sm font-normal text-slate-500">ر.س</span>
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
