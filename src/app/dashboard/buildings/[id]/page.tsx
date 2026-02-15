'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Building2,
  ArrowLeft,
  Edit2,
  MapPin,
  Phone,
  Calendar,
  Home,
  Users,
  Coffee,
  Shield,
  DollarSign,
  Maximize2,
  Grid3x3,
  Waves,
  User,
  Clock,
  Map,
  Save,
  X,
  Loader,
  CheckCircle,
  AlertCircle,
  Building,
  FileText,
  Award
} from 'lucide-react'

interface Building {
  id: string
  name: string
  address: string
  description: string | null
  total_floors: number
  total_units: number
  entrances: number
  parking_slots: number
  elevators: number
  year_built: number | null
  phone: string | null
  guard_name: string | null
  guard_phone: string | null
  guard_id_number: string | null
  guard_shift: string | null
  latitude: number | null
  longitude: number | null
  google_maps_link: string | null
  street_type: string | null
  building_facing: string | null
  image_urls: string[] | null
  owners_committee_name: string | null
  owners_committee_phone: string | null
  owners_committee_email: string | null
  owners_committee_chairman: string | null
  owners_committee_meeting_schedule: string | null
  created_at: string
  updated_at: string
}

interface Unit {
  id: string
  building_id: string
  unit_number: string
  floor: number
  type: string
  area: number
  rooms: number
  bathrooms: number
  price: number | null
  status: 'available' | 'sold' | 'reserved'
  created_at: string
  updated_at: string
}

export default function BuildingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const buildingId = params.id as string
  const supabase = createClient()

  const [building, setBuilding] = useState<Building | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const [showUnitDetail, setShowUnitDetail] = useState(false)

  const [formData, setFormData] = useState<Partial<Building>>({})
  const [unitFormData, setUnitFormData] = useState<Partial<Unit>>({})
  const [showUnitModal, setShowUnitModal] = useState(false)

  useEffect(() => {
    fetchBuilding()
  }, [])

  const fetchBuilding = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('id', buildingId)
        .single()

      if (error) throw error
      
      setBuilding(data)
      setFormData(data)

      // جلب الوحدات
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('*')
        .eq('building_id', buildingId)
        .order('floor', { ascending: true })
        .order('unit_number', { ascending: true })

      if (unitsError) throw unitsError
      setUnits(unitsData || [])
    } catch (error) {
      console.error('Error fetching building:', error)
      setErrorMessage('خطأ في تحميل بيانات المبنى')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    if (!building) return

    try {
      setIsSaving(true)
      setErrorMessage('')
      setSuccessMessage('')

      const { error } = await supabase
        .from('buildings')
        .update({
          name: formData.name,
          address: formData.address,
          description: formData.description,
          total_floors: formData.total_floors,
          total_units: formData.total_units,
          entrances: formData.entrances,
          parking_slots: formData.parking_slots,
          elevators: formData.elevators,
          year_built: formData.year_built,
          phone: formData.phone,
          guard_name: formData.guard_name,
          guard_phone: formData.guard_phone,
          guard_id_number: formData.guard_id_number,
          guard_shift: formData.guard_shift,
          latitude: formData.latitude,
          longitude: formData.longitude,
          google_maps_link: formData.google_maps_link,
          street_type: formData.street_type,
          building_facing: formData.building_facing,
          owners_committee_name: formData.owners_committee_name,
          owners_committee_phone: formData.owners_committee_phone,
          owners_committee_email: formData.owners_committee_email,
          owners_committee_chairman: formData.owners_committee_chairman,
          owners_committee_meeting_schedule: formData.owners_committee_meeting_schedule,
          updated_at: new Date().toISOString()
        })
        .eq('id', buildingId)

      if (error) throw error

      setSuccessMessage('تم حفظ التغييرات بنجاح!')
      setBuilding(formData as Building)
      setIsEditing(false)

      setTimeout(() => {
        setSuccessMessage('')
      }, 3000)
    } catch (error) {
      console.error('Error saving building:', error)
      setErrorMessage('خطأ في حفظ التغييرات')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveUnit = async () => {
    if (!editingUnitId || !unitFormData) return

    try {
      setIsSaving(true)
      setErrorMessage('')
      setSuccessMessage('')

      const { error } = await supabase
        .from('units')
        .update({
          area: unitFormData.area,
          rooms: unitFormData.rooms,
          bathrooms: unitFormData.bathrooms,
          price: unitFormData.price,
          status: unitFormData.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUnitId)

      if (error) throw error

      setSuccessMessage('تم تحديث بيانات الوحدة بنجاح!')
      setShowUnitModal(false)
      setEditingUnitId(null)
      fetchBuilding()

      setTimeout(() => {
        setSuccessMessage('')
      }, 3000)
    } catch (error) {
      console.error('Error saving unit:', error)
      setErrorMessage('خطأ في حفظ بيانات الوحدة')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditUnit = (unit: Unit) => {
    setEditingUnitId(unit.id)
    setUnitFormData(unit)
    setShowUnitModal(true)
  }

  // دالة لحساب الترقيم التلقائي 01, 02, 03...
  const formatUnitNumber = (index: number, floor: number): string => {
    const unitsInFloor = units.filter(u => u.floor === floor).length
    if (unitsInFloor > 0) {
      const floorIndex = units.filter(u => u.floor === floor).indexOf(units[index])
      return `${String(floor).padStart(2, '0')}${String(floorIndex + 1).padStart(2, '0')}`
    }
    return `${String(floor).padStart(2, '0')}01`
  }

  // دالة لعرض رقم الوحدة مع معالجة الترقيم التلقائي
  const getDisplayUnitNumber = (unit: Unit): string => {
    return unit.unit_number && unit.unit_number.length > 0 ? unit.unit_number : `${String(unit.floor).padStart(2, '0')}01`
  }

  const handleViewUnitDetail = (unit: Unit) => {
    setSelectedUnit(unit)
    setShowUnitDetail(true)
  }

  const handleEditFromDetail = (unit: Unit) => {
    handleEditUnit(unit)
    setShowUnitDetail(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل بيانات المبنى...</p>
        </div>
      </div>
    )
  }

  if (!building) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">المبنى غير موجود</h1>
          <p className="text-gray-600 mb-6">لم نتمكن من العثور على بيانات هذا المبنى</p>
          <Link
            href="/dashboard/buildings"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            العودة للعماير
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white shadow-2xl sticky top-0 z-20 border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 backdrop-blur-sm"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-white/20 to-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight">
                    {isEditing ? 'تعديل المبنى' : 'تفاصيل المبنى'}
                  </h1>
                  <p className="text-slate-300 text-lg mt-1 font-medium">{formData.name}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!isEditing ? (
                <>
                  <Link
                    href="/dashboard/buildings"
                    className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-2xl hover:bg-white/20 transition-all duration-300 flex items-center gap-2 border border-white/20 hover:border-white/30 hover:scale-105"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    عودة
                  </Link>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    <Edit2 className="w-5 h-5" />
                    تعديل
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setFormData(building)
                    }}
                    className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-2xl hover:bg-white/20 transition-all duration-300 flex items-center gap-2 border border-white/20 hover:border-white/30 hover:scale-105"
                  >
                    <X className="w-5 h-5" />
                    إلغاء
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        حفظ التغييرات
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-6 mx-4 mt-4 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-6 mx-4 mt-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{errorMessage}</p>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Main Info */}
          <div className="xl:col-span-2 space-y-6 lg:space-y-8">
            
            {/* Basic Information */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 shadow-2xl border border-white/10">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20"></div>
                <div className="absolute inset-0">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-1 h-full bg-white/5"
                      style={{
                        left: `${i * 5}%`,
                        transform: `rotate(${45 + i * 10}deg)`,
                        transformOrigin: 'center'
                      }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="relative z-10 p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 rounded-3xl flex items-center justify-center shadow-2xl border border-amber-400/50 animate-pulse">
                        <Building2 className="w-8 h-8 text-white drop-shadow-lg" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-300 rounded-full animate-ping"></div>
                    </div>
                    <div>
                      <h2 className="text-4xl font-black mb-2 tracking-tight">المعلومات الأساسية</h2>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                        <p className="text-amber-200 text-sm font-medium">بيانات المبنى الرئيسية</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="group relative px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl font-bold shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 border-2 border-amber-400/50 hover:border-amber-400 overflow-hidden"
                  >
                    <span className="relative z-10">{isEditing ? 'إغلاق' : 'تعديل'}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </button>
                </div>

              {isEditing ? (
                <div className="space-y-8">
                  <div className="group relative">
                    <label className="block text-amber-200 text-sm font-bold mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                      اسم المبنى
                    </label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl text-white placeholder-white/40 focus:border-amber-400 focus:ring-4 focus:ring-amber-300/50 transition-all duration-300 shadow-lg"
                      placeholder="أدخل اسم المبنى"
                    />
                    <div className="absolute left-6 top-1/2 w-4 h-4 bg-amber-400 rounded-full opacity-0 group-focus:opacity-100 transition-opacity duration-300"></div>
                  </div>

                  <div className="group relative">
                    <label className="block text-amber-200 text-sm font-bold mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                      العنوان
                    </label>
                    <textarea
                      value={formData.address || ''}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows={4}
                      className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl text-white placeholder-white/40 focus:border-amber-400 focus:ring-4 focus:ring-amber-300/50 transition-all duration-300 shadow-lg resize-none"
                      placeholder="أدخل العنوان الكامل"
                    />
                    <div className="absolute left-6 top-1/2 w-4 h-4 bg-amber-400 rounded-full opacity-0 group-focus:opacity-100 transition-opacity duration-300"></div>
                  </div>

                  <div className="group relative">
                    <label className="block text-amber-200 text-sm font-bold mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                      الوصف
                    </label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl text-white placeholder-white/40 focus:border-amber-400 focus:ring-4 focus:ring-amber-300/50 transition-all duration-300 shadow-lg resize-none"
                      placeholder="وصف المبنى ومميزاته"
                    />
                    <div className="absolute left-6 top-1/2 w-4 h-4 bg-amber-400 rounded-full opacity-0 group-focus:opacity-100 transition-opacity duration-300"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="group relative">
                      <label className="block text-amber-200 text-sm font-bold mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                        سنة البناء
                      </label>
                      <input
                        type="number"
                        value={formData.year_built || ''}
                        onChange={(e) => handleInputChange('year_built', e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl text-white placeholder-white/40 focus:border-amber-400 focus:ring-4 focus:ring-amber-300/50 transition-all duration-300 shadow-lg"
                        placeholder="مثال: 2020"
                      />
                      <div className="absolute left-6 top-1/2 w-4 h-4 bg-amber-400 rounded-full opacity-0 group-focus:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    <div className="group relative">
                      <label className="block text-amber-200 text-sm font-bold mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                        رقم الهاتف
                      </label>
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl text-white placeholder-white/40 focus:border-amber-400 focus:ring-4 focus:ring-amber-300/50 transition-all duration-300 shadow-lg"
                        placeholder="05xxxxxxxxx"
                      />
                      <div className="absolute left-6 top-1/2 w-4 h-4 bg-amber-400 rounded-full opacity-0 group-focus:opacity-100 transition-opacity duration-300"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-8 border border-amber-200 hover:shadow-xl transition-all duration-300 cursor-pointer">
                    <div className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="pr-20">
                      <p className="text-amber-700 text-sm font-bold mb-3">اسم المبنى</p>
                      <p className="text-3xl font-bold text-gray-900 mb-2">{building.name}</p>
                    </div>
                  </div>
                  
                  <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-8 border border-blue-200 hover:shadow-xl transition-all duration-300 cursor-pointer">
                    <div className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div className="pr-20">
                      <p className="text-blue-700 text-sm font-bold mb-3">العنوان</p>
                      <p className="text-lg font-semibold text-gray-900 leading-relaxed">{building.address}</p>
                    </div>
                  </div>

                  {building.description && (
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 p-8 border border-purple-200 hover:shadow-xl transition-all duration-300 cursor-pointer">
                      <div className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div className="pr-20">
                        <p className="text-purple-700 text-sm font-bold mb-3">الوصف</p>
                        <p className="text-gray-900 leading-relaxed">{building.description}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {building.year_built && (
                      <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 p-8 border border-green-200 hover:shadow-xl transition-all duration-300 cursor-pointer">
                        <div className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div className="pr-20">
                          <p className="text-green-700 text-sm font-bold mb-3">سنة البناء</p>
                          <p className="text-3xl font-bold text-gray-900">{building.year_built}</p>
                        </div>
                      </div>
                    )}
                    {building.phone && (
                      <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-50 to-red-50 p-8 border border-rose-200 hover:shadow-xl transition-all duration-300 cursor-pointer">
                        <div className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-br from-rose-400 to-red-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Phone className="w-6 h-6 text-white" />
                        </div>
                        <div className="pr-20">
                          <p className="text-rose-700 text-sm font-bold mb-3">الهاتف</p>
                          <p className="text-3xl font-bold text-gray-900">{building.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Building Details */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/50 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Grid3x3 className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">تفاصيل المبنى</h2>
              </div>

              {isEditing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">عدد الأدوار</label>
                    <input
                      type="number"
                      value={formData.total_floors || ''}
                      onChange={(e) => handleInputChange('total_floors', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">عدد الوحدات</label>
                    <input
                      type="number"
                      value={formData.total_units || ''}
                      onChange={(e) => handleInputChange('total_units', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">المصاعد</label>
                    <input
                      type="number"
                      value={formData.elevators || ''}
                      onChange={(e) => handleInputChange('elevators', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">المداخل</label>
                    <input
                      type="number"
                      value={formData.entrances || ''}
                      onChange={(e) => handleInputChange('entrances', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">مواقف السيارات</label>
                    <input
                      type="number"
                      value={formData.parking_slots || ''}
                      onChange={(e) => handleInputChange('parking_slots', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">نوع الشارع</label>
                    <select
                      value={formData.street_type || ''}
                      onChange={(e) => handleInputChange('street_type', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="one">شارع واحد</option>
                      <option value="two">شارعان</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">اتجاه المبنى</label>
                    <select
                      value={formData.building_facing || ''}
                      onChange={(e) => handleInputChange('building_facing', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="north">شمال</option>
                      <option value="south">جنوب</option>
                      <option value="east">شرق</option>
                      <option value="west">غرب</option>
                      <option value="northeast">شمال شرق</option>
                      <option value="northwest">شمال غرب</option>
                      <option value="southeast">جنوب شرق</option>
                      <option value="southwest">جنوب غرب</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                  <div className="group p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-blue-700 text-sm font-semibold">الأدوار</p>
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Grid3x3 className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-blue-800">{building.total_floors}</p>
                  </div>
                  <div className="group p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-purple-700 text-sm font-semibold">الوحدات</p>
                      <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Home className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-purple-800">{building.total_units}</p>
                  </div>
                  <div className="group p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl border border-indigo-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-indigo-700 text-sm font-semibold">المصاعد</p>
                      <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Maximize2 className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-indigo-800">{building.elevators}</p>
                  </div>
                  <div className="group p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200 hover:border-green-300 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-green-700 text-sm font-semibold">المداخل</p>
                      <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-green-800">{building.entrances}</p>
                  </div>
                  <div className="group p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl border border-orange-200 hover:border-orange-300 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-orange-700 text-sm font-semibold">مواقف السيارات</p>
                      <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Coffee className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-orange-800">{building.parking_slots}</p>
                  </div>
                  <div className="group p-6 bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl border border-pink-200 hover:border-pink-300 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-pink-700 text-sm font-semibold">الاتجاه</p>
                      <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Map className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <p className="text-xl font-bold text-pink-800">
                      {building.building_facing === 'north' && 'شمال'}
                      {building.building_facing === 'south' && 'جنوب'}
                      {building.building_facing === 'east' && 'شرق'}
                      {building.building_facing === 'west' && 'غرب'}
                      {building.building_facing === 'northeast' && 'شمال شرق'}
                      {building.building_facing === 'northwest' && 'شمال غرب'}
                      {building.building_facing === 'southeast' && 'جنوب شرق'}
                      {building.building_facing === 'southwest' && 'جنوب غرب'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Units Cards */}
            <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-3xl shadow-2xl p-8 border border-white/10 hover:shadow-3xl transition-all duration-500">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center shadow-lg border border-emerald-300">
                    <Home className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-1">الوحدات والشقق</h2>
                    <p className="text-emerald-200 text-sm">إدارة وحدات المبنى</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-full text-sm font-bold shadow-lg border border-emerald-400">
                    {units.length} وحدة
                  </span>
                </div>
              </div>

              {units.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/20">
                    <Home className="w-12 h-12 text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">لا توجد وحدات مضافة</h3>
                  <p className="text-emerald-200 text-lg">ابدأ بإضافة الوحدات الأولى لهذا المبنى</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {units.map((unit, index) => (
                    <div 
                      key={unit.id} 
                      className="group relative overflow-hidden bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 hover:shadow-2xl transition-all duration-300 cursor-pointer"
                      onClick={() => handleViewUnitDetail(unit)}
                    >
                      {/* Card Header */}
                      <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-4 relative">
                        <div className="absolute top-2 left-2 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{getDisplayUnitNumber(unit)}</span>
                        </div>
                        <div className="text-left">
                          <p className="text-white/80 text-xs font-medium mb-1">الوحدة</p>
                          <p className="text-white font-bold text-lg">{getDisplayUnitNumber(unit)}</p>
                        </div>
                        <div className="absolute top-2 right-2">
                          <div className={`w-3 h-3 rounded-full ${
                            unit.status === 'available' ? 'bg-green-400' :
                            unit.status === 'reserved' ? 'bg-yellow-400' :
                            'bg-red-400'
                          }`}></div>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-emerald-200 text-xs font-medium mb-1">الدور</p>
                            <p className="text-white text-2xl font-bold">{unit.floor}</p>
                          </div>
                          <div className="text-left">
                            <p className="text-emerald-200 text-xs font-medium mb-1">النوع</p>
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                              unit.type === 'apartment' ? 'bg-purple-500 text-white' :
                              unit.type === 'studio' ? 'bg-blue-500 text-white' :
                              unit.type === 'duplex' ? 'bg-indigo-500 text-white' :
                              'bg-pink-500 text-white'
                            }`}>
                              {unit.type === 'apartment' && 'شقة'}
                              {unit.type === 'studio' && 'ستوديو'}
                              {unit.type === 'duplex' && 'دوبلكس'}
                              {unit.type === 'penthouse' && 'بنتهاوس'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-emerald-200 text-xs font-medium mb-1">المساحة</p>
                            <p className="text-white text-xl font-bold">{unit.area} <span className="text-sm text-emerald-300">م²</span></p>
                          </div>
                          <div>
                            <p className="text-emerald-200 text-xs font-medium mb-1">الغرف</p>
                            <p className="text-white text-xl font-bold">{unit.rooms}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-emerald-200 text-xs font-medium mb-1">الحمامات</p>
                            <p className="text-white text-xl font-bold">{unit.bathrooms}</p>
                          </div>
                          <div>
                            <p className="text-emerald-200 text-xs font-medium mb-1">السعر</p>
                            <p className="text-white text-xl font-bold">
                              {unit.price ? `${unit.price.toLocaleString('ar-SA')}` : '--'}
                            </p>
                            {unit.price && <span className="text-xs text-emerald-300">ر.س</span>}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-white/20">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                            unit.status === 'available' ? 'bg-green-500 text-white' :
                            unit.status === 'reserved' ? 'bg-yellow-500 text-white' :
                            'bg-red-500 text-white'
                          }`}>
                            {unit.status === 'available' && '✓ متاحة'}
                            {unit.status === 'reserved' && '⏳ محجوزة'}
                            {unit.status === 'sold' && '✓ مباعة'}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditUnit(unit)
                            }}
                            className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all duration-300 border border-white/30 text-white font-semibold text-sm hover:scale-105"
                          >
                            تعديل
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Guard Information */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                معلومات الحارس
              </h2>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">اسم الحارس</label>
                    <input
                      type="text"
                      value={formData.guard_name || ''}
                      onChange={(e) => handleInputChange('guard_name', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">رقم هاتفه</label>
                      <input
                        type="tel"
                        value={formData.guard_phone || ''}
                        onChange={(e) => handleInputChange('guard_phone', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">رقم هويته</label>
                      <input
                        type="text"
                        value={formData.guard_id_number || ''}
                        onChange={(e) => handleInputChange('guard_id_number', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الورديَّة</label>
                    <select
                      value={formData.guard_shift || ''}
                      onChange={(e) => handleInputChange('guard_shift', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="">بدون</option>
                      <option value="day">النهار</option>
                      <option value="night">الليل</option>
                      <option value="rotating">دوارة</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {building.guard_name ? (
                    <>
                      <div className="p-4 bg-gray-50 rounded-xl flex items-center gap-3">
                        <User className="w-5 h-5 text-indigo-600" />
                        <div>
                          <p className="text-gray-600 text-sm">الاسم</p>
                          <p className="font-bold text-gray-800">{building.guard_name}</p>
                        </div>
                      </div>

                      {building.guard_phone && (
                        <div className="p-4 bg-gray-50 rounded-xl flex items-center gap-3">
                          <Phone className="w-5 h-5 text-indigo-600" />
                          <div>
                            <p className="text-gray-600 text-sm">الهاتف</p>
                            <p className="font-bold text-gray-800">{building.guard_phone}</p>
                          </div>
                        </div>
                      )}

                      {building.guard_id_number && (
                        <div className="p-4 bg-gray-50 rounded-xl">
                          <p className="text-gray-600 text-sm">الهوية</p>
                          <p className="font-bold text-gray-800">{building.guard_id_number}</p>
                        </div>
                      )}

                      {building.guard_shift && (
                        <div className="p-4 bg-gray-50 rounded-xl flex items-center gap-3">
                          <Clock className="w-5 h-5 text-indigo-600" />
                          <div>
                            <p className="text-gray-600 text-sm">الورديَّة</p>
                            <p className="font-bold text-gray-800">
                              {building.guard_shift === 'day' && 'النهار'}
                              {building.guard_shift === 'night' && 'الليل'}
                              {building.guard_shift === 'rotating' && 'دوارة'}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500 text-center py-4">لم تضف معلومات عن الحارس</p>
                  )}
                </div>
              )}
            </div>

            {/* Owners Committee Information */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/50 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">اتحاد الملاك</h3>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">اسم الاتحاد</label>
                    <input
                      type="text"
                      value={formData.owners_committee_name || ''}
                      onChange={(e) => handleInputChange('owners_committee_name', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">رئيس الاتحاد</label>
                      <input
                        type="text"
                        value={formData.owners_committee_chairman || ''}
                        onChange={(e) => handleInputChange('owners_committee_chairman', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">هاتف الاتحاد</label>
                      <input
                        type="tel"
                        value={formData.owners_committee_phone || ''}
                        onChange={(e) => handleInputChange('owners_committee_phone', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={formData.owners_committee_email || ''}
                      onChange={(e) => handleInputChange('owners_committee_email', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">جدول الاجتماعات</label>
                    <textarea
                      value={formData.owners_committee_meeting_schedule || ''}
                      onChange={(e) => handleInputChange('owners_committee_meeting_schedule', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      placeholder="مثال: أول يوم سبت من كل شهر الساعة 7 مساءً"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {building.owners_committee_name ? (
                    <>
                      <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200">
                        <p className="text-purple-700 text-sm font-semibold mb-2">اسم الاتحاد</p>
                        <p className="text-xl font-bold text-gray-800">{building.owners_committee_name}</p>
                      </div>

                      {building.owners_committee_chairman && (
                        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-blue-700 text-sm font-semibold">رئيس الاتحاد</p>
                            <p className="text-lg font-bold text-gray-800">{building.owners_committee_chairman}</p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {building.owners_committee_phone && (
                          <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 flex items-center gap-4">
                            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                              <Phone className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-green-700 text-sm font-semibold">هاتف الاتحاد</p>
                              <p className="text-lg font-bold text-gray-800">{building.owners_committee_phone}</p>
                            </div>
                          </div>
                        )}

                        {building.owners_committee_email && (
                          <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-200 flex items-center gap-4">
                            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                              <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-orange-700 text-sm font-semibold">البريد الإلكتروني</p>
                              <p className="text-sm font-bold text-gray-800 break-all">{building.owners_committee_email}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {building.owners_committee_meeting_schedule && (
                        <div className="p-6 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl border border-gray-200">
                          <div className="flex items-center gap-3 mb-3">
                            <Clock className="w-5 h-5 text-gray-600" />
                            <p className="text-gray-700 text-sm font-semibold">جدول الاجتماعات</p>
                          </div>
                          <p className="text-gray-800 leading-relaxed">{building.owners_committee_meeting_schedule}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <Award className="w-10 h-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-600 mb-2">لم تضف معلومات اتحاد الملاك</h3>
                      <p className="text-gray-500">يمكنك إضافة معلومات اتحاد الملاك لإدارة المبنى بشكل أفضل</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Location Information */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/50 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Map className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">الموقع الجغرافي</h3>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">العرض الجغرافي</label>
                    <input
                      type="number"
                      step="0.00000001"
                      value={formData.latitude || ''}
                      onChange={(e) => handleInputChange('latitude', e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      placeholder="Latitude"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الطول الجغرافي</label>
                    <input
                      type="number"
                      step="0.00000001"
                      value={formData.longitude || ''}
                      onChange={(e) => handleInputChange('longitude', e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      placeholder="Longitude"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">رابط خريطة جوجل</label>
                    <input
                      type="url"
                      value={formData.google_maps_link || ''}
                      onChange={(e) => handleInputChange('google_maps_link', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      placeholder="https://maps.google.com/..."
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {building.latitude && building.longitude ? (
                    <div className="p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl border border-orange-200">
                      <p className="text-orange-700 text-sm font-semibold mb-2">الإحداثيات</p>
                      <p className="font-mono text-sm text-gray-800 bg-white/50 rounded-lg px-3 py-2">
                        {building.latitude}, {building.longitude}
                      </p>
                    </div>
                  ) : (
                    <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200">
                      <p className="text-gray-500 text-center">لم يتم تحديد الإحداثيات</p>
                    </div>
                  )}

                  {building.google_maps_link && (
                    <a
                      href={building.google_maps_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 text-center font-bold shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Map className="w-5 h-5" />
                        فتح في خريطة جوجل
                      </span>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Statistics */}
            <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl shadow-xl p-8 text-white border border-white/10 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold">إحصائيات</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-all">
                  <span className="text-sm font-medium">تاريخ الإنشاء</span>
                  <span className="font-bold text-sm">
                    {new Date(building.created_at).toLocaleDateString('ar-SA')}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-all">
                  <span className="text-sm font-medium">آخر تحديث</span>
                  <span className="font-bold text-sm">
                    {new Date(building.updated_at).toLocaleDateString('ar-SA')}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-all">
                  <span className="text-sm font-medium">معرّف المبنى</span>
                  <span className="font-mono text-xs bg-white/10 px-2 py-1 rounded">{building.id.slice(0, 8)}...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      </div>

      {/* Unit Edit Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 max-h-[90vh] overflow-y-auto border border-white/20">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Edit2 className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">تعديل الوحدة</h2>
              </div>
              <button
                onClick={() => setShowUnitModal(false)}
                className="p-3 hover:bg-gray-100 rounded-2xl transition-all duration-200 hover:scale-110"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {unitFormData && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">رقم الوحدة</label>
                  <input
                    type="text"
                    value={unitFormData.unit_number || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-gray-50 text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">المساحة (م²)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={unitFormData.area || ''}
                    onChange={(e) => setUnitFormData(prev => ({ ...prev, area: parseFloat(e.target.value) }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">عدد الغرف</label>
                  <input
                    type="number"
                    value={unitFormData.rooms || ''}
                    onChange={(e) => setUnitFormData(prev => ({ ...prev, rooms: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">عدد الحمامات</label>
                  <input
                    type="number"
                    value={unitFormData.bathrooms || ''}
                    onChange={(e) => setUnitFormData(prev => ({ ...prev, bathrooms: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">السعر (ر.س)</label>
                  <input
                    type="number"
                    step="1000"
                    value={unitFormData.price || ''}
                    onChange={(e) => setUnitFormData(prev => ({ ...prev, price: e.target.value ? parseFloat(e.target.value) : null }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">الحالة</label>
                  <select
                    value={unitFormData.status || 'available'}
                    onChange={(e) => setUnitFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="available">متاحة</option>
                    <option value="reserved">محجوزة</option>
                    <option value="sold">مباعة</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowUnitModal(false)}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 transition-all duration-200 font-bold hover:border-gray-400 hover:scale-105"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleSaveUnit}
                    disabled={isSaving}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-bold shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        جاري...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        حفظ
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unit Detail Preview Modal */}
      {showUnitDetail && selectedUnit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full p-10 max-h-[90vh] overflow-y-auto border border-white/20">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-800">
                    بيانات الوحدة #{getDisplayUnitNumber(selectedUnit)}
                  </h2>
                  <p className="text-gray-600 mt-1">تفاصيل كاملة للوحدة المحددة</p>
                </div>
              </div>
              <button
                onClick={() => setShowUnitDetail(false)}
                className="p-3 hover:bg-gray-100 rounded-2xl transition-all duration-200 hover:scale-110"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Unit Details Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6 mb-8">
              {/* Floor */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-blue-600 text-sm font-semibold mb-1">الدور</p>
                <p className="text-3xl font-bold text-blue-700">{selectedUnit.floor}</p>
              </div>

              {/* Type */}
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                <p className="text-purple-600 text-sm font-semibold mb-1">نوع الوحدة</p>
                <p className="text-2xl font-bold text-purple-700">
                  {selectedUnit.type === 'apartment' && 'شقة'}
                  {selectedUnit.type === 'studio' && 'ستوديو'}
                  {selectedUnit.type === 'duplex' && 'دوبلكس'}
                  {selectedUnit.type === 'penthouse' && 'بنتهاوس'}
                </p>
              </div>

              {/* Area */}
              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <p className="text-green-600 text-sm font-semibold mb-1">المساحة</p>
                <p className="text-3xl font-bold text-green-700">{selectedUnit.area} م²</p>
              </div>

              {/* Rooms */}
              <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                <p className="text-orange-600 text-sm font-semibold mb-1">عدد الغرف</p>
                <p className="text-3xl font-bold text-orange-700">{selectedUnit.rooms}</p>
              </div>

              {/* Bathrooms */}
              <div className="p-4 bg-pink-50 rounded-xl border border-pink-200">
                <p className="text-pink-600 text-sm font-semibold mb-1">الحمامات</p>
                <p className="text-3xl font-bold text-pink-700">{selectedUnit.bathrooms}</p>
              </div>

              {/* Price */}
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                <p className="text-indigo-600 text-sm font-semibold mb-1">السعر</p>
                <p className="text-2xl font-bold text-indigo-700">
                  {selectedUnit.price ? `${selectedUnit.price.toLocaleString('ar-SA')} ر.س` : 'غير محدد'}
                </p>
              </div>

              {/* Status */}
              <div className={`p-4 rounded-xl border-2 ${
                selectedUnit.status === 'available' ? 'bg-green-50 border-green-200' :
                selectedUnit.status === 'reserved' ? 'bg-yellow-50 border-yellow-200' :
                'bg-red-50 border-red-200'
              }`}>
                <p className={`text-sm font-semibold mb-1 ${
                  selectedUnit.status === 'available' ? 'text-green-600' :
                  selectedUnit.status === 'reserved' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  الحالة
                </p>
                <p className={`text-2xl font-bold ${
                  selectedUnit.status === 'available' ? 'text-green-700' :
                  selectedUnit.status === 'reserved' ? 'text-yellow-700' :
                  'text-red-700'
                }`}>
                  {selectedUnit.status === 'available' && '✓ متاحة'}
                  {selectedUnit.status === 'reserved' && '⏳ محجوزة'}
                  {selectedUnit.status === 'sold' && '✓ مباعة'}
                </p>
              </div>

              {/* Date Created */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-600 text-sm font-semibold mb-1">تاريخ الإنشاء</p>
                <p className="text-sm font-semibold text-gray-700">
                  {new Date(selectedUnit.created_at).toLocaleDateString('ar-SA')}
                </p>
              </div>

              {/* Last Updated */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-600 text-sm font-semibold mb-1">آخر تحديث</p>
                <p className="text-sm font-semibold text-gray-700">
                  {new Date(selectedUnit.updated_at).toLocaleDateString('ar-SA')}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 sm:pt-8 border-t border-gray-200">
              <button
                onClick={() => setShowUnitDetail(false)}
                className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 transition-all duration-200 font-bold text-lg hover:border-gray-400 hover:scale-105"
              >
                إغلاق
              </button>
              <button
                onClick={() => handleEditFromDetail(selectedUnit)}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-3"
              >
                <Edit2 className="w-5 h-5" />
                تعديل البيانات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

