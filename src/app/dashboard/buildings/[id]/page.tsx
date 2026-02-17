'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  ArrowUp,
  Building2,
  CheckCircle,
  ChevronDown,
  DoorOpen,
  Edit2,
  Home,
  Save,
  Trash2,
  Wind,
  X
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
  const [openSection, setOpenSection] = useState('basic')

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

  const formatValue = (value: any) => {
    if (value === null || value === undefined || value === '') return '-'
    return String(value)
  }

  const formatBool = (value?: boolean | null) => {
    if (value === null || value === undefined) return '-'
    return value ? 'نعم' : 'لا'
  }

  const formatCurrency = (value?: number | null) => {
    if (value === null || value === undefined) return '-'
    return `${value} ر.س`
  }

  const guardShiftLabel = useMemo(() => {
    if (building?.guard_shift === 'day') return 'نهاري'
    if (building?.guard_shift === 'night') return 'ليلي'
    if (building?.guard_shift === 'both') return 'كلا الفترتين'
    return '-'
  }, [building?.guard_shift])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-semibold">جاري تحميل بيانات المبنى...</p>
        </div>
      </div>
    )
  }

  if (!building) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">المبنى غير موجود</h1>
          <p className="text-gray-600 mb-6">لم نتمكن من العثور على بيانات هذا المبنى</p>
          <Link
            href="/dashboard/buildings"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            العودة إلى قائمة المباني
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-900"
      dir="rtl"
      style={{ fontFamily: '"Tajawal", "Cairo", "Noto Kufi Arabic", sans-serif' }}
    >
      <div className="relative">
        <div className="bg-white/90 shadow-lg border-b-2 border-indigo-100 sticky top-0 z-20 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-5">
                <Link
                  href="/dashboard/buildings"
                  className="inline-flex items-center justify-center p-2.5 rounded-2xl hover:bg-indigo-50 transition-all duration-300 group"
                >
                  <span className="w-11 h-11 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </span>
                </Link>

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

              <div className="flex items-center gap-3">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl transform transition-all duration-300 hover:-translate-y-0.5 hover:scale-105"
                  >
                    <Edit2 className="w-5 h-5" />
                    <span className="text-sm font-bold">تعديل البيانات</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl transform transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 disabled:opacity-60"
                    >
                      <Save className="w-5 h-5" />
                      <span className="text-sm font-bold">{isSaving ? 'جاري الحفظ...' : 'حفظ'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setFormData(building)
                        setIsEditing(false)
                      }}
                      className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition"
                    >
                      <X className="w-5 h-5" />
                      <span className="text-sm font-bold">إلغاء</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile label="الأدوار" value={building.total_floors} icon={<ArrowUp className="w-5 h-5" />} />
            <StatTile label="الوحدات" value={building.total_units} icon={<Home className="w-5 h-5" />} />
            <StatTile label="المصاعد" value={building.elevators} icon={<Wind className="w-5 h-5" />} />
            <StatTile label="المداخل" value={building.entrances} icon={<DoorOpen className="w-5 h-5" />} />
          </div>

          <div className="mt-6 space-y-3">
            {successMessage && (
              <div className="p-4 bg-green-50/90 backdrop-blur-sm border-r-4 border-green-500 rounded-2xl flex items-start gap-3 animate-fadeIn">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-800 mb-1">تم بنجاح</h4>
                  <p className="text-green-600 text-sm">{successMessage}</p>
                </div>
              </div>
            )}
            {errorMessage && (
              <div className="p-4 bg-red-50/90 backdrop-blur-sm border-r-4 border-red-500 rounded-2xl flex items-start gap-3 animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-800 mb-1">خطأ</h4>
                  <p className="text-red-600 text-sm">{errorMessage}</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-10">
            {isEditing ? (
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden border border-white/20 p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">تعديل بيانات العمارة</h2>
                <form onSubmit={(e) => { e.preventDefault(); handleSave() }} className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">المعلومات الأساسية</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Field label="اسم المبنى*">
                        <input
                          type="text"
                          value={formData.name || ''}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className={fieldInputClass}
                        />
                      </Field>
                      <Field label="رقم القطعة*">
                        <input
                          type="text"
                          value={formData.plot_number || ''}
                          onChange={(e) => handleInputChange('plot_number', e.target.value)}
                          className={fieldInputClass}
                        />
                      </Field>
                      <Field label="الحي">
                        <input
                          type="text"
                          value={formData.neighborhood || ''}
                          onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                          className={fieldInputClass}
                        />
                      </Field>
                      <Field label="سنة البناء">
                        <input
                          type="number"
                          value={formData.year_built || ''}
                          onChange={(e) => handleInputChange('year_built', parseInt(e.target.value))}
                          className={fieldInputClass}
                        />
                      </Field>
                    </div>
                    <Field label="الوصف" className="mt-4">
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={4}
                        className={fieldInputClass}
                      />
                    </Field>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">الهيكل الأساسي</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <Field label="عدد الأدوار">
                        <input
                          type="number"
                          value={formData.total_floors || ''}
                          onChange={(e) => handleInputChange('total_floors', parseInt(e.target.value))}
                          className={fieldInputClass}
                        />
                      </Field>
                      <Field label="عدد الوحدات">
                        <input
                          type="number"
                          value={formData.total_units || ''}
                          onChange={(e) => handleInputChange('total_units', parseInt(e.target.value))}
                          className={fieldInputClass}
                        />
                      </Field>
                      <Field label="عدد المصاعد">
                        <input
                          type="number"
                          value={formData.elevators || ''}
                          onChange={(e) => handleInputChange('elevators', parseInt(e.target.value))}
                          className={fieldInputClass}
                        />
                      </Field>
                      <Field label="عدد المداخل">
                        <input
                          type="number"
                          value={formData.entrances || ''}
                          onChange={(e) => handleInputChange('entrances', parseInt(e.target.value))}
                          className={fieldInputClass}
                        />
                      </Field>
                      <Field label="مواقف السيارات">
                        <input
                          type="number"
                          value={formData.parking_slots || ''}
                          onChange={(e) => handleInputChange('parking_slots', parseInt(e.target.value))}
                          className={fieldInputClass}
                        />
                      </Field>
                      <Field label="غرف السائقين">
                        <input
                          type="number"
                          value={formData.driver_rooms || ''}
                          onChange={(e) => handleInputChange('driver_rooms', parseInt(e.target.value))}
                          className={fieldInputClass}
                        />
                      </Field>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">معلومات الحارس</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Field label="اسم الحارس">
                        <input
                          type="text"
                          value={formData.guard_name || ''}
                          onChange={(e) => handleInputChange('guard_name', e.target.value)}
                          className={fieldInputClass}
                        />
                      </Field>
                      <Field label="رقم الحارس">
                        <input
                          type="tel"
                          value={formData.guard_phone || ''}
                          onChange={(e) => handleInputChange('guard_phone', e.target.value)}
                          className={fieldInputClass}
                        />
                      </Field>
                      <Field label="رقم الغرفة">
                        <input
                          type="text"
                          value={formData.guard_room_number || ''}
                          onChange={(e) => handleInputChange('guard_room_number', e.target.value)}
                          className={fieldInputClass}
                        />
                      </Field>
                      <Field label="فترة العمل">
                        <select
                          value={formData.guard_shift || ''}
                          onChange={(e) => handleInputChange('guard_shift', e.target.value)}
                          className={fieldInputClass}
                        >
                          <option value="">اختر الفترة</option>
                          <option value="day">نهاري</option>
                          <option value="night">ليلي</option>
                          <option value="both">كلا الفترتين</option>
                        </select>
                      </Field>
                      <Field label="صرف راتب">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.guard_has_salary || false}
                            onChange={(e) => handleInputChange('guard_has_salary', e.target.checked)}
                            className="w-5 h-5 text-indigo-600 rounded"
                          />
                          <span>صرف راتب للحارس</span>
                        </label>
                      </Field>
                      {formData.guard_has_salary && (
                        <Field label="قيمة الراتب (ر.س)">
                          <input
                            type="number"
                            value={formData.guard_salary_amount || ''}
                            onChange={(e) => handleInputChange('guard_salary_amount', parseInt(e.target.value))}
                            className={fieldInputClass}
                          />
                        </Field>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 transition-all duration-300 font-semibold"
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
              <div className="space-y-4">
                <AccordionSection
                  title="المعلومات الأساسية"
                  isOpen={openSection === 'basic'}
                  onToggle={() => setOpenSection(openSection === 'basic' ? '' : 'basic')}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <InfoItem label="اسم المبنى" value={formatValue(building.name)} />
                    <InfoItem label="رقم القطعة" value={formatValue(building.plot_number)} />
                    <InfoItem label="الحي" value={formatValue(building.neighborhood)} />
                    <InfoItem label="سنة البناء" value={formatValue(building.year_built)} />
                    <InfoItem label="رقم الهاتف" value={formatValue(building.phone)} />
                    <InfoItem label="نوع الشارع" value={formatValue(building.street_type)} />
                    <InfoItem label="واجهة المبنى" value={formatValue(building.building_facing)} />
                    <InfoItem label="رابط خرائط Google" value={formatValue(building.google_maps_link)} />
                    <InfoItem label="الوصف" value={formatValue(building.description)} />
                  </div>
                </AccordionSection>

                <AccordionSection
                  title="هيكل العمارة"
                  isOpen={openSection === 'structure'}
                  onToggle={() => setOpenSection(openSection === 'structure' ? '' : 'structure')}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <InfoItem label="عدد الأدوار" value={formatValue(building.total_floors)} />
                    <InfoItem label="عدد الوحدات" value={formatValue(building.total_units)} />
                    <InfoItem label="عدد المداخل" value={formatValue(building.entrances)} />
                    <InfoItem label="عدد المواقف" value={formatValue(building.parking_slots)} />
                    <InfoItem label="عدد المصاعد" value={formatValue(building.elevators)} />
                    <InfoItem label="غرف السائقين" value={formatValue(building.driver_rooms)} />
                  </div>
                </AccordionSection>

                <AccordionSection
                  title="بيانات الحارس"
                  isOpen={openSection === 'guard'}
                  onToggle={() => setOpenSection(openSection === 'guard' ? '' : 'guard')}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <InfoItem label="اسم الحارس" value={formatValue(building.guard_name)} />
                    <InfoItem label="رقم الحارس" value={formatValue(building.guard_phone)} />
                    <InfoItem label="رقم غرفة الحارس" value={formatValue(building.guard_room_number)} />
                    <InfoItem label="فترة العمل" value={guardShiftLabel} />
                    <InfoItem label="صرف راتب" value={formatBool(building.guard_has_salary)} />
                    <InfoItem label="قيمة الراتب" value={formatCurrency(building.guard_salary_amount)} />
                    <InfoItem label="صورة الهوية" value={formatValue(building.guard_id_photo)} />
                  </div>
                </AccordionSection>

                <AccordionSection
                  title="لجنة الملاك"
                  isOpen={openSection === 'committee'}
                  onToggle={() => setOpenSection(openSection === 'committee' ? '' : 'committee')}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <InfoItem label="اسم اللجنة" value={formatValue(building.owners_committee_name)} />
                    <InfoItem label="رئيس اللجنة" value={formatValue(building.owners_committee_chairman)} />
                    <InfoItem label="هاتف اللجنة" value={formatValue(building.owners_committee_phone)} />
                    <InfoItem label="بريد اللجنة" value={formatValue(building.owners_committee_email)} />
                    <InfoItem label="جدول الاجتماعات" value={formatValue(building.owners_committee_meeting_schedule)} />
                  </div>
                </AccordionSection>

                <AccordionSection
                  title="اتحاد الملاك"
                  isOpen={openSection === 'association'}
                  onToggle={() => setOpenSection(openSection === 'association' ? '' : 'association')}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <InfoItem label="يوجد اتحاد" value={formatBool(building.owner_association?.hasAssociation)} />
                    <InfoItem label="تاريخ البداية" value={formatValue(building.owner_association?.startDate)} />
                    <InfoItem label="تاريخ النهاية" value={formatValue(building.owner_association?.endDate)} />
                    <InfoItem label="الرسوم الشهرية" value={formatCurrency(building.owner_association?.monthlyFee)} />
                    <InfoItem label="رقم التواصل" value={formatValue(building.owner_association?.contactNumber)} />
                    <InfoItem label="اسم المسؤول" value={formatValue(building.owner_association?.managerName)} />
                    <InfoItem label="رقم السجل" value={formatValue(building.owner_association?.registrationNumber)} />
                    <InfoItem label="عدد الوحدات المسجلة" value={formatValue(building.owner_association?.registeredUnitsCount)} />
                    <InfoItem label="IBAN" value={formatValue(building.owner_association?.iban)} />
                    <InfoItem label="رقم الحساب" value={formatValue(building.owner_association?.accountNumber)} />
                    <InfoItem label="يشمل الكهرباء" value={formatBool(building.owner_association?.includesElectricity)} />
                    <InfoItem label="يشمل الماء" value={formatBool(building.owner_association?.includesWater)} />
                  </div>
                </AccordionSection>

                <AccordionSection
                  title={`الوحدات (${units.length})`}
                  isOpen={openSection === 'units'}
                  onToggle={() => setOpenSection(openSection === 'units' ? '' : 'units')}
                >
                  {units.length === 0 ? (
                    <p className="text-gray-500 font-semibold">لا توجد وحدات</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-gray-200">
                            <th className="text-right px-4 py-3 font-bold text-gray-700">الوحدة</th>
                            <th className="text-right px-4 py-3 font-bold text-gray-700">الدور</th>
                            <th className="text-right px-4 py-3 font-bold text-gray-700">النوع</th>
                            <th className="text-right px-4 py-3 font-bold text-gray-700">الاتجاه</th>
                            <th className="text-right px-4 py-3 font-bold text-gray-700">المساحة</th>
                            <th className="text-right px-4 py-3 font-bold text-gray-700">الغرف</th>
                            <th className="text-right px-4 py-3 font-bold text-gray-700">الحمامات</th>
                            <th className="text-right px-4 py-3 font-bold text-gray-700">السعر</th>
                            <th className="text-right px-4 py-3 font-bold text-gray-700">الحالة</th>
                            <th className="text-center px-4 py-3 font-bold text-gray-700">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {units.map((unit) => (
                            <tr key={unit.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                              <td className="px-4 py-3 font-semibold text-gray-900">{unit.unit_number}</td>
                              <td className="px-4 py-3">{unit.floor}</td>
                              <td className="px-4 py-3">
                                {unit.type === 'apartment'
                                  ? 'شقة'
                                  : unit.type === 'studio'
                                    ? 'ملحق'
                                    : unit.type === 'duplex'
                                      ? 'دوبلكس'
                                      : 'بنتهاوس'}
                              </td>
                              <td className="px-4 py-3">
                                {unit.facing === 'front'
                                  ? 'أمامية'
                                  : unit.facing === 'back'
                                    ? 'خلفية'
                                    : 'على شارعين'}
                              </td>
                              <td className="px-4 py-3">{unit.area} م²</td>
                              <td className="px-4 py-3 text-center">{unit.rooms}</td>
                              <td className="px-4 py-3 text-center">{unit.bathrooms}</td>
                              <td className="px-4 py-3">{unit.price ? `${unit.price}` : '-'}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                                  unit.status === 'available'
                                    ? 'bg-green-100 text-green-700'
                                    : unit.status === 'reserved'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-rose-100 text-rose-700'
                                }`}>
                                  {unit.status === 'available' ? 'متاحة' : unit.status === 'reserved' ? 'محجوزة' : 'مباعة'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleDeleteUnit(unit.id)}
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-full transition"
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
                </AccordionSection>

                <AccordionSection
                  title="بيانات النظام"
                  isOpen={openSection === 'system'}
                  onToggle={() => setOpenSection(openSection === 'system' ? '' : 'system')}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <InfoItem label="تاريخ الإنشاء" value={formatValue(building.created_at)} />
                    <InfoItem label="آخر تحديث" value={formatValue(building.updated_at)} />
                    <InfoItem label="معرف المالك" value={formatValue(building.owner_id)} />
                  </div>
                </AccordionSection>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatTile({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-white/80 backdrop-blur-lg border border-white/30 rounded-2xl p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">{label}</p>
          <p className="text-2xl font-black text-gray-900 mt-2">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
          {icon}
        </div>
      </div>
    </div>
  )
}

function AccordionSection({
  title,
  isOpen,
  onToggle,
  children
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="bg-white/80 backdrop-blur-lg border border-white/30 rounded-3xl shadow-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-right hover:bg-indigo-50 transition"
      >
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-500">قسم</p>
          <h3 className="text-xl font-black text-gray-900">{title}</h3>
        </div>
        <div className={`w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center transition ${
          isOpen ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rotate-180' : 'bg-white text-indigo-600'
        }`}>
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>
      <div className={`px-6 pb-6 transition-all duration-300 ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        {isOpen && <div className="pt-2">{children}</div>}
      </div>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-white border border-gray-200 rounded-2xl p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-indigo-600 font-bold mb-2">{label}</p>
      <p className="text-base font-bold text-gray-900 break-words">{value}</p>
    </div>
  )
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
      {children}
    </div>
  )
}

const fieldInputClass =
  'w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition text-gray-700'

