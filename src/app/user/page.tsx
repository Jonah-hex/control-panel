'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDashboardAuth, type PermissionKey } from '@/hooks/useDashboardAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { showToast } from '@/app/dashboard/buildings/details/toast'
import { phoneDigitsOnly, isValidPhone10Digits } from '@/lib/validation-utils'
import {
  LayoutDashboard,
  User as UserIcon,
  Shield,
  Building2,
  FileText,
  Users,
  TrendingUp,
  Calendar,
  ShoppingCart,
  Settings,
  ChevronRight,
  CheckCircle,
  Mail,
  Briefcase,
  Phone,
  Lock,
  ShieldCheck,
  Send,
  BadgeCheck,
  Crown,
} from 'lucide-react'

/** صلاحيات موجزة: عنوان المجموعة + مفاتيحها (لعرض ملخص "كامل" أو "ن صلاحية") */
const PERMISSION_GROUPS: { title: string; keys: PermissionKey[] }[] = [
  { title: 'لوحة التحكم والعماير', keys: ['dashboard', 'buildings', 'building_details', 'buildings_create', 'buildings_edit', 'buildings_delete'] },
  { title: 'تفاصيل العمارة', keys: ['details_basic', 'details_building', 'details_facilities', 'details_guard', 'details_location', 'details_association', 'details_engineering', 'details_electricity', 'details_driver_rooms', 'details_elevators_maintenance', 'documents_upload', 'documents_edit_folders'] },
  { title: 'الوحدات والصكوك', keys: ['units', 'units_edit', 'deeds'] },
  { title: 'الحجوزات والمبيعات', keys: ['reservations', 'sales', 'marketing_view', 'marketing_edit', 'marketing_cancel_reservation', 'marketing_complete_sale', 'marketing_building_details'] },
  { title: 'الملاك والمستثمرون', keys: ['owners_investors_view', 'owners_investors_edit', 'owners_view', 'owners_edit', 'investors_view', 'investors_edit'] },
  { title: 'التقارير والإعدادات', keys: ['statistics', 'activities', 'reports', 'security', 'settings'] },
]

/** روابط سريعة حسب الصلاحية */
const QUICK_LINKS: { href: string; label: string; icon: React.ReactNode; permission?: PermissionKey }[] = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: '/dashboard/buildings', label: 'قائمة العماير', icon: <Building2 className="w-5 h-5" />, permission: 'buildings' },
  { href: '/dashboard/reservations', label: 'سجل الحجوزات', icon: <Calendar className="w-5 h-5" />, permission: 'reservations' },
  { href: '/dashboard/sales', label: 'سجل المبيعات', icon: <ShoppingCart className="w-5 h-5" />, permission: 'sales' },
  { href: '/dashboard/owners-investors/owners', label: 'الملاك', icon: <Users className="w-5 h-5" />, permission: 'owners_view' },
  { href: '/dashboard/owners-investors/investors', label: 'المستثمرون', icon: <TrendingUp className="w-5 h-5" />, permission: 'investors_view' },
  { href: '/user/settings', label: 'الإعدادات المتقدمة', icon: <Settings className="w-5 h-5" />, permission: 'settings' },
]

export default function UserPage() {
  const router = useRouter()
  const { user, ready, can, currentUserDisplayName, isOwner } = useDashboardAuth()
  const { planName } = useSubscription()
  const [jobTitle, setJobTitle] = useState<string | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [resetLinkSending, setResetLinkSending] = useState(false)
  const [phoneEditing, setPhoneEditing] = useState(false)
  const [phoneEdit, setPhoneEdit] = useState('')
  const [phoneSaving, setPhoneSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!ready || !user) return
    if (isOwner) {
      const meta = (user as { user_metadata?: { phone?: string } }).user_metadata
      setPhone(meta?.phone ?? null)
      setJobTitle(null)
      return
    }
    const load = async () => {
      const { data } = await supabase
        .from('dashboard_employees')
        .select('job_title, phone')
        .eq('auth_user_id', user.id)
        .limit(1)
      const row = data?.[0] as { job_title: string | null; phone: string | null } | undefined
      setJobTitle(row?.job_title ?? null)
      setPhone(row?.phone ?? null)
    }
    load()
  }, [ready, user, isOwner])

  useEffect(() => {
    if (phone != null) setPhoneEdit(phone)
    else setPhoneEdit('')
  }, [phone])

  useEffect(() => {
    if (!ready) return
    if (!user) {
      router.push('/login')
      return
    }
  }, [ready, user, router])

  if (!ready || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center" dir="rtl">
        <p className="text-slate-600">جاري التحميل...</p>
      </div>
    )
  }

  const email = (user as { email?: string }).email ?? ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100" dir="rtl">
      <header className="sticky top-0 z-10 border-b border-slate-200/60 bg-white/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold text-slate-800">ملف المستخدم</h1>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
            >
              <LayoutDashboard className="w-4 h-4" />
              لوحة التحكم
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* بطاقة البيانات */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-l from-emerald-50/80 to-white">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-emerald-600" />
              بياناتي
            </h2>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
              <span className="text-slate-500 text-xs">الاسم</span>
              <span className="font-medium text-slate-800">{currentUserDisplayName || '—'}</span>
              {isOwner && (planName === 'مفتوح' || planName === null) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium border border-amber-200/70">
                  <Crown className="w-3.5 h-3.5" />
                  مميز
                </span>
              )}
              {(planName === 'مفتوح' || planName === null || (planName && planName !== 'مجاني' && /تجريبي|شهري|14/.test(planName))) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium border border-emerald-200/70">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  موثّق
                </span>
              )}
              {planName && planName !== 'مفتوح' && planName !== 'مجاني' && !/تجريبي|شهري|14/.test(planName) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200/70">
                  {planName}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600 text-sm dir-ltr">{email}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
              <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
              {phoneEditing ? (
                <>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phoneEdit}
                    onChange={(e) => setPhoneEdit(phoneDigitsOnly(e.target.value))}
                    placeholder="05xxxxxxxx"
                    className="flex-1 min-w-[120px] px-3 py-2 rounded-lg border border-slate-200 text-sm dir-ltr focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-none bg-white"
                    maxLength={10}
                  />
                  <button
                    type="button"
                    disabled={phoneSaving || (phoneEdit.trim() !== '' && !isValidPhone10Digits(phoneEdit.trim().replace(/\s/g, '')))}
                    onClick={async () => {
                      const val = phoneEdit.trim().replace(/\s/g, '')
                      if (val && !isValidPhone10Digits(val)) {
                        showToast('رقم الجوال يجب أن يكون 10 أرقام صحيحة.', 'error')
                        return
                      }
                      const toSave = val ? phoneDigitsOnly(val) : null
                      setPhoneSaving(true)
                      if (isOwner) {
                        const { error } = await supabase.auth.updateUser({ data: { phone: toSave } })
                        setPhoneSaving(false)
                        if (error) {
                          showToast(error.message || 'فشل حفظ رقم الجوال.', 'error')
                          return
                        }
                        setPhone(toSave)
                        setPhoneEditing(false)
                        showToast(toSave ? 'تم حفظ رقم الجوال.' : 'تم حذف رقم الجوال.')
                      } else {
                        const { error } = await supabase.from('dashboard_employees').update({ phone: toSave }).eq('auth_user_id', (user as { id: string }).id)
                        setPhoneSaving(false)
                        if (error) {
                          showToast(error.message || 'فشل حفظ رقم الجوال.', 'error')
                          return
                        }
                        setPhone(toSave)
                        setPhoneEditing(false)
                        showToast(toSave ? 'تم حفظ رقم الجوال.' : 'تم حذف رقم الجوال.')
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition"
                  >
                    {phoneSaving ? 'جاري...' : 'حفظ'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPhoneEditing(false); setPhoneEdit(phone ?? ''); }}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition"
                  >
                    إلغاء
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setPhoneEditing(true)}
                  className="text-right w-full min-w-0 flex-1 text-slate-600 text-sm dir-ltr hover:bg-slate-100/50 rounded-lg py-1 -my-1 px-1 -mx-1 transition"
                >
                  {phone && phone !== '' ? phone : 'اضغط لإضافة أو تعديل رقم الجوال'}
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
              <span className="text-slate-500 text-xs">الدور</span>
              <span className="font-medium text-slate-800">
                {isOwner ? 'مدير النظام (مالك الحساب)' : 'موظف'}
              </span>
            </div>
            {!isOwner && jobTitle && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                <Briefcase className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600 text-sm">المسمى الوظيفي: {jobTitle}</span>
              </div>
            )}
          </div>
        </section>

        {/* تأمين الحساب — تغيير كلمة المرور عبر البريد (مربوط بجدول auth وجداول المالك) */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-l from-emerald-50/80 to-white">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              تأمين الحساب
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              لحماية حسابك، نرسل <strong>رابطاً آمناً</strong> إلى البريد الإلكتروني المسجّل في النظام. استخدم الرابط خلال المهلة المحددة (عادة ساعة) لتعيين كلمة مرور جديدة من صفحة آمنة.
            </p>
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500">سيُرسل الرابط إلى:</span>
              <span className="text-sm font-medium text-slate-800 dir-ltr">{email || '—'}</span>
            </div>
            <button
              type="button"
              disabled={resetLinkSending || !email}
              onClick={async () => {
                if (!email) return
                setResetLinkSending(true)
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : undefined,
                })
                setResetLinkSending(false)
                if (error) {
                  showToast(error.message || 'فشل إرسال الرابط.', 'error')
                  return
                }
                showToast('تم إرسال رابط تغيير كلمة المرور إلى بريدك. راجع صندوق الوارد (والبريد المزعج) واستخدم الرابط خلال ساعة.')
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm shadow-emerald-500/20"
            >
              <Send className="w-4 h-4" />
              {resetLinkSending ? 'جاري الإرسال...' : 'إرسال رابط تغيير كلمة المرور إلى بريدي'}
            </button>
          </div>
        </section>

        {/* صلاحياتي */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-l from-emerald-50/80 to-white">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              صلاحياتي في المنصة
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isOwner ? 'لديك صلاحية كاملة على جميع أقسام المنصة.' : 'ملخص الصلاحيات المعطاة لك من حساب المالك.'}
            </p>
          </div>
          <div className="p-5">
            <ul className="space-y-2">
              {PERMISSION_GROUPS.map((group) => {
                const allowed = group.keys.filter((k) => can(k))
                if (allowed.length === 0) return null
                const full = allowed.length === group.keys.length
                return (
                  <li key={group.title} className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-700">{group.title}</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200/70">
                      <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {full ? 'كامل' : `${allowed.length} صلاحية`}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        {/* روابط سريعة */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-500" />
              روابط سريعة للعمل
            </h2>
          </div>
          <div className="p-5">
            <ul className="space-y-1">
              {QUICK_LINKS.map((link) => {
                const show = !link.permission || can(link.permission)
                if (!show) return null
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex items-center justify-between gap-3 w-full px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition"
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-slate-400">{link.icon}</span>
                        <span className="font-medium text-sm">{link.label}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      </main>
    </div>
  )
}
