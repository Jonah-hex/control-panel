'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { showToast } from '@/app/dashboard/buildings/details/toast'
import { 
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  Home,
  Search,
  ShoppingCart,
  Filter,
  RefreshCw,
  Edit,
  X,
  Maximize2,
  Bed,
  Bath,
  Sofa,
  UtensilsCrossed,
  User,
  Wind,
  BadgeCheck,
  FileText,
  Zap,
  DoorOpen,
  LayoutDashboard
} from 'lucide-react'
import { RiyalIcon } from '@/components/icons/RiyalIcon'
import { UnitStatusBadge } from '@/components/UnitStatusBadge'

interface Building {
  id: string
  name: string
  plot_number: string
  neighborhood?: string | null
  total_units: number
}

interface Unit {
  id: string
  building_id: string
  unit_number: string
  floor: number
  status: 'available' | 'reserved' | 'sold'
  type: string
  facing?: 'front' | 'back' | 'corner'
  price?: number
  area?: number
  rooms?: number
  bathrooms?: number
  living_rooms?: number
  kitchens?: number
  maid_room?: boolean
  driver_room?: boolean
  ac_type?: string
  description?: string | null
  building?: Building
  electricity_meter_number?: string | null
  entrances?: number
}

function UnitsFilterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const buildingIdFromUrl = searchParams.get('buildingId')
  
  const [buildings, setBuildings] = useState<Building[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'reserved' | 'sold'>('all')
  const [facingFilter, setFacingFilter] = useState<'all' | 'front' | 'back'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'apartment' | 'studio'>('all')
  const [filtersInitialized, setFiltersInitialized] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const TABLE_PAGE_SIZES = [10, 18, 25, 50, 100] as const
  const [unitsPage, setUnitsPage] = useState(1)
  const [unitsPageSize, setUnitsPageSize] = useState(18)

  const supabase = createClient()
  const { can, ready, effectiveOwnerId } = useDashboardAuth()

  useEffect(() => {
    if (!ready) return
    if (!can('units')) {
      showToast('ليس لديك صلاحية معاينة الوحدات.', 'error')
      router.replace('/dashboard')
    }
  }, [ready, can, router])

  useEffect(() => {
    // Real-time subscription للوحدات
    const unitsChannel = supabase
      .channel('units-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'units'
        },
        () => {
          fetchData()
        }
      )
      .subscribe()

    // Real-time subscription للعماير
    const buildingsChannel = supabase
      .channel('buildings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buildings'
        },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(unitsChannel)
      supabase.removeChannel(buildingsChannel)
    }
  }, [])

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    const status = search.get('status')
    const facing = search.get('facing')
    const type = search.get('type')

    if (status === 'available' || status === 'reserved' || status === 'sold') {
      setStatusFilter(status)
    } else {
      setStatusFilter('all')
    }

    if (facing === 'front' || facing === 'back') {
      setFacingFilter(facing)
    } else {
      setFacingFilter('all')
    }

    if (type === 'apartment' || type === 'studio') {
      setTypeFilter(type)
    } else {
      setTypeFilter('all')
    }

    setFiltersInitialized(true)
  }, [])

  // إعادة جلب الوحدات عند تغيير العمارة من الرابط (مثلاً بعد الضغط على "عرض كل الوحدات")
  useEffect(() => {
    if (!filtersInitialized || !effectiveOwnerId) return
    fetchData()
  }, [filtersInitialized, buildingIdFromUrl, effectiveOwnerId])

  useEffect(() => {
    if (!filtersInitialized) return

    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (facingFilter !== 'all') params.set('facing', facingFilter)
    if (typeFilter !== 'all') params.set('type', typeFilter)
    if (buildingIdFromUrl) params.set('buildingId', buildingIdFromUrl)

    const queryString = params.toString()
    const query = queryString ? `/dashboard/units?${queryString}` : '/dashboard/units'
    router.replace(query)
  }, [statusFilter, facingFilter, typeFilter, buildingIdFromUrl, router, filtersInitialized])

  const fetchData = async () => {
    const ownerId = effectiveOwnerId
    if (!ownerId) return
    try {
      setLoading(true)
      setErrorMsg(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setErrorMsg('يجب تسجيل الدخول للوصول إلى الوحدات. سيتم تحويلك لصفحة الدخول.')
        router.push('/login')
        return
      }

      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })

      if (buildingsError) throw buildingsError

      let buildingIds = (buildingsData || []).map(b => b.id)

      // إذا وُجد buildingId في الرابط وكان من عماير المستخدم، نعرض وحدات هذه العمارة فقط
      const buildingIdParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('buildingId') : null
      if (buildingIdParam && buildingIds.includes(buildingIdParam)) {
        buildingIds = [buildingIdParam]
      }

      // جلب الوحدات المرتبطة بعماير المستخدم فقط والمطابقة للفلتر
      if (buildingIds.length > 0) {
        const { data: unitsData, error: unitsError } = await supabase
          .from('units')
          .select('*')
          .in('building_id', buildingIds)
          .order('floor', { ascending: true })
          .order('unit_number', { ascending: true })

        if (unitsError) throw unitsError

        const buildingMap = new Map((buildingsData || []).map((building) => [building.id, building]))
        const merged = (unitsData || []).map((unit) => ({
          ...unit,
          building: buildingMap.get(unit.building_id),
        }))
        const mergedUnits = [...merged].sort((a, b) => {
          const fA = Number(a.floor) ?? 0;
          const fB = Number(b.floor) ?? 0;
          if (fA !== fB) return fA - fB;
          const uA = Number(a.unit_number) || 0;
          const uB = Number(b.unit_number) || 0;
          return uA - uB;
        })

        setUnits(mergedUnits)
      } else {
        setUnits([])
      }

      setBuildings(buildingsData || [])
    } catch (error: any) {
      setErrorMsg('حدث خطأ غير متوقع أثناء تحميل البيانات. يمكنك إعادة المحاولة أو العودة للوحة التحكم.')
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUnits = useMemo(() => {
    return units.filter((unit) => {
      const statusMatches = statusFilter === 'all' || unit.status === statusFilter
      const facingMatches = facingFilter === 'all' || unit.facing === facingFilter
      const typeMatches = typeFilter === 'all' || unit.type === typeFilter
      const term = searchTerm.trim().toLowerCase()
      const termDigits = searchTerm.trim().replace(/,/g, '')
      const searchMatches =
        term.length === 0 ||
        unit.unit_number?.toLowerCase().includes(term) ||
        unit.building?.name?.toLowerCase().includes(term) ||
        (unit.price != null && termDigits !== '' && String(unit.price).includes(termDigits))
      return statusMatches && facingMatches && typeMatches && searchMatches
    })
  }, [units, statusFilter, facingFilter, typeFilter, searchTerm])

  const unitsTotalPages = Math.max(1, Math.ceil(filteredUnits.length / unitsPageSize))
  const paginatedUnits = useMemo(
    () => filteredUnits.slice((unitsPage - 1) * unitsPageSize, unitsPage * unitsPageSize),
    [filteredUnits, unitsPage, unitsPageSize]
  )
  useEffect(() => {
    if (unitsPage > unitsTotalPages && unitsTotalPages >= 1) setUnitsPage(1)
  }, [unitsPage, unitsTotalPages])

  const totalUnits = units.length
  const availableUnits = units.filter((unit) => unit.status === 'available').length
  const reservedUnits = units.filter((unit) => unit.status === 'reserved').length
  const soldUnits = units.filter((unit) => unit.status === 'sold').length

  const exportToCSV = () => {
    if (filteredUnits.length === 0) return

    const headers = [
      'رقم الوحدة',
      'العمارة',
      'اتجاه الشقة',
      'رقم القطعة',
      'الدور',
      'النوع',
      'المساحة',
      'الغرف',
      'الحمامات',
      'السعر',
      'الحالة'
    ]

    const rows = filteredUnits.map((unit) => [
      unit.unit_number || '-',
      unit.building?.name || '-',
      facingLabel(unit.facing),
      unit.building?.plot_number || '-',
      unit.floor ?? '-',
      unit.type || '-',
      unit.area ?? '-',
      unit.rooms ?? '-',
      unit.bathrooms ?? '-',
      unit.price ?? '-',
      unit.status === 'available' ? 'متاحة' : unit.status === 'reserved' ? 'محجوزة' : 'مباعة'
    ])

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `units-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const statusLabel = (status: Unit['status']) => {
    if (status === 'available') return 'متاحة'
    if (status === 'reserved') return 'محجوزة'
    return 'مباعة'
  }

  const typeLabel = (type: string) => {
    if (type === 'apartment') return 'شقة'
    if (type === 'studio') return 'ملحق'
    if (type === 'duplex') return 'دوبلكس'
    if (type === 'penthouse') return 'بنتهاوس'
    return type || '—'
  }

  const facingLabel = (facing: string | undefined) => {
    if (facing === 'front') return 'أمامية'
    if (facing === 'back') return 'خلفية'
    if (facing === 'corner') return 'على شارعين'
    return facing || '—'
  }

  const acTypeLabel = (ac: string | undefined) => {
    if (ac === 'split') return 'سبلت'
    if (ac === 'window') return 'شباك'
    if (ac === 'splitWindow') return 'سبلت + شباك'
    if (ac === 'central') return 'مركزي'
    if (ac === 'none') return 'لا يوجد'
    return ac || '—'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-200 max-w-md mx-auto">
          <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-10 h-10 text-rose-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">حدث خطأ غير متوقع</h3>
          <p className="text-gray-600 mb-6">{errorMsg}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
            >
              إعادة المحاولة
            </button>
            <Link
              href="/dashboard"
              className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
            >
              <LayoutDashboard className="w-4 h-4" />
              العودة للوحة التحكم
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* هيدر — نفس مقاس ونمط إدارة العماير */}
        <header className="relative rounded-2xl overflow-hidden mb-8 shadow-lg border border-gray-200/90 bg-gradient-to-br from-white to-gray-50">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 opacity-10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_70%_0%,rgba(20,184,166,0.08),transparent)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-4 sm:px-5 sm:py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25 ring-1 ring-white/70">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-800 tracking-tight leading-tight">
                  {buildingIdFromUrl
                    ? `وحدات عمارة: ${buildings.find(b => b.id === buildingIdFromUrl)?.name ?? '—'}`
                    : 'إدارة الوحدات'}
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  {buildingIdFromUrl
                    ? 'عرض ومعاينة وتعديل وحدات هذه العمارة'
                    : 'عرض شامل للوحدات مع الفلترة'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
              <Link
                href="/dashboard/buildings"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
              >
                <Building2 className="w-4 h-4" />
                قائمة العماير
              </Link>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Home className="w-7 h-7" />
              <span className="text-sm">إجمالي الوحدات</span>
            </div>
            <p className="text-3xl font-black">{totalUnits}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-7 h-7" />
              <span className="text-sm">الوحدات المتاحة</span>
            </div>
            <p className="text-3xl font-black">{availableUnits}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-7 h-7" />
              <span className="text-sm">الوحدات المحجوزة</span>
            </div>
            <p className="text-3xl font-black">{reservedUnits}</p>
          </div>
          <div className="bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <ShoppingCart className="w-7 h-7" />
              <span className="text-sm">الوحدات المباعة</span>
            </div>
            <p className="text-3xl font-black">{soldUnits}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-800">البحث والفلترة</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث باسم العمارة أو السعر"
                value={
                  (() => {
                    const digitsOnly = searchTerm.replace(/,/g, '')
                    if (digitsOnly === '' || !/^\d+$/.test(digitsOnly)) return searchTerm
                    return Number(digitsOnly).toLocaleString('en')
                  })()
                }
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, '')
                  if (raw === '' || /^\d*$/.test(raw)) setSearchTerm(raw)
                  else setSearchTerm(e.target.value)
                }}
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <select
              value={facingFilter}
              onChange={(e) => setFacingFilter(e.target.value as 'all' | 'front' | 'back')}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">كل الاتجاهات</option>
              <option value="front">أمامية</option>
              <option value="back">خلفية</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'apartment' | 'studio')}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">كل الأنواع</option>
              <option value="apartment">شقة</option>
              <option value="studio">ملحق</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'available' | 'reserved' | 'sold')}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">كل الحالات</option>
              <option value="available">متاحة</option>
              <option value="reserved">محجوزة</option>
              <option value="sold">مباعة</option>
            </select>
          </div>
        </div>

        {filteredUnits.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-right px-4 py-4 font-bold text-gray-700 min-w-[180px]">العمارة</th>
                    <th className="text-center px-4 py-4 font-bold text-gray-700">رقم الوحدة</th>
                    <th className="text-center px-4 py-4 font-bold text-gray-700">الدور</th>
                    <th className="text-center px-4 py-4 font-bold text-gray-700">النوع</th>
                    <th className="text-center px-4 py-4 font-bold text-gray-700 min-w-[120px] whitespace-nowrap">اتجاه الشقة</th>
                    <th className="text-center px-4 py-4 font-bold text-gray-700">المساحة</th>
                    <th className="text-center px-4 py-4 font-bold text-gray-700">الغرف</th>
                    <th className="text-center px-4 py-4 font-bold text-gray-700">الحمامات</th>
                    <th className="text-center px-4 py-4 font-bold text-gray-700">السعر</th>
                    <th className="text-center px-4 py-4 font-bold text-gray-700">الحالة</th>
                    {can('units_edit') && (
                      <th className="text-center px-4 py-4 font-bold text-gray-700">إجراءات التعديل</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedUnits.map((unit, index) => (
                    <tr
                      key={unit.id}
                      onClick={() => setSelectedUnit(unit)}
                      className="border-b border-gray-100 hover:bg-emerald-50/40 transition-colors cursor-pointer"
                      data-seq={(unitsPage - 1) * unitsPageSize + index + 1}
                    >
                      <td className="px-4 py-4 text-right min-w-[180px]" onClick={(e) => e.stopPropagation()}>
                        <Link href={can('building_details') ? `/dashboard/buildings/details?buildingId=${unit.building_id}` : `/dashboard/buildings`} className="text-emerald-700 hover:underline font-semibold">
                          {unit.building?.name || '-'}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-center font-semibold text-gray-900">{unit.unit_number || '-'}</td>
                      <td className="px-4 py-4 text-center">{unit.floor ?? '-'}</td>
                      <td className="px-4 py-4 text-center">{unit.type === 'apartment' ? 'شقة' : unit.type === 'studio' ? 'ملحق' : unit.type === 'duplex' ? 'دوبلكس' : unit.type === 'penthouse' ? 'بنتهاوس' : unit.type || '-'}</td>
                      <td className="px-4 py-4 text-center min-w-[120px]">{facingLabel(unit.facing)}</td>
                      <td className="px-4 py-4 text-center">{unit.area ? `${unit.area} م²` : '-'}</td>
                      <td className="px-4 py-4 text-center">{unit.rooms ?? '-'}</td>
                      <td className="px-4 py-4 text-center">{unit.bathrooms ?? '-'}</td>
                      <td className="px-4 py-4 text-center font-semibold text-gray-800">
                        {unit.price ? `${Number(unit.price).toLocaleString('en')} ر.س` : '-'}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <UnitStatusBadge status={unit.status} />
                      </td>
                      {can('units_edit') && (
                      <td className="px-4 py-4 text-center align-middle flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/dashboard/units/edit?unitId=${unit.id}`}
                          className="flex items-center justify-center w-9 h-9 text-indigo-600 hover:text-white bg-white hover:bg-indigo-600 rounded-full shadow transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          title="تعديل الوحدة"
                        >
                          <Edit className="w-5 h-5" />
                        </Link>
                      </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span>عرض</span>
                <select
                  value={unitsPageSize}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (TABLE_PAGE_SIZES.includes(n)) {
                      setUnitsPageSize(n)
                      setUnitsPage(1)
                    }
                  }}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-0 transition-all duration-200 min-w-[4.5rem]"
                  aria-label="عدد الصفوف في الصفحة"
                >
                  {TABLE_PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span className="font-mono">
                  {((unitsPage - 1) * unitsPageSize + 1).toLocaleString('en')}–
                  {Math.min(unitsPage * unitsPageSize, filteredUnits.length).toLocaleString('en')} من {filteredUnits.length.toLocaleString('en')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setUnitsPage((p) => Math.max(1, p - 1))}
                  disabled={unitsPage <= 1}
                  className="min-w-[2.75rem] py-2 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-0"
                >
                  السابق
                </button>
                <span className="px-2 py-1.5 text-sm text-slate-600 font-mono">
                  {unitsPage.toLocaleString('en')} / {unitsTotalPages.toLocaleString('en')}
                </span>
                <button
                  type="button"
                  onClick={() => setUnitsPage((p) => Math.min(unitsTotalPages, p + 1))}
                  disabled={unitsPage >= unitsTotalPages}
                  className="min-w-[2.75rem] py-2 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-0"
                >
                  التالي
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">لا توجد نتائج</h3>
            <p className="text-gray-600 mb-6">لم يتم العثور على وحدات تطابق معايير البحث الحالية</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                }}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
              >
                إعادة تعيين البحث
              </button>
              <Link
                href="/dashboard/buildings"
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
              >
                قائمة العماير
              </Link>
            </div>
          </div>
        )}
      </div>

      {selectedUnit && (
        <div
          className="dashboard-modal-overlay items-start justify-center overflow-y-auto py-6 sm:py-10 sm:items-center min-h-0"
          onClick={() => setSelectedUnit(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="unit-preview-title"
        >
            <div
              className="bg-white rounded-3xl shadow-2xl border-2 border-emerald-200/30 w-full max-w-2xl max-h-[min(90vh,calc(100dvh-3rem))] flex flex-col overflow-hidden sm:my-0 shrink-0"
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
            >
              <div className="shrink-0 z-10 bg-gradient-to-br from-emerald-500 to-teal-500 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                <h2 id="unit-preview-title" className="text-xl font-bold text-white">
                  معاينة الوحدة — {selectedUnit.unit_number}
                  {selectedUnit.building?.name && (
                    <span className="block text-sm font-normal text-emerald-100 mt-0.5">
                      {selectedUnit.building.name} — الدور {selectedUnit.floor}
                    </span>
                  )}
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedUnit(null)}
                  className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition shrink-0"
                  aria-label="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 bg-gradient-to-b from-white to-gray-50 space-y-6 border-t-2 border-gray-200 overflow-y-auto overflow-x-hidden dashboard-modal-scroll dashboard-modal-scroll-gutter-auto max-h-[calc(90vh-5.75rem)] rounded-b-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                      <Maximize2 className="w-4 h-4 text-blue-500/70" />
                      المساحة (م²)
                    </span>
                    <p className="text-gray-900 font-semibold">{selectedUnit.area != null ? selectedUnit.area : '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                      <RiyalIcon className="w-4 h-4 text-green-500/70" />
                      السعر (ر.س)
                    </span>
                    <p className="text-gray-900 font-semibold">
                      {selectedUnit.price != null ? Number(selectedUnit.price).toLocaleString('en') : '—'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500">نوع الوحدة</span>
                    <p className="text-gray-900 font-medium">{typeLabel(selectedUnit.type)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500">اتجاه الوحدة</span>
                    <p className="text-gray-900 font-medium">{facingLabel(selectedUnit.facing)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                      <Bed className="w-4 h-4 text-red-500/70" />
                      عدد الغرف
                    </span>
                    <p className="text-gray-900 font-semibold">{selectedUnit.rooms ?? '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                      <Bath className="w-4 h-4 text-cyan-500/70" />
                      عدد الحمامات
                    </span>
                    <p className="text-gray-900 font-semibold">{selectedUnit.bathrooms ?? '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                      <Sofa className="w-4 h-4 text-amber-500/70" />
                      صالات
                    </span>
                    <p className="text-gray-900 font-semibold">{selectedUnit.living_rooms ?? '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                      <UtensilsCrossed className="w-4 h-4 text-orange-500/70" />
                      مطابخ
                    </span>
                    <p className="text-gray-900 font-semibold">{selectedUnit.kitchens ?? '—'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                      <User className="w-4 h-4 text-indigo-500/70" />
                      غرفة خادمة
                    </span>
                    <p className="text-gray-900 font-medium">{selectedUnit.maid_room ? 'يوجد' : 'لا يوجد'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                      <User className="w-4 h-4 text-pink-500/70" />
                      غرفة سائق
                    </span>
                    <p className="text-gray-900 font-medium">{selectedUnit.driver_room ? 'يوجد' : 'لا يوجد'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                      <Wind className="w-4 h-4 text-sky-500/70" />
                      التكييف
                    </span>
                    <p className="text-gray-900 font-medium">{acTypeLabel(selectedUnit.ac_type)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                      <DoorOpen className="w-4 h-4 text-orange-500/70" />
                      عدد المداخل
                    </span>
                    <p className="text-gray-900 font-medium">{selectedUnit.entrances != null ? selectedUnit.entrances : '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                      <Zap className="w-4 h-4 text-amber-500/70" />
                      رقم عداد الكهرباء
                    </span>
                    <p className="text-gray-900 font-medium font-mono">
                      {selectedUnit.electricity_meter_number?.trim() || '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-emerald-500/70" />
                  <span className="text-xs font-semibold text-gray-500">حالة الوحدة</span>
                  <UnitStatusBadge status={selectedUnit.status} />
                </div>
                {selectedUnit.description && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      الوصف
                    </span>
                    <p className="text-gray-700 text-sm">{selectedUnit.description}</p>
                  </div>
                )}
                <div className="pt-4 flex justify-start gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedUnit(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold text-sm"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
        </div>
      )}
  </div>
  )
}

export default function UnitsFilterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>}>
      <UnitsFilterContent />
    </Suspense>
  )
}
