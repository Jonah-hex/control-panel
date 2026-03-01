'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart3,
  Building2,
  Home,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Users,
  Gauge,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  RefreshCw,
  LayoutDashboard
} from 'lucide-react'
import { RiyalIcon } from '@/components/icons/RiyalIcon'

interface Building {
  id: string
  name: string
  neighborhood: string | null
  total_units: number
}

interface Unit {
  id: string
  building_id: string
  status: 'available' | 'reserved' | 'sold'
  price: number | null
  area: number
  rooms: number
  type: string
}

interface Stats {
  totalBuildings: number
  totalUnits: number
  availableUnits: number
  reservedUnits: number
  soldUnits: number
  totalRevenue: number
  averagePrice: number
  averageArea: number
  occupancyRate: number
  neighborhoodStats: Array<{
    neighborhood: string
    buildingsCount: number
    unitsCount: number
  }>
  unitTypeStats: Array<{
    type: string
    count: number
    percentage: number
  }>
  roomsDistribution: Array<{
    rooms: number
    count: number
  }>
}

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchStatistics()
  }, [])

  const fetchStatistics = async () => {
    try {
      setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch buildings
      const { data: buildings, error: buildingsError } = await supabase
        .from('buildings')
        .select('*')
        .eq('owner_id', user.id)

      if (buildingsError) throw buildingsError

      // Fetch units
      const buildingIds = (buildings || []).map(b => b.id)
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('*')
        .in('building_id', buildingIds)

      if (unitsError) throw unitsError

      // Calculate statistics
      const totalBuildings = buildings?.length || 0
      const totalUnits = units?.length || 0
      const availableUnits = units?.filter(u => u.status === 'available').length || 0
      const reservedUnits = units?.filter(u => u.status === 'reserved').length || 0
      const soldUnits = units?.filter(u => u.status === 'sold').length || 0

      const unitsWithPrice = units?.filter(u => u.price && u.price > 0) || []
      const totalRevenue = unitsWithPrice
        .filter(u => u.status === 'sold')
        .reduce((sum, u) => sum + (u.price || 0), 0)

      const averagePrice = unitsWithPrice.length > 0
        ? unitsWithPrice.reduce((sum, u) => sum + (u.price || 0), 0) / unitsWithPrice.length
        : 0

      const averageArea = units && units.length > 0
        ? units.reduce((sum, u) => sum + u.area, 0) / units.length
        : 0

      const occupancyRate = totalUnits > 0
        ? ((reservedUnits + soldUnits) / totalUnits) * 100
        : 0

      // Neighborhood statistics
      const neighborhoodMap = new Map<string, { buildingsCount: number; unitsCount: number }>()
      buildings?.forEach(building => {
        const neighborhood = building.neighborhood || 'غير محدد'
        const buildingUnits = units?.filter(u => u.building_id === building.id).length || 0
        
        if (neighborhoodMap.has(neighborhood)) {
          const current = neighborhoodMap.get(neighborhood)!
          neighborhoodMap.set(neighborhood, {
            buildingsCount: current.buildingsCount + 1,
            unitsCount: current.unitsCount + buildingUnits
          })
        } else {
          neighborhoodMap.set(neighborhood, {
            buildingsCount: 1,
            unitsCount: buildingUnits
          })
        }
      })

      const neighborhoodStats = Array.from(neighborhoodMap.entries())
        .map(([neighborhood, stats]) => ({
          neighborhood,
          ...stats
        }))
        .sort((a, b) => b.buildingsCount - a.buildingsCount)

      // Unit type statistics
      const typeMap = new Map<string, number>()
      units?.forEach(unit => {
        const type = unit.type || 'غير محدد'
        typeMap.set(type, (typeMap.get(type) || 0) + 1)
      })

      const unitTypeStats = Array.from(typeMap.entries())
        .map(([type, count]) => ({
          type: type === 'apartment' ? 'شقة' : type === 'studio' ? 'ملحق' : type === 'duplex' ? 'دوبلكس' : type === 'penthouse' ? 'بنتهاوس' : type,
          count,
          percentage: totalUnits > 0 ? (count / totalUnits) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count)

      // Rooms distribution
      const roomsMap = new Map<number, number>()
      units?.forEach(unit => {
        const rooms = unit.rooms || 0
        roomsMap.set(rooms, (roomsMap.get(rooms) || 0) + 1)
      })

      const roomsDistribution = Array.from(roomsMap.entries())
        .map(([rooms, count]) => ({ rooms, count }))
        .sort((a, b) => a.rooms - b.rooms)

      setStats({
        totalBuildings,
        totalUnits,
        availableUnits,
        reservedUnits,
        soldUnits,
        totalRevenue,
        averagePrice,
        averageArea,
        occupancyRate,
        neighborhoodStats,
        unitTypeStats,
        roomsDistribution
      })
    } catch (error) {
      console.error('Error fetching statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'apartment': return 'شقة'
      case 'studio': return 'ملحق'
      case 'duplex': return 'دوبلكس'
      case 'penthouse': return 'بنتهاوس'
      default: return type
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">جارٍ تحميل الإحصائيات...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-gray-600">لا توجد بيانات متاحة</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" dir="rtl">
      {/* Header */}
      <div className="bg-white/90 shadow-lg border-b-2 border-indigo-100 sticky top-0 z-20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between py-4 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
                <BarChart3 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  الإحصائيات
                </h1>
                <p className="text-xs text-gray-500">إحصائيات شاملة للعمائر والوحدات</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
              >
                <LayoutDashboard className="w-4 h-4" />
                لوحة التحكم
              </Link>
              <button
              onClick={fetchStatistics}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 text-sm font-semibold"
            >
              <RefreshCw className="w-4 h-4" />
              تحديث
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <Building2 className="w-10 h-10 opacity-90" />
              <TrendingUp className="w-5 h-5 opacity-80" />
            </div>
            <span className="text-sm font-semibold opacity-90">إجمالي العمائر</span>
            <p className="text-5xl font-black mt-2">{stats.totalBuildings}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <Home className="w-10 h-10 opacity-90" />
              <TrendingUp className="w-5 h-5 opacity-80" />
            </div>
            <span className="text-sm font-semibold opacity-90">إجمالي الوحدات</span>
            <p className="text-5xl font-black mt-2">{stats.totalUnits}</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <RiyalIcon className="w-10 h-10 opacity-90" />
              <TrendingUp className="w-5 h-5 opacity-80" />
            </div>
            <span className="text-sm font-semibold opacity-90">إجمالي الإيرادات</span>
            <p className="text-3xl font-black mt-2">{stats.totalRevenue.toLocaleString()} ر.س</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <Gauge className="w-10 h-10 opacity-90" />
              <TrendingUp className="w-5 h-5 opacity-80" />
            </div>
            <span className="text-sm font-semibold opacity-90">نسبة الإشغال</span>
            <p className="text-5xl font-black mt-2">{stats.occupancyRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Units Status Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">الوحدات المتاحة</h3>
                <p className="text-xs text-gray-500">جاهزة للبيع أو التأجير</p>
              </div>
            </div>
            <p className="text-5xl font-black text-green-700 mb-3">{stats.availableUnits}</p>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-green-600 to-green-700 h-3 rounded-full transition-all duration-500"
                style={{ width: `${stats.totalUnits > 0 ? (stats.availableUnits / stats.totalUnits) * 100 : 0}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {stats.totalUnits > 0 ? ((stats.availableUnits / stats.totalUnits) * 100).toFixed(1) : 0}% من إجمالي الوحدات
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-xl flex items-center justify-center">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">الوحدات المحجوزة</h3>
                <p className="text-xs text-gray-500">قيد الحجز</p>
              </div>
            </div>
            <p className="text-5xl font-black text-yellow-700 mb-3">{stats.reservedUnits}</p>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-yellow-600 to-yellow-700 h-3 rounded-full transition-all duration-500"
                style={{ width: `${stats.totalUnits > 0 ? (stats.reservedUnits / stats.totalUnits) * 100 : 0}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {stats.totalUnits > 0 ? ((stats.reservedUnits / stats.totalUnits) * 100).toFixed(1) : 0}% من إجمالي الوحدات
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                <XCircle className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">الوحدات المباعة</h3>
                <p className="text-xs text-gray-500">تم البيع</p>
              </div>
            </div>
            <p className="text-5xl font-black text-red-700 mb-3">{stats.soldUnits}</p>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-red-600 to-red-700 h-3 rounded-full transition-all duration-500"
                style={{ width: `${stats.totalUnits > 0 ? (stats.soldUnits / stats.totalUnits) * 100 : 0}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {stats.totalUnits > 0 ? ((stats.soldUnits / stats.totalUnits) * 100).toFixed(1) : 0}% من إجمالي الوحدات
            </p>
          </div>
        </div>

        {/* Averages */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-xl flex items-center justify-center">
                <RiyalIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">متوسط سعر الوحدة</h3>
                <p className="text-xs text-gray-500">المتوسط الحسابي</p>
              </div>
            </div>
            <p className="text-4xl font-black text-cyan-700">{stats.averagePrice.toLocaleString()} ر.س</p>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-600 to-pink-700 rounded-xl flex items-center justify-center">
                <Home className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">متوسط مساحة الوحدة</h3>
                <p className="text-xs text-gray-500">المتوسط الحسابي</p>
              </div>
            </div>
            <p className="text-4xl font-black text-pink-700">{stats.averageArea.toFixed(1)} م²</p>
          </div>
        </div>

        {/* Neighborhood Distribution */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-6">
            <div className="flex items-center gap-3">
              <MapPin className="w-6 h-6" />
              <h2 className="text-xl font-bold">التوزيع حسب الأحياء</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats.neighborhoodStats.map((neighborhood, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-100 hover:shadow-lg transition-all">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-800">{neighborhood.neighborhood}</span>
                      <span className="text-sm text-gray-600">{neighborhood.buildingsCount} عمارة • {neighborhood.unitsCount} وحدة</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 h-3 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${stats.totalBuildings > 0 ? (neighborhood.buildingsCount / stats.totalBuildings) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {stats.totalBuildings > 0 ? ((neighborhood.buildingsCount / stats.totalBuildings) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Unit Type Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
              <div className="flex items-center gap-3">
                <Home className="w-6 h-6" />
                <h2 className="text-xl font-bold">التوزيع حسب نوع الوحدة</h2>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {stats.unitTypeStats.map((typeData, index) => (
                <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-800">{getTypeText(typeData.type)}</span>
                    <span className="text-sm text-gray-600">{typeData.count} وحدة</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${typeData.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{typeData.percentage.toFixed(1)}%</p>
                </div>
              ))}
            </div>
          </div>

          {/* Rooms Distribution */}
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6">
              <div className="flex items-center gap-3">
                <Home className="w-6 h-6" />
                <h2 className="text-xl font-bold">التوزيع حسب عدد الغرف</h2>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {stats.roomsDistribution.map((roomData, index) => (
                <div key={index} className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-800">{roomData.rooms} {roomData.rooms === 1 ? 'غرفة' : 'غرف'}</span>
                    <span className="text-sm text-gray-600">{roomData.count} وحدة</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 h-3 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${stats.totalUnits > 0 ? (roomData.count / stats.totalUnits) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {stats.totalUnits > 0 ? ((roomData.count / stats.totalUnits) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
