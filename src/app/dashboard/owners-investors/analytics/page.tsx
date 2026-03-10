"use client";
/**
 * مدخل تحليلات الملاك والمستثمرين — يوجّه إلى تقرير الوحدات أو تقرير العمارة
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
  TrendingUp,
  Building2,
  Wallet,
  ArrowRight,
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
  settlement_type?: string | null;
}

interface BuildingInvestorRow {
  id: string;
  building_id: string;
  total_invested_amount: number | null;
  closed_at?: string | null;
  realized_profit?: number | null;
  settlement_type?: string | null;
}

interface SaleRow {
  id: string;
  sale_price: number;
}

const NUM_LOCALE = "en";
function formatNum(n: number): string {
  return n.toLocaleString(NUM_LOCALE);
}

export default function InvestmentAnalyticsEntryPage() {
  const { ready, can, effectiveOwnerId } = useDashboardAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [unitInvestments, setUnitInvestments] = useState<UnitInvestmentRow[]>([]);
  const [buildingInvestors, setBuildingInvestors] = useState<BuildingInvestorRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);

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

  const summaryUnits = useMemo(() => {
    const totalInvested = unitInvestments.reduce((s, r) => s + (Number(r.purchase_price) || 0), 0);
    const resoldList = unitInvestments.filter((r) => r.status === "resold" && r.resale_sale_id);
    const totalProfit = resoldList.reduce((s, r) => {
      const salePrice = sales.find((sx) => sx.id === r.resale_sale_id)?.sale_price ?? 0;
      const purchasePrice = Number(r.purchase_price) || 0;
      return s + Math.round(salePrice - purchasePrice);
    }, 0);
    const resoldCount = resoldList.length;
    const underCount = unitInvestments.filter((r) => r.status === "under_construction").length;
    return {
      totalInvested,
      totalProfit,
      resoldCount,
      underCount,
      count: unitInvestments.length,
    };
  }, [unitInvestments, sales]);

  const summaryBuilding = useMemo(() => {
    const totalInvested = buildingInvestors.reduce((s, r) => s + (Number(r.total_invested_amount) || 0), 0);
    const closedList = buildingInvestors.filter((r) => !!r.closed_at);
    const totalRealized = closedList.reduce((s, r) => s + (Number(r.realized_profit) || 0), 0);
    const closedCount = closedList.length;
    const openCount = buildingInvestors.length - closedCount;
    const withCapital = closedList.filter((r) => r.settlement_type === "with_capital");
    const profitOnly = closedList.filter((r) => r.settlement_type === "profit_only");
    const paidWithCapital = withCapital.reduce(
      (s, r) => s + (Number(r.total_invested_amount) || 0) + (Number(r.realized_profit) || 0),
      0
    );
    const paidProfitOnly = profitOnly.reduce((s, r) => s + (Number(r.realized_profit) || 0), 0);
    return {
      totalInvested,
      totalRealized,
      closedCount,
      openCount,
      count: buildingInvestors.length,
      paidWithCapital,
      paidProfitOnly,
      totalSettlementPaid: paidWithCapital + paidProfitOnly,
    };
  }, [buildingInvestors]);

  const ownerNetMetrics = useMemo(() => {
    const totalUnitValue = units.reduce((s, u) => s + (Number(u.price) || 0), 0);
    const resoldList = unitInvestments.filter((r) => r.status === "resold" && r.resale_sale_id);
    const resaleRevenue = resoldList.reduce(
      (s, r) => s + (sales.find((sx) => sx.id === r.resale_sale_id)?.sale_price ?? 0),
      0
    );
    const unitInvestorProfit = resoldList.reduce((s, r) => {
      const salePrice = sales.find((sx) => sx.id === r.resale_sale_id)?.sale_price ?? 0;
      const purchasePrice = Number(r.purchase_price) || 0;
      return s + Math.round(salePrice - purchasePrice);
    }, 0);
    const unitSettlements = resoldList.reduce((s, r) => {
      const salePrice = sales.find((sx) => sx.id === r.resale_sale_id)?.sale_price ?? 0;
      const purchasePrice = Number(r.purchase_price) || 0;
      const profit = Math.round(salePrice - purchasePrice);
      const withCapital = r.settlement_type !== "profit_only";
      return s + (withCapital ? purchasePrice + profit : profit);
    }, 0);
    const buildingSettlements = buildingInvestors
      .filter((r) => !!r.closed_at)
      .reduce((s, r) => {
        const cap = Number(r.total_invested_amount) || 0;
        const real = Number(r.realized_profit) || 0;
        return s + (r.settlement_type === "with_capital" ? cap + real : real);
      }, 0);
    const netProfitOwner = resaleRevenue - unitSettlements - buildingSettlements;
    return {
      totalUnitValue,
      resaleRevenue,
      unitInvestorProfit,
      unitSettlements,
      buildingSettlements,
      netProfitOwner,
    };
  }, [units, unitInvestments, sales, buildingInvestors]);

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
        <header className="mb-5">
          <div className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/70 px-3 sm:px-4 lg:px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:min-h-[64px] shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/25 flex-shrink-0">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">تحليلات الملاك والمستثمرين</h1>
                <p className="text-sm text-slate-500 mt-0.5">اختر نوع التقرير للتفاصيل والجداول</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Link
                href="/dashboard/owners-investors/analytics/units"
                className="group block rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm hover:border-teal-300 hover:shadow-lg transition-all duration-200 text-right no-underline"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center group-hover:bg-teal-100 transition-colors">
                    <TrendingUp className="w-6 h-6 text-teal-600" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
                </div>
                <h2 className="text-base font-bold text-slate-800 mt-3 mb-0.5">تحليلات استثمار الوحدات</h2>
                <p className="text-xs text-slate-500 mb-3">
                  ربح من إعادة البيع، مدة الاستثمار، نسبة الربح المحققة، وحالة كل صفقة
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">عدد الاستثمارات</p>
                    <p className="font-bold text-slate-800 tabular-nums dir-ltr text-sm">{summaryUnits.count}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">رأس المال</p>
                    <p className="font-bold text-slate-800 tabular-nums dir-ltr text-sm">{formatNum(summaryUnits.totalInvested)} ر.س</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 px-2.5 py-1.5">
                    <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-wide">الربح المحقق</p>
                    <p className="font-bold text-emerald-800 tabular-nums dir-ltr text-sm">+{formatNum(summaryUnits.totalProfit)} ر.س</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">مُخالص / قائم</p>
                    <p className="font-bold text-slate-800 tabular-nums text-sm">{summaryUnits.resoldCount} / {summaryUnits.underCount}</p>
                  </div>
                </div>
              </Link>

              <Link
                href="/dashboard/owners-investors/analytics/building"
                className="group block rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm hover:border-teal-300 hover:shadow-lg transition-all duration-200 text-right no-underline"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                    <Building2 className="w-6 h-6 text-amber-600" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
                </div>
                <h2 className="text-base font-bold text-slate-800 mt-3 mb-0.5">تحليلات استثمار العمارة</h2>
                <p className="text-xs text-slate-500 mb-3">
                  ربح محقق، نسبة الإغلاق، نوع المخالصة، ورأس المال القائم في العماير
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">عدد المستثمرين</p>
                    <p className="font-bold text-slate-800 tabular-nums dir-ltr text-sm">{summaryBuilding.count}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">رأس المال</p>
                    <p className="font-bold text-slate-800 tabular-nums dir-ltr text-sm">{formatNum(summaryBuilding.totalInvested)} ر.س</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 px-2.5 py-1.5">
                    <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-wide">الربح المحقق</p>
                    <p className="font-bold text-emerald-800 tabular-nums dir-ltr text-sm">+{formatNum(summaryBuilding.totalRealized)} ر.س</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">إجمالي المخالصات</p>
                    <p className="font-bold text-slate-800 tabular-nums dir-ltr text-sm">{formatNum(summaryBuilding.totalSettlementPaid)} ر.س</p>
                  </div>
                </div>
              </Link>
            </div>

            {/* ملخص تحليل الاستثمار للمنشأة */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <h2 className="text-base font-bold text-slate-800 mb-0.5 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-slate-600" />
                ملخص تحليل الاستثمار للمنشأة
              </h2>
              <p className="text-xs text-slate-500 mb-3">إجمالي سريع يجمع وحدات وعماير (بدون فلاتر)</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-2.5 py-2">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">إجمالي سعر بيع وحدات العمارة</p>
                  <p className="text-sm font-bold text-slate-800 dir-ltr tabular-nums">{formatNum(ownerNetMetrics.totalUnitValue)} ر.س</p>
                </div>
                <div className="rounded-lg border border-sky-200/80 bg-sky-50/80 px-2.5 py-2">
                  <p className="text-[10px] font-medium text-sky-700 uppercase tracking-wide mb-0.5">إيرادات إعادة البيع</p>
                  <p className="text-sm font-bold text-sky-800 dir-ltr tabular-nums">{formatNum(ownerNetMetrics.resaleRevenue)} ر.س</p>
                </div>
                <div className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-2.5 py-2">
                  <p className="text-[10px] font-medium text-amber-800 uppercase tracking-wide mb-0.5">مخالصات مستثمرين الوحدات</p>
                  <p className="text-sm font-bold text-amber-800 dir-ltr tabular-nums">{formatNum(ownerNetMetrics.unitSettlements)} ر.س</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">ربحهم: {formatNum(ownerNetMetrics.unitInvestorProfit)} ر.س</p>
                </div>
                <div className="rounded-lg border border-orange-200/80 bg-orange-50/90 px-2.5 py-2">
                  <p className="text-[10px] font-medium text-orange-800 uppercase tracking-wide mb-0.5">مخالصات عقود استثمار بالعماير</p>
                  <p className="text-sm font-bold text-orange-800 dir-ltr tabular-nums">{formatNum(ownerNetMetrics.buildingSettlements)} ر.س</p>
                </div>
                <div className="rounded-lg border border-slate-200/80 bg-slate-100/90 px-2.5 py-2 sm:col-span-2 lg:col-span-1">
                  <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wide mb-0.5">صافي استثمار المنشأة</p>
                  <p className="text-sm font-medium text-slate-500">—</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">يُحسب لاحقاً من التكلفة الفعلية والأرباح</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
