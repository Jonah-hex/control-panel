"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, User2, UserPlus, LayoutDashboard, LineChart } from "lucide-react";
import { RiyalIcon } from "@/components/icons/RiyalIcon";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";

/** لوجو إدارة التسويق والمبيعات — نفس شكل بطاقة لوحة التحكم (User2) */
function MarketingLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25 ring-2 ring-white/80">
        <User2 className="w-7 h-7 text-white" />
      </div>
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">إدارة التسويق والمبيعات</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">لوحة تشغيل التسويق والمبيعات — تنقل سريع بين الحجوزات والمبيعات</p>
      </div>
    </div>
  );
}

export default function MarketingPage() {
  const router = useRouter();
  const { can, ready } = useDashboardAuth();

  useEffect(() => {
    if (!ready) return;
    if (!can("reservations")) {
      router.replace("/dashboard");
    }
  }, [ready, can, router]);

  if (ready && !can("reservations")) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <p className="text-gray-500">جاري التحويل...</p>
      </main>
    );
  }

  const cardBase = "group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300";
  const cardOverlay = "absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-0 group-hover:opacity-80 transition-opacity duration-300";
  const iconBox = "w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-amber-50/40 p-4 sm:p-6 lg:p-8" dir="rtl">
      {/* خلفية حيوية خفيفة */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_60%_50%_at_20%_0%,rgba(245,158,11,0.06),transparent)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_50%_60%_at_80%_100%,rgba(234,88,12,0.05),transparent)]" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        {/* هيدر بنفس أسلوب البطاقات */}
        <header className="relative rounded-2xl overflow-hidden mb-8 shadow-lg border border-gray-200/90 bg-gradient-to-br from-white to-gray-50">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_70%_0%,rgba(245,158,11,0.08),transparent)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6">
            <MarketingLogo />
            <Link
              href="/dashboard"
              className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
            >
              <LayoutDashboard className="w-4 h-4" />
              لوحة التحكم
            </Link>
          </div>
        </header>

        {/* عنوان القسم */}
        <div className="flex items-center gap-3 mb-5">
          <span className="h-px flex-1 max-w-[4rem] bg-gradient-to-l from-amber-300 to-transparent rounded-full" />
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">أقسام إدارة التسويق والمبيعات</h2>
          <span className="h-px flex-1 max-w-[4rem] bg-gradient-to-r from-orange-300 to-transparent rounded-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          <Link
            href="/dashboard/reservations"
            className={`${cardBase} p-6 hover:shadow-xl hover:-translate-y-1 cursor-pointer`}
          >
            <div className={cardOverlay} />
            <div className="relative z-10 text-center">
              <div className={`${iconBox} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-800 group-hover:text-white transition-colors duration-300 text-sm mb-1">
                إدارة الحجوزات
              </h3>
              <p className="text-xs text-gray-500 group-hover:text-white/90 transition-colors duration-300">
                إنشاء الحجز ومتابعة الحالات وطباعة السندات
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/sales"
            className={`${cardBase} p-6 hover:shadow-xl hover:-translate-y-1 cursor-pointer`}
          >
            <div className={cardOverlay} />
            <div className="relative z-10 text-center">
              <div className={`${iconBox} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                <RiyalIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-800 group-hover:text-white transition-colors duration-300 text-sm mb-1">
                سجل المبيعات ونقل الملكية
              </h3>
              <p className="text-xs text-gray-500 group-hover:text-white/90 transition-colors duration-300">
                تتبع عمليات البيع والمدفوعات وإتمام نقل الملكية
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/marketing/marketers"
            className={`${cardBase} p-6 hover:shadow-xl hover:-translate-y-1 cursor-pointer`}
          >
            <div className={cardOverlay} />
            <div className="relative z-10 text-center">
              <div className={`${iconBox} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                <UserPlus className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-800 group-hover:text-white transition-colors duration-300 text-sm mb-1">
                قسم المسوقين
              </h3>
              <p className="text-xs text-gray-500 group-hover:text-white/90 transition-colors duration-300">
                إدارة قائمة المسوقين وربطهم بالحجوزات وتتبع الأداء
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/marketing/reports"
            className={`${cardBase} p-6 hover:shadow-xl hover:-translate-y-1 cursor-pointer`}
          >
            <div className={cardOverlay} />
            <div className="relative z-10 text-center">
              <div className={`${iconBox} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                <LineChart className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-800 group-hover:text-white transition-colors duration-300 text-sm mb-1">
                التقارير والتحليلات
              </h3>
              <p className="text-xs text-gray-500 group-hover:text-white/90 transition-colors duration-300">
                ملخص وتقارير تفصيلية للحجوزات والمبيعات وأداء المسوقين — فلترة بالفترة وطباعة
              </p>
            </div>
          </Link>
        </div>

      </div>
    </main>
  );
}
