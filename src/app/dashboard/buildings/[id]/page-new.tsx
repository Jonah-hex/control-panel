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
  Grid3x3,
  Map,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit,
  DollarSign,
  Maximize2,
  Wind,
  User,
  Shield,
  FileText,
  Clock,
  Award
} from 'lucide-react'

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
  year_built: number | null
  phone: string | null
  guard_name: string | null
  guard_phone: string | null
  guard_id_number: string | null
  guard_shift: string | null
  latitude: number | null
  longitude: number | null
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
  area: number
  rooms: number
  bathrooms: number
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
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [showUnitModal, setShowUnitModal] = useState(false)

  const router = useRouter()
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

      // Fetch units
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
          year_built: formData.year_built,
          phone: formData.phone,
          guard_name: formData.guard_name,
          guard_phone: formData.guard_phone,
          guard_id_number: formData.guard_id_number,
          guard_shift: formData.guard_shift,
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">هاتف المبنى</label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
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
                <InfoRow label="هاتف المبنى" value={building.phone || '-'} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <StatCard label="الأدوار" value={building.total_floors} icon={Grid3x3} />
                <StatCard label="الوحدات" value={building.total_units} icon={Home} />
                <StatCard label="المصاعد" value={building.elevators} icon={Wind} />
                <StatCard label="المداخل" value={building.entrances} icon={Maximize2} />
                <StatCard label="المواقف" value={building.parking_slots} icon={Wind} />
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
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">المساحة</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">السعر</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">الحالة</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-slate-700">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((unit) => (
                    <tr key={unit.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-sm">{unit.unit_number}</td>
                      <td className="px-4 py-3 text-sm">{unit.floor}</td>
                      <td className="px-4 py-3 text-sm">{unit.type}</td>
                      <td className="px-4 py-3 text-sm">{unit.area} م²</td>
                      <td className="px-4 py-3 text-sm">{unit.price ? `${unit.price} ر.س` : '-'}</td>
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
    <div>
      <p className="text-sm font-medium text-slate-600 mb-1">{label}</p>
      <p className="text-slate-900">{value}</p>
    </div>
  )
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-blue-700">{label}</p>
        <Icon className="w-4 h-4 text-blue-600" />
      </div>
      <p className="text-2xl font-bold text-blue-900">{value}</p>
    </div>
  )
}
