'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  RefreshCw
} from 'lucide-react'

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
  price?: number
  area?: number
  rooms?: number
  bathrooms?: number
  building?: Building
}

export default function UnitsFilterPage() {
  const router = useRouter()
  
  const [buildings, setBuildings] = useState<Building[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'reserved' | 'sold'>('all')
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all')
  const [filtersInitialized, setFiltersInitialized] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    fetchData()
    
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
    const buildingId = search.get('buildingId')

    if (status === 'available' || status === 'reserved' || status === 'sold') {
      setStatusFilter(status)
    } else {
      setStatusFilter('all')
    }

    if (buildingId && buildingId.trim()) {
      setSelectedBuildingId(buildingId)
    } else {
      setSelectedBuildingId('all')
    }

    setFiltersInitialized(true)
  }, [])

  useEffect(() => {
    if (!filtersInitialized) return

    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (selectedBuildingId !== 'all') params.set('buildingId', selectedBuildingId)

    const queryString = params.toString()
    const query = queryString ? `/dashboard/units?${queryString}` : '/dashboard/units'
    router.replace(query)
  }, [statusFilter, selectedBuildingId, router, filtersInitialized])

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // جلب العماير الخاصة بالمستخدم
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (buildingsError) throw buildingsError

      const buildingIds = (buildingsData || []).map(b => b.id)

      // جلب الوحدات المرتبطة بعماير المستخدم فقط والمطابقة للفلتر
      if (buildingIds.length > 0) {
        const { data: unitsData, error: unitsError } = await supabase
          .from('units')
          .select('*')
          .in('building_id', buildingIds)
          .order('unit_number', { ascending: true })

        if (unitsError) throw unitsError

        const buildingMap = new Map((buildingsData || []).map((building) => [building.id, building]))
        const mergedUnits = (unitsData || []).map((unit) => ({
          ...unit,
          building: buildingMap.get(unit.building_id),
        }))

        setUnits(mergedUnits)
      } else {
        setUnits([])
      }

      setBuildings(buildingsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const scopedUnits = selectedBuildingId === 'all'
    ? units
    : units.filter((unit) => unit.building_id === selectedBuildingId)

  const filteredUnits = scopedUnits.filter((unit) => {
    const statusMatches = statusFilter === 'all' || unit.status === statusFilter
    const term = searchTerm.trim().toLowerCase()
    const searchMatches =
      term.length === 0 ||
      unit.unit_number?.toLowerCase().includes(term) ||
      unit.building?.name?.toLowerCase().includes(term) ||
      unit.building?.plot_number?.toLowerCase().includes(term) ||
      unit.building?.neighborhood?.toLowerCase().includes(term)

    return statusMatches && searchMatches
  })

  const totalUnits = scopedUnits.length
  const availableUnits = scopedUnits.filter((unit) => unit.status === 'available').length
  const reservedUnits = scopedUnits.filter((unit) => unit.status === 'reserved').length
  const soldUnits = scopedUnits.filter((unit) => unit.status === 'sold').length
  const selectedBuilding = buildings.find((building) => building.id === selectedBuildingId)

  const exportToCSV = () => {
    if (filteredUnits.length === 0) return

    const headers = [
      'رقم الوحدة',
      'العمارة',
      'الحي',
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
      unit.building?.neighborhood || '-',
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

  const statusBadge = (status: Unit['status']) => {
    if (status === 'available') return 'bg-purple-100 text-purple-700'
    if (status === 'reserved') return 'bg-amber-100 text-amber-700'
    return 'bg-rose-100 text-rose-700'
  }

  const statusLabel = (status: Unit['status']) => {
    if (status === 'available') return 'متاحة'
    if (status === 'reserved') return 'محجوزة'
    return 'مباعة'
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-emerald-50 border-b border-emerald-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg">
                <Home className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-emerald-700">إدارة الوحدات</h1>
                <p className="text-gray-600 text-sm mt-1">
                  عرض شامل للوحدات مع الفلترة والتصدير
                  {selectedBuilding ? ` • ${selectedBuilding.name}` : ''}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-3 bg-white text-gray-700 rounded-xl hover:shadow-lg transition-all border border-gray-200"
              >
                <RefreshCw className="w-4 h-4" />
                تحديث
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg transition-all"
              >
                <Download className="w-4 h-4" />
                تصدير CSV
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 px-6 py-3 bg-white text-emerald-700 rounded-xl hover:shadow-lg transition-all font-semibold border-2 border-emerald-200"
              >
                <ArrowRight className="w-5 h-5" />
                رجوع للوحة التحكم
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                placeholder="ابحث برقم الوحدة / اسم العمارة / رقم القطعة / الحي"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'available' | 'reserved' | 'sold')}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">كل الحالات</option>
              <option value="available">متاحة</option>
              <option value="reserved">محجوزة</option>
              <option value="sold">مباعة</option>
            </select>

            <select
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">كل العمائر</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name} - قطعة {building.plot_number}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setSelectedBuildingId('all')
              }}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
            >
              إعادة تعيين الفلاتر
            </button>
          </div>
        </div>

        {filteredUnits.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-right px-4 py-4 font-bold text-gray-700">رقم الوحدة</th>
                    <th className="text-right px-4 py-4 font-bold text-gray-700">العمارة</th>
                    <th className="text-right px-4 py-4 font-bold text-gray-700">الحي</th>
                    <th className="text-right px-4 py-4 font-bold text-gray-700">الدور</th>
                    <th className="text-right px-4 py-4 font-bold text-gray-700">النوع</th>
                    <th className="text-right px-4 py-4 font-bold text-gray-700">المساحة</th>
                    <th className="text-right px-4 py-4 font-bold text-gray-700">الغرف</th>
                    <th className="text-right px-4 py-4 font-bold text-gray-700">الحمامات</th>
                    <th className="text-right px-4 py-4 font-bold text-gray-700">السعر</th>
                    <th className="text-right px-4 py-4 font-bold text-gray-700">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnits.map((unit) => (
                    <tr key={unit.id} className="border-b border-gray-100 hover:bg-emerald-50/40 transition-colors">
                      <td className="px-4 py-4 font-semibold text-gray-900">{unit.unit_number || '-'}</td>
                      <td className="px-4 py-4">
                        <Link href={`/dashboard/buildings/${unit.building_id}`} className="text-emerald-700 hover:underline font-semibold">
                          {unit.building?.name || '-'}
                        </Link>
                        <div className="text-xs text-gray-500">قطعة: {unit.building?.plot_number || '-'}</div>
                      </td>
                      <td className="px-4 py-4">{unit.building?.neighborhood || '-'}</td>
                      <td className="px-4 py-4">{unit.floor ?? '-'}</td>
                      <td className="px-4 py-4">{unit.type || '-'}</td>
                      <td className="px-4 py-4">{unit.area ? `${unit.area} م²` : '-'}</td>
                      <td className="px-4 py-4">{unit.rooms ?? '-'}</td>
                      <td className="px-4 py-4">{unit.bathrooms ?? '-'}</td>
                      <td className="px-4 py-4 font-semibold text-gray-800">
                        {unit.price ? `${unit.price.toLocaleString('ar-SA')} ر.س` : '-'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${statusBadge(unit.status)}`}>
                          {statusLabel(unit.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                إدارة العماير
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
