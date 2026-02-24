'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, ArrowLeft, Building2, MapPin, Home, Search, Trash2, Eye, Crown } from 'lucide-react'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { useSubscription } from '@/hooks/useSubscription'

interface Building {
  id: string
  name: string
  plot_number: string
  neighborhood?: string
  address?: string | null
  phone?: string | null
  build_status?: 'ready' | 'under_construction' | 'old' | null
  year_built?: number | null
  total_units: number
  total_floors: number
  owner_id: string
  created_at: string
}

interface UnitStatusRow {
  building_id: string
  status: 'available' | 'reserved' | 'sold'
}

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [buildingToDelete, setBuildingToDelete] = useState<Building | null>(null)
  const [unitStatsByBuilding, setUnitStatsByBuilding] = useState<Record<string, { available: number; reserved: number; sold: number }>>({})
  const supabase = createClient()
  const { effectiveOwnerId, can, ready } = useDashboardAuth()
  const { planName, canAddBuilding, buildingsLimitLabel, loading: subscriptionLoading } = useSubscription()

  useEffect(() => {
    if (effectiveOwnerId) fetchBuildings()
    else if (ready) setLoading(false)
  }, [effectiveOwnerId, ready])

  const fetchBuildings = async () => {
    const ownerId = effectiveOwnerId
    if (!ownerId) return
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setBuildings(data || [])

      const buildingIds = (data || []).map((building) => building.id)
      if (buildingIds.length > 0) {
        const { data: unitRows, error: unitsError } = await supabase
          .from('units')
          .select('building_id,status')
          .in('building_id', buildingIds)

        if (unitsError) throw unitsError

        const stats = (unitRows || []).reduce((acc: Record<string, { available: number; reserved: number; sold: number }>, row: UnitStatusRow) => {
          if (!acc[row.building_id]) {
            acc[row.building_id] = { available: 0, reserved: 0, sold: 0 }
          }

          if (row.status === 'available') acc[row.building_id].available += 1
          else if (row.status === 'reserved') acc[row.building_id].reserved += 1
          else if (row.status === 'sold') acc[row.building_id].sold += 1

          return acc
        }, {})

        setUnitStatsByBuilding(stats)
      } else {
        setUnitStatsByBuilding({})
      }
    } catch (error) {
      console.error('Error fetching buildings:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteBuilding = async (buildingId: string) => {
    try {
      const { error } = await supabase
        .from('buildings')
        .delete()
        .eq('id', buildingId)

      if (error) throw error
      
      setBuildings(buildings.filter(b => b.id !== buildingId))
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
  const displayedBuildings = [...filteredBuildings].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      {/* Header - refined elegant style */}
      <div className="sticky top-0 z-20">
        <div className="backdrop-blur bg-gradient-to-r from-white/70 to-white/60 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center shadow-xl text-white">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900">العماير</h1>
                  <p className="text-sm text-slate-500">قائمة العماير المسجلة في النظام</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-3 px-4 py-2 bg-white/80 border-2 border-slate-200 text-slate-700 rounded-full hover:border-purple-300 hover:bg-slate-50 shadow-sm hover:shadow-md transform transition hover:-translate-y-0.5"
                >
                  <span className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                    <ArrowLeft className="w-4 h-4 text-slate-700" />
                  </span>
                  <span className="text-sm font-semibold">لوحة التحكم</span>
                </Link>

                {ready && can('buildings_create') && canAddBuilding && (
                  <Link
                    href="/dashboard/buildings/new"
                    className="inline-flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-slate-800/90 via-purple-800/90 to-slate-800/90 backdrop-blur-sm text-white rounded-full shadow-xl hover:shadow-2xl transform transition hover:-translate-y-0.5"
                  >
                    <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-white" />
                    </span>
                    <span className="text-sm font-semibold">إضافة عمارة جديدة</span>
                  </Link>
                )}
                {ready && can('buildings_create') && !subscriptionLoading && !canAddBuilding && (
                  <Link
                    href="/subscriptions"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/90 text-white rounded-full shadow-lg hover:bg-amber-600 transition text-sm font-semibold"
                  >
                    <Crown className="w-4 h-4" />
                    ترقية الخطة لإضافة المزيد
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-600">
              إجمالي العماير: <span className="text-slate-600 font-bold">{buildings.length}</span>
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
          </div>
          <div className="relative">
            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث بالاسم، الحي، حالة البناء..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-12 pl-4 py-3 bg-white border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
            />
          </div>
        </div>

        {/* Buildings Grid (Table view matching dashboard style) */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600 mt-4">جاري التحميل...</p>
          </div>
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
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-white text-slate-700 border-b border-gray-200">
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
                  {displayedBuildings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
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
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700">
                            متاحة: {unitStatsByBuilding[b.id]?.available || 0}
                          </span>
                          <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">
                            محجوزة: {unitStatsByBuilding[b.id]?.reserved || 0}
                          </span>
                          <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700">
                            مباعة: {unitStatsByBuilding[b.id]?.sold || 0}
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
  )
}
