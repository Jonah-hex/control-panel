'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Building2,
  ArrowLeft,
  Edit2,
  Home,
  Grid3x3,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Trash2,
  Maximize2,
  Wind,
  Users,
  ArrowUp,
  DoorOpen,
  ParkingCircle
} from 'lucide-react'

interface OwnerAssociation {
  hasAssociation: boolean
  startDate?: string
  endDate?: string
  monthlyFee?: number
  contactNumber?: string
  managerName?: string
  registrationNumber?: string
  registeredUnitsCount?: number
  iban?: string
  accountNumber?: string
  includesElectricity?: boolean
  includesWater?: boolean
}

interface Building {
  id: string
  name: string
  plot_number: string
  neighborhood?: string
  description: string | null
  total_floors: number
  total_units: number
  entrances: number
  parking_slots: number
  elevators: number
  driver_rooms: number
  year_built: number | null
  phone: string | null
  guard_name: string | null
  guard_phone: string | null
  guard_room_number: string | null
  guard_id_photo: string | null
  guard_shift: string | null
  guard_has_salary: boolean | null
  guard_salary_amount: number | null
  owner_association?: OwnerAssociation | null
  owner_id?: string
  google_maps_link?: string | null
  street_type?: string | null
  building_facing?: string | null
  owners_committee_name?: string | null
  owners_committee_phone?: string | null
  owners_committee_email?: string | null
  owners_committee_chairman?: string | null
  owners_committee_meeting_schedule?: string | null
  created_at?: string
  updated_at?: string
}

interface Unit {
  id: string
  building_id: string
  floor: number
  unit_number: string
  type: string
  facing: string
  area: number
  rooms: number
  bathrooms: number
  living_rooms: number
  kitchens: number
  maid_room: boolean
  driver_room: boolean
  entrances: number
  ac_type: string
  price: number | null
  status: 'available' | 'reserved' | 'sold'
  created_at: string
  updated_at: string
}

export default function BuildingDetailPage() {
  const [building, setBuilding] = useState<Building | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [formData, setFormData] = useState<Partial<Building>>({})

  const params = useParams()
  const buildingId = params.id as string
  const supabase = createClient()

  useEffect(() => {
    if (buildingId) {
      fetchBuilding()
    }
  }, [buildingId])

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

      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('*')
        .eq('building_id', buildingId)
        .order('floor', { ascending: true })

      if (unitsError) throw unitsError
      setUnits(unitsData || [])
    } catch (error) {
      console.error('Error fetching building:', error)
      setErrorMessage('فشل تحميل بيانات المبنى')
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
          plot_number: formData.plot_number,
          neighborhood: formData.neighborhood,
          description: formData.description,
          total_floors: formData.total_floors,
          total_units: formData.total_units,
          entrances: formData.entrances,
          parking_slots: formData.parking_slots,
          elevators: formData.elevators,
          driver_rooms: formData.driver_rooms,
          year_built: formData.year_built,
          phone: formData.phone,
          guard_name: formData.guard_name,
          guard_phone: formData.guard_phone,
          guard_room_number: formData.guard_room_number,
          guard_id_photo: formData.guard_id_photo,
          guard_shift: formData.guard_shift,
          guard_has_salary: formData.guard_has_salary,
          guard_salary_amount: formData.guard_salary_amount,
          owner_association: formData.owner_association,
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
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error saving building:', error)
      setErrorMessage('خطأ في حفظ التغييرات')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm('هل تريد حذف هذه الوحدة؟')) return
    try {
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', unitId)

      if (error) throw error
      setUnits(units.filter(u => u.id !== unitId))
      setSuccessMessage('تم حذف الوحدة بنجاح!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error deleting unit:', error)
      setErrorMessage('خطأ في حذف الوحدة')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">جاري تحميل بيانات المبنى...</p>
        </div>
      </div>
    )
  }

  if (!building) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">المبنى غير موجود</h1>
          <p className="text-gray-600 mb-6">لم نتمكن من العثور على بيانات هذا المبنى</p>
          <Link
            href="/dashboard/buildings"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            العودة إلى قائمة المباني
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" dir="rtl">
      {/* الشريط العلوي - تصميم محسّن */}
      <div className="bg-white/90 shadow-lg border-b-2 border-indigo-100 sticky top-0 z-20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-5">
              {/* زر الرجوع */}
              <Link
                href="/dashboard/buildings"
                className="inline-flex items-center justify-center p-2.5 rounded-2xl hover:bg-indigo-50 transition-all duration-300 group"
              >
                <span className="w-11 h-11 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  <ArrowLeft className="w-5 h-5 text-white" />
                </span>
              </Link>

              {/* اللوقو والنصوص */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
                  <Building2 className="w-7 h-7" />
                </div>
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {building.name}
                  </h1>
                  <p className="text-xs text-gray-500">رقم القطعة: {building.plot_number}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages - Alerts */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-3">
        {successMessage && (
          <div className="p-4 bg-green-50/90 backdrop-blur-sm border-r-4 border-green-500 rounded-2xl flex items-start gap-3 animate-fadeIn">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-green-800">نجح</h4>
              <p className="text-green-600 text-sm">{successMessage}</p>
            </div>
          </div>
        )}
        {errorMessage && (
          <div className="p-4 bg-red-50/90 backdrop-blur-sm border-r-4 border-red-500 rounded-2xl flex items-start gap-3 animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-800">خطأ</h4>
              <p className="text-red-600 text-sm">{errorMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isEditing ? (
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden border border-white/20 p-8 space-y-6 mb-8">
          <div className="border-t-4 border-indigo-500 pt-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Edit2 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">تعديل بيانات العمارة</h2>
            </div>
          </div>

          <form onSubmit={(e) => {e.preventDefault(); handleSave()}} className="space-y-6">
            {/* المعلومات الأساسية */}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </span>
                المعلومات الأساسية
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">اسم المبنى*</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">رقم القطعة*</label>
                  <input
                    type="text"
                    value={formData.plot_number || ''}
                    onChange={(e) => handleInputChange('plot_number', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">الحي</label>
                  <input
                    type="text"
                    value={formData.neighborhood || ''}
                    onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">سنة البناء</label>
                  <input
                    type="number"
                    value={formData.year_built || ''}
                    onChange={(e) => handleInputChange('year_built', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>
              </div>
              <div className="mt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">الوصف</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                />
              </div>
            </div>

            {/* الهيكل الأساسي */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Grid3x3 className="w-5 h-5 text-amber-600" />
                </span>
                الهيكل الأساسي للعمارة
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">عدد الأدوار</label>
                  <input
                    type="number"
                    value={formData.total_floors || ''}
                    onChange={(e) => handleInputChange('total_floors', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">عدد الوحدات</label>
                  <input
                    type="number"
                    value={formData.total_units || ''}
                    onChange={(e) => handleInputChange('total_units', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">عدد المصاعد</label>
                  <input
                    type="number"
                    value={formData.elevators || ''}
                    onChange={(e) => handleInputChange('elevators', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">عدد المداخل</label>
                  <input
                    type="number"
                    value={formData.entrances || ''}
                    onChange={(e) => handleInputChange('entrances', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">مواقف السيارات</label>
                  <input
                    type="number"
                    value={formData.parking_slots || ''}
                    onChange={(e) => handleInputChange('parking_slots', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">غرف السائقين</label>
                  <input
                    type="number"
                    value={formData.driver_rooms || ''}
                    onChange={(e) => handleInputChange('driver_rooms', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* معلومات الحارس */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-orange-600" />
                </span>
                معلومات الحارس
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">اسم الحارس</label>
                  <input
                    type="text"
                    value={formData.guard_name || ''}
                    onChange={(e) => handleInputChange('guard_name', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">رقم الحارس</label>
                  <input
                    type="tel"
                    value={formData.guard_phone || ''}
                    onChange={(e) => handleInputChange('guard_phone', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">رقم الغرفة</label>
                  <input
                    type="text"
                    value={formData.guard_room_number || ''}
                    onChange={(e) => handleInputChange('guard_room_number', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">فترة العمل</label>
                  <select
                    value={formData.guard_shift || ''}
                    onChange={(e) => handleInputChange('guard_shift', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  >
                    <option value="">اختر الفترة</option>
                    <option value="day">نهاري</option>
                    <option value="night">ليلي</option>
                    <option value="both">كلا الفترتين</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.guard_has_salary || false}
                      onChange={(e) => handleInputChange('guard_has_salary', e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded"
                    />
                    <span className="text-sm font-semibold text-gray-700">صرف راتب للحارس</span>
                  </label>
                </div>
                {formData.guard_has_salary && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">قيمة الراتب (ر.س)</label>
                    <input
                      type="number"
                      value={formData.guard_salary_amount || ''}
                      onChange={(e) => handleInputChange('guard_salary_amount', parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* أزرار الحفظ */}
            <div className="pt-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 transition-all duration-300 font-semibold"
              >
                <Save className="w-5 h-5" />
                {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
              <button
                onClick={() => {
                  setFormData(building)
                  setIsEditing(false)
                }}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-2xl hover:bg-gray-300 transition-all duration-300 font-semibold"
              >
                <X className="w-5 h-5" />
                إلغاء
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Basic Building Info Cards */}
          <div className="relative overflow-hidden rounded-3xl shadow-2xl">
              {/* Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pointer-events-none"></div>

              {/* Content */}
              <div className="relative bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">المعلومات الأساسية</h2>
                  </div>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 font-semibold text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    تعديل
                  </button>
                </div>

                {/* Cards in One Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Building Name Card */}
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-4 border-l-4 border-indigo-600 hover:shadow-lg transition-all duration-300">
                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-2">اسم المبنى</p>
                    <p className="text-lg font-bold text-gray-800">{building.name}</p>
                  </div>

                  {/* Plot Number Card */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 border-l-4 border-purple-600 hover:shadow-lg transition-all duration-300">
                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-widest mb-2">رقم القطعة</p>
                    <p className="text-lg font-bold text-gray-800">{building.plot_number}</p>
                  </div>

                  {/* Neighborhood Card */}
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-4 border-l-4 border-pink-600 hover:shadow-lg transition-all duration-300">
                    <p className="text-xs font-semibold text-pink-600 uppercase tracking-widest mb-2">الحي</p>
                    <p className="text-lg font-bold text-gray-800">{building.neighborhood || '-'}</p>
                  </div>

                  {/* Year Built Card */}
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4 border-l-4 border-orange-600 hover:shadow-lg transition-all duration-300">
                    <p className="text-xs font-semibold text-orange-600 uppercase tracking-widest mb-2">سنة البناء</p>
                    <p className="text-lg font-bold text-gray-800">{building.year_built || '-'}</p>
                  </div>
                </div>

                {/* Description Card - if exists */}
                {building.description && (
                  <div className="mt-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 border-l-4 border-slate-600">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-2">الوصف</p>
                    <p className="text-gray-750 leading-relaxed">{building.description}</p>
                  </div>
                )}
              </div>
            </div>

          {/* الهيكل الأساسي - Building Structure */}
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Grid3x3 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">الهيكل الأساسي للعمارة</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'الأدوار', value: building.total_floors, icon: <Building2 className="w-5 h-5" />, gradient: 'from-blue-500 to-blue-600' },
                { label: 'الوحدات', value: building.total_units, icon: <Home className="w-5 h-5" />, gradient: 'from-green-500 to-green-600' },
                { label: 'المصاعد', value: building.elevators, icon: <ArrowUp className="w-5 h-5" />, gradient: 'from-purple-500 to-purple-600' },
                { label: 'المداخل', value: building.entrances, icon: <DoorOpen className="w-5 h-5" />, gradient: 'from-orange-500 to-orange-600' },
                { label: 'المواقف', value: building.parking_slots, icon: <ParkingCircle className="w-5 h-5" />, gradient: 'from-red-500 to-red-600' },
                { label: 'غرف السائقين', value: building.driver_rooms, icon: <Users className="w-5 h-5" />, gradient: 'from-cyan-500 to-cyan-600' },
              ].map((item, index) => (
                <div
                  key={index}
                  className={`bg-gradient-to-br ${item.gradient} rounded-2xl p-4 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wide">{item.label}</span>
                    {item.icon}
                  </div>
                  <p className="text-3xl font-black">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* معلومات الحارس - Guard Information */}
          {building.guard_name && (
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">معلومات الحارس</h2>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 font-semibold text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  تعديل
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4 border-l-4 border-orange-600">
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-widest mb-2">الاسم</p>
                  <p className="text-lg font-bold text-gray-800">{building.guard_name}</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-4 border-l-4 border-red-600">
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-2">الرقم</p>
                  <p className="text-lg font-bold text-gray-800">{building.guard_phone || '-'}</p>
                </div>
                <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-4 border-l-4 border-pink-600">
                  <p className="text-xs font-semibold text-pink-600 uppercase tracking-widest mb-2">رقم الغرفة</p>
                  <p className="text-lg font-bold text-gray-800">{building.guard_room_number || '-'}</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-4 border-l-4 border-yellow-600">
                  <p className="text-xs font-semibold text-yellow-600 uppercase tracking-widest mb-2">فترة العمل</p>
                  <p className="text-lg font-bold text-gray-800">
                    {building.guard_shift === 'day' ? 'نهاري' : building.guard_shift === 'night' ? 'ليلي' : 'كلا الفترتين'}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border-l-4 border-green-600">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-widest mb-2">صرف راتب</p>
                  <p className="text-lg font-bold text-gray-800">{building.guard_has_salary ? 'نعم' : 'لا'}</p>
                </div>
                {building.guard_has_salary && building.guard_salary_amount && (
                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl p-4 border-l-4 border-cyan-600">
                    <p className="text-xs font-semibold text-cyan-600 uppercase tracking-widest mb-2">قيمة الراتب</p>
                    <p className="text-lg font-bold text-gray-800">{building.guard_salary_amount} ر.س</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Owner Association Card */}
          {building.owner_association?.hasAssociation && (
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">معلومات اتحاد الملاك</h2>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 font-semibold text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  تعديل
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-4 border-l-4 border-indigo-600">
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-2">اسم المسؤول</p>
                  <p className="text-lg font-bold text-gray-800">{building.owner_association.managerName || '-'}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border-l-4 border-blue-600">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2">رقم السجل</p>
                  <p className="text-lg font-bold text-gray-800">{building.owner_association.registrationNumber || '-'}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 border-l-4 border-purple-600">
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-widest mb-2">عدد الوحدات</p>
                  <p className="text-lg font-bold text-gray-800">{building.owner_association.registeredUnitsCount || '-'}</p>
                </div>
                <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-4 border-l-4 border-pink-600">
                  <p className="text-xs font-semibold text-pink-600 uppercase tracking-widest mb-2">رقم التواصل</p>
                  <p className="text-lg font-bold text-gray-800">{building.owner_association.contactNumber || '-'}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4 border-l-4 border-orange-600">
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-widest mb-2">الرسم الشهري</p>
                  <p className="text-lg font-bold text-gray-800">{building.owner_association.monthlyFee ? `${building.owner_association.monthlyFee} ر.س` : '-'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Units Section */}
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Home className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">الوحدات ({units.length})</h2>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 font-semibold text-sm"
            >
              <Edit2 className="w-4 h-4" />
              إدارة الوحدات
            </button>
          </div>

          {units.length === 0 ? (
            <p className="text-gray-500 text-center py-12">لا توجد وحدات</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-right px-4 py-4 text-sm font-bold text-gray-700 uppercase">الوحدة</th>
                    <th className="text-right px-4 py-4 text-sm font-bold text-gray-700 uppercase">الدور</th>
                    <th className="text-right px-4 py-4 text-sm font-bold text-gray-700 uppercase">النوع</th>
                    <th className="text-right px-4 py-4 text-sm font-bold text-gray-700 uppercase">الاتجاه</th>
                    <th className="text-right px-4 py-4 text-sm font-bold text-gray-700 uppercase">المساحة</th>
                    <th className="text-right px-4 py-4 text-sm font-bold text-gray-700 uppercase">الغرف</th>
                    <th className="text-right px-4 py-4 text-sm font-bold text-gray-700 uppercase">الحمامات</th>
                    <th className="text-right px-4 py-4 text-sm font-bold text-gray-700 uppercase">السعر</th>
                    <th className="text-right px-4 py-4 text-sm font-bold text-gray-700 uppercase">الحالة</th>
                    <th className="text-center px-4 py-4 text-sm font-bold text-gray-700 uppercase">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
{units.map((unit) => (
                    <tr key={unit.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{unit.unit_number}</td>
                      <td className="px-4 py-3 text-sm">{unit.floor}</td>
                      <td className="px-4 py-3 text-sm">{unit.type === 'apartment' ? 'شقة' : unit.type === 'studio' ? 'ملحق' : unit.type === 'duplex' ? 'دوبلكس' : 'بنتهاوس'}</td>
                      <td className="px-4 py-3 text-sm">{unit.facing === 'front' ? 'أمامية' : unit.facing === 'back' ? 'خلفية' : 'على شارعين'}</td>
                      <td className="px-4 py-3 text-sm">{unit.area} م²</td>
                      <td className="px-4 py-3 text-sm text-center">{unit.rooms}</td>
                      <td className="px-4 py-3 text-sm text-center">{unit.bathrooms}</td>
                      <td className="px-4 py-3 text-sm">{unit.price ? `${unit.price}` : '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          unit.status === 'available' ? 'bg-green-100 text-green-700' :
                          unit.status === 'reserved' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {unit.status === 'available' ? 'متاحة' : unit.status === 'reserved' ? 'محجوزة' : 'مباعة'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDeleteUnit(unit.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </>
      )}
      </div>
    </div>
  )
}

// Helper Components
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="group relative">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-lg p-4 border border-slate-200 hover:border-blue-300 transition-all duration-300 hover:shadow-md">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">{label}</p>
        <p className="text-lg font-bold text-slate-900 truncate relative z-10">{value}</p>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="relative group">
      <style>{`
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        @keyframes floatIn {
          0% { 
            opacity: 0;
            transform: translateY(10px);
          }
          100% { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        .stat-card {
          animation: floatIn 0.6s ease-out;
          position: relative;
          overflow: hidden;
        }
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transition: left 0.5s;
        }
        .stat-card:hover::before {
          left: 100%;
        }
        .stat-card:hover {
          transform: scale(1.08) translateY(-8px);
          box-shadow: 0 20px 30px -10px rgba(59, 130, 246, 0.3);
        }
      `}</style>
      <div className="stat-card bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 rounded-xl p-5 border-2 border-blue-200 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-blue-700 uppercase tracking-wide">{label}</p>
          <Icon className="w-5 h-5 text-blue-600 group-hover:rotate-12 transition-transform" />
        </div>
        <p className="text-3xl font-black text-blue-900">{value}</p>
        <div className="mt-2 h-1 bg-gradient-to-r from-blue-300 to-transparent rounded-full opacity-60"></div>
      </div>
    </div>
  )
}

