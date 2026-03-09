'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { PageLoadingSkeleton } from '@/components/dashboard/PageLoadingSkeleton'
import { showToast } from '@/app/dashboard/buildings/details/toast'
import {
  ArrowRightLeft,
  Activity,
  Plus,
  Edit,
  Trash2,
  ShoppingCart,
  Calendar,
  Users,
  Clock,
  Filter,
  Zap,
  LayoutDashboard,
  Search,
  Banknote,
  AlertCircle
} from 'lucide-react'

interface Building {
  id: string
  name: string
  created_at: string
  owner_name?: string | null
  created_by_name?: string | null
  owner_association?: string | Record<string, unknown> | null
}

interface Unit {
  id: string
  building_id: string
  unit_number: string
  floor: number
  status: 'available' | 'reserved' | 'sold'
  owner_name?: string | null
  created_at: string
  updated_at?: string
}

interface ActivityItem {
  id: string
  type: 'add' | 'edit' | 'delete' | 'booking' | 'sold' | 'reserved' | 'association_end' | 'meter_added' | 'ownership_transferred' | 'reservation_cancelled' | 'deposit_refunded' | 'remaining_payment_collected' | 'remaining_payment_collected_late'
  building_name: string
  building_id?: string
  user_name: string
  timestamp: string
  details: string
  endDate?: string
}

type FilterType = 'all' | 'add' | 'sold' | 'reserved' | 'association_end' | 'meter_added' | 'ownership_transferred' | 'reservation_cancelled' | 'deposit_refunded' | 'remaining_payment_collected' | 'remaining_payment_collected_late'

type ReservationRow = { id: string; unit_id: string; building_id: string; created_at: string; created_by?: string | null; created_by_name?: string | null; customer_name: string; status: string; expiry_date?: string | null; marketer_name?: string | null; completed_at?: string | null; sale_id?: string | null }

export default function ActivitiesPage() {
  const [loading, setLoading] = useState(true)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [reservations, setReservations] = useState<ReservationRow[]>([])
  const [meterAddedLogs, setMeterAddedLogs] = useState<Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>>([])
  const [ownershipTransferredLogs, setOwnershipTransferredLogs] = useState<Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>>([])
  const [reservationCancelledLogs, setReservationCancelledLogs] = useState<Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>>([])
  const [depositRefundedLogs, setDepositRefundedLogs] = useState<Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>>([])
  const [remainingPaymentCollectedLogs, setRemainingPaymentCollectedLogs] = useState<Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>>([])
  const [remainingPaymentCollectedLateLogs, setRemainingPaymentCollectedLateLogs] = useState<Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>>([])
  const [employeesList, setEmployeesList] = useState<Array<{ auth_user_id: string; full_name: string; job_title: string | null }>>([])
  const [user, setUser] = useState<{ id: string; user_metadata?: { full_name?: string }; email?: string } | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const TABLE_PAGE_SIZES = [10, 25, 50, 100] as const
  const [activitiesPage, setActivitiesPage] = useState(1)
  const [activitiesPageSize, setActivitiesPageSize] = useState(10)
  const router = useRouter()
  const supabase = createClient()
  const { effectiveOwnerId, can, ready } = useDashboardAuth()

  useEffect(() => {
    if (!ready) return
    if (!can('activities')) {
      showToast('ليس لديك صلاحية الوصول لسجل النشاطات.', 'error')
      router.replace('/dashboard')
      return
    }
  }, [ready, can, router])

  useEffect(() => {
    const fetchData = async () => {
      const ownerId = effectiveOwnerId
      if (!ownerId) {
        setLoading(false)
        return
      }
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          router.push('/login')
          return
        }
        setUser(authUser as { id: string; user_metadata?: { full_name?: string }; email?: string })

        const { data: buildingsData, error: buildingsError } = await supabase
          .from('buildings')
          .select('id, name, created_at, owner_name, created_by_name, owner_association')
          .eq('owner_id', ownerId)
          .order('created_at', { ascending: false })

        if (buildingsError) throw buildingsError
        setBuildings(buildingsData || [])

        const buildingIds = (buildingsData || []).map(b => b.id)
        if (buildingIds.length > 0) {
          const [unitsRes, resRes, employeesRes] = await Promise.all([
            supabase.from('units').select('*').in('building_id', buildingIds),
            supabase.from('reservations').select('id, unit_id, building_id, created_at, created_by, created_by_name, customer_name, status, expiry_date, marketer_name, completed_at, sale_id').in('building_id', buildingIds).order('created_at', { ascending: false }),
            supabase.from('dashboard_employees').select('auth_user_id, full_name, job_title').eq('owner_id', ownerId).eq('is_active', true)
          ])
          if (unitsRes.error) throw unitsRes.error
          setUnits(unitsRes.data || [])
          setReservations(Array.isArray(resRes.data) ? resRes.data : [])
          setEmployeesList((employeesRes.data || []) as Array<{ auth_user_id: string; full_name: string; job_title: string | null }>)
        } else {
          setUnits([])
          setReservations([])
          setEmployeesList([])
        }

        const logLimit = 100
        const [meterRes, transferRes, cancelledRes, refundedRes, remainingRes, remainingLateRes] = await Promise.all([
          supabase.from('activity_logs').select('id, action_description, metadata, created_at').eq('action_type', 'meter_added').order('created_at', { ascending: false }).limit(logLimit),
          supabase.from('activity_logs').select('id, action_description, metadata, created_at').eq('action_type', 'ownership_transferred').order('created_at', { ascending: false }).limit(logLimit),
          supabase.from('activity_logs').select('id, action_description, metadata, created_at').eq('action_type', 'reservation_cancelled').order('created_at', { ascending: false }).limit(logLimit),
          supabase.from('activity_logs').select('id, action_description, metadata, created_at').eq('action_type', 'deposit_refunded').order('created_at', { ascending: false }).limit(logLimit),
          supabase.from('activity_logs').select('id, action_description, metadata, created_at').eq('action_type', 'remaining_payment_collected').order('created_at', { ascending: false }).limit(logLimit),
          supabase.from('activity_logs').select('id, action_description, metadata, created_at').eq('action_type', 'remaining_payment_collected_late').order('created_at', { ascending: false }).limit(logLimit)
        ])
        setMeterAddedLogs((meterRes.data || []) as Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>)
        setOwnershipTransferredLogs((transferRes.data || []) as Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>)
        setReservationCancelledLogs((cancelledRes.data || []) as Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>)
        setDepositRefundedLogs((refundedRes.data || []) as Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>)
        setRemainingPaymentCollectedLogs((remainingRes.data || []) as Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>)
        setRemainingPaymentCollectedLateLogs((remainingLateRes.data || []) as Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>)
      } catch (err) {
        console.error('Error fetching activities:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [router, effectiveOwnerId, supabase])

  // تنبيهات انتهاء اتحاد الملاك
  const associationEndReminders = useMemo(() => {
    const reminders: Array<{ buildingId: string; buildingName: string; daysLeft: number; endDate: string }> = []
    buildings.forEach(b => {
      const assoc = b.owner_association
      if (!assoc || typeof assoc !== 'object') return
      const end = (assoc as { end_date?: string }).end_date
      if (!end) return
      const endDate = new Date(end)
      const now = new Date()
      const diff = endDate.getTime() - now.getTime()
      const daysLeft = Math.ceil(diff / (24 * 60 * 60 * 1000))
      if (daysLeft <= 10) {
        reminders.push({
          buildingId: b.id,
          buildingName: b.name || '—',
          daysLeft,
          endDate: endDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
        })
      }
    })
    return reminders.sort((a, b) => a.daysLeft - b.daysLeft)
  }, [buildings])

  const buildingIds = useMemo(() => buildings.map(b => b.id), [buildings])

  const activities = useMemo(() => {
    const ownerDisplayName =
      (user && effectiveOwnerId === user.id ? (user.user_metadata?.full_name || user.email) : null) || 'صاحب الحساب'

    const fromUnits: ActivityItem[] = []
    for (const u of units) {
      const bName = buildings.find(b => b.id === u.building_id)?.name || '—'
      if (u.status === 'sold') {
        const completedRes = reservations.find(r => r.unit_id === u.id && (r.status === 'completed' || r.sale_id != null || r.completed_at != null))
        const marketerName = completedRes?.marketer_name && String(completedRes.marketer_name).trim()
        const createdByName = completedRes?.created_by_name && String(completedRes.created_by_name).trim()
        let displayName = ownerDisplayName
        if (marketerName) {
          displayName = marketerName
        } else if (createdByName) {
          const createdByUserId = completedRes?.created_by ?? null
          const emp = createdByUserId ? employeesList.find(e => e.auth_user_id === createdByUserId) : null
          const jobTitle = emp?.job_title?.trim() || null
          displayName = jobTitle ? `${createdByName} (${jobTitle})` : createdByName
        }
        fromUnits.push({
          id: u.id + '-sold',
          type: 'sold',
          building_name: bName,
          building_id: u.building_id,
          user_name: displayName,
          timestamp: u.updated_at || u.created_at,
          details: `تم بيع الوحدة ${u.unit_number} (الدور ${u.floor})`
        })
      }
    }
    const fromReservations: ActivityItem[] = reservations.map(r => {
      const bName = buildings.find(b => b.id === r.building_id)?.name || '—'
      const u = units.find(ux => ux.id === r.unit_id)
      const unitLabel = u ? `الوحدة ${u.unit_number} (الدور ${u.floor})` : 'وحدة محجوزة'
      return {
        id: r.id + '-reserved',
        type: 'reserved',
        building_name: bName,
        building_id: r.building_id,
        user_name: (r.created_by_name && String(r.created_by_name).trim()) || 'صاحب الحساب',
        timestamp: r.created_at,
        details: `تم حجز ${unitLabel} — عميل: ${r.customer_name || '—'}`
      }
    })
    const fromExpiredReservations: ActivityItem[] = reservations
      .filter((r) => ['active', 'pending', 'confirmed', 'reserved'].includes(r.status))
      .filter((r) => r.expiry_date && new Date(r.expiry_date).getTime() < Date.now())
      .map((r) => {
        const bName = buildings.find(b => b.id === r.building_id)?.name || '—'
        const u = units.find(ux => ux.id === r.unit_id)
        const unitLabel = u ? `الوحدة ${u.unit_number} (الدور ${u.floor})` : 'وحدة محجوزة'
        return {
          id: r.id + '-expired-review',
          type: 'reserved',
          building_name: bName,
          building_id: r.building_id,
          user_name: 'النظام',
          timestamp: r.expiry_date || r.created_at,
          details: `انتهت مدة الحجز — يرجى مراجعة وإلغاء حجز ${unitLabel}`
        }
      })
    const fromBuildings: ActivityItem[] = buildings.map(b => ({
      id: b.id + '-add',
      type: 'add',
      building_name: b.name || 'عمارة جديدة',
      building_id: b.id,
      user_name: b.created_by_name?.trim() || b.owner_name?.trim() || 'النظام',
      timestamp: b.created_at,
      details: 'تم إضافة عمارة جديدة'
    }))
    const fromAssoc: ActivityItem[] = associationEndReminders.map(r => {
      const ownerName = buildings.find(b => b.id === r.buildingId)?.owner_name?.trim() || 'النظام'
      const sortTime = new Date(Date.now() - r.daysLeft * 24 * 60 * 60 * 1000).toISOString()
      return {
        id: `assoc-${r.buildingId}-${r.daysLeft}`,
        type: 'association_end' as const,
        building_name: r.buildingName,
        building_id: r.buildingId,
        user_name: ownerName,
        timestamp: sortTime,
        details: r.daysLeft === 0
          ? 'انتهت مدة اتحاد الملاك اليوم'
          : r.daysLeft === 3
            ? 'تنتهي مدة اتحاد الملاك بعد 3 أيام'
            : r.daysLeft === 5
              ? 'تنتهي مدة اتحاد الملاك بعد 5 أيام'
              : 'تنتهي مدة اتحاد الملاك بعد 10 أيام',
        endDate: r.endDate
      }
    })
    const fromMeterAdded: ActivityItem[] = meterAddedLogs
      .filter(log => { const bid = log.metadata?.building_id as string | undefined; return Boolean(bid && buildingIds.includes(bid)) })
      .map(log => ({
        id: `meter-${log.id}`,
        type: 'meter_added' as const,
        building_name: (log.metadata?.building_name as string) || '—',
        building_id: (log.metadata?.building_id as string) || undefined,
        user_name: (log.metadata?.created_by_name as string) || 'النظام',
        timestamp: log.created_at,
        details: log.action_description || 'تم إضافة عداد'
      }))
    const fromOwnershipTransferred: ActivityItem[] = ownershipTransferredLogs
      .filter(log => { const bid = log.metadata?.building_id as string | undefined; return Boolean(bid && buildingIds.includes(bid)) })
      .map(log => ({
        id: `transfer-${log.id}`,
        type: 'ownership_transferred' as const,
        building_name: (log.metadata?.building_name as string) || '—',
        building_id: (log.metadata?.building_id as string) || undefined,
        user_name: (log.metadata?.created_by_name as string) || 'النظام',
        timestamp: log.created_at,
        details: log.action_description || 'نقل ملكية'
      }))
    const fromReservationCancelled: ActivityItem[] = reservationCancelledLogs
      .filter(log => { const bid = log.metadata?.building_id as string | undefined; return Boolean(bid && buildingIds.includes(bid)) })
      .map(log => ({
        id: `cancelled-${log.id}`,
        type: 'reservation_cancelled' as const,
        building_name: (log.metadata?.building_name as string) || '—',
        building_id: (log.metadata?.building_id as string) || undefined,
        user_name: (log.metadata?.created_by_name as string) || 'النظام',
        timestamp: log.created_at,
        details: log.action_description || 'إلغاء حجز'
      }))
    const fromDepositRefunded: ActivityItem[] = depositRefundedLogs
      .filter(log => { const bid = log.metadata?.building_id as string | undefined; return Boolean(bid && buildingIds.includes(bid)) })
      .map(log => ({
        id: `refund-${log.id}`,
        type: 'deposit_refunded' as const,
        building_name: (log.metadata?.building_name as string) || '—',
        building_id: (log.metadata?.building_id as string) || undefined,
        user_name: (log.metadata?.created_by_name as string) || 'النظام',
        timestamp: log.created_at,
        details: log.action_description || 'استرداد عربون'
      }))
    const fromRemainingPaymentCollected: ActivityItem[] = remainingPaymentCollectedLogs
      .filter(log => { const bid = log.metadata?.building_id as string | undefined; return Boolean(bid && buildingIds.includes(bid)) })
      .map(log => ({
        id: `remaining-${log.id}`,
        type: 'remaining_payment_collected' as const,
        building_name: (log.metadata?.building_name as string) || '—',
        building_id: (log.metadata?.building_id as string) || undefined,
        user_name: (log.metadata?.created_by_name as string) || 'النظام',
        timestamp: log.created_at,
        details: log.action_description || 'تم تأكيد تحصيل المبلغ المتبقي'
      }))
    const fromRemainingPaymentCollectedLate: ActivityItem[] = remainingPaymentCollectedLateLogs
      .filter(log => { const bid = log.metadata?.building_id as string | undefined; return Boolean(bid && buildingIds.includes(bid)) })
      .map(log => ({
        id: `remaining-late-${log.id}`,
        type: 'remaining_payment_collected_late' as const,
        building_name: (log.metadata?.building_name as string) || '—',
        building_id: (log.metadata?.building_id as string) || undefined,
        user_name: (log.metadata?.created_by_name as string) || 'النظام',
        timestamp: log.created_at,
        details: log.action_description || 'تأخير في تحصيل المبلغ المتبقي'
      }))
    let all = [...fromUnits, ...fromReservations, ...fromExpiredReservations, ...fromBuildings, ...fromAssoc, ...fromMeterAdded, ...fromOwnershipTransferred, ...fromReservationCancelled, ...fromDepositRefunded, ...fromRemainingPaymentCollected, ...fromRemainingPaymentCollectedLate]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    if (filter !== 'all') {
      all = all.filter(a => a.type === filter)
    }
    return all
  }, [units, buildings, reservations, associationEndReminders, meterAddedLogs, ownershipTransferredLogs, reservationCancelledLogs, depositRefundedLogs, remainingPaymentCollectedLogs, remainingPaymentCollectedLateLogs, employeesList, user, effectiveOwnerId, buildingIds, filter])

  // عرض النشاطات حسب الصلاحيات + البحث
  const filteredActivities = useMemo(() => {
    const byPermission = activities.filter((a) => {
      if (a.type === 'sold') return can('sales')
      if (a.type === 'reserved') return can('reservations')
      if (a.type === 'add') return can('building_details') || can('buildings')
      if (a.type === 'association_end') return can('details_association')
      if (a.type === 'meter_added') return can('details_electricity')
      if (a.type === 'ownership_transferred') return can('deeds')
      if (a.type === 'reservation_cancelled' || a.type === 'deposit_refunded') return can('reservations')
      if (a.type === 'remaining_payment_collected' || a.type === 'remaining_payment_collected_late') return can('sales')
      return true
    })
    const q = searchQuery.trim().toLowerCase()
    if (!q) return byPermission
    return byPermission.filter((a) => {
      return (
        (a.building_name && a.building_name.toLowerCase().includes(q)) ||
        (a.details && a.details.toLowerCase().includes(q)) ||
        (a.user_name && a.user_name.toLowerCase().includes(q))
      )
    })
  }, [activities, can, searchQuery])

  const activitiesTotalPages = Math.max(1, Math.ceil(filteredActivities.length / activitiesPageSize))
  const paginatedActivities = useMemo(
    () => filteredActivities.slice((activitiesPage - 1) * activitiesPageSize, activitiesPage * activitiesPageSize),
    [filteredActivities, activitiesPage, activitiesPageSize]
  )
  useEffect(() => {
    if (activitiesPage > activitiesTotalPages && activitiesTotalPages >= 1) setActivitiesPage(1)
  }, [activitiesPage, activitiesTotalPages])

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'الآن'
    if (minutes < 60) return `منذ ${minutes} دقيقة`
    if (hours < 24) return `منذ ${hours} ساعة`
    if (days === 1) return 'أمس'
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'add': return <Plus className="w-4 h-4 text-green-600" />
      case 'edit': return <Edit className="w-4 h-4 text-blue-600" />
      case 'delete': return <Trash2 className="w-4 h-4 text-red-600" />
      case 'booking':
      case 'sold': return <ShoppingCart className="w-4 h-4 text-purple-600" />
      case 'reserved': return <Calendar className="w-4 h-4 text-amber-600" />
      case 'association_end': return <Users className="w-4 h-4 text-emerald-600" />
      case 'meter_added': return <Zap className="w-4 h-4 text-amber-600" />
      case 'ownership_transferred': return <ArrowRightLeft className="w-4 h-4 text-teal-600" />
      case 'reservation_cancelled': return <Trash2 className="w-4 h-4 text-red-600" />
      case 'deposit_refunded': return <ArrowRightLeft className="w-4 h-4 text-amber-600" />
      case 'remaining_payment_collected': return <Banknote className="w-4 h-4 text-emerald-600" />
      case 'remaining_payment_collected_late': return <AlertCircle className="w-4 h-4 text-amber-600" />
      default: return <Activity className="w-4 h-4 text-gray-600" />
    }
  }

  const filterLabels: Record<FilterType, string> = {
    all: 'الكل',
    add: 'إضافة عمارة',
    sold: 'بيع',
    reserved: 'حجز',
    association_end: 'اتحاد ملاك',
    meter_added: 'إضافة عداد',
    ownership_transferred: 'نقل ملكية',
    reservation_cancelled: 'إلغاء حجز',
    deposit_refunded: 'استرداد عربون',
    remaining_payment_collected: 'تحصيل متبقي',
    remaining_payment_collected_late: 'تحصيل متأخر'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
        <PageLoadingSkeleton message="جاري تحميل النشاطات..." size="md" variant="indigo" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* هيدر موحد — نفس نمط إدارة العماير */}
        <header className="relative rounded-2xl overflow-hidden mb-8 shadow-lg border border-gray-200/90 bg-gradient-to-br from-white to-gray-50">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 opacity-10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_70%_0%,rgba(99,102,241,0.08),transparent)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-4 sm:px-5 sm:py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/70">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-800 tracking-tight leading-tight">سجل النشاطات</h1>
                <p className="text-xs text-gray-500 mt-0.5">{filteredActivities.length} نشاط</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
              >
                <LayoutDashboard className="w-4 h-4" />
                لوحة التحكم
              </Link>
            </div>
          </div>
        </header>

        <div className="pb-6">
        {/* بحث في النشاطات */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالعمارة أو التفاصيل أو اسم المستخدم..."
              className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              aria-label="بحث في النشاطات"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                aria-label="مسح البحث"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        {/* فلتر حسب النوع — قائمة منسدلة */}
        <div className="mb-6 flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500 flex-shrink-0" aria-hidden />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="flex-1 min-w-0 max-w-xs pr-10 pl-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-no-repeat bg-[right_0.75rem_center]"
            aria-label="فلتر نوع النشاط"
          >
            {(Object.keys(filterLabels) as FilterType[]).map((key) => (
              <option key={key} value={key}>
                {filterLabels[key]}
              </option>
            ))}
          </select>
        </div>

        {/* قائمة النشاطات */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">لا توجد نشاطات</p>
              <p className="text-sm text-gray-500 mt-1">
                {searchQuery.trim()
                  ? 'لا توجد نتائج للبحث. جرّب كلمة أخرى أو امسح البحث.'
                  : filter !== 'all'
                  ? 'جرب تغيير الفلتر أو عد لاحقاً'
                  : 'ستظهر هنا النشاطات عند إضافة عمارة أو بيع/حجز وحدة أو أي إجراء على المنصة'}
              </p>
            </div>
          ) : (
            <>
            <div className="divide-y divide-gray-100">
              {paginatedActivities.map((activity) => (
                <Link
                  key={activity.id}
                  href={activity.building_id
                    ? activity.type === 'ownership_transferred'
                    ? `/building-deeds?buildingId=${activity.building_id}`
                    : activity.type === 'remaining_payment_collected' || activity.type === 'remaining_payment_collected_late'
                    ? `/dashboard/sales`
                    : `/dashboard/buildings/details?buildingId=${activity.building_id}${activity.type === 'association_end' ? '#card-association' : activity.type === 'meter_added' ? '#card-electricity' : ''}`
                    : '#'}
                  className="flex items-start gap-4 p-5 hover:bg-gray-50/80 transition-colors group cursor-pointer block"
                >
                  <div className={`w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center shadow-sm ${
                    activity.type === 'add' ? 'bg-green-100' :
                    activity.type === 'edit' ? 'bg-blue-100' :
                    activity.type === 'delete' ? 'bg-red-100' :
                    activity.type === 'sold' ? 'bg-purple-100' :
                    activity.type === 'reserved' ? 'bg-amber-100' :
                    activity.type === 'association_end' ? 'bg-emerald-100' :
                    activity.type === 'meter_added' ? 'bg-amber-100' :
                    activity.type === 'ownership_transferred' ? 'bg-teal-100' :
                    activity.type === 'reservation_cancelled' ? 'bg-red-100' :
                    activity.type === 'deposit_refunded' ? 'bg-amber-100' :
                    activity.type === 'remaining_payment_collected' ? 'bg-emerald-100' :
                    activity.type === 'remaining_payment_collected_late' ? 'bg-amber-100' :
                    'bg-gray-100'
                  }`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <h4 className="font-bold text-gray-800 truncate">{activity.building_name}</h4>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {activity.type === 'association_end' && activity.endDate
                            ? `تاريخ النهاية: ${activity.endDate}`
                            : formatDate(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 leading-relaxed">{activity.details}</p>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {activity.user_name.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-xs text-gray-500">بواسطة <span className="font-semibold text-gray-700">{activity.user_name}</span></p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {filteredActivities.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-slate-50/50">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span>عرض</span>
                  <select
                    value={activitiesPageSize}
                    onChange={(e) => { setActivitiesPageSize(Number(e.target.value)); setActivitiesPage(1); }}
                    className="rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-0 transition-all duration-200"
                  >
                    {TABLE_PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span className="font-mono">
                    {((activitiesPage - 1) * activitiesPageSize + 1).toLocaleString('en')}–
                    {Math.min(activitiesPage * activitiesPageSize, filteredActivities.length).toLocaleString('en')} من {filteredActivities.length.toLocaleString('en')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActivitiesPage((p) => Math.max(1, p - 1))}
                    disabled={activitiesPage <= 1}
                    className="min-w-[2.75rem] py-2 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-0"
                  >
                    السابق
                  </button>
                  <span className="px-2 py-1.5 text-sm text-slate-600 font-mono">
                    {activitiesPage.toLocaleString('en')} / {activitiesTotalPages.toLocaleString('en')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActivitiesPage((p) => Math.min(activitiesTotalPages, p + 1))}
                    disabled={activitiesPage >= activitiesTotalPages}
                    className="min-w-[2.75rem] py-2 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-0"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}
