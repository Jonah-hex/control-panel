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
  Users
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/buildings"
                className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{building.name}</h1>
                <p className="text-sm text-slate-500">رقم القطعة: {building.plot_number}</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (isEditing) {
                  setFormData(building)
                  setIsEditing(false)
                } else {
                  setIsEditing(true)
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                isEditing
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              {isEditing ? (
                <>
                  <X className="w-4 h-4" />
                  إلغاء
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4" />
                  تعديل
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 p-4 text-green-700">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p>{successMessage}</p>
        </div>
      )}
      {errorMessage && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Information */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            المعلومات الأساسية
          </h2>

          {isEditing ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">اسم المبنى*</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">رقم القطعة*</label>
                  <input
                    type="text"
                    value={formData.plot_number || ''}
                    onChange={(e) => handleInputChange('plot_number', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">الحي</label>
                  <input
                    type="text"
                    value={formData.neighborhood || ''}
                    onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">سنة البناء</label>
                  <input
                    type="number"
                    value={formData.year_built || ''}
                    onChange={(e) => handleInputChange('year_built', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">الوصف</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">عدد الأدوار</label>
                  <input
                    type="number"
                    value={formData.total_floors || ''}
                    onChange={(e) => handleInputChange('total_floors', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">عدد الوحدات</label>
                  <input
                    type="number"
                    value={formData.total_units || ''}
                    onChange={(e) => handleInputChange('total_units', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">عدد المصاعد</label>
                  <input
                    type="number"
                    value={formData.elevators || ''}
                    onChange={(e) => handleInputChange('elevators', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">عدد المداخل</label>
                  <input
                    type="number"
                    value={formData.entrances || ''}
                    onChange={(e) => handleInputChange('entrances', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">مواقف السيارات</label>
                  <input
                    type="number"
                    value={formData.parking_slots || ''}
                    onChange={(e) => handleInputChange('parking_slots', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">غرف السائقين</label>
                  <input
                    type="number"
                    value={formData.driver_rooms || ''}
                    onChange={(e) => handleInputChange('driver_rooms', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Guard Information Section */}
              <div className="pt-6 border-t border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-600" />
                  معلومات الحارس
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">اسم الحارس</label>
                    <input
                      type="text"
                      value={formData.guard_name || ''}
                      onChange={(e) => handleInputChange('guard_name', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">رقم الحارس</label>
                    <input
                      type="tel"
                      value={formData.guard_phone || ''}
                      onChange={(e) => handleInputChange('guard_phone', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="05xxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">رقم غرفة الحارس</label>
                    <input
                      type="text"
                      value={formData.guard_room_number || ''}
                      onChange={(e) => handleInputChange('guard_room_number', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">فترة العمل</label>
                    <select
                      value={formData.guard_shift || ''}
                      onChange={(e) => handleInputChange('guard_shift', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <span className="text-sm font-medium text-slate-700">صرف راتب للحارس</span>
                    </label>
                  </div>
                  {formData.guard_has_salary && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">قيمة الراتب (ر.س)</label>
                      <input
                        type="number"
                        value={formData.guard_salary_amount || ''}
                        onChange={(e) => handleInputChange('guard_salary_amount', parseInt(e.target.value))}
                        min="0"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Owner Association Section */}
              <div className="pt-6 border-t border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  معلومات اتحاد الملاك
                </h3>
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.owner_association?.hasAssociation || false}
                      onChange={(e) => handleInputChange('owner_association', {
                        ...(formData.owner_association || {}),
                        hasAssociation: e.target.checked
                      })}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium text-slate-700">يوجد اتحاد ملاك للعمارة</span>
                  </label>
                </div>
                {formData.owner_association?.hasAssociation && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">اسم مسؤول الاتحاد</label>
                      <input
                        type="text"
                        value={formData.owner_association?.managerName || ''}
                        onChange={(e) => handleInputChange('owner_association', {
                          ...(formData.owner_association || {}),
                          managerName: e.target.value
                        })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">رقم سجل الاتحاد</label>
                      <input
                        type="text"
                        value={formData.owner_association?.registrationNumber || ''}
                        onChange={(e) => handleInputChange('owner_association', {
                          ...(formData.owner_association || {}),
                          registrationNumber: e.target.value
                        })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">عدد الوحدات المسجلة</label>
                      <input
                        type="number"
                        value={formData.owner_association?.registeredUnitsCount || ''}
                        onChange={(e) => handleInputChange('owner_association', {
                          ...(formData.owner_association || {}),
                          registeredUnitsCount: parseInt(e.target.value) || 0
                        })}
                        min="0"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">رقم التواصل</label>
                      <input
                        type="tel"
                        value={formData.owner_association?.contactNumber || ''}
                        onChange={(e) => handleInputChange('owner_association', {
                          ...(formData.owner_association || {}),
                          contactNumber: e.target.value
                        })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="05xxxxxxxx"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">رقم الآيبان</label>
                      <input
                        type="text"
                        value={formData.owner_association?.iban || ''}
                        onChange={(e) => handleInputChange('owner_association', {
                          ...(formData.owner_association || {}),
                          iban: e.target.value
                        })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="SA0000000000000000000000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">رقم الحساب</label>
                      <input
                        type="text"
                        value={formData.owner_association?.accountNumber || ''}
                        onChange={(e) => handleInputChange('owner_association', {
                          ...(formData.owner_association || {}),
                          accountNumber: e.target.value
                        })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">تاريخ البداية</label>
                      <input
                        type="date"
                        value={formData.owner_association?.startDate || ''}
                        onChange={(e) => handleInputChange('owner_association', {
                          ...(formData.owner_association || {}),
                          startDate: e.target.value
                        })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">تاريخ النهاية</label>
                      <input
                        type="date"
                        value={formData.owner_association?.endDate || ''}
                        onChange={(e) => handleInputChange('owner_association', {
                          ...(formData.owner_association || {}),
                          endDate: e.target.value
                        })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">الرسم الشهري (ر.س)</label>
                      <input
                        type="number"
                        value={formData.owner_association?.monthlyFee || ''}
                        onChange={(e) => handleInputChange('owner_association', {
                          ...(formData.owner_association || {}),
                          monthlyFee: parseInt(e.target.value) || 0
                        })}
                        min="0"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">الرسوم تشمل</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.owner_association?.includesElectricity || false}
                            onChange={(e) => handleInputChange('owner_association', {
                              ...(formData.owner_association || {}),
                              includesElectricity: e.target.checked
                            })}
                            className="w-5 h-5 text-blue-600 rounded"
                          />
                          <span className="text-sm font-medium text-slate-700">فواتير الكهرباء</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.owner_association?.includesWater || false}
                            onChange={(e) => handleInputChange('owner_association', {
                              ...(formData.owner_association || {}),
                              includesWater: e.target.checked
                            })}
                            className="w-5 h-5 text-blue-600 rounded"
                          />
                          <span className="text-sm font-medium text-slate-700">فواتير المياه</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-slate-200">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 transition"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <InfoRow label="اسم المبنى" value={building.name} />
                <InfoRow label="رقم القطعة" value={building.plot_number} />
                <InfoRow label="الحي" value={building.neighborhood || '-'} />
                <InfoRow label="سنة البناء" value={building.year_built?.toString() || '-'} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <StatCard label="الأدوار" value={building.total_floors} icon={Grid3x3} />
                <StatCard label="الوحدات" value={building.total_units} icon={Home} />
                <StatCard label="المصاعد" value={building.elevators} icon={Wind} />
                <StatCard label="المداخل" value={building.entrances} icon={Maximize2} />
                <StatCard label="المواقف" value={building.parking_slots} icon={Wind} />
                <StatCard label="غرف السائقين" value={building.driver_rooms} icon={Users} />
              </div>
              {building.description && (
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-600 mb-2">الوصف:</p>
                  <p className="text-slate-700">{building.description}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Guard Information Section */}
        {!isEditing && building.guard_name && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-600" />
              معلومات الحارس
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="اسم الحارس" value={building.guard_name || '-'} />
              <InfoRow label="رقم الحارس" value={building.guard_phone || '-'} />
              <InfoRow label="رقم غرفة الحارس" value={building.guard_room_number || '-'} />
              <InfoRow label="فترة العمل" value={building.guard_shift === 'day' ? 'نهاري' : building.guard_shift === 'night' ? 'ليلي' : building.guard_shift === 'both' ? 'كلا الفترتين' : '-'} />
              <InfoRow label="صرف راتب" value={building.guard_has_salary ? 'نعم' : 'لا'} />
              {building.guard_has_salary && building.guard_salary_amount && (
                <InfoRow label="قيمة الراتب" value={`${building.guard_salary_amount} ر.س`} />
              )}
            </div>
          </div>
        )}

        {/* Owner Association Section */}
        {!isEditing && building.owner_association?.hasAssociation && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              معلومات اتحاد الملاك
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="اسم مسؤول الاتحاد" value={building.owner_association.managerName || '-'} />
              <InfoRow label="رقم سجل الاتحاد" value={building.owner_association.registrationNumber || '-'} />
              <InfoRow label="عدد الوحدات المسجلة" value={building.owner_association.registeredUnitsCount?.toString() || '-'} />
              <InfoRow label="رقم التواصل" value={building.owner_association.contactNumber || '-'} />
              <InfoRow label="رقم الآيبان" value={building.owner_association.iban || '-'} />
              <InfoRow label="رقم الحساب" value={building.owner_association.accountNumber || '-'} />
              <InfoRow label="تاريخ البداية" value={building.owner_association.startDate || '-'} />
              <InfoRow label="تاريخ النهاية" value={building.owner_association.endDate || '-'} />
              <InfoRow label="الرسم الشهري" value={building.owner_association.monthlyFee ? `${building.owner_association.monthlyFee} ر.س` : '-'} />
              <div className="md:col-span-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">الرسوم تشمل</p>
                <div className="flex gap-4">
                  {building.owner_association.includesElectricity && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">فواتير الكهرباء</span>
                  )}
                  {building.owner_association.includesWater && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">فواتير المياه</span>
                  )}
                  {!building.owner_association.includesElectricity && !building.owner_association.includesWater && (
                    <span className="text-slate-500">لا توجد خدمات مشمولة</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Units Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Home className="w-5 h-5 text-blue-600" />
            الوحدات ({units.length})
          </h2>

          {units.length === 0 ? (
            <p className="text-slate-500 text-center py-8">لا توجد وحدات</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
<thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">الوحدة</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">الدور</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">النوع</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">الاتجاه</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">المساحة</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">الغرف</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">الحمامات</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">السعر</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">الحالة</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-slate-700">الإجراءات</th>
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

