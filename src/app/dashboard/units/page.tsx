'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Building2, 
  Home,
  ArrowRight,
  X,
  Filter,
  CheckSquare,
  Calendar,
  ShoppingCart,
  TrendingUp,
  Search,
  MapPin,
  Eye
} from 'lucide-react'

interface Building {
  id: string
  name: string
  plot_number: string
  neighborhood?: string
  total_units: number
  image_urls?: string[]
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
}

export default function UnitsFilterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const statusFilter = searchParams.get('status') || 'available'
  
  const [buildings, setBuildings] = useState<Building[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  
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
  }, [statusFilter])

  const fetchData = async () => {
    try {
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

      console.log('Status Filter:', statusFilter)
      console.log('Buildings found:', buildingsData?.length)
      console.log('Building IDs:', buildingIds)

      // جلب الوحدات المرتبطة بعماير المستخدم فقط والمطابقة للفلتر
      if (buildingIds.length > 0) {
        const { data: unitsData, error: unitsError } = await supabase
          .from('units')
          .select('*')
          .in('building_id', buildingIds)
          .eq('status', statusFilter)
          .order('unit_number', { ascending: true })

        if (unitsError) throw unitsError
        
        console.log('Units found:', unitsData?.length)
        console.log('Units data:', unitsData)
        
        setUnits(unitsData || [])
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'available':
        return {
          title: 'الشقق المتاحة',
          unitLabel: 'الوحدات المتاحة',
          icon: CheckSquare,
          color: 'purple',
          gradient: 'from-purple-500 to-pink-500',
          bgLight: 'bg-purple-50',
          textColor: 'text-purple-600',
          borderColor: 'border-purple-200'
        }
      case 'reserved':
        return {
          title: 'الشقق المحجوزة',
          unitLabel: 'الوحدات المحجوزة',
          icon: Calendar,
          color: 'amber',
          gradient: 'from-amber-500 to-orange-500',
          bgLight: 'bg-amber-50',
          textColor: 'text-amber-600',
          borderColor: 'border-amber-200'
        }
      case 'sold':
        return {
          title: 'الشقق المباعة',
          unitLabel: 'الوحدات المباعة',
          icon: ShoppingCart,
          color: 'rose',
          gradient: 'from-rose-500 to-red-500',
          bgLight: 'bg-rose-50',
          textColor: 'text-rose-600',
          borderColor: 'border-rose-200'
        }
      default:
        return {
          title: 'جميع الوحدات',
          unitLabel: 'الوحدات',
          icon: Home,
          color: 'blue',
          gradient: 'from-blue-500 to-cyan-500',
          bgLight: 'bg-blue-50',
          textColor: 'text-blue-600',
          borderColor: 'border-blue-200'
        }
    }
  }

  const config = getStatusConfig(statusFilter)
  const StatusIcon = config.icon

  // فلترة العماير حسب البحث ونوع الوحدة
  const filteredBuildings = buildings.filter(building => {
    const buildingUnits = units.filter(u => u.building_id === building.id)
    
    if (buildingUnits.length === 0) return false
    
    const matchesSearch = building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         building.plot_number.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = selectedType === 'all' || 
                       buildingUnits.some(u => u.type === selectedType)
    
    return matchesSearch && matchesType
  })

  // الحصول على أنواع الوحدات الفريدة من الوحدات المفلترة
  const unitTypes = Array.from(new Set(units.map(u => u.type).filter(Boolean)))

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className={`${config.bgLight} border-b ${config.borderColor}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 bg-gradient-to-br ${config.gradient} rounded-2xl shadow-lg`}>
                <StatusIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className={`text-3xl font-black ${config.textColor}`}>{config.title}</h1>
                <p className="text-gray-600 text-sm mt-1">
                  {filteredBuildings.length} {filteredBuildings.length === 1 ? 'عمارة' : 'عماير'} • {units.length} {units.length === 1 ? 'وحدة' : 'وحدات'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className={`flex items-center gap-2 px-6 py-3 bg-white ${config.textColor} rounded-xl hover:shadow-lg transition-all font-semibold border-2 ${config.borderColor}`}
              >
                <ArrowRight className="w-5 h-5" />
                رجوع للوحة التحكم
              </button>
              <button
                onClick={() => router.back()}
                className="p-3 bg-white text-gray-600 rounded-xl hover:bg-gray-100 transition-all border border-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Filter className={`w-5 h-5 ${config.textColor}`} />
            <h2 className="text-lg font-bold text-gray-800">فلترة النتائج</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* بحث بالاسم */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث عن عمارة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* فلتر نوع الوحدة */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">جميع الأنواع</option>
              {unitTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            {/* فلتر الحالة */}
            <select
              value={statusFilter}
              onChange={(e) => router.push(`/dashboard/units?status=${e.target.value}`)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="available">متاحة</option>
              <option value="reserved">محجوزة</option>
              <option value="sold">مباعة</option>
            </select>

            {/* زر إعادة تعيين */}
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedType('all')
              }}
              className={`px-6 py-3 bg-gradient-to-r ${config.gradient} text-white rounded-xl hover:shadow-lg transition-all font-semibold`}
            >
              إعادة تعيين الفلاتر
            </button>
          </div>
        </div>

        {/* Buildings Grid */}
        {filteredBuildings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBuildings.map(building => {
              const buildingUnits = units.filter(u => u.building_id === building.id)
              const totalUnits = buildingUnits.length
              
              return (
                <div
                  key={building.id}
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 hover:border-purple-300"
                >
                  {/* Header */}
                  <div className={`p-6 bg-gradient-to-r ${config.gradient}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-2">{building.name}</h3>
                        <p className="text-white/80 text-sm flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          رقم القطعة: {building.plot_number}
                        </p>
                      </div>
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className={`${config.bgLight} rounded-xl p-4 text-center`}>
                        <p className="text-gray-600 text-xs mb-1">{config.unitLabel}</p>
                        <p className={`text-3xl font-black ${config.textColor}`}>{totalUnits}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 text-center">
                        <p className="text-gray-600 text-xs mb-1">إجمالي الوحدات</p>
                        <p className="text-3xl font-black text-gray-800">{building.total_units}</p>
                      </div>
                    </div>

                    {/* Units Details */}
                    <div className="space-y-2 mb-4">
                      {buildingUnits.slice(0, 3).map(unit => (
                        <div key={unit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-2">
                            <Home className={`w-4 h-4 ${config.textColor}`} />
                            <span className="font-semibold text-sm">شقة رقم {unit.unit_number}</span>
                          </div>
                          <div className="text-left">
                            <p className="text-xs text-gray-600">الطابق {unit.floor}</p>
                            {unit.price && (
                              <p className={`text-xs font-bold ${config.textColor}`}>
                                {unit.price.toLocaleString('ar-SA')} ريال
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {buildingUnits.length > 3 && (
                        <p className="text-center text-gray-500 text-sm pt-2">
                          + {buildingUnits.length - 3} وحدة أخرى
                        </p>
                      )}
                    </div>

                    {/* Action Button */}
                    <Link
                      href={`/dashboard/buildings/${building.id}`}
                      className={`flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r ${config.gradient} text-white rounded-xl hover:shadow-lg transition-all font-semibold group-hover:scale-105`}
                    >
                      <Eye className="w-5 h-5" />
                      عرض التفاصيل
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
            <div className={`w-24 h-24 bg-gradient-to-br ${config.gradient} bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-6`}>
              <StatusIcon className={`w-12 h-12 ${config.textColor}`} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">لا توجد نتائج</h3>
            <p className="text-gray-600 mb-6">
              {units.length === 0 
                ? `لا توجد وحدات ${config.title.toLowerCase()} حالياً`
                : `لم يتم العثور على عماير تطابق معايير البحث`
              }
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedType('all')
                }}
                className={`px-6 py-3 bg-gradient-to-r ${config.gradient} text-white rounded-xl hover:shadow-lg transition-all font-semibold`}
              >
                إعادة تعيين البحث
              </button>
              {units.length === 0 && (
                <Link
                  href="/dashboard/buildings"
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                >
                  إدارة العماير
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
