'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { showToast } from '@/app/dashboard/buildings/details/toast'
import { phoneDigitsOnly, isValidPhone10Digits } from '@/lib/validation-utils'
import {
  Settings,
  UserPlus,
  Users,
  Pencil,
  Trash2,
  X,
  Check,
  ChevronLeft,
  RefreshCw,
  LayoutDashboard,
  ListChecks,
} from 'lucide-react'

/** يولد كلمة مرور مؤقتة عشوائية (12 حرفاً: حروف كبيرة/صغيرة وأرقام) وفق سياسة النظام (6 أحرف على الأقل) */
function generateTemporaryPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const all = upper + lower + digits
  let p = ''
  p += upper[Math.floor(Math.random() * upper.length)]
  p += lower[Math.floor(Math.random() * lower.length)]
  p += digits[Math.floor(Math.random() * digits.length)]
  for (let i = 0; i < 9; i++) p += all[Math.floor(Math.random() * all.length)]
  return p.split('').sort(() => Math.random() - 0.5).join('')
}

export type PermissionKey =
  | 'dashboard'
  | 'buildings'
  | 'buildings_create'
  | 'buildings_edit'
  | 'building_details'
  | 'buildings_delete'
  | 'details_basic'
  | 'details_basic_edit'
  | 'details_building'
  | 'details_building_edit'
  | 'details_facilities'
  | 'details_facilities_edit'
  | 'details_guard'
  | 'details_guard_edit'
  | 'details_location'
  | 'details_location_edit'
  | 'details_association'
  | 'details_association_edit'
  | 'details_engineering'
  | 'details_engineering_edit'
  | 'details_electricity'
  | 'details_electricity_edit'
  | 'details_driver_rooms'
  | 'details_driver_rooms_edit'
  | 'details_elevators_maintenance'
  | 'details_elevators_maintenance_edit'
  | 'units'
  | 'units_edit'
  | 'deeds'
  | 'statistics'
  | 'activities'
  | 'reports'
  | 'reservations'
  | 'sales'
  | 'marketing_cancel_reservation'
  | 'marketing_complete_sale'
  | 'marketing_building_details'
  | 'documents_edit_folders'
  | 'security'
  | 'settings'

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  dashboard: 'لوحة التحكم',
  buildings: 'قائمة العماير',
  buildings_create: 'إضافة عمارة جديدة',
  buildings_edit: 'تعديل بيانات العماير (أزرار التعديل داخل التفاصيل)',
  building_details: 'عرض صفحة تفاصيل المبنى',
  buildings_delete: 'حذف العمارة',
  details_basic: 'معلومات أساسية',
  details_basic_edit: 'تعديل',
  details_building: 'معلومات المبنى',
  details_building_edit: 'تعديل',
  details_facilities: 'المرافق والتأمين',
  details_facilities_edit: 'تعديل',
  details_guard: 'بيانات الحارس',
  details_guard_edit: 'تعديل',
  details_location: 'الموقع والصور',
  details_location_edit: 'تعديل',
  details_association: 'اتحاد الملاك',
  details_association_edit: 'تعديل',
  details_engineering: 'المكتب الهندسي',
  details_engineering_edit: 'تعديل',
  documents_edit_folders: 'تعديل المجلدات',
  details_electricity: 'عدادات الكهرباء',
  details_electricity_edit: 'تعديل',
  details_driver_rooms: 'غرف السائق',
  details_driver_rooms_edit: 'تعديل',
  details_elevators_maintenance: 'المصاعد والصيانة',
  details_elevators_maintenance_edit: 'تعديل',
  units: 'معاينة الوحدات',
  units_edit: 'تعديل الوحدات',
  deeds: 'الصكوك ومحاضر الفرز',
  statistics: 'الإحصائيات',
  activities: 'النشاطات',
  reports: 'التقارير',
  reservations: 'سجل الحجوزات',
  sales: 'سجل المبيعات',
  marketing_cancel_reservation: 'زر: إلغاء الحجز (في الحجوزات)',
  marketing_complete_sale: 'زر: إتمام البيع (في الحجوزات)',
  marketing_building_details: 'زر: تفاصيل المبنى (في الحجوزات)',
  security: 'الأمان',
  settings: 'الإعدادات المتقدمة',
}

// تجميع الصلاحيات لعرضها في المودال (لوحة التحكم ثابتة دائماً ولا تظهر؛ الصكوك أُلغيت)
const PERMISSION_GROUPS: { title: string; keys: PermissionKey[] }[] = [
  { title: 'العماير', keys: ['buildings', 'building_details', 'buildings_create', 'buildings_edit', 'buildings_delete'] },
  { title: 'الوحدات', keys: ['units', 'units_edit'] },
  { title: 'التسويق والحجوزات', keys: ['reservations', 'sales', 'marketing_cancel_reservation', 'marketing_complete_sale', 'marketing_building_details'] },
  { title: 'التقارير والإحصائيات', keys: ['statistics', 'activities', 'reports'] },
  { title: 'الأمان والإعدادات', keys: ['security', 'settings'] },
]

// تفاصيل المبنى: صف واحد لكل قسم مع سوتش معاينة + سوتش تعديل (+ سوتش إضافي اختياري)
const CARD_PERMISSION_ROWS: {
  label: string
  viewKey: PermissionKey
  editKey: PermissionKey
  extraKey?: { key: PermissionKey; label: string }
}[] = [
  { label: 'تفاصيل: معلومات أساسية', viewKey: 'details_basic', editKey: 'details_basic_edit' },
  { label: 'تفاصيل: معلومات المبنى', viewKey: 'details_building', editKey: 'details_building_edit' },
  { label: 'تفاصيل: المرافق والتأمين', viewKey: 'details_facilities', editKey: 'details_facilities_edit' },
  { label: 'تفاصيل: بيانات الحارس', viewKey: 'details_guard', editKey: 'details_guard_edit' },
  { label: 'تفاصيل: الموقع والصور', viewKey: 'details_location', editKey: 'details_location_edit' },
  { label: 'تفاصيل: اتحاد الملاك', viewKey: 'details_association', editKey: 'details_association_edit' },
  {
    label: 'تفاصيل: المكتب الهندسي',
    viewKey: 'details_engineering',
    editKey: 'details_engineering_edit',
    extraKey: { key: 'documents_edit_folders', label: 'تعديل المجلدات' },
  },
  { label: 'تفاصيل: عدادات الكهرباء', viewKey: 'details_electricity', editKey: 'details_electricity_edit' },
  { label: 'تفاصيل: غرف السائق', viewKey: 'details_driver_rooms', editKey: 'details_driver_rooms_edit' },
  { label: 'تفاصيل: المصاعد والصيانة', viewKey: 'details_elevators_maintenance', editKey: 'details_elevators_maintenance_edit' },
]

const DEFAULT_PERMISSIONS: Record<PermissionKey, boolean> = {
  dashboard: true,
  buildings: true,
  buildings_create: true,
  buildings_edit: true,
  building_details: true,
  buildings_delete: true,
  details_basic: true,
  details_basic_edit: true,
  details_building: true,
  details_building_edit: true,
  details_facilities: true,
  details_facilities_edit: true,
  details_guard: true,
  details_guard_edit: true,
  details_location: true,
  details_location_edit: true,
  details_association: true,
  details_association_edit: true,
  details_engineering: true,
  details_engineering_edit: true,
  details_electricity: true,
  details_electricity_edit: true,
  details_driver_rooms: true,
  details_driver_rooms_edit: true,
  details_elevators_maintenance: true,
  details_elevators_maintenance_edit: true,
  units: true,
  units_edit: true,
  deeds: true,
  statistics: true,
  activities: true,
  reports: true,
  reservations: true,
  sales: true,
  marketing_cancel_reservation: true,
  marketing_complete_sale: true,
  marketing_building_details: true,
  documents_edit_folders: true,
  security: false,
  settings: false,
}

interface Employee {
  id: string
  owner_id: string
  full_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  permissions: Record<PermissionKey, boolean>
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function AdvancedSettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    job_title: '',
    temporary_password: '',
    permissions: { ...DEFAULT_PERMISSIONS },
  })
  const [successPassword, setSuccessPassword] = useState<string | null>(null)
  const [permissionsSummaryEmp, setPermissionsSummaryEmp] = useState<Employee | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) {
        router.push('/login')
        return
      }
      const { data: empRow } = await supabase
        .from('dashboard_employees')
        .select('id')
        .eq('auth_user_id', u.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      if (empRow) {
        router.replace('/dashboard')
        return
      }
      setUser(u)
      setLoading(false)
    }
    init()
  }, [router, supabase.auth])

  const fetchEmployees = async () => {
    if (!user?.id) return
    setEmployeesLoading(true)
    const { data, error } = await supabase
      .from('dashboard_employees')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
    setEmployeesLoading(false)
    if (!error && data) {
      setEmployees(
        (data || []).map((row: Record<string, unknown>) => ({
          id: row.id as string,
          owner_id: row.owner_id as string,
          full_name: (row.full_name as string) ?? '',
          email: (row.email as string) ?? null,
          phone: (row.phone as string) ?? null,
          job_title: (row.job_title as string) ?? null,
          permissions: { ...DEFAULT_PERMISSIONS, ...(row.permissions as Record<PermissionKey, boolean>) },
          is_active: (row.is_active as boolean) ?? true,
          created_at: row.created_at as string,
          updated_at: row.updated_at as string,
        }))
      )
    } else setEmployees([])
  }

  useEffect(() => {
    if (user?.id) fetchEmployees()
  }, [user?.id])

  const openAdd = () => {
    setEditingId(null)
    setForm({
      full_name: '',
      email: '',
      phone: '',
      job_title: '',
      temporary_password: generateTemporaryPassword(),
      permissions: { ...DEFAULT_PERMISSIONS },
    })
    setSaveError(null)
    setSuccessPassword(null)
    setModalOpen(true)
  }

  const openEdit = (emp: Employee) => {
    setEditingId(emp.id)
    setForm({
      full_name: emp.full_name,
      email: emp.email ?? '',
      phone: emp.phone ?? '',
      job_title: emp.job_title ?? '',
      temporary_password: '',
      permissions: { ...DEFAULT_PERMISSIONS, ...emp.permissions },
    })
    setSaveError(null)
    setModalOpen(true)
  }

  const setPermission = (key: PermissionKey, value: boolean) => {
    setForm((p) => ({
      ...p,
      permissions: { ...p.permissions, [key]: value },
    }))
  }

  const saveEmployee = async () => {
    const name = form.full_name.trim()
    if (!name) {
      setSaveError('الرجاء إدخال اسم الموظف')
      return
    }
    if (!user?.id) return
    const phoneTrimmed = (form.phone ?? '').trim()
    if (!phoneTrimmed) {
      setSaveError('رقم الجوال مطلوب (10 أرقام)')
      return
    }
    if (!isValidPhone10Digits(phoneTrimmed)) {
      setSaveError('رقم الجوال يجب أن يكون 10 أرقام بالضبط')
      return
    }
    const emailTrimmed = (form.email ?? '').trim()
    if (!editingId && !emailTrimmed) {
      setSaveError('البريد الإلكتروني مطلوب')
      return
    }
    if (!editingId && (form.temporary_password ?? '').trim().length < 6) {
      setSaveError('كلمة المرور المؤقتة مطلوبة (6 أحرف على الأقل). أرسلها للموظف ليدخل منها ثم يغيّرها عبر «نسيت كلمة المرور»')
      return
    }
    setSaveLoading(true)
    setSaveError(null)
    if (editingId) {
      const jobTitleTrimmed = (form.job_title ?? '').trim() || null
      const payload = {
        full_name: name,
        email: emailTrimmed || null,
        phone: phoneDigitsOnly(phoneTrimmed),
        job_title: jobTitleTrimmed,
        permissions: form.permissions,
        is_active: true,
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase
        .from('dashboard_employees')
        .update(payload)
        .eq('id', editingId)
        .eq('owner_id', user.id)
      if (error) {
        const msg = error.message || 'فشل التحديث'
        setSaveError(msg)
        showToast(msg, 'error')
        setSaveLoading(false)
        return
      }
      showToast('تم حفظ التعديلات بنجاح', 'success')
      setSaveLoading(false)
      setModalOpen(false)
      fetchEmployees()
      return
    }
    try {
      const res = await fetch('/api/employees/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: name,
          email: emailTrimmed,
          phone: phoneDigitsOnly(phoneTrimmed),
          job_title: (form.job_title ?? '').trim() || undefined,
          temporary_password: (form.temporary_password ?? '').trim(),
          permissions: form.permissions,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSaveError((data.error as string) || 'فشل إنشاء الحساب')
        setSaveLoading(false)
        return
      }
      setSuccessPassword((form.temporary_password ?? '').trim() || null)
      setSaveLoading(false)
      setModalOpen(false)
      fetchEmployees()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'حدث خطأ أثناء إرسال الدعوة')
      setSaveLoading(false)
    }
  }

  const deleteEmployee = async (id: string) => {
    if (!user?.id || !confirm('حذف هذا الموظف؟')) return
    await supabase.from('dashboard_employees').delete().eq('id', id).eq('owner_id', user.id)
    fetchEmployees()
  }

  const toggleActive = async (emp: Employee) => {
    if (!user?.id) return
    await supabase
      .from('dashboard_employees')
      .update({ is_active: !emp.is_active, updated_at: new Date().toISOString() })
      .eq('id', emp.id)
      .eq('owner_id', user.id)
    fetchEmployees()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center" dir="rtl">
        <div className="animate-spin w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      <header className="bg-white/90 backdrop-blur border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-100 text-teal-600">
                <Settings className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-slate-800">الإعدادات المتقدمة</h1>
                <p className="text-xs text-slate-500">إدارة الموظفين وصلاحيات الوصول</p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
            >
              <LayoutDashboard className="w-4 h-4" />
              لوحة التحكم
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* بطاقة إدارة الموظفين */}
        <section className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              <h2 className="font-bold text-slate-800">إدارة الموظفين</h2>
            </div>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition font-medium text-sm shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              إضافة موظف
            </button>
          </div>

          {successPassword && (
            <div className="mx-6 mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="font-semibold text-emerald-800 mb-2">تم إنشاء حساب الموظف بنجاح</p>
              <p className="text-sm text-emerald-700 mb-2">أرسل للموظف (بالبريد أو واتساب):</p>
              <div className="bg-white rounded-lg p-3 border border-emerald-200 font-mono text-sm text-emerald-900 break-all">
                كلمة المرور المؤقتة: <strong className="select-all">{successPassword}</strong>
              </div>
              <p className="text-xs text-emerald-600 mt-2">يدخل الموظف من صفحة تسجيل الدخول بالبريد وكلمة المرور أعلاه، ويمكنه لاحقاً استخدام «نسيت كلمة المرور» لتعيين كلمة خاصة به.</p>
              <button
                type="button"
                onClick={() => setSuccessPassword(null)}
                className="mt-3 text-sm font-medium text-emerald-700 hover:underline"
              >
                إخفاء
              </button>
            </div>
          )}

          {employeesLoading ? (
            <div className="p-12 flex justify-center">
              <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
            </div>
          ) : employees.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 text-slate-400 mb-4">
                <Users className="w-7 h-7" />
              </div>
              <p className="text-slate-600 font-medium">لا يوجد موظفون حتى الآن</p>
              <p className="text-sm text-slate-500 mt-1">أضف موظفين وحدد صلاحيات الوصول لكل منهم</p>
              <button
                type="button"
                onClick={openAdd}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition text-sm font-medium"
              >
                <UserPlus className="w-4 h-4" />
                إضافة أول موظف
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">الاسم</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">البريد</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">المسمى الوظيفي</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">الجوال</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">الحالة</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 w-32">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-medium text-slate-800">{emp.full_name}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{emp.email || '—'}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{emp.job_title || '—'}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{emp.phone || '—'}</td>
                      <td className="py-3 px-4 align-middle text-center">
                        <button
                          type="button"
                          onClick={() => toggleActive(emp)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            emp.is_active
                              ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-200/60 shadow-sm'
                              : 'bg-red-50 text-red-600 border border-red-200/80'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${emp.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {emp.is_active ? 'نشط' : 'معطّل'}
                        </button>
                      </td>
                      <td className="py-3 px-4 align-middle text-center">
                        <div className="flex items-center justify-center gap-1 flex-nowrap">
                          <button
                            type="button"
                            onClick={() => setPermissionsSummaryEmp(emp)}
                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                            title="ملخص الصلاحيات"
                          >
                            <ListChecks className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(emp)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            title="تعديل"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteEmployee(emp.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>

      {/* مودال ملخص صلاحيات الموظف */}
      {permissionsSummaryEmp && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm cursor-pointer"
            onClick={() => setPermissionsSummaryEmp(null)}
            aria-hidden
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="permissions-summary-title"
            >
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <h3 id="permissions-summary-title" className="font-bold text-slate-800 flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-teal-600" />
                  ملخص الصلاحيات
                </h3>
                <button
                  type="button"
                  onClick={() => setPermissionsSummaryEmp(null)}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                  aria-label="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5 pb-2 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-800">{permissionsSummaryEmp.full_name}</p>
                  <p className="text-sm text-slate-600">المسمى الوظيفي: {permissionsSummaryEmp.job_title || '—'}</p>
                  <p className="text-sm text-slate-600">رقم الجوال: {permissionsSummaryEmp.phone || '—'}</p>
                  <p className="text-sm text-slate-500">البريد: {permissionsSummaryEmp.email || '—'}</p>
                </div>
                {!Object.values(permissionsSummaryEmp.permissions).some(Boolean) ? (
                  <p className="text-sm text-slate-500 py-4">لا توجد صلاحيات معطاة لهذا الموظف</p>
                ) : (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">صلاحيات الوصول</p>
                  <p className="text-xs text-slate-500 mb-3">الصلاحيات المعطاة فقط</p>
                  {PERMISSION_GROUPS.map((group) => {
                    const enabledKeys = group.keys.filter((key) => permissionsSummaryEmp.permissions[key] ?? false)
                    if (enabledKeys.length === 0) return null
                    return (
                      <div key={group.title}>
                        <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">{group.title}</p>
                        <div className="space-y-2">
                          {enabledKeys.map((key) => (
                            <div
                              key={key}
                              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50/50 transition"
                            >
                              <span className="text-sm text-slate-700">{PERMISSION_LABELS[key]}</span>
                              <Check className="w-5 h-5 text-teal-500 flex-shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  {(() => {
                    const cardRowsWithAny = CARD_PERMISSION_ROWS.filter(
                      (row) => {
                        const { viewKey, editKey, extraKey } = row
                        const viewOn = permissionsSummaryEmp.permissions[viewKey] ?? false
                        const editOn = permissionsSummaryEmp.permissions[editKey] ?? false
                        const extraOn = extraKey ? (permissionsSummaryEmp.permissions[extraKey.key] ?? false) : false
                        return viewOn || editOn || extraOn
                      }
                    )
                    if (cardRowsWithAny.length === 0) return null
                    return (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">تفاصيل المبنى</p>
                        <div className="space-y-2">
                          {cardRowsWithAny.map(({ label, viewKey, editKey, extraKey }) => {
                            const viewOn = permissionsSummaryEmp.permissions[viewKey] ?? false
                            const editOn = permissionsSummaryEmp.permissions[editKey] ?? false
                            const extraOn = extraKey ? (permissionsSummaryEmp.permissions[extraKey.key] ?? false) : false
                            const parts = []
                            if (viewOn) parts.push('معاينة')
                            if (editOn) parts.push('تعديل')
                            if (extraOn) parts.push(extraKey!.label)
                            return (
                              <div
                                key={viewKey}
                                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50/50 transition"
                              >
                                <span className="text-sm text-slate-700 min-w-0">{label}</span>
                                <span className="text-xs text-slate-500 flex-shrink-0">{parts.join('، ')}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}
                </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* مودال إضافة/تعديل موظف */}
      {modalOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm cursor-pointer"
            onClick={() => !saveLoading && setModalOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="employee-modal-title"
            >
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4">
                <h3 id="employee-modal-title" className="font-bold text-slate-800">
                  {editingId ? 'تعديل الموظف' : 'إضافة موظف'}
                </h3>
              </div>

              <div className="p-6 space-y-5">
                {saveError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    {saveError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">اسم الموظف *</label>
                  <input
                    type="text"
                    value={form.full_name ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="مثال: أحمد محمد"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">رقم الجوال *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.phone ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, phone: phoneDigitsOnly(e.target.value) }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="05xxxxxxxx"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    value={form.email ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="employee@example.com"
                    required={!editingId}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">المسمى الوظيفي</label>
                  <input
                    type="text"
                    value={form.job_title ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, job_title: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="مثال: مدير مبيعات، منسق حجوزات"
                  />
                </div>

                {!editingId && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور المؤقتة *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={form.temporary_password ?? ''}
                        onChange={(e) => setForm((p) => ({ ...p, temporary_password: e.target.value }))}
                        className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="6 أحرف على الأقل"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, temporary_password: generateTemporaryPassword() }))}
                        className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition font-medium text-sm shrink-0"
                        title="توليد كلمة مرور عشوائية"
                      >
                        <RefreshCw className="w-4 h-4" />
                        توليد
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-3">صلاحيات الوصول</p>
                  <p className="text-xs text-slate-500 mb-3">فعّل الأقسام التي يمكن للموظف الوصول إليها</p>
                  <div className="space-y-4">
                    {PERMISSION_GROUPS.map((group) => (
                      <React.Fragment key={group.title}>
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">{group.title}</p>
                          <div className="space-y-2">
                            {group.keys.map((key) => {
                              const checked = form.permissions[key] ?? false
                              return (
                                <label
                                  key={key}
                                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50/50 transition cursor-pointer"
                                >
                                  <span className="text-sm text-slate-700">{PERMISSION_LABELS[key]}</span>
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={checked}
                                    onClick={() => setPermission(key, !checked)}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 ${
                                      checked ? 'bg-teal-500' : 'bg-slate-300'
                                    }`}
                                  >
                                    <span
                                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-all duration-200 ${
                                        checked
                                          ? 'right-0.5 left-auto rtl:right-auto rtl:left-0.5'
                                          : 'left-0.5 right-auto rtl:left-auto rtl:right-0.5'
                                      }`}
                                    />
                                  </button>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                        {/* تفاصيل المبنى: مباشرة بعد الوحدات */}
                        {group.title === 'الوحدات' && (
                          <div>
                            <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">تفاصيل المبنى</p>
                            <div className="space-y-2">
                              {CARD_PERMISSION_ROWS.map(({ label, viewKey, editKey, extraKey }) => {
                                const viewChecked = form.permissions[viewKey] ?? false
                                const editChecked = form.permissions[editKey] ?? false
                                const extraChecked = extraKey ? (form.permissions[extraKey.key] ?? false) : false
                                const Switch = ({ keyName, checked }: { keyName: PermissionKey; checked: boolean }) => (
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={checked}
                                    onClick={() => setPermission(keyName, !checked)}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 ${
                                      checked ? 'bg-teal-500' : 'bg-slate-300'
                                    }`}
                                  >
                                    <span
                                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-all duration-200 ${
                                        checked ? 'right-0.5 left-auto rtl:right-auto rtl:left-0.5' : 'left-0.5 right-auto rtl:left-auto rtl:right-0.5'
                                      }`}
                                    />
                                  </button>
                                )
                                return (
                                  <div
                                    key={viewKey}
                                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50/50 transition"
                                  >
                                    <span className="text-sm text-slate-700 min-w-0">{label}</span>
                                    <div className="flex items-center gap-4 flex-shrink-0">
                                      {extraKey && (
                                        <div className="flex flex-col items-center gap-0.5">
                                          <span className="text-[10px] text-slate-400">{extraKey.label}</span>
                                          <Switch keyName={extraKey.key} checked={extraChecked} />
                                        </div>
                                      )}
                                      <div className="flex flex-col items-center gap-0.5">
                                        <span className="text-[10px] text-slate-400">معاينة</span>
                                        <Switch keyName={viewKey} checked={viewChecked} />
                                      </div>
                                      <div className="flex flex-col items-center gap-0.5">
                                        <span className="text-[10px] text-slate-400">تعديل</span>
                                        <Switch keyName={editKey} checked={editChecked} />
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => !saveLoading && setModalOpen(false)}
                  className="px-4 py-2.5 text-slate-700 hover:bg-slate-100 rounded-xl transition font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={saveEmployee}
                  disabled={saveLoading}
                  className="px-4 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {saveLoading ? (
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : null}
                  {editingId ? 'حفظ التعديلات' : 'إضافة الموظف'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
