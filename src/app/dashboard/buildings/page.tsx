'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, Building2, LayoutDashboard, Home, Search, Trash2, Eye, Crown } from 'lucide-react'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { useBuildings } from '@/hooks/useBuildings'
import { PageLoadingSkeleton } from '@/components/dashboard/PageLoadingSkeleton'
import type { Building } from '@/types/database'

const TABLE_PAGE_SIZES = [10, 25, 50, 100] as const

export default function BuildingsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [buildingToDelete, setBuildingToDelete] = useState<Building | null>(null)
  const [buildingsPage, setBuildingsPage] = useState(1)
  const [buildingsPageSize, setBuildingsPageSize] = useState(10)
  const supabase = createClient()
  const { effectiveOwnerId, can, ready } = useDashboardAuth()
  const { planName, canAddBuilding, buildingsLimitLabel, loading: subscriptionLoading } = useSubscription()
  const { buildings, unitStatsByBuilding, loading, refetch } = useBuildings({
    ownerId: effectiveOwnerId,
    enabled: ready && !!effectiveOwnerId,
  })

  const deleteBuilding = async (buildingId: string) => {
    try {
      const { error } = await supabase
        .from('buildings')
        .delete()
        .eq('id', buildingId)

      if (error) throw error
      
      refetch()
    } catch (error) {
      console.error('Error deleting building:', error)
    }
  }

  const openDeleteModal = (building: Building) => {
    setBuildingToDelete(building)
    setIsDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false)
    setBuildingToDelete(null)
  }

  const confirmDelete = async () => {
    if (!buildingToDelete) return
    await deleteBuilding(buildingToDelete.id)
    closeDeleteModal()
  }

  const getBuildStatusLabel = (status?: Building['build_status']) => {
    if (status === 'under_construction') return { label: 'تحت الإنشاء', className: 'bg-amber-100 text-amber-700' }
    if (status === 'finishing') return { label: 'تشطيب', className: 'bg-blue-100 text-blue-700' }
    if (status === 'new_project') return { label: 'أرض مشروع جديد', className: 'bg-amber-100 text-amber-700' }
    if (status === 'old') return { label: 'قديم', className: 'bg-slate-200 text-slate-700' }
    return { label: 'جاهز', className: 'bg-emerald-100 text-emerald-700' }
  }

  const filteredBuildings = buildings.filter(building => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return true
    const statusLabel = getBuildStatusLabel(building.build_status).label.toLowerCase()
    return (
      building.name.toLowerCase().includes(term) ||
      building.plot_number.toLowerCase().includes(term) ||
      building.neighborhood?.toLowerCase().includes(term) ||
      building.address?.toLowerCase().includes(term) ||
      building.phone?.toLowerCase().includes(term) ||
      statusLabel.includes(term)
    )
  })

  // Sort by newest first (last added)
  const displayedBuildings = useMemo(
    () => [...filteredBuildings].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
    [filteredBuildings]
  )

  const buildingsTotalPages = Math.max(1, Math.ceil(displayedBuildings.length / buildingsPageSize))
  const paginatedBuildings = useMemo(
    () => displayedBuildings.slice((buildingsPage - 1) * buildingsPageSize, buildingsPage * buildingsPageSize),
    [displayedBuildings, buildingsPage, buildingsPageSize]
  )
  useEffect(() => {
    if (buildingsPage > buildingsTotalPages && buildingsTotalPages >= 1) setBuildingsPage(1)
  }, [buildingsPage, buildingsTotalPages])

  const totalAvailableUnits = Object.values(unitStatsByBuilding).reduce((sum, s) => sum + s.available, 0)
  const totalReservedUnits = Object.values(unitStatsByBuilding).reduce((sum, s) => sum + s.reserved, 0)
  const totalSoldUnits = Object.values(unitStatsByBuilding).reduce((sum, s) => sum + s.sold, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header — نفس نمط التقارير والمبيعات والتسويق */}
        <header className="relative rounded-2xl overflow-hidden mb-8 shadow-lg border border-gray-200/90 bg-gradient-to-br from-white to-gray-50">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500 to-indigo-600 opacity-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_70%_0%,rgba(14,165,233,0.08),transparent)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-4 sm:px-5 sm:py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25 ring-1 ring-white/70">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-800 tracking-tight leading-tight">إدارة العماير</h1>
              <p className="text-xs text-gray-500 mt-0.5">قائمة العماير المسجلة في النظام</p>
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

        {/* Main Content */}
        <div className="py-8">
        {/* Search + stats */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 sm:p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <p className="text-sm font-semibold text-slate-700">
              إجمالي العماير: <span className="text-slate-900 font-bold">{buildings.length}</span>
              {searchTerm && (
                <span className="mr-2 text-slate-500">
                  (ظاهر: {filteredBuildings.length})
                </span>
              )}
              {!subscriptionLoading && planName && (
                <span className="mr-2 text-indigo-600 font-medium">
                  — خطة {planName}: {buildingsLimitLabel}
                </span>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200/90 bg-white/90 shadow-sm min-w-0">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">متاحة</span>
                <span className="text-base font-bold tabular-nums text-violet-600">{totalAvailableUnits}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200/90 bg-white/90 shadow-sm min-w-0">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">محجوزة</span>
                <span className="text-base font-bold tabular-nums text-amber-600">{totalReservedUnits}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200/90 bg-white/90 shadow-sm min-w-0">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">مباعة</span>
                <span className="text-base font-bold tabular-nums text-rose-600">{totalSoldUnits}</span>
              </div>
            </div>
          </div>

          {/* شريط إضافة + بحث — زر وبحث في صف واحد بمحاذاة الارتفاع */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-stretch">
            {(ready && can('buildings_create') && (canAddBuilding || (!subscriptionLoading && !canAddBuilding))) ? (
              <div className="flex-shrink-0 flex gap-2">
                {canAddBuilding ? (
                  <Link
                    href="/dashboard/buildings/new"
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-sm font-semibold shadow-md shadow-sky-500/20 hover:shadow-lg hover:shadow-sky-500/30 transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 min-h-[48px] border border-sky-500/20"
                  >
                    <Plus className="w-5 h-5" />
                    إضافة عمارة جديدة
                  </Link>
                ) : (
                  <Link
                    href="/subscriptions"
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 text-white text-sm font-semibold shadow-md hover:bg-amber-600 transition-all min-h-[48px] border border-amber-400/30 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
                  >
                    <Crown className="w-5 h-5" />
                    ترقية الخطة لإضافة المزيد
                  </Link>
                )}
              </div>
            ) : null}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="ابحث بالاسم، الحي، حالة البناء..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-12 pl-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100 outline-none transition min-h-[48px]"
              />
            </div>
          </div>
        </div>

        {/* Buildings Grid (Table view matching dashboard style) */}
        {loading ? (
          <PageLoadingSkeleton message="جاري التحميل..." size="md" variant="indigo" />
        ) : filteredBuildings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              {buildings.length === 0 ? 'لا توجد عمارات' : 'لم يتم العثور على عمارات'}
            </h3>
            <p className="text-gray-500 mb-6">
              {buildings.length === 0 ? 'ابدأ بإضافة عمارتك الأولى' : 'حاول البحث عن عمارة أخرى'}
            </p>
            {buildings.length === 0 && ready && can('buildings_create') && canAddBuilding && (
              <Link
                href="/dashboard/buildings/new"
                className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all"
              >
                إضافة عمارة جديدة
              </Link>
            )}
            {buildings.length === 0 && ready && can('buildings_create') && !canAddBuilding && !subscriptionLoading && (
              <Link href="/subscriptions" className="inline-block px-6 py-3 bg-amber-500 text-white rounded-2xl hover:bg-amber-600 transition font-semibold">
                ترقية الخطة لإضافة عمارة
              </Link>
            )}
            {buildings.length === 0 && ready && !can('buildings_create') && (
              <p className="text-amber-600 text-sm font-medium">ليس لديك صلاحية إضافة عمارة. تواصل مع المالك.</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-white text-slate-700 border-b border-slate-200">
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">اسم العمارة</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">الحي</th>
                      <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">حالة البناء</th>
                      <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">الأدوار</th>
                      <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">الوحدات</th>
                      <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">حالات الوحدات</th>
                      <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">الإجراءات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedBuildings.map((b) => (
                    <tr key={b.id} className="hover:bg-sky-50/40 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                            <Building2 className="w-6 h-6 text-white" />
                          </div>
                          <div className="text-right min-w-0 flex-1">
                            <div className="font-bold text-gray-900 truncate">{b.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-600">
                          {b.neighborhood || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${getBuildStatusLabel(b.build_status).className}`}>
                          {getBuildStatusLabel(b.build_status).label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-semibold text-gray-700">
                          {b.total_floors}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-semibold text-gray-700">
                          {b.total_units}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            متاحة <span className="font-bold text-emerald-700">{unitStatsByBuilding[b.id]?.available ?? 0}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            محجوزة <span className="font-bold text-amber-700">{unitStatsByBuilding[b.id]?.reserved ?? 0}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200/80 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            مباعة <span className="font-bold text-rose-700">{unitStatsByBuilding[b.id]?.sold ?? 0}</span>
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {ready && can('building_details') && (
                          <Link
                            href={`/dashboard/buildings/details?buildingId=${b.id}`}
                            className="p-2 text-blue-600 hover:text-blue-700 rounded-full hover:bg-blue-50 hover:scale-110 transform transition"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          )}

                          <Link
                            href={`/dashboard/units?buildingId=${b.id}`}
                            className="p-2 text-emerald-600 hover:text-emerald-700 rounded-full hover:bg-emerald-50 hover:scale-110 transform transition"
                            title="وحدات العمارة"
                          >
                            <Home className="w-4 h-4" />
                          </Link>

                          {ready && can('buildings_delete') && (
                          <button
                            onClick={() => openDeleteModal(b)}
                            className="p-2 text-red-600 hover:text-red-700 rounded-full hover:bg-red-50 hover:scale-110 transform transition"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span>عرض</span>
                <select
                  value={buildingsPageSize}
                  onChange={(e) => { setBuildingsPageSize(Number(e.target.value)); setBuildingsPage(1); }}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-0 transition-all duration-200"
                  aria-label="عدد الصفوف في الصفحة"
                >
                  {TABLE_PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="font-mono">
                  {((buildingsPage - 1) * buildingsPageSize + 1).toLocaleString('en')}–
                  {Math.min(buildingsPage * buildingsPageSize, displayedBuildings.length).toLocaleString('en')} من {displayedBuildings.length.toLocaleString('en')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setBuildingsPage((p) => Math.max(1, p - 1))}
                  disabled={buildingsPage <= 1}
                  className="min-w-[2.75rem] py-2 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-0"
                >
                  السابق
                </button>
                <span className="px-2 py-1.5 text-sm text-slate-600 font-mono">
                  {buildingsPage.toLocaleString('en')} / {buildingsTotalPages.toLocaleString('en')}
                </span>
                <button
                  type="button"
                  onClick={() => setBuildingsPage((p) => Math.min(buildingsTotalPages, p + 1))}
                  disabled={buildingsPage >= buildingsTotalPages}
                  className="min-w-[2.75rem] py-2 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-0"
                >
                  التالي
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isDeleteModalOpen && buildingToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200">
            <div className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">تأكيد حذف العمارة</h3>
                  <p className="text-sm text-gray-600">هذا الإجراء نهائي ولا يمكن التراجع عنه</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-red-100 bg-red-50/50 px-4 py-3 text-sm text-gray-700">
                هل أنت متأكد من حذف <span className="font-bold text-gray-900">{buildingToDelete.name}</span>؟
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
              >
                لا
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition"
              >
                نعم، حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  )
}
