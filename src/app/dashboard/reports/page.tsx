'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  FileText,
  Building2,
  Home,
  ArrowLeft,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  BarChart3,
  Printer,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Percent
} from 'lucide-react'

interface Building {
  id: string
  name: string
  plot_number: string
  neighborhood: string | null
  total_units: number
  total_floors: number
}

interface Unit {
  id: string
  building_id: string
  status: 'available' | 'reserved' | 'sold'
  price: number | null
  area: number
  rooms: number
}

interface ReportData {
  totalBuildings: number
  totalUnits: number
  availableUnits: number
  reservedUnits: number
  soldUnits: number
  totalRevenue: number
  averagePrice: number
  averageArea: number
  occupancyRate: number
  buildingsData: Array<{
    building: Building
    units: Unit[]
    stats: {
      total: number
      available: number
      reserved: number
      sold: number
      revenue: number
      occupancyRate: number
    }
  }>
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'month' | 'quarter' | 'year'>('all')

  const supabase = createClient()

  useEffect(() => {
    fetchReportData()
  }, [selectedPeriod])

  const fetchReportData = async () => {
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

      // Fetch all units
      const buildingIds = (buildings || []).map(b => b.id)
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('*')
        .in('building_id', buildingIds)

      if (unitsError) throw unitsError

      // Calculate statistics
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

      // Calculate per-building statistics
      const buildingsData = (buildings || []).map(building => {
        const buildingUnits = units?.filter(u => u.building_id === building.id) || []
        const available = buildingUnits.filter(u => u.status === 'available').length
        const reserved = buildingUnits.filter(u => u.status === 'reserved').length
        const sold = buildingUnits.filter(u => u.status === 'sold').length
        const revenue = buildingUnits
          .filter(u => u.status === 'sold' && u.price)
          .reduce((sum, u) => sum + (u.price || 0), 0)
        const occupancy = buildingUnits.length > 0
          ? ((reserved + sold) / buildingUnits.length) * 100
          : 0

        return {
          building,
          units: buildingUnits,
          stats: {
            total: buildingUnits.length,
            available,
            reserved,
            sold,
            revenue,
            occupancyRate: occupancy
          }
        }
      })

      setReportData({
        totalBuildings: buildings?.length || 0,
        totalUnits,
        availableUnits,
        reservedUnits,
        soldUnits,
        totalRevenue,
        averagePrice,
        averageArea,
        occupancyRate,
        buildingsData
      })
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generatePDF = () => {
    window.print()
  }

  const exportToCSV = () => {
    if (!reportData) return

    const headers = ['العمارة', 'رقم القطعة', 'الحي', 'إجمالي الوحدات', 'المتاحة', 'المحجوزة', 'المباعة', 'الإيرادات', 'نسبة الإشغال']
    const rows = reportData.buildingsData.map(({ building, stats }) => [
      building.name,
      building.plot_number,
      building.neighborhood || '-',
      stats.total,
      stats.available,
      stats.reserved,
      stats.sold,
      `${stats.revenue.toLocaleString()} ر.س`,
      `${stats.occupancyRate.toFixed(1)}%`
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `building-reports-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">جارٍ تحميل التقارير...</p>
        </div>
      </div>
    )
  }

  if (!reportData) {
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
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-5">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center p-2.5 rounded-2xl hover:bg-indigo-50 transition-all duration-300 group"
              >
                <span className="w-11 h-11 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  <ArrowLeft className="w-5 h-5 text-white" />
                </span>
              </Link>

              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
                  <FileText className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    التقارير
                  </h1>
                  <p className="text-xs text-gray-500">تقرير شامل لجميع العمائر والوحدات</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={generatePDF}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg transition-all duration-300 text-sm font-semibold"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">طباعة</span>
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:shadow-lg transition-all duration-300 text-sm font-semibold"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">تصدير</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <Building2 className="w-8 h-8 opacity-90" />
              <span className="text-sm font-semibold opacity-90">إجمالي العمائر</span>
            </div>
            <p className="text-4xl font-black">{reportData.totalBuildings}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <Home className="w-8 h-8 opacity-90" />
              <span className="text-sm font-semibold opacity-90">إجمالي الوحدات</span>
            </div>
            <p className="text-4xl font-black">{reportData.totalUnits}</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <DollarSign className="w-8 h-8 opacity-90" />
              <span className="text-sm font-semibold opacity-90">إجمالي الإيرادات</span>
            </div>
            <p className="text-2xl font-black">{reportData.totalRevenue.toLocaleString()} ر.س</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <Percent className="w-8 h-8 opacity-90" />
              <span className="text-sm font-semibold opacity-90">نسبة الإشغال</span>
            </div>
            <p className="text-4xl font-black">{reportData.occupancyRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Detailed Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">الوحدات المتاحة</h3>
            </div>
            <p className="text-4xl font-black text-green-700">{reportData.availableUnits}</p>
            <p className="text-sm text-gray-600 mt-2">
              {reportData.totalUnits > 0 ? ((reportData.availableUnits / reportData.totalUnits) * 100).toFixed(1) : 0}% من إجمالي الوحدات
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">الوحدات المحجوزة</h3>
            </div>
            <p className="text-4xl font-black text-yellow-700">{reportData.reservedUnits}</p>
            <p className="text-sm text-gray-600 mt-2">
              {reportData.totalUnits > 0 ? ((reportData.reservedUnits / reportData.totalUnits) * 100).toFixed(1) : 0}% من إجمالي الوحدات
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                <XCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">الوحدات المباعة</h3>
            </div>
            <p className="text-4xl font-black text-red-700">{reportData.soldUnits}</p>
            <p className="text-sm text-gray-600 mt-2">
              {reportData.totalUnits > 0 ? ((reportData.soldUnits / reportData.totalUnits) * 100).toFixed(1) : 0}% من إجمالي الوحدات
            </p>
          </div>
        </div>

        {/* Buildings Detailed Report */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6" />
              <h2 className="text-xl font-bold">تقرير تفصيلي حسب العمارة</h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="text-right px-4 py-4 text-sm font-bold text-gray-700 uppercase">اسم العمارة</th>
                  <th className="text-right px-4 py-4 text-sm font-bold text-gray-700 uppercase">رقم القطعة</th>
                  <th className="text-right px-4 py-4 text-sm font-bold text-gray-700 uppercase">الحي</th>
                  <th className="text-center px-4 py-4 text-sm font-bold text-gray-700 uppercase">الوحدات</th>
                  <th className="text-center px-4 py-4 text-sm font-bold text-gray-700 uppercase">متاحة</th>
                  <th className="text-center px-4 py-4 text-sm font-bold text-gray-700 uppercase">محجوزة</th>
                  <th className="text-center px-4 py-4 text-sm font-bold text-gray-700 uppercase">مباعة</th>
                  <th className="text-right px-4 py-4 text-sm font-bold text-gray-700 uppercase">الإيرادات</th>
                  <th className="text-center px-4 py-4 text-sm font-bold text-gray-700 uppercase">الإشغال</th>
                </tr>
              </thead>
              <tbody>
                {reportData.buildingsData.map(({ building, stats }) => (
                  <tr key={building.id} className="border-b border-gray-200 hover:bg-indigo-50/50 transition-colors">
                    <td className="px-4 py-4 text-sm font-bold text-indigo-700">
                      <Link href={`/dashboard/buildings/${building.id}`} className="hover:underline">
                        {building.name}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-sm">{building.plot_number}</td>
                    <td className="px-4 py-4 text-sm">{building.neighborhood || '-'}</td>
                    <td className="px-4 py-4 text-sm text-center font-bold">{stats.total}</td>
                    <td className="px-4 py-4 text-sm text-center">
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                        {stats.available}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-center">
                      <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                        {stats.reserved}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-center">
                      <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                        {stats.sold}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-emerald-700">
                      {stats.revenue.toLocaleString()} ر.س
                    </td>
                    <td className="px-4 py-4 text-sm text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(stats.occupancyRate, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold">{stats.occupancyRate.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Additional Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">متوسط السعر</h3>
            </div>
            <p className="text-3xl font-black text-cyan-700">{reportData.averagePrice.toLocaleString()} ر.س</p>
            <p className="text-sm text-gray-600 mt-2">للوحدة الواحدة</p>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-600 to-pink-700 rounded-xl flex items-center justify-center">
                <Home className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">متوسط المساحة</h3>
            </div>
            <p className="text-3xl font-black text-pink-700">{reportData.averageArea.toFixed(1)} م²</p>
            <p className="text-sm text-gray-600 mt-2">للوحدة الواحدة</p>
          </div>
        </div>
      </div>
    </div>
  )
}
