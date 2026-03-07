'use client'

import { PageLoadingSkeleton } from '@/components/dashboard/PageLoadingSkeleton'
import Link from 'next/link'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { useStatistics } from '@/hooks/useStatistics'
import {
  BarChart3,
  Building2,
  Home,
  TrendingUp,
  Gauge,
  MapPin,
  LayoutDashboard,
  Target,
  Award
} from 'lucide-react'
import { RiyalIcon } from '@/components/icons/RiyalIcon'

function getTypeLabel(type: string) {
  const map: Record<string, string> = {
    apartment: 'شقة',
    studio: 'ملحق',
    duplex: 'دوبلكس',
    penthouse: 'بنتهاوس'
  }
  return map[type] || type
}

export default function StatisticsPage() {
  const { effectiveOwnerId, ready } = useDashboardAuth()
  const { stats, loading, refetch } = useStatistics({
    ownerId: effectiveOwnerId,
    enabled: ready && !!effectiveOwnerId,
  })

  if (!ready) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
        <PageLoadingSkeleton message="جاري التحميل..." size="md" variant="indigo" />
      </div>
    )
  }

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
        <PageLoadingSkeleton message="جارٍ تحميل الإحصائيات..." size="md" variant="indigo" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center" dir="rtl">
        <p className="text-slate-600">لا توجد بيانات متاحة</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* هيدر موحد */}
        <header className="relative rounded-2xl overflow-hidden mb-8 shadow-lg border border-gray-200/90 bg-gradient-to-br from-white to-gray-50">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_70%_0%,rgba(99,102,241,0.08),transparent)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-4 sm:px-5 sm:py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/70">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-800 tracking-tight leading-tight">الإحصائيات</h1>
                <p className="text-xs text-gray-500 mt-0.5">إحصائيات شاملة للعماير والوحدات</p>
              </div>
            </div>
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

        {/* مؤشرات إحصائية — غير مكررة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">حجم المحفظة</p>
              <p className="text-xl font-bold text-slate-800">{stats.totalBuildings} عمارة · {stats.totalUnits} وحدة</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <RiyalIcon className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">إجمالي المبيعات المسجلة</p>
              <p className="text-xl font-bold text-slate-800">{stats.totalRevenueFromSales.toLocaleString('en')} ر.س</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">متوسط قيمة الصفقة</p>
              <p className="text-xl font-bold text-slate-800">{stats.averageDealValue > 0 ? `${Math.round(stats.averageDealValue).toLocaleString('en')} ر.س` : '—'}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Gauge className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">معدل الإشغال</p>
              <p className="text-2xl font-bold text-slate-800">{stats.occupancyRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* التوزيع التكراري لحالة الوحدات */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-slate-500" />
              التوزيع التكراري لحالة الوحدات
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">حجم العينة: {stats.totalUnits} وحدة · التكرار والنسبة المئوية لكل فئة</p>
          </div>
          <div className="p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">الحالة</th>
                    <th className="py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">التكرار</th>
                    <th className="py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">النسبة %</th>
                    <th className="py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-full max-w-[200px]">التوزيع</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'متاحة', value: stats.availableUnits, bg: 'from-emerald-500 to-teal-600' },
                    { label: 'محجوزة', value: stats.reservedUnits, bg: 'from-amber-500 to-orange-600' },
                    { label: 'مباعة', value: stats.soldUnits, bg: 'from-rose-500 to-pink-600' }
                  ].map(({ label, value, bg }) => {
                    const pct = stats.totalUnits > 0 ? (value / stats.totalUnits) * 100 : 0
                    return (
                      <tr key={label} className="border-b border-slate-100 last:border-0">
                        <td className="py-3 px-3 font-medium text-slate-800">{label}</td>
                        <td className="py-3 px-3 text-slate-700 tabular-nums">{value}</td>
                        <td className="py-3 px-3 text-slate-700 tabular-nums">{pct.toFixed(1)}%</td>
                        <td className="py-3 px-3 w-full max-w-[200px]">
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${bg} transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* وضعنا في السوق */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-l from-indigo-50/80 to-white">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              وضعنا في السوق
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">ملخص الصفقات، التحويل، قيمة المعروض ونطاق الأسعار</p>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                <p className="text-xs font-medium text-slate-500 mb-1">عدد الصفقات</p>
                <p className="text-xl font-bold text-slate-800">{stats.salesCount}</p>
                <p className="text-xs text-slate-500 mt-0.5">من سجل المبيعات</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                <p className="text-xs font-medium text-slate-500 mb-1">معدل التحويل (حجز ← بيع)</p>
                <p className="text-xl font-bold text-emerald-600">{stats.conversionRate.toFixed(1)}%</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                <p className="text-xs font-medium text-slate-500 mb-1">قيمة المعروض (متاحة)</p>
                <p className="text-lg font-bold text-slate-800">{stats.portfolioValueAvailable.toLocaleString('en')} ر.س</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">أقل سعر وحدة</span>
                <span className="text-lg font-bold text-slate-800">{stats.minUnitPrice ? `${stats.minUnitPrice.toLocaleString('en')} ر.س` : '—'}</span>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">أعلى سعر وحدة</span>
                <span className="text-lg font-bold text-slate-800">{stats.maxUnitPrice ? `${stats.maxUnitPrice.toLocaleString('en')} ر.س` : '—'}</span>
              </div>
            </div>
            {stats.buildStatusStats.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-2">توزيع العماير حسب حالة البناء</p>
                <div className="flex flex-wrap gap-2">
                  {stats.buildStatusStats.map((b, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-800 text-sm font-medium border border-indigo-100">
                      {b.label}: {b.count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* تقييم الأداء — تقييمنا من بين المطورين */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-l from-amber-50/80 to-white">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              تقييم الأداء
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">مؤشر قوة المنصة بناءً على الإشغال والتحويل والمحفظة والتنوّع والإيرادات</p>
          </div>
          <div className="p-5 flex flex-col sm:flex-row gap-6 items-center">
            <div className="flex-shrink-0 relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path className="text-slate-100 fill-current" strokeWidth="2" stroke="currentColor" fill="none" d="M18 2.084 a 15.916 15.916 0 0 1 0 31.832 a 15.916 15.916 0 0 1 0 -31.832" />
                <path
                  className="text-amber-500 fill-none transition-all duration-700"
                  strokeWidth="2"
                  strokeDasharray={`${stats.performanceScore}, 100`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  d="M18 2.084 a 15.916 15.916 0 0 1 0 31.832 a 15.916 15.916 0 0 1 0 -31.832"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-black text-slate-800">{Math.min(100, stats.performanceScore)}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              {stats.scoreBreakdown.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-slate-600 w-40 flex-shrink-0">{s.label}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all"
                      style={{ width: `${s.max > 0 ? (s.value / s.max) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-600 w-12 text-left">{s.value}/{s.max}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* مقاييس النزعة المركزية */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <RiyalIcon className="w-5 h-5 text-emerald-600" />
              متوسط سعر الوحدة
            </h3>
            <p className="text-2xl font-bold text-slate-800">{stats.averagePrice.toLocaleString('en')} ر.س</p>
            <p className="text-xs text-slate-500 mt-1">المتوسط الحسابي للوحدات ذات السعر</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Home className="w-5 h-5 text-violet-600" />
              متوسط مساحة الوحدة
            </h3>
            <p className="text-2xl font-bold text-slate-800">{stats.averageArea.toFixed(1)} م²</p>
            <p className="text-xs text-slate-500 mt-1">المتوسط الحسابي لمساحة جميع الوحدات</p>
          </div>
        </div>

        {/* المستثمرون والملاك */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-slate-500" />
              المستثمرون والملاك
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">عدد المستثمرين والملاك، ونسبة استثمارات الشركة والعماير</p>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                <p className="text-xs font-medium text-slate-500 mb-1">المستثمرون</p>
                <p className="text-2xl font-bold text-slate-800">{stats.investorsCount}</p>
                <p className="text-xs text-slate-500 mt-0.5">مستثمرون في العماير والوحدات</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                <p className="text-xs font-medium text-slate-500 mb-1">الملاك</p>
                <p className="text-2xl font-bold text-slate-800">{stats.ownersCount}</p>
                <p className="text-xs text-slate-500 mt-0.5">ملاك الوحدات المباعة</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                <p className="text-xs font-medium text-slate-500 mb-1">نسبة العماير التي لديها مستثمرون</p>
                <p className="text-2xl font-bold text-slate-800">{stats.buildingsWithInvestorsPct.toFixed(1)}%</p>
                <p className="text-xs text-slate-500 mt-0.5">{stats.buildingsWithInvestorsCount} من {stats.totalBuildings} عمارة</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                <p className="text-xs font-medium text-slate-500 mb-1">نسبة العماير التي لديها ملاك</p>
                <p className="text-2xl font-bold text-slate-800">{stats.buildingsWithOwnersPct.toFixed(1)}%</p>
                <p className="text-xs text-slate-500 mt-0.5">{stats.buildingsWithOwnersCount} من {stats.totalBuildings} عمارة</p>
              </div>
            </div>
          </div>
        </div>

        {/* التوزيع حسب الحي */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-l from-slate-50 to-white">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-500" />
              التوزيع حسب الأحياء
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">عدد العماير والوحدات لكل حي ونسبتها من الإجمالي</p>
          </div>
          <div className="p-5 space-y-3">
            {stats.neighborhoodStats.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">لا توجد أحياء مسجلة</p>
            ) : (
              stats.neighborhoodStats.map((n, i) => {
                const pct = stats.totalBuildings > 0 ? (n.buildingsCount / stats.totalBuildings) * 100 : 0
                return (
                  <div key={i} className="rounded-xl border border-slate-200/80 bg-slate-50/50 overflow-hidden hover:bg-slate-50/80 transition-colors">
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0 flex items-baseline justify-between gap-2 sm:block">
                        <p className="font-semibold text-slate-800 truncate">{n.neighborhood}</p>
                        <p className="text-xs text-slate-500 mt-0.5 sm:mt-0">
                          {n.buildingsCount} عمارة · {n.unitsCount} وحدة
                        </p>
                      </div>
                      <div className="flex items-center gap-3 min-w-0 flex-shrink-0 sm:w-40">
                        <div className="flex-1 min-w-0 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-l from-indigo-500 to-purple-600 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-slate-700 tabular-nums w-10 text-left">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* نوع الوحدة + عدد الغرف */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Home className="w-5 h-5 text-slate-500" />
                التوزيع حسب نوع الوحدة
              </h2>
            </div>
            <div className="p-5 space-y-3">
              {stats.unitTypeStats.map((t, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700 w-20 flex-shrink-0">{getTypeLabel(t.type)}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all" style={{ width: `${t.percentage}%` }} />
                  </div>
                  <span className="text-xs text-slate-500 w-14 text-left">{t.count} وحدة</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Home className="w-5 h-5 text-slate-500" />
                التوزيع حسب عدد الغرف
              </h2>
            </div>
            <div className="p-5 space-y-3">
              {stats.roomsDistribution.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700 w-20 flex-shrink-0">{r.rooms} {r.rooms === 1 ? 'غرفة' : 'غرف'}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all"
                      style={{ width: `${stats.totalUnits > 0 ? (r.count / stats.totalUnits) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-14 text-left">{r.count} وحدة</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
