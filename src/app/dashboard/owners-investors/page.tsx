"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, LayoutDashboard, Home, TrendingUp, BarChart3 } from "lucide-react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";

/** لوجو إدارة الملاك والمستثمرين — نفس مقاس ونمط هيدر إدارة العماير */
function OwnersInvestorsLogo() {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/25 ring-1 ring-white/70">
        <Users className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl font-bold text-gray-800 tracking-tight leading-tight">إدارة الملاك والمستثمرين</h1>
        <p className="text-xs text-gray-500 mt-0.5">ملاك الوحدات المباعة والمستثمرين — إدارة وعرض البيانات</p>
      </div>
    </div>
  );
}

export default function OwnersInvestorsPage() {
  const router = useRouter();
  const { can, ready } = useDashboardAuth();

  const canAccessOwners = can("owners_view");
  const canAccessInvestors = can("investors_view");
  const canAccessAny = canAccessOwners || canAccessInvestors;

  useEffect(() => {
    if (!ready) return;
    if (!canAccessAny) {
      router.replace("/dashboard");
    }
  }, [ready, canAccessAny, router]);

  if (ready && !canAccessAny) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <p className="text-gray-500">جاري التحويل...</p>
      </main>
    );
  }

  const cardBase = "group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300";
  const cardOverlay = "absolute inset-0 bg-gradient-to-br from-teal-500 to-cyan-600 opacity-0 group-hover:opacity-80 transition-opacity duration-300";
  const iconBox = "w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/20";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-teal-50/40 p-4 sm:p-6 lg:p-8" dir="rtl">
      {/* خلفية خفيفة */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_60%_50%_at_20%_0%,rgba(20,184,166,0.06),transparent)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_50%_60%_at_80%_100%,rgba(6,182,212,0.05),transparent)]" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        {/* هيدر */}
        <header className="relative rounded-2xl overflow-hidden mb-8 shadow-lg border border-gray-200/90 bg-gradient-to-br from-white to-gray-50">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-cyan-600 opacity-10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_70%_0%,rgba(20,184,166,0.08),transparent)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-4 sm:px-5 sm:py-4">
            <OwnersInvestorsLogo />
            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
              >
                <LayoutDashboard className="w-4 h-4" />
                لوحة التحكم
              </Link>
            </div>
          </div>
        </header>

        {/* عنوان القسم */}
        <div className="flex items-center gap-3 mb-5">
          <span className="h-px flex-1 max-w-[4rem] bg-gradient-to-l from-teal-300 to-transparent rounded-full" />
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">أقسام إدارة الملاك والمستثمرين</h2>
          <span className="h-px flex-1 max-w-[4rem] bg-gradient-to-r from-cyan-300 to-transparent rounded-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {/* بطاقة الملاك — ملاك الوحدات المباعة (تظهر لمن لديه صلاحية الملاك) */}
          {canAccessOwners && (
            <Link
              href="/dashboard/owners-investors/owners"
              className={`${cardBase} p-6 hover:shadow-xl hover:-translate-y-1 cursor-pointer`}
            >
              <div className={cardOverlay} />
              <div className="relative z-10 text-center">
                <div className={`${iconBox} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                  <Home className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-gray-800 group-hover:text-white transition-colors duration-300 text-sm mb-1">
                  الملاك
                </h3>
                <p className="text-xs text-gray-500 group-hover:text-white/90 transition-colors duration-300">
                  ملاك الوحدات المباعة — عرض وإدارة بيانات الملاك والوحدات المملوكة
                </p>
              </div>
            </Link>
          )}

          {/* بطاقة المستثمرين (تظهر لمن لديه صلاحية المستثمرين) */}
          {canAccessInvestors && (
            <Link
              href="/dashboard/owners-investors/investors"
              className={`${cardBase} p-6 hover:shadow-xl hover:-translate-y-1 cursor-pointer`}
            >
              <div className={cardOverlay} />
              <div className="relative z-10 text-center">
                <div className={`${iconBox} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-gray-800 group-hover:text-white transition-colors duration-300 text-sm mb-1">
                  المستثمرين
                </h3>
                <p className="text-xs text-gray-500 group-hover:text-white/90 transition-colors duration-300">
                  إدارة المستثمرين — عرض ومتابعة بيانات المستثمرين واستثماراتهم
                </p>
              </div>
            </Link>
          )}

          {/* لوحة تحليلات الاستثمار */}
          {canAccessInvestors && (
            <Link
              href="/dashboard/owners-investors/analytics"
              className={`${cardBase} p-6 hover:shadow-xl hover:-translate-y-1 cursor-pointer`}
            >
              <div className={cardOverlay} />
              <div className="relative z-10 text-center">
                <div className={`${iconBox} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-gray-800 group-hover:text-white transition-colors duration-300 text-sm mb-1">
                  تحليلات الملاك والمستثمرين
                </h3>
                <p className="text-xs text-gray-500 group-hover:text-white/90 transition-colors duration-300">
                  تحليل الاستثمارات والأرباح المحققة والمخالصات فقط — شارتات وفلاتر وبحث
                </p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
