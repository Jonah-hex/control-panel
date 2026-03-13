// src/app/dashboard/page.tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Building2, 
  Home, 
  Users, 
  TrendingUp, 
  Calendar,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Plus,
  Eye,
  MapPin,
  Phone,
  Mail,
  Activity,
  BarChart3,
  Target,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
  ShoppingCart,
  CheckSquare,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Sparkles,
  Zap,
  Clock,
  FileText,
  Edit,
  Trash2,
  User2,
  Crown
} from 'lucide-react'
import { RiyalIcon } from '@/components/icons/RiyalIcon'
import { showToast } from '@/app/dashboard/buildings/details/toast'
import { useSubscription } from '@/hooks/useSubscription'
import { useCriticalAlertsCount } from '@/components/dashboard/CriticalAlertsDock'

interface Building {
  id: string
  name: string
  plot_number: string
  neighborhood?: string
  total_units: number
  total_floors: number
  image_urls: string[] | null
  created_at: string
  owner_name?: string | null
  created_by_name?: string | null
}

interface Unit {
  id: string
  building_id: string
  unit_number: string
  floor: number
  status: 'available' | 'reserved' | 'sold'
  electricity_meter_number?: string | null
  electricity_meter_transferred_with_sale?: boolean | null
  owner_name?: string | null
  created_at: string
  updated_at?: string
}

interface Activity {
  id: string
  type: 'add' | 'edit' | 'delete' | 'booking' | 'sold' | 'reserved' | 'association_end' | 'meter_added' | 'ownership_transferred' | 'remaining_payment_collected' | 'remaining_payment_collected_late'
  building_name: string
  building_id?: string
  user_name: string
  /** توضيح دور الشخص: مسوق، موظف، صاحب الحساب، عميل، إلخ */
  user_role_label?: string
  timestamp: string
  details: string
  /** لتنسيق العرض في تنبيهات اتحاد الملاك (تاريخ نهاية المدة) */
  endDate?: string
}

interface BuildingAssocRow {
  id: string
  name: string
  owner_association?: string | Record<string, unknown> | null
}

type PermissionKey =
  | 'dashboard'
  | 'buildings'
  | 'buildings_create'
  | 'buildings_edit'
  | 'building_details'
  | 'buildings_delete'
  | 'details_basic'
  | 'details_building'
  | 'details_facilities'
  | 'details_guard'
  | 'details_location'
  | 'details_association'
  | 'details_engineering'
  | 'details_electricity'
  | 'units'
  | 'units_edit'
  | 'deeds'
  | 'statistics'
  | 'activities'
  | 'reports'
  | 'reservations'
  | 'sales'
  | 'marketing_view'
  | 'owners_view'
  | 'investors_view'
  | 'security'
  | 'settings'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  /** المالك الفعلي للبيانات: إما المالك نفسه أو المالك التابع له الموظف */
  const [effectiveOwnerId, setEffectiveOwnerId] = useState<string | null>(null)
  /** صلاحيات الموظف إن كان الدخول كموظف؛ null = مالك كامل الصلاحيات */
  const [employeePermissions, setEmployeePermissions] = useState<Record<PermissionKey, boolean> | null>(null)
  /** المسمى الوظيفي للموظف (للعرض في الهيدر)؛ null للمالك */
  const [employeeJobTitle, setEmployeeJobTitle] = useState<string | null>(null)
  /** اسم الموظف للعرض */
  const [employeeDisplayName, setEmployeeDisplayName] = useState<string | null>(null)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [buildingsForAssoc, setBuildingsForAssoc] = useState<BuildingAssocRow[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [reservations, setReservations] = useState<Array<{ id: string; unit_id: string; building_id: string; created_at: string; created_by?: string | null; created_by_name?: string | null; customer_name: string; status: string; expiry_date?: string | null; marketer_name?: string | null; completed_at?: string | null; sale_id?: string | null }>>([])
  /** موظفو المالك (لربط الحجوزات بالمسمى الوظيفي: مدير مبيعات، مدير حجوزات، إلخ) */
  const [employeesList, setEmployeesList] = useState<Array<{ auth_user_id: string; full_name: string; job_title: string | null }>>([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const raw = localStorage.getItem('dashboard-read-notifications')
      if (!raw) return new Set()
      const arr = JSON.parse(raw) as string[]
      return new Set(Array.isArray(arr) ? arr : [])
    } catch {
      return new Set()
    }
  })
  const [currentTime, setCurrentTime] = useState(new Date())
  const [greeting, setGreeting] = useState('')
  const [animateStats, setAnimateStats] = useState(false)
  const [meterAddedLogs, setMeterAddedLogs] = useState<Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>>([])
  const [ownershipTransferredLogs, setOwnershipTransferredLogs] = useState<Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>>([])
  const [reservationCancelledLogs, setReservationCancelledLogs] = useState<Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>>([])
  const [depositRefundedLogs, setDepositRefundedLogs] = useState<Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>>([])
  const [remainingPaymentCollectedLogs, setRemainingPaymentCollectedLogs] = useState<Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>>([])
  const [remainingPaymentCollectedLateLogs, setRemainingPaymentCollectedLateLogs] = useState<Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>>([])
  const [salesWithRemaining, setSalesWithRemaining] = useState<Array<{ id: string; building_id: string; remaining_payment: number; remaining_payment_due_date?: string | null; buyer_name?: string | null }>>([])
  const [buildingInvestorsWithDueDate, setBuildingInvestorsWithDueDate] = useState<Array<{ id: string; building_id: string; investor_name: string; investment_due_date: string }>>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<Array<{ id: string; title: string; scheduled_at: string; type: string; buildings?: { name: string } | null }>>([])
  /** مواعيد عادي/منخفض ضمن ±يومين — تظهر في جرس التنبيهات فقط (ليس الحرجة) */
  const [appointmentBellReminders, setAppointmentBellReminders] = useState<Array<{ id: string; title: string; scheduled_at: string; buildings?: { name: string } | null }>>([])
  const [tasksCount, setTasksCount] = useState(0)

  const router = useRouter()
  const supabase = createClient()
  const can = (key: PermissionKey) => employeePermissions === null || Boolean(employeePermissions[key])
  const { planName, buildingsLimitLabel, canAddBuilding, loading: subscriptionLoading } = useSubscription()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        const { data: empRows } = await supabase
          .from('dashboard_employees')
          .select('owner_id, permissions, full_name, job_title, is_active')
          .eq('auth_user_id', user.id)
          .limit(1)
        const emp = empRows?.[0] as { owner_id: string; permissions: unknown; full_name: string; job_title: string | null; is_active: boolean } | undefined
        if (emp?.is_active) {
          setEffectiveOwnerId(emp.owner_id)
          setEmployeePermissions((emp.permissions as Record<PermissionKey, boolean>) || null)
          setEmployeeJobTitle((emp.job_title as string) || null)
          setEmployeeDisplayName((emp.full_name as string) || null)
        } else if (emp && !emp.is_active) {
          setEffectiveOwnerId(emp.owner_id)
          setEmployeePermissions({} as Record<PermissionKey, boolean>)
          setEmployeeJobTitle(null)
          setEmployeeDisplayName(null)
        } else {
          setEffectiveOwnerId(user.id)
          setEmployeePermissions(null)
          setEmployeeJobTitle(null)
          setEmployeeDisplayName(null)
        }
      }
    }
    getUser()

    // تحديث البيانات عند العودة إلى تبويب لوحة التحكم (بعد نقل ملكية أو تغيير حالة وحدة)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchBuildings()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    // تحديث الوقت والتحية
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now)
      
      const hours = now.getHours()
      if (hours < 12) setGreeting('صباح الخير')
      else if (hours < 18) setGreeting('مساء الخير')
      else setGreeting('مساء الخير')
    }
    
    updateTime()
    const timer = setInterval(updateTime, 60000)
    
    // Animate stats after load
    setTimeout(() => setAnimateStats(true), 300)
    
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (effectiveOwnerId) {
      fetchBuildings()
      const APPT_BELL_WINDOW = 2
      const fetchUpcomingAppointments = async () => {
        try {
          const { data } = await supabase
            .from('dashboard_appointments')
            .select('id, title, scheduled_at, type, priority, buildings ( name )')
            .eq('owner_id', effectiveOwnerId)
            .eq('status', 'scheduled')
            .gte('scheduled_at', new Date().toISOString())
            .order('scheduled_at', { ascending: true })
            .limit(5)
          const normalized = (data || []).map((a: { id: string; title: string; scheduled_at: string; type: string; buildings?: { name: string } | { name: string }[] | null }) => ({
            id: a.id,
            title: a.title,
            scheduled_at: a.scheduled_at,
            type: a.type,
            buildings: Array.isArray(a.buildings) ? (a.buildings[0] ?? null) : a.buildings ?? null
          }))
          setUpcomingAppointments(normalized)
        } catch {
          setUpcomingAppointments([])
        }
      }
      const fetchAppointmentBellReminders = async () => {
        try {
          const from = new Date()
          from.setDate(from.getDate() - APPT_BELL_WINDOW)
          from.setHours(0, 0, 0, 0)
          const to = new Date()
          to.setDate(to.getDate() + APPT_BELL_WINDOW + 1)
          const { data } = await supabase
            .from('dashboard_appointments')
            .select('id, title, scheduled_at, priority, buildings ( name )')
            .eq('owner_id', effectiveOwnerId)
            .eq('status', 'scheduled')
            .in('priority', ['low', 'normal'])
            .gte('scheduled_at', from.toISOString())
            .lte('scheduled_at', to.toISOString())
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const out: Array<{ id: string; title: string; scheduled_at: string; buildings?: { name: string } | null }> = []
          for (const a of data || []) {
            if (!a.scheduled_at) continue
            const due = new Date(a.scheduled_at)
            due.setHours(0, 0, 0, 0)
            const daysUntil = Math.ceil((due.getTime() - today.getTime()) / 86400000)
            if (daysUntil < -APPT_BELL_WINDOW || daysUntil > APPT_BELL_WINDOW) continue
            const b = a.buildings
            out.push({
              id: a.id,
              title: a.title,
              scheduled_at: a.scheduled_at,
              buildings: Array.isArray(b) ? (b[0] ?? null) : b ?? null
            })
          }
          setAppointmentBellReminders(out)
        } catch {
          setAppointmentBellReminders([])
        }
      }
      fetchUpcomingAppointments()
      fetchAppointmentBellReminders()
      const fetchTasksCount = async () => {
        try {
          const { count, error } = await supabase
            .from('dashboard_tasks')
            .select('id', { count: 'exact', head: true })
            .eq('owner_id', effectiveOwnerId)
            .in('status', ['pending', 'accepted', 'scheduled'])
          if (!error && count != null) setTasksCount(count)
          else setTasksCount(0)
        } catch {
          setTasksCount(0)
        }
      }
      fetchTasksCount()
    } else {
      setUpcomingAppointments([])
      setAppointmentBellReminders([])
      setTasksCount(0)
    }
  }, [effectiveOwnerId])

  // مراقبة التحديثات الفورية للوحدات
  useEffect(() => {
    if (buildings.length === 0) return

    const unitsSubscription = supabase
      .channel('units_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'units',
          filter: `building_id=in.(${buildings.map(b => `'${b.id}'`).join(',')})`
        },
        (payload) => {
          console.log('Units updated:', payload)
          // إعادة جلب الوحدات عند أي تغيير
          fetchBuildings()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(unitsSubscription)
    }
  }, [buildings])

  // اشتراك لتحديث النشاطات عند إضافة عمارة جديدة (تجعل البطاقة تفاعلية)
  useEffect(() => {
    if (!user) return

    const buildingsSub = supabase
      .channel('buildings_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'buildings' },
        (payload: any) => {
          try {
            const newBuilding = payload.new
            if (!newBuilding) return
            // فقط نشاطات المالك الحالي
            if (newBuilding.owner_id && newBuilding.owner_id !== effectiveOwnerId) return

            // إعادة جلب العماير لعرض أحدثها في البطاقات والنشاطات
            fetchBuildings()
          } catch (e) {
            console.error('Error processing building insert payload', e)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(buildingsSub)
    }
  }, [effectiveOwnerId])

  const fetchBuildings = async () => {
    try {
      const ownerId = effectiveOwnerId
      if (!ownerId) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setBuildings(data || [])

      // جلب جميع العماير لاستخراج تنبيهات انتهاء مدة اتحاد الملاك
      const { data: assocData } = await supabase
        .from('buildings')
        .select('id, name, owner_association')
        .eq('owner_id', ownerId)
      setBuildingsForAssoc(assocData || [])

      const buildingIds = (data || []).map(b => b.id)
      if (buildingIds.length > 0) {
        const [unitsRes, resRes, salesPartialRes, investorsDueRes, employeesRes] = await Promise.all([
          supabase.from('units').select('*').in('building_id', buildingIds),
          supabase.from('reservations').select('id, unit_id, building_id, created_at, created_by, created_by_name, customer_name, status, expiry_date, marketer_name, completed_at, sale_id').in('building_id', buildingIds).order('created_at', { ascending: false }),
          supabase.from('sales').select('id, building_id, remaining_payment, remaining_payment_due_date, buyer_name').in('building_id', buildingIds).eq('payment_status', 'partial').gt('remaining_payment', 0),
          supabase.from('building_investors').select('id, building_id, investor_name, investment_due_date').eq('owner_id', ownerId).not('investment_due_date', 'is', null),
          supabase.from('dashboard_employees').select('auth_user_id, full_name, job_title').eq('owner_id', ownerId).eq('is_active', true)
        ])
        if (unitsRes.error) throw unitsRes.error
        setUnits(unitsRes.data || [])
        setReservations(Array.isArray(resRes.data) ? resRes.data : [])
        setEmployeesList((employeesRes.data || []) as Array<{ auth_user_id: string; full_name: string; job_title: string | null }>)
        setSalesWithRemaining((salesPartialRes.data || []) as Array<{ id: string; building_id: string; remaining_payment: number; remaining_payment_due_date?: string | null; buyer_name?: string | null }>)
        setBuildingInvestorsWithDueDate((investorsDueRes.data || []) as Array<{ id: string; building_id: string; investor_name: string; investment_due_date: string }>)
      } else {
        setUnits([])
        setReservations([])
        setSalesWithRemaining([])
        setBuildingInvestorsWithDueDate([])
        setEmployeesList([])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    const loadMeterAddedLogs = async () => {
      const { data } = await supabase
        .from('activity_logs')
        .select('id, action_description, metadata, created_at')
        .eq('action_type', 'meter_added')
        .order('created_at', { ascending: false })
        .limit(20)
      setMeterAddedLogs((data || []) as Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>)
    }
    loadMeterAddedLogs()
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    const loadOwnershipTransferredLogs = async () => {
      const { data } = await supabase
        .from('activity_logs')
        .select('id, action_description, metadata, created_at')
        .eq('action_type', 'ownership_transferred')
        .order('created_at', { ascending: false })
        .limit(20)
      setOwnershipTransferredLogs((data || []) as Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>)
    }
    loadOwnershipTransferredLogs()
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    const loadReservationActivityLogs = async () => {
      const [cancelledRes, refundedRes] = await Promise.all([
        supabase.from('activity_logs').select('id, action_description, metadata, created_at').eq('action_type', 'reservation_cancelled').order('created_at', { ascending: false }).limit(10),
        supabase.from('activity_logs').select('id, action_description, metadata, created_at').eq('action_type', 'deposit_refunded').order('created_at', { ascending: false }).limit(10),
      ])
      setReservationCancelledLogs((cancelledRes.data || []) as Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>)
      setDepositRefundedLogs((refundedRes.data || []) as Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>)
    }
    loadReservationActivityLogs()
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    const loadRemainingPaymentCollectedLogs = async () => {
      const { data } = await supabase
        .from('activity_logs')
        .select('id, action_description, metadata, created_at')
        .eq('action_type', 'remaining_payment_collected')
        .order('created_at', { ascending: false })
        .limit(15)
      setRemainingPaymentCollectedLogs((data || []) as Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>)
    }
    loadRemainingPaymentCollectedLogs()
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    const loadRemainingPaymentCollectedLateLogs = async () => {
      const { data } = await supabase
        .from('activity_logs')
        .select('id, action_description, metadata, created_at')
        .eq('action_type', 'remaining_payment_collected_late')
        .order('created_at', { ascending: false })
        .limit(15)
      setRemainingPaymentCollectedLateLogs((data || []) as Array<{ id: string; action_description: string | null; metadata: Record<string, unknown> | null; created_at: string }>)
    }
    loadRemainingPaymentCollectedLateLogs()
  }, [user?.id])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

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

  // حساب الإحصائيات من جدول الوحدات
  const totalBuildings = buildings.length
  const totalUnits = units.length
  
  // حساب عدد الوحدات حسب الحالة من جدول units
  const availableUnits = units.filter(u => u.status === 'available').length
  const reservedUnits = units.filter(u => u.status === 'reserved').length
  const soldUnits = units.filter(u => u.status === 'sold').length

  // تنبيهات فواتير الكهرباء — فقط خلال فترة الفاتورة (26 حتى 10). فقط عدادات الوحدات المتاحة (المملوكة للمنشأة): المستبعدة الوحدات المُباعة التي نُقل عدادها مع البيع. تنبيه واحد لكل عمارة (اسم العمارة فقط).
  const isElectricityBillPeriod = (() => {
    const today = new Date()
    const day = today.getDate()
    return day >= 26 || day <= 10
  })()
  const electricityReminders = useMemo(() => {
    if (!isElectricityBillPeriod) return []
    const seen = new Set<string>()
    const out: { buildingId: string; buildingName: string }[] = []
    for (const u of units) {
      if (!u.electricity_meter_number || !String(u.electricity_meter_number).trim()) continue
      if (u.status === 'sold' && u.electricity_meter_transferred_with_sale === true) continue
      const bid = u.building_id
      if (!bid || seen.has(bid)) continue
      seen.add(bid)
      out.push({
        buildingId: bid,
        buildingName: buildings.find(b => b.id === bid)?.name || '—'
      })
    }
    return out
  }, [isElectricityBillPeriod, units, buildings])

  // تنبيهات عمارة بدون عدادات كاملة — تنبيه واحد لكل عمارة (بالاسم فقط)
  const buildingsMissingMeters = useMemo(() => {
    const byBuilding = new Map<string, { missing: number; hasAny: boolean; buildingName: string }>()
    for (const u of units) {
      const bid = u.building_id
      if (!bid) continue
      const hasMeter = !!(u.electricity_meter_number && String(u.electricity_meter_number).trim())
      const buildingName = buildings.find(b => b.id === bid)?.name || '—'
      if (!byBuilding.has(bid)) {
        byBuilding.set(bid, { missing: 0, hasAny: false, buildingName })
      }
      const cur = byBuilding.get(bid)!
      if (!hasMeter) cur.missing += 1
      else cur.hasAny = true
    }
    const out: { buildingId: string; buildingName: string; needsComplete: boolean }[] = []
    byBuilding.forEach((val, buildingId) => {
      if (val.missing > 0) {
        out.push({
          buildingId,
          buildingName: val.buildingName,
          needsComplete: val.hasAny
        })
      }
    })
    return out
  }, [units, buildings])

  // تنبيهات الحجز المنتهي — عند تجاوز تاريخ انتهاء الحجز مع بقاء الحالة قيد الحجز
  const reservationReminders = reservations
    .filter((r) => ['active', 'pending', 'confirmed', 'reserved'].includes(r.status))
    .filter((r) => r.expiry_date && new Date(r.expiry_date).getTime() < Date.now())
    .map((r) => {
      const unit = units.find((u) => u.id === r.unit_id)
      return {
        reservation: r,
        unit,
        buildingName: buildings.find((b) => b.id === r.building_id)?.name || '—'
      }
    })

  // تنبيهات اقتراب انتهاء عقد الاستثمار — قبل 30 يوم ثم كل 10 أيام (30، 20، 10، 0) — للمالك أو من لديه صلاحية المستثمرين
  const INV_DUE_ALERT_DAYS = [30, 20, 10, 0]
  const investmentEndReminders = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const out: { investorId: string; buildingId: string; buildingName: string; investorName: string; dueDate: string; daysLeft: number }[] = []
    for (const inv of buildingInvestorsWithDueDate) {
      const dueDate = new Date(inv.investment_due_date)
      dueDate.setHours(0, 0, 0, 0)
      const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
      if (INV_DUE_ALERT_DAYS.includes(daysLeft) && daysLeft >= 0) {
        out.push({
          investorId: inv.id,
          buildingId: inv.building_id,
          buildingName: buildings.find(b => b.id === inv.building_id)?.name || '—',
          investorName: inv.investor_name,
          dueDate: inv.investment_due_date,
          daysLeft
        })
      }
    }
    return out
  }, [buildingInvestorsWithDueDate, buildings])

  // تنبيهات انتهاء مدة اتحاد الملاك — قبل 10، 5، 3 أيام وعند الانتهاء
  const ASSOC_ALERT_DAYS = [10, 5, 3, 0]
  const associationEndReminders = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const out: { buildingId: string; buildingName: string; endDate: string; daysLeft: number }[] = []
    for (const b of buildingsForAssoc) {
      let oa: Record<string, unknown> = {}
      try {
        const raw = b.owner_association
        if (!raw) continue
        oa = typeof raw === 'string' ? JSON.parse(raw) : raw
      } catch {
        continue
      }
      const hasAssoc = !!(oa.hasAssociation ?? oa.isAssociationActive)
      if (!hasAssoc) continue
      const endDateStr = (oa.endDate ?? oa.end_date) as string | undefined
      if (!endDateStr || typeof endDateStr !== 'string') continue
      const endDate = new Date(endDateStr)
      endDate.setHours(0, 0, 0, 0)
      const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
      if (ASSOC_ALERT_DAYS.includes(daysLeft)) {
        out.push({
          buildingId: b.id,
          buildingName: b.name || 'عمارة',
          endDate: endDateStr,
          daysLeft
        })
      }
    }
    return out
  }, [buildingsForAssoc])

  // تنبيهات معروضة حسب الصلاحيات (خاصة بلوحة الموظف حسب عمله)
  // تنبيهات الحجز والإلغاء والبيع تظهر للمالك فقط وليس للموظف
  // تنبيهات اقتراب انتهاء عقد الاستثمار — للمالك فقط أو من لديه صلاحية المستثمرين
  const filteredAssociationEndReminders = can('details_association') ? associationEndReminders : []
  const filteredReservationReminders = employeePermissions === null && can('reservations') ? reservationReminders : []
  const filteredElectricityReminders = can('details_electricity') ? electricityReminders : []
  const filteredMissingMeterReminders = can('details_electricity') ? buildingsMissingMeters : []
  const filteredInvestmentEndReminders = can('investors_view') ? investmentEndReminders : []

  // إجراءات حجوزات (إلغاء حجز / استرداد عربون) تظهر في الجرس لأصحاب صلاحية الحجوزات
  const reservationActivityForBell = useMemo(() => {
    if (!can('reservations')) return { cancelled: [], refunded: [] }
    const cancelled = (reservationCancelledLogs || []).slice(0, 5)
    const refunded = (depositRefundedLogs || []).slice(0, 5)
    return { cancelled, refunded }
  }, [can('reservations'), reservationCancelledLogs, depositRefundedLogs])
  const reservationActivityCount = reservationActivityForBell.cancelled.length + reservationActivityForBell.refunded.length

  // تنبيهات تأكيد تحصيل المتبقي + تأخير التحصيل + صفقات بمبلغ متبقٍ — للمالك ومن لديه صلاحية المبيعات
  const filteredRemainingPaymentCollectedLogs = can('sales') ? (remainingPaymentCollectedLogs || []).slice(0, 8) : []
  const filteredRemainingPaymentCollectedLateLogs = can('sales') ? (remainingPaymentCollectedLateLogs || []).slice(0, 8) : []
  const filteredSalesWithRemaining = can('sales') ? (salesWithRemaining || []).slice(0, 8) : []
  const remainingPaymentNotificationsCount = filteredRemainingPaymentCollectedLogs.length + filteredRemainingPaymentCollectedLateLogs.length + filteredSalesWithRemaining.length

  const criticalAlertsCount = useCriticalAlertsCount(
    salesWithRemaining,
    reservations,
    can('sales'),
    can('reservations'),
    employeePermissions
  )

  const notificationsCount = filteredElectricityReminders.length + filteredReservationReminders.length + filteredAssociationEndReminders.length + filteredMissingMeterReminders.length + filteredInvestmentEndReminders.length + reservationActivityCount + remainingPaymentNotificationsCount + appointmentBellReminders.length

  // قائمة معرفات الإشعارات الحالية (لحساب غير المقروءة)
  const currentNotificationIds = useMemo(() => {
    const ids: string[] = []
    filteredAssociationEndReminders.forEach(({ buildingId, daysLeft }) => ids.push(`assoc-${buildingId}-${daysLeft}`))
    filteredInvestmentEndReminders.forEach(({ investorId, daysLeft }) => ids.push(`inv-due-${investorId}-${daysLeft}`))
    filteredReservationReminders.forEach(({ reservation }) => ids.push(`res-expired-${reservation.id}`))
    filteredElectricityReminders.forEach(({ buildingId }) => ids.push(`elec-building-${buildingId}`))
    filteredMissingMeterReminders.forEach(({ buildingId }) => ids.push(`meter-missing-${buildingId}`))
    reservationActivityForBell.cancelled.forEach((log: { id: string }) => ids.push(`activity-cancelled-${log.id}`))
    reservationActivityForBell.refunded.forEach((log: { id: string }) => ids.push(`activity-refund-${log.id}`))
    filteredRemainingPaymentCollectedLogs.forEach((log: { id: string }) => ids.push(`remaining-collected-${log.id}`))
    filteredRemainingPaymentCollectedLateLogs.forEach((log: { id: string }) => ids.push(`remaining-collected-late-${log.id}`))
    filteredSalesWithRemaining.forEach((s: { id: string }) => ids.push(`sale-remaining-${s.id}`))
    appointmentBellReminders.forEach((a) => {
      const d = (a.scheduled_at || '').slice(0, 10)
      ids.push(`appt-bell-${a.id}-${d}`)
    })
    return ids
  }, [filteredAssociationEndReminders, filteredInvestmentEndReminders, filteredReservationReminders, filteredElectricityReminders, filteredMissingMeterReminders, reservationActivityForBell, filteredRemainingPaymentCollectedLogs, filteredRemainingPaymentCollectedLateLogs, filteredSalesWithRemaining, appointmentBellReminders])

  const unreadCount = useMemo(() => {
    return currentNotificationIds.filter((id) => !readNotificationIds.has(id)).length
  }, [currentNotificationIds, readNotificationIds])

  /** تنسيق وقت التنبيه لعرضه بجانب كل تنبيه (أحدث أولاً) */
  const formatNotificationTime = (isoDate: string) => {
    const d = new Date(isoDate)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined }
    const formatMiladi = () => d.toLocaleDateString('en-GB', opts)
    if (diffMs < 0) {
      // تاريخ مستقبلي (مثلاً انتهاء اتحاد الملاك)
      return formatMiladi()
    }
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'الآن'
    if (diffMins < 60) return `منذ ${diffMins} د`
    if (diffHours < 24) return `منذ ${diffHours} س`
    if (diffDays === 1) return 'أمس'
    if (diffDays < 7) return `منذ ${diffDays} أيام`
    return formatMiladi()
  }

  /** قائمة موحدة لجميع التنبيهات مرتبة من الأحدث إلى الأقدم */
  type NotificationItem =
    | { type: 'assoc'; sortTime: string; key: string; buildingId: string; buildingName: string; endDate: string; daysLeft: number }
    | { type: 'inv-due'; sortTime: string; key: string; investorId: string; buildingId: string; buildingName: string; investorName: string; dueDate: string; daysLeft: number }
    | { type: 'res-expired'; sortTime: string; key: string; reservation: (typeof reservations)[0]; unit: Unit | undefined; buildingName: string }
    | { type: 'elec'; sortTime: string; key: string; buildingId: string; buildingName: string }
    | { type: 'meter-missing'; sortTime: string; key: string; buildingId: string; buildingName: string; needsComplete: boolean }
    | { type: 'cancelled'; sortTime: string; key: string; log: (typeof reservationCancelledLogs)[0] }
    | { type: 'refunded'; sortTime: string; key: string; log: (typeof depositRefundedLogs)[0] }
    | { type: 'remaining-collected'; sortTime: string; key: string; log: (typeof remainingPaymentCollectedLogs)[0] }
    | { type: 'remaining-late'; sortTime: string; key: string; log: (typeof remainingPaymentCollectedLateLogs)[0] }
    | { type: 'sale-remaining'; sortTime: string; key: string; sale: (typeof salesWithRemaining)[0] }
    | { type: 'appt-bell'; sortTime: string; key: string; appt: { id: string; title: string; scheduled_at: string; buildings?: { name: string } | null } }
  const sortedNotifications = useMemo((): NotificationItem[] => {
    const fallbackTime = '1970-01-01T00:00:00Z' // تنبيهات بدون تاريخ تُعرض في النهاية
    const items: NotificationItem[] = []
    filteredAssociationEndReminders.forEach(({ buildingId, buildingName, endDate, daysLeft }) => {
      items.push({ type: 'assoc', sortTime: endDate, key: `assoc-${buildingId}-${daysLeft}`, buildingId, buildingName, endDate, daysLeft })
    })
    filteredInvestmentEndReminders.forEach(({ investorId, buildingId, buildingName, investorName, dueDate, daysLeft }) => {
      items.push({ type: 'inv-due', sortTime: dueDate, key: `inv-due-${investorId}-${daysLeft}`, investorId, buildingId, buildingName, investorName, dueDate, daysLeft })
    })
    filteredReservationReminders.forEach(({ reservation, unit, buildingName }) => {
      const sortTime = reservation.expiry_date || reservation.created_at
      items.push({ type: 'res-expired', sortTime, key: `res-expired-${reservation.id}`, reservation, unit, buildingName })
    })
    filteredElectricityReminders.forEach(({ buildingId, buildingName }) => {
      items.push({ type: 'elec', sortTime: fallbackTime, key: `elec-building-${buildingId}`, buildingId, buildingName })
    })
    filteredMissingMeterReminders.forEach(({ buildingId, buildingName, needsComplete }) => {
      items.push({ type: 'meter-missing', sortTime: fallbackTime, key: `meter-missing-${buildingId}`, buildingId, buildingName, needsComplete })
    })
    ;(reservationActivityForBell.cancelled || []).forEach((log) => {
      items.push({ type: 'cancelled', sortTime: log.created_at, key: `activity-cancelled-${log.id}`, log })
    })
    ;(reservationActivityForBell.refunded || []).forEach((log) => {
      items.push({ type: 'refunded', sortTime: log.created_at, key: `activity-refund-${log.id}`, log })
    })
    ;(filteredRemainingPaymentCollectedLogs || []).forEach((log) => {
      items.push({ type: 'remaining-collected', sortTime: log.created_at, key: `remaining-collected-${log.id}`, log })
    })
    ;(filteredRemainingPaymentCollectedLateLogs || []).forEach((log) => {
      items.push({ type: 'remaining-late', sortTime: log.created_at, key: `remaining-collected-late-${log.id}`, log })
    })
    ;(filteredSalesWithRemaining || []).forEach((s) => {
      items.push({ type: 'sale-remaining', sortTime: (s as { created_at?: string }).created_at || fallbackTime, key: `sale-remaining-${s.id}`, sale: s })
    })
    appointmentBellReminders.forEach((a) => {
      const d = (a.scheduled_at || '').slice(0, 10)
      items.push({ type: 'appt-bell', sortTime: a.scheduled_at, key: `appt-bell-${a.id}-${d}`, appt: a })
    })
    return items.sort((a, b) => new Date(b.sortTime).getTime() - new Date(a.sortTime).getTime())
  }, [
    filteredAssociationEndReminders,
    filteredInvestmentEndReminders,
    filteredReservationReminders,
    filteredElectricityReminders,
    filteredMissingMeterReminders,
    reservationActivityForBell,
    filteredRemainingPaymentCollectedLogs,
    filteredRemainingPaymentCollectedLateLogs,
    filteredSalesWithRemaining,
    reservations,
    appointmentBellReminders,
  ])

  const markAllNotificationsRead = () => {
    setReadNotificationIds((prev) => {
      const next = new Set(prev)
      currentNotificationIds.forEach((id) => next.add(id))
      try {
        localStorage.setItem('dashboard-read-notifications', JSON.stringify([...next]))
      } catch {}
      return next
    })
  }

  // اشتقاق آخر النشاطات من البيانات الفعلية (بيع، حجز، إضافة عمارة، تنبيهات اتحاد الملاك)
  const activities = useMemo(() => {
    // اسم صاحب الحساب من الحساب فقط (استبعاد العمارة): الاسم من الحساب ثم صاحب الحساب
    const ownerDisplayName =
      (user && effectiveOwnerId === user.id ? (user.user_metadata?.full_name || user.email) : null) ||
      'صاحب الحساب'

    const fromUnits: Activity[] = []
    for (const u of units) {
      const bName = buildings.find(b => b.id === u.building_id)?.name || '—'
      if (u.status === 'sold') {
        // تم البيع: مسوق → "بواسطة المسوق: الاسم" | موظف → "بواسطة: اسم الموظف" | وإلا "بواسطة: اسم صاحب الحساب"
        const completedRes = reservations.find(r => r.unit_id === u.id && (r.status === 'completed' || r.sale_id != null || r.completed_at != null))
        const marketerName = completedRes?.marketer_name && String(completedRes.marketer_name).trim()
        const createdByName = completedRes?.created_by_name && String(completedRes.created_by_name).trim()
        if (marketerName) {
          fromUnits.push({
            id: u.id + '-sold',
            type: 'sold',
            building_name: bName,
            building_id: u.building_id,
            user_name: marketerName,
            user_role_label: 'بواسطة المسوق',
            timestamp: u.updated_at || u.created_at,
            details: `تم بيع الوحدة ${u.unit_number} (الدور ${u.floor})`
          })
        } else if (createdByName) {
          const createdByUserId = completedRes?.created_by ?? null
          const emp = createdByUserId ? employeesList.find(e => e.auth_user_id === createdByUserId) : null
          const jobTitle = emp?.job_title?.trim() || null
          const displayName = jobTitle ? `${createdByName} (${jobTitle})` : createdByName
          fromUnits.push({
            id: u.id + '-sold',
            type: 'sold',
            building_name: bName,
            building_id: u.building_id,
            user_name: displayName,
            user_role_label: 'بواسطة',
            timestamp: u.updated_at || u.created_at,
            details: `تم بيع الوحدة ${u.unit_number} (الدور ${u.floor})`
          })
        } else {
          fromUnits.push({
            id: u.id + '-sold',
            type: 'sold',
            building_name: bName,
            building_id: u.building_id,
            user_name: ownerDisplayName,
            user_role_label: 'بواسطة',
            timestamp: u.updated_at || u.created_at,
            details: `تم بيع الوحدة ${u.unit_number} (الدور ${u.floor})`
          })
        }
      }
    }
    const fromReservations: Activity[] = reservations.map(r => {
      const bName = buildings.find(b => b.id === r.building_id)?.name || '—'
      const u = units.find(ux => ux.id === r.unit_id)
      const unitLabel = u ? `الوحدة ${u.unit_number} (الدور ${u.floor})` : 'وحدة محجوزة'
      return {
        id: r.id + '-reserved',
        type: 'reserved' as const,
        building_name: bName,
        building_id: r.building_id,
        user_name: (r.created_by_name && String(r.created_by_name).trim()) || 'مدير الحجوزات',
        user_role_label: 'موظف',
        timestamp: r.created_at,
        details: `تم حجز ${unitLabel} — عميل: ${r.customer_name || '—'}`
      }
    })
    const fromExpiredReservations: Activity[] = reservations
      .filter((r) => ['active', 'pending', 'confirmed', 'reserved'].includes(r.status))
      .filter((r) => r.expiry_date && new Date(r.expiry_date).getTime() < Date.now())
      .map((r) => {
        const bName = buildings.find(b => b.id === r.building_id)?.name || '—'
        const u = units.find(ux => ux.id === r.unit_id)
        const unitLabel = u ? `الوحدة ${u.unit_number} (الدور ${u.floor})` : 'وحدة محجوزة'
        return {
          id: r.id + '-expired-review',
          type: 'reserved' as const,
          building_name: bName,
          building_id: r.building_id,
          user_name: (r.created_by_name && String(r.created_by_name).trim()) || 'مدير الحجوزات',
          user_role_label: 'موظف',
          timestamp: r.expiry_date || r.created_at,
          details: `انتهت مدة الحجز — يرجى مراجعة وإلغاء حجز ${unitLabel}`
        }
      })
    const fromBuildings: Activity[] = buildings.map(b => ({
      id: b.id + '-add',
      type: 'add',
      building_name: b.name || 'عمارة جديدة',
      building_id: b.id,
      user_name: b.created_by_name?.trim() || b.owner_name?.trim() || 'صاحب الحساب',
      user_role_label: b.created_by_name?.trim() ? 'موظف' : 'صاحب الحساب',
      timestamp: b.created_at,
      details: 'تم إضافة عمارة جديدة'
    }))
    const fromAssoc: Activity[] = associationEndReminders.map(r => {
      const ownerName = buildings.find(b => b.id === r.buildingId)?.owner_name?.trim() || 'النظام'
      // ترتيب العرض: انتهت اليوم أولاً ثم 3 ثم 5 ثم 10 أيام (الأقرب أولاً)
      const sortTime = new Date(Date.now() - r.daysLeft * 24 * 60 * 60 * 1000).toISOString()
      return {
        id: `assoc-${r.buildingId}-${r.daysLeft}`,
        type: 'association_end' as const,
        building_name: r.buildingName,
        building_id: r.buildingId,
        user_name: ownerName,
        user_role_label: 'صاحب الحساب',
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
    const buildingIds = buildings.map(b => b.id)
    const fromMeterAdded: Activity[] = meterAddedLogs
      .filter(log => {
        const bid = log.metadata?.building_id as string | undefined
        return Boolean(bid && buildingIds.includes(bid))
      })
      .map(log => ({
        id: `meter-${log.id}`,
        type: 'meter_added' as const,
        building_name: (log.metadata?.building_name as string) || '—',
        building_id: (log.metadata?.building_id as string) || undefined,
        user_name: (log.metadata?.created_by_name as string)?.trim() || 'صاحب الحساب',
        user_role_label: (log.metadata?.created_by_name as string)?.trim() ? 'موظف' : 'صاحب الحساب',
        timestamp: log.created_at,
        details: log.action_description || 'تم إضافة عداد'
      }))
    const fromOwnershipTransferred: Activity[] = ownershipTransferredLogs
      .filter(log => {
        const bid = log.metadata?.building_id as string | undefined
        return Boolean(bid && buildingIds.includes(bid))
      })
      .map(log => ({
        id: `transfer-${log.id}`,
        type: 'ownership_transferred' as const,
        building_name: (log.metadata?.building_name as string) || '—',
        building_id: (log.metadata?.building_id as string) || undefined,
        user_name: (log.metadata?.created_by_name as string)?.trim() || 'صاحب الحساب',
        user_role_label: (log.metadata?.created_by_name as string)?.trim() ? 'موظف' : 'صاحب الحساب',
        timestamp: log.created_at,
        details: log.action_description || 'نقل ملكية'
      }))
    const fromRemainingPaymentCollected: Activity[] = remainingPaymentCollectedLogs
      .filter(log => {
        const bid = log.metadata?.building_id as string | undefined
        return Boolean(bid && buildingIds.includes(bid))
      })
      .map(log => ({
        id: `remaining-${log.id}`,
        type: 'remaining_payment_collected' as const,
        building_name: (log.metadata?.building_name as string) || '—',
        building_id: (log.metadata?.building_id as string) || undefined,
        user_name: 'النظام',
        user_role_label: 'النظام',
        timestamp: log.created_at,
        details: log.action_description || 'تم تأكيد تحصيل المبلغ المتبقي'
      }))
    const fromRemainingPaymentCollectedLate: Activity[] = remainingPaymentCollectedLateLogs
      .filter(log => {
        const bid = log.metadata?.building_id as string | undefined
        return Boolean(bid && buildingIds.includes(bid))
      })
      .map(log => ({
        id: `remaining-late-${log.id}`,
        type: 'remaining_payment_collected_late' as const,
        building_name: (log.metadata?.building_name as string) || '—',
        building_id: (log.metadata?.building_id as string) || undefined,
        user_name: 'النظام',
        user_role_label: 'النظام',
        timestamp: log.created_at,
        details: log.action_description || 'تأخير في تحصيل المبلغ المتبقي — تم الدفع بعد تاريخ الاستحقاق'
      }))
    return [...fromUnits, ...fromReservations, ...fromExpiredReservations, ...fromBuildings, ...fromAssoc, ...fromMeterAdded, ...fromOwnershipTransferred, ...fromRemainingPaymentCollected, ...fromRemainingPaymentCollectedLate]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 7)
  }, [units, buildings, reservations, employeesList, associationEndReminders, meterAddedLogs, ownershipTransferredLogs, remainingPaymentCollectedLogs, remainingPaymentCollectedLateLogs, user, effectiveOwnerId])

  // عرض النشاطات حسب الصلاحيات (خاص بلوحة الموظف)
  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      if (a.type === 'sold') return can('sales')
      if (a.type === 'reserved') return can('reservations')
      if (a.type === 'add') return can('building_details') || can('buildings')
      if (a.type === 'association_end') return can('details_association')
      if (a.type === 'meter_added') return can('details_electricity')
      if (a.type === 'ownership_transferred') return can('deeds')
      if (a.type === 'remaining_payment_collected') return can('sales')
      if (a.type === 'remaining_payment_collected_late') return can('sales')
      return true
    })
  }, [activities, employeePermissions])

  // حساب النسب المئوية
  const availablePercentage = totalUnits > 0 ? Math.round((availableUnits / totalUnits) * 100) : 0
  const reservedPercentage = totalUnits > 0 ? Math.round((reservedUnits / totalUnits) * 100) : 0
  const soldPercentage = totalUnits > 0 ? Math.round((soldUnits / totalUnits) * 100) : 0

  const stats = [
    {
      title: 'إجمالي العماير',
      value: totalBuildings,
      change: totalBuildings > 0 ? `${totalBuildings} عمارة` : '—',
      trend: 'up' as const,
      icon: Building2,
      color: 'blue',
      bgGradient: 'from-blue-500 to-cyan-500',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      iconBg: 'bg-blue-100',
      chart: [40, 70, 50, 80, 60, 90, 70],
      link: '/dashboard/buildings'
    },
    {
      title: 'إجمالي الوحدات',
      value: totalUnits,
      change: `${totalUnits} وحدة`,
      trend: 'up' as const,
      icon: Home,
      color: 'emerald',
      bgGradient: 'from-emerald-500 to-teal-500',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
      iconBg: 'bg-emerald-100',
      chart: [30, 60, 45, 70, 55, 85, 65],
      link: '/dashboard/units'
    },
    {
      title: 'الشقق المتاحة',
      value: availableUnits,
      change: `${availablePercentage}%`,
      trend: 'up' as const,
      icon: CheckSquare,
      color: 'purple',
      bgGradient: 'from-purple-500 to-pink-500',
      bgLight: 'bg-purple-50',
      textColor: 'text-purple-600',
      borderColor: 'border-purple-200',
      iconBg: 'bg-purple-100',
      chart: [60, 75, 65, 85, 70, 90, 80],
      link: '/dashboard/units?status=available'
    },
    {
      title: 'الشقق المحجوزة',
      value: reservedUnits,
      change: `${reservedPercentage}%`,
      trend: 'up' as const,
      icon: Calendar,
      color: 'amber',
      bgGradient: 'from-amber-500 to-orange-500',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-600',
      borderColor: 'border-amber-200',
      iconBg: 'bg-amber-100',
      chart: [30, 45, 35, 50, 40, 55, 45],
      link: '/dashboard/units?status=reserved'
    },
    {
      title: 'الشقق المباعة',
      value: soldUnits,
      change: `${soldPercentage}%`,
      trend: 'up' as const,
      icon: ShoppingCart,
      color: 'rose',
      bgGradient: 'from-rose-500 to-pink-500',
      bgLight: 'bg-rose-50',
      textColor: 'text-rose-600',
      borderColor: 'border-rose-200',
      iconBg: 'bg-rose-100',
      chart: [50, 80, 60, 90, 70, 95, 85],
      link: '/dashboard/units?status=sold'
    },
    {
      title: 'معدل الإشغال',
      value: totalUnits > 0 ? Math.round(((reservedUnits + soldUnits) / totalUnits) * 100) : 0,
      suffix: '%',
      change: totalUnits > 0 ? `${Math.round(((reservedUnits + soldUnits) / totalUnits) * 100)}%` : '—',
      trend: 'up' as const,
      icon: TrendingUp,
      color: 'indigo',
      bgGradient: 'from-indigo-500 to-purple-500',
      bgLight: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      borderColor: 'border-indigo-200',
      iconBg: 'bg-indigo-100',
      chart: [45, 65, 55, 75, 65, 85, 75],
      link: '/dashboard/statistics'
    }
  ]

  const quickActions = [
    { icon: Eye, label: 'إدارة العماير', href: '/dashboard/buildings', color: 'green', gradient: 'from-emerald-500 to-green-500', permission: 'buildings' as const, noPermissionMessage: 'ليس لديك صلاحية إدارة العماير.' },
    { icon: Plus, label: 'إضافة عمارة', href: '/dashboard/buildings/new', color: 'blue', gradient: 'from-blue-500 to-cyan-500', permission: 'buildings_create' as const, noPermissionMessage: 'ليس لديك صلاحية إضافة عمارة جديدة. تواصل مع المالك لتفعيل الصلاحية.' },
    { icon: Home, label: 'الوحدات', href: '/dashboard/units', color: 'purple', gradient: 'from-purple-500 to-pink-500', permission: 'units' as const, noPermissionMessage: 'ليس لديك صلاحية الوصول للوحدات.' },
    { icon: User2, label: 'إدارة التسويق والمبيعات', href: '/dashboard/marketing', color: 'amber', gradient: 'from-amber-500 to-orange-600', permission: 'marketing_view' as const, noPermissionMessage: 'ليس لديك صلاحية الوصول لإدارة التسويق والمبيعات.' },
    { icon: Users, label: 'إدارة الملاك والمستثمرين', href: '/dashboard/owners-investors', color: 'teal', gradient: 'from-teal-500 to-cyan-600', permission: 'owners_view' as const, permissionAlt: 'investors_view' as const, noPermissionMessage: 'ليس لديك صلاحية الوصول لإدارة الملاك أو المستثمرين.' },
    { icon: CheckSquare, label: 'المهام والملاحظات', href: '/dashboard/tasks', color: 'amber', gradient: 'from-amber-500 to-orange-600', permission: 'marketing_view' as const, noPermissionMessage: 'ليس لديك صلاحية الوصول للمهام والملاحظات.' },
    { icon: BarChart3, label: 'الإحصائيات', href: '/dashboard/statistics', color: 'indigo', gradient: 'from-indigo-500 to-purple-500', permission: 'statistics' as const, noPermissionMessage: 'ليس لديك صلاحية الوصول للإحصائيات.' }
  ]

  const recentBuildings = buildings.slice(0, 3)

  const getActivityIcon = (type: string) => {
    switch(type) {
      case 'add': return <Plus className="w-4 h-4 text-green-600" />
      case 'edit': return <Edit className="w-4 h-4 text-blue-600" />
      case 'delete': return <Trash2 className="w-4 h-4 text-red-600" />
      case 'booking':
      case 'sold': return <ShoppingCart className="w-4 h-4 text-purple-600" />
      case 'reserved': return <Calendar className="w-4 h-4 text-amber-600" />
      case 'association_end': return <Users className="w-4 h-4 text-emerald-600" />
      case 'meter_added': return <Zap className="w-4 h-4 text-amber-600" />
      case 'ownership_transferred': return <ArrowRightLeft className="w-4 h-4 text-teal-600" />
      case 'remaining_payment_collected': return <CheckCircle className="w-4 h-4 text-emerald-600" />
      case 'remaining_payment_collected_late': return <AlertCircle className="w-4 h-4 text-amber-600" />
      default: return <Activity className="w-4 h-4 text-gray-600" />
    }
  }

  /** رابط تفاعلي لكل نشاط حسب النوع والصلاحيات — يوجّه للصفحة المناسبة */
  const getActivityLink = (activity: Activity): string => {
    const bid = activity.building_id
    switch (activity.type) {
      case 'sold':
        return bid ? `/dashboard/sales?buildingId=${encodeURIComponent(bid)}` : '/dashboard/sales'
      case 'reserved':
        return bid ? `/dashboard/reservations?buildingId=${encodeURIComponent(bid)}` : '/dashboard/reservations'
      case 'add':
        return bid && can('building_details') ? `/dashboard/buildings/details?buildingId=${encodeURIComponent(bid)}` : '/dashboard/buildings'
      case 'association_end':
        return bid && can('details_association') ? `/dashboard/buildings/details?buildingId=${encodeURIComponent(bid)}` : '/dashboard/buildings'
      case 'meter_added':
        return bid && can('details_electricity') ? `/dashboard/buildings/details?buildingId=${encodeURIComponent(bid)}#card-electricity` : '/dashboard/buildings'
      case 'ownership_transferred':
        return bid && can('deeds') ? `/dashboard/buildings/details?buildingId=${encodeURIComponent(bid)}` : '/dashboard/buildings'
      case 'remaining_payment_collected':
      case 'remaining_payment_collected_late':
        return '/dashboard/sales'
      default:
        return bid ? `/dashboard/buildings/details?buildingId=${encodeURIComponent(bid)}` : '/dashboard/buildings'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
            <Building2 className="w-10 h-10 text-blue-600 absolute top-7 left-1/2 transform -translate-x-1/2 animate-pulse" />
          </div>
          <p className="text-gray-700 text-xl font-medium mb-2">جاري تحميل لوحة التحكم</p>
          <p className="text-gray-400">يرجى الانتظار...</p>
        </div>
      </div>
    )
  }

  const isDisabledEmployee = user != null && employeePermissions !== null && Object.keys(employeePermissions).length === 0
  if (isDisabledEmployee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">حسابك معطّل</h1>
          <p className="text-slate-600 mb-6">تم تعطيل هذا الحساب من قبل مدير النظام. لا يمكنك استخدام لوحة التحكم حالياً.</p>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 transition"
          >
            <LogOut className="w-4 h-4" /> تسجيل الخروج
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
      {/* تصميم الهيدر المعتمد: شريط شفاف + حاوية بيضاوية بيضاء واحدة (بدون تحية/تاريخ في الهيدر) — لا يُغيّر */}
      <header className="sticky top-0 z-20 border-b border-slate-200/50 bg-transparent">
        <div className="relative w-full max-w-full px-4 sm:px-6 lg:px-8 pt-3 pb-2 md:pt-4 md:pb-3">
          <div className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/70 px-3 sm:px-4 lg:px-5 py-3 md:flex-row md:items-center md:justify-between md:min-h-[80px] shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
            {/* القسم الأيمن */}
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 md:flex-1">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 text-gray-600 hover:bg-white/80 rounded-xl border border-white/70 transition-colors"
              >
                <Menu className="w-6 h-6 text-gray-600" />
              </button>
              
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/70 flex-shrink-0">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-800 leading-tight">لوحة التحكم الرئيسية</h1>
                  <p className="text-xs text-gray-500/90">
                    {employeePermissions === null ? 'مدير النظام' : (employeeJobTitle ? `حساب موظف — ${employeeJobTitle}` : (employeeDisplayName ? `حساب موظف — ${employeeDisplayName}` : 'حساب موظف'))}
                  </p>
                  {!subscriptionLoading && planName && (
                    <p className="text-xs text-indigo-700 font-medium mt-1 flex flex-wrap items-center gap-2">
                      {planName === 'مفتوح' ? (
                        'حساب مدير النظام — العمل جاري على التطوير'
                      ) : (
                        <>
                          خطة {planName}: {buildingsLimitLabel}
                          {!canAddBuilding && (
                            <Link href="/subscriptions" className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 bg-amber-50/90 border border-amber-200/70 px-2 py-0.5 rounded-lg">
                              <Crown className="w-3.5 h-3.5" />
                              ترقية
                            </Link>
                          )}
                        </>
                      )}
                    </p>
                  )}
                  <div className="mt-2 flex md:hidden items-center gap-2 flex-wrap">
                    {can('reservations') && (
                      <Link href="/dashboard/reservations" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200/70 bg-blue-50/90 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition">
                        <Calendar className="w-3.5 h-3.5" />
                        سجل الحجوزات
                      </Link>
                    )}
                    {can('sales') && (
                      <Link href="/dashboard/sales" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-green-200/70 bg-green-50/90 text-green-700 text-xs font-semibold hover:bg-green-100 transition">
                        <RiyalIcon className="w-3.5 h-3.5" />
                        سجل المبيعات
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* القسم الأيسر */}
            <div className="flex items-center justify-between sm:justify-start gap-3 md:flex-shrink-0">
              {/* الإشعارات */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(v => !v)}
                  className={`relative flex items-center justify-center w-11 h-11 rounded-2xl border transition-all duration-200 overflow-visible shadow-sm ${
                    notificationsOpen
                      ? 'border-amber-200 bg-amber-50/90 text-amber-600'
                      : criticalAlertsCount > 0
                        ? 'dashboard-bell-urgent'
                        : 'border-white/80 bg-white/70 text-gray-600 hover:bg-white hover:border-slate-200'
                  }`}
                  aria-expanded={notificationsOpen}
                  aria-haspopup="true"
                  aria-label={
                    criticalAlertsCount > 0
                      ? `تنبيهات — ${criticalAlertsCount} بالغة الأهمية`
                      : unreadCount > 0
                        ? `${unreadCount} تنبيه غير مقروء`
                        : 'التنبيهات'
                  }
                >
                  <Bell className="w-5 h-5 flex-shrink-0" />
                </button>
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-0.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center ring-2 ring-white z-10 leading-tight"
                    aria-hidden
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                {notificationsOpen && (
                  <>
                    <div className="app-modal-root fixed inset-0 z-40 cursor-pointer" onClick={() => setNotificationsOpen(false)} aria-hidden="true" />
                    <div className="absolute left-0 mt-2 w-[22rem] max-h-[28rem] overflow-hidden bg-white rounded-2xl shadow-xl border border-gray-200 z-50" dir="rtl">
                      {/* رأس القائمة */}
                      <div className="bg-gradient-to-b from-amber-50 to-white border-b border-amber-100/80 px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-100 text-amber-600">
                              <Bell className="w-5 h-5" />
                            </span>
                            <div>
                              <h3 className="font-bold text-gray-800">التنبيهات</h3>
                            </div>
                          </div>
                          {notificationsCount > 0 && unreadCount > 0 && (
                            <button
                              type="button"
                              onClick={markAllNotificationsRead}
                              className="flex-shrink-0 inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-[11px] sm:text-xs font-semibold text-emerald-800 bg-white shadow-sm shadow-slate-900/5 ring-1 ring-emerald-200/70 hover:bg-emerald-50/90 hover:ring-emerald-300/50 active:scale-[0.98] transition"
                            >
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden />
                              تحديد الكل كمقروء
                            </button>
                          )}
                        </div>
                      </div>
                      {/* محتوى القائمة */}
                      <div className="max-h-80 overflow-y-auto overflow-x-hidden dashboard-modal-scroll py-1 rounded-lg">
                        {notificationsCount === 0 ? (
                          <div className="px-5 py-8 text-center">
                            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 text-gray-400 mb-3">
                              <Bell className="w-6 h-6" />
                            </span>
                            <p className="text-sm text-gray-500 font-medium">لا توجد تنبيهات</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {sortedNotifications.map((item) => {
                              const timeLabel = item.type === 'assoc' ? item.endDate : item.type === 'inv-due' ? item.dueDate : item.type === 'res-expired' ? (item.reservation.expiry_date || item.reservation.created_at) : item.type === 'elec' ? null : item.type === 'meter-missing' ? null : item.type === 'sale-remaining' ? (item.sale as { created_at?: string }).created_at : item.type === 'appt-bell' ? item.appt.scheduled_at : (item as { log?: { created_at: string } }).log?.created_at
                              const displayTime = item.type === 'elec' ? 'خلال فترة الفاتورة (26 — 10)' : timeLabel ? formatNotificationTime(timeLabel) : null
                              return (
                                <div key={item.key} className="flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50/70 transition">
                                  {item.type === 'assoc' && (
                                    <Link href={`/dashboard/buildings/details?buildingId=${item.buildingId}#card-association`} onClick={() => setNotificationsOpen(false)} className="flex items-start gap-3 flex-1 min-w-0">
                                      <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600"><Users className="w-5 h-5" /></span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800">{item.daysLeft === 0 ? 'انتهت مدة اتحاد الملاك اليوم' : `تنتهي خلال ${item.daysLeft} أيام`}</p>
                                        <p className="text-xs text-gray-600 mt-0.5">{item.buildingName}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">النهاية: {item.endDate}</p>
                                        {displayTime && <p className="text-[11px] text-gray-400 mt-1">{displayTime}</p>}
                                      </div>
                                    </Link>
                                  )}
                                  {item.type === 'inv-due' && (
                                    <Link href="/dashboard/owners-investors/investors" onClick={() => setNotificationsOpen(false)} className="flex items-start gap-3 flex-1 min-w-0">
                                      <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600"><TrendingUp className="w-5 h-5" /></span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800">{item.daysLeft === 0 ? 'ينتهي عقد الاستثمار اليوم' : `اقتراب انتهاء عقد الاستثمار — ${item.daysLeft} يوم`}</p>
                                        <p className="text-xs text-gray-600 mt-0.5">{item.investorName} — {item.buildingName}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">استحقاق المبلغ: {item.dueDate}</p>
                                        {displayTime && <p className="text-[11px] text-gray-400 mt-1">{displayTime}</p>}
                                      </div>
                                    </Link>
                                  )}
                                  {item.type === 'res-expired' && (
                                    <Link href={`/dashboard/reservations?buildingId=${item.reservation.building_id}`} onClick={() => setNotificationsOpen(false)} className="flex items-start gap-3 flex-1 min-w-0">
                                      <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600"><Calendar className="w-5 h-5" /></span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800">انتهت مدة الحجز — راجع وألغِ الحجز</p>
                                        <p className="text-xs text-gray-600 mt-0.5">{item.unit ? `الوحدة ${item.unit.unit_number} (د${item.unit.floor})` : 'وحدة محجوزة'} — {item.buildingName}</p>
                                        {displayTime && <p className="text-[11px] text-gray-400 mt-1">{displayTime}</p>}
                                      </div>
                                    </Link>
                                  )}
                                  {item.type === 'elec' && (
                                    <Link href={`/dashboard/buildings/details?buildingId=${item.buildingId}#card-electricity`} onClick={() => setNotificationsOpen(false)} className="flex items-start gap-3 flex-1 min-w-0">
                                      <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600"><Zap className="w-5 h-5" /></span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800">فاتورة كهرباء — عدادات العمارة</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{item.buildingName}</p>
                                        {displayTime && <p className="text-[11px] text-slate-500 mt-1">{displayTime}</p>}
                                      </div>
                                    </Link>
                                  )}
                                  {item.type === 'meter-missing' && (
                                    <Link href={`/dashboard/buildings/details?buildingId=${item.buildingId}#card-electricity`} onClick={() => setNotificationsOpen(false)} className="flex items-start gap-3 flex-1 min-w-0">
                                      <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600"><AlertCircle className="w-5 h-5" /></span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800">{item.needsComplete ? 'الرجاء إكمال إضافة عدادات عمارة' : 'الرجاء إضافة عدادات عمارة'}</p>
                                        <p className="text-xs text-gray-600 mt-0.5">{item.buildingName}</p>
                                      </div>
                                    </Link>
                                  )}
                                  {item.type === 'cancelled' && (
                                    <Link href={`/dashboard/reservations${item.log.metadata?.building_id ? `?buildingId=${String(item.log.metadata.building_id)}` : ''}`} onClick={() => setNotificationsOpen(false)} className="flex items-start gap-3 flex-1 min-w-0">
                                      <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600"><Trash2 className="w-5 h-5" /></span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800">إلغاء حجز</p>
                                        <p className="text-xs text-gray-600 mt-0.5">{item.log.action_description || 'تم إلغاء حجز'}</p>
                                        {displayTime && <p className="text-[11px] text-gray-400 mt-1">{displayTime}</p>}
                                      </div>
                                    </Link>
                                  )}
                                  {item.type === 'refunded' && (
                                    <Link href={`/dashboard/reservations${item.log.metadata?.building_id ? `?buildingId=${String(item.log.metadata.building_id)}` : ''}`} onClick={() => setNotificationsOpen(false)} className="flex items-start gap-3 flex-1 min-w-0">
                                      <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600"><ArrowRightLeft className="w-5 h-5" /></span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800">استرداد عربون</p>
                                        <p className="text-xs text-gray-600 mt-0.5">{item.log.action_description || 'تم استرداد العربون'}</p>
                                        {displayTime && <p className="text-[11px] text-gray-400 mt-1">{displayTime}</p>}
                                      </div>
                                    </Link>
                                  )}
                                  {item.type === 'remaining-collected' && (
                                    <Link href="/dashboard/sales" onClick={() => setNotificationsOpen(false)} className="flex items-start gap-3 flex-1 min-w-0">
                                      <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600"><CheckCircle className="w-5 h-5" /></span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800">تأكيد تحصيل المتبقي</p>
                                        <p className="text-xs text-gray-600 mt-0.5">{item.log.action_description || 'تم تأكيد تحصيل المبلغ المتبقي وتحويل الدفع إلى مكتمل'}</p>
                                        {displayTime && <p className="text-[11px] text-gray-400 mt-1">{displayTime}</p>}
                                      </div>
                                    </Link>
                                  )}
                                  {item.type === 'remaining-late' && (
                                    <Link href="/dashboard/sales" onClick={() => setNotificationsOpen(false)} className="flex items-start gap-3 flex-1 min-w-0">
                                      <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600"><AlertCircle className="w-5 h-5" /></span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800">تأخير في تحصيل المتبقي</p>
                                        <p className="text-xs text-gray-600 mt-0.5">{item.log.action_description || 'تم دفع المبلغ المتبقي بعد تاريخ الاستحقاق'}</p>
                                        {displayTime && <p className="text-[11px] text-gray-400 mt-1">{displayTime}</p>}
                                      </div>
                                    </Link>
                                  )}
                                  {item.type === 'sale-remaining' && (
                                    <Link href="/dashboard/sales" onClick={() => setNotificationsOpen(false)} className="flex items-start gap-3 flex-1 min-w-0">
                                      <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600"><RiyalIcon className="w-5 h-5" /></span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800">مبلغ متبقٍ على عميل</p>
                                        <p className="text-xs text-gray-600 mt-0.5 dir-ltr">{Number(item.sale.remaining_payment).toLocaleString('en')} ر.س — {buildings.find(b => b.id === item.sale.building_id)?.name || '—'}{item.sale.buyer_name ? ` · ${String(item.sale.buyer_name).trim()}` : ''}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">سجل المبيعات ← تأكيد التحصيل</p>
                                        {displayTime && <p className="text-[11px] text-gray-400 mt-1">{displayTime}</p>}
                                      </div>
                                    </Link>
                                  )}
                                  {item.type === 'appt-bell' && (
                                    <Link href="/dashboard/appointments" onClick={() => setNotificationsOpen(false)} className="flex items-start gap-3 flex-1 min-w-0">
                                      <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600"><Calendar className="w-5 h-5" /></span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800">تذكير موعد (عادي)</p>
                                        <p className="text-xs text-gray-600 mt-0.5">{item.appt.title}{item.appt.buildings?.name ? ` — ${item.appt.buildings.name}` : ''}</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">المواعيد — أولوية عالية تظهر في التنبيه الحرج</p>
                                        {displayTime && <p className="text-[11px] text-gray-400 mt-1">{displayTime}</p>}
                                      </div>
                                    </Link>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

{/* الوقت والتاريخ */}
              <div className="hidden md:block px-5 py-3 rounded-2xl border border-slate-200/60 bg-white/90 shadow-sm shadow-slate-200/30 min-w-[10rem] text-right">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">{greeting}</div>
                <div className="text-sm font-semibold text-slate-800 tabular-nums" dir="ltr">
                  {currentTime.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>

              {/* صورة المستخدم */}
              <div className="relative group">
                <button className="w-11 h-11 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg ring-1 ring-white/80">
                  {user?.email?.charAt(0).toUpperCase()}
                </button>
                
                {/* القائمة المنسدلة */}
                <div className="absolute left-0 mt-2 w-48 bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-white/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">{user?.email}</p>
                    {employeePermissions === null ? (
                      <p className="text-xs text-gray-500">مدير النظام</p>
                    ) : (
                      <p className="text-xs text-gray-500">{employeeJobTitle || employeeDisplayName || 'موظف'}</p>
                    )}
                  </div>
                  <div className="p-2">
                    <a href="/user" className="w-full px-3 py-2 text-right text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2 cursor-pointer">
                      <User2 className="w-4 h-4" />
                      ملف المستخدم
                    </a>
                    {(employeePermissions === null || employeePermissions.settings) && (
                      <Link href="/user/settings" className="w-full px-3 py-2 text-right text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2 cursor-pointer">
                        <Settings className="w-4 h-4" />
                        إعدادات متقدمة
                      </Link>
                    )}
                    <button 
                      onClick={handleLogout}
                      className="w-full px-3 py-2 text-right text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      تسجيل الخروج
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* القائمة الجانبية للجوال */}
      {sidebarOpen && (
        <div className="app-modal-root fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden cursor-pointer" onClick={() => setSidebarOpen(false)}>
          <div className="fixed right-0 top-0 bottom-0 w-64 bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-800">القائمة</h2>
                <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4">
              {quickActions.map((action, index) => {
                const allowed = can(action.permission) || ('permissionAlt' in action && action.permissionAlt && can(action.permissionAlt))
                const showWithoutPermission = action.permission === 'buildings_create' || action.permission === 'statistics'
                if (!allowed && !showWithoutPermission) return null
                if (allowed) {
                  return (
                    <Link
                      key={index}
                      href={action.href}
                      className="flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-50 rounded-xl transition mb-1 cursor-pointer"
                    >
                      <action.icon className={`w-5 h-5 text-${action.color}-600`} />
                      <span>{action.label}</span>
                    </Link>
                  )
                }
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => showToast(action.noPermissionMessage, 'error')}
                    className="flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-50 rounded-xl transition mb-1 cursor-pointer w-full text-right"
                  >
                    <action.icon className={`w-5 h-5 text-${action.color}-600`} />
                    <span>{action.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* المحتوى الرئيسي */}
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* بطاقات الإحصائيات المحدثة */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8 -mt-[9px]">
          {stats.map((stat, index) => (
            <Link
              key={index}
              href={stat.link || '#'}
              className={`group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border ${stat.borderColor} hover:border-opacity-100 ${animateStats ? 'animate-slideInUp' : 'opacity-0'} cursor-pointer hover:scale-105`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient}`}></div>
              </div>
              
              {/* Content */}
              <div className="relative p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 ${stat.iconBg} rounded-lg group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
                  </div>
                  <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium ${stat.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {stat.trend === 'up' ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    <span className="text-xs">{stat.change}</span>
                  </div>
                </div>
                
                <h3 className={`text-2xl font-bold ${stat.textColor} mb-1`}>
                  {stat.value}{stat.suffix || ''}
                </h3>
                <p className="text-gray-600 text-xs font-medium mb-3">{stat.title}</p>
                
                {/* Mini Chart */}
                <div className="flex items-end gap-0.5 h-10">
                  {stat.chart.map((height, i) => (
                    <div
                      key={i}
                      className={`flex-1 bg-gradient-to-t ${stat.bgGradient} rounded-t transition-all duration-500 group-hover:opacity-90`}
                      style={{ 
                        height: `${height}%`,
                        transitionDelay: `${i * 50}ms`
                      }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 transform -skew-x-12 group-hover:translate-x-full"></div>
            </Link>
          ))}
        </div>

        {/* إجراءات سريعة */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8 -mt-[9px]">
          {quickActions.map((action, index) => {
            const allowed = can(action.permission) || ('permissionAlt' in action && action.permissionAlt && can(action.permissionAlt))
            const showWithoutPermission = action.permission === 'buildings_create' || action.permission === 'statistics'
            if (!allowed && !showWithoutPermission) return null
            if (allowed) {
              return (
                <Link
                  key={index}
                  href={action.href}
                  className="group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 p-6 border border-gray-200 hover:border-transparent overflow-hidden hover:-translate-y-2 cursor-pointer"
                >
                  <div className={`absolute inset-0 top-[-1px] bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                  <div className="relative z-10 text-center">
                    <div className={`w-14 h-14 bg-gradient-to-br ${action.gradient} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                      <action.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-800 group-hover:text-white transition-colors duration-300 text-sm">
                      {action.label}
                    </h3>
                  </div>
                  <Sparkles className="absolute top-2 right-2 w-4 h-4 text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </Link>
              )
            }
            return (
              <button
                key={index}
                type="button"
                onClick={() => showToast(action.noPermissionMessage, 'error')}
                className="group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 p-6 border border-gray-200 overflow-hidden cursor-pointer w-full text-right opacity-90 hover:opacity-100"
              >
                <div className={`absolute inset-0 top-[-1px] bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                <div className="relative z-10 text-center">
                  <div className={`w-14 h-14 bg-gradient-to-br ${action.gradient} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                    <action.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-800 text-sm">
                    {action.label}
                  </h3>
                </div>
                <Sparkles className="absolute top-2 right-2 w-4 h-4 text-yellow-400 opacity-50" />
              </button>
            )
          })}
        </div>

        {/* صفين من المحتوى — محاذاة الأسفل بين العمودين */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          
          {/* العمود الأيمن - آخر النشاطات */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            
            {/* بطاقة النشاطات الأخيرة */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  آخر النشاطات
                </h2>
                {can('activities') && (
                  <Link href="/dashboard/activities" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:gap-2 transition-all group cursor-pointer">
                    <span>عرض الكل</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                )}
              </div>

              <div className="space-y-3">
                {filteredActivities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">لا توجد نشاطات بعد — ستظهر هنا عند إضافة عمارة أو بيع/حجز وحدة</div>
                ) : filteredActivities.map((activity) => (
                  <Link
                    key={activity.id}
                    href={getActivityLink(activity)}
                    className="relative flex items-start gap-4 p-4 rounded-xl border border-transparent hover:border-gray-200 hover:bg-gray-50/80 transition-colors duration-200 cursor-pointer block no-underline text-inherit"
                  >
                    <div className={`w-12 h-12 flex-shrink-0 bg-gradient-to-br ${
                      activity.type === 'add' ? 'from-green-100 to-emerald-200' :
                      activity.type === 'edit' ? 'from-blue-100 to-cyan-200' :
                      activity.type === 'delete' ? 'from-red-100 to-rose-200' :
                      activity.type === 'booking' || activity.type === 'sold' ? 'from-purple-100 to-pink-200' :
                      activity.type === 'reserved' ? 'from-amber-100 to-orange-200' :
                      activity.type === 'association_end' ? 'from-emerald-100 to-teal-200' :
                      activity.type === 'meter_added' ? 'from-amber-100 to-yellow-200' :
                      activity.type === 'ownership_transferred' ? 'from-teal-100 to-emerald-200' :
                      activity.type === 'remaining_payment_collected' ? 'from-emerald-100 to-green-200' :
                      activity.type === 'remaining_payment_collected_late' ? 'from-amber-100 to-orange-200' :
                      'from-gray-100 to-slate-200'
                    } rounded-xl flex items-center justify-center shadow-sm`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="font-bold text-gray-800 truncate">{activity.building_name}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>
                            {activity.type === 'association_end' && activity.endDate
                              ? `تاريخ النهاية: ${activity.endDate}`
                              : formatDate(activity.timestamp)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2 leading-relaxed">{activity.details}</p>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {activity.user_name.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-xs text-gray-500">
                          {(() => {
                            const isCurrentUserSystemAdmin = employeePermissions === null && user?.id === effectiveOwnerId
                            const ownerName = buildings[0]?.owner_name?.trim()
                            const isActorTheOwner = ownerName && activity.user_name === ownerName
                            const isActorCurrentUserByMetadata = activity.user_name === (user?.user_metadata?.full_name as string) || activity.user_name === user?.email
                            const isActorFallbackOwner = activity.user_name === 'صاحب الحساب'
                            const displayRole = (isCurrentUserSystemAdmin && (isActorTheOwner || isActorCurrentUserByMetadata || isActorFallbackOwner))
                              ? 'مدير النظام'
                              : activity.user_role_label
                            return displayRole ? (
                              <><span className="font-medium text-gray-600">{displayRole}:</span> <span className="font-semibold text-gray-700">{activity.user_name}</span></>
                            ) : (
                              <>بواسطة <span className="font-semibold text-gray-700">{activity.user_name}</span></>
                            )
                          })()}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

          </div>

          {/* العمود الأيسر - آخر العماير والتقويم — محاذاة من تحت */}
          <div className="flex flex-col gap-6 lg:items-stretch">
            
            {/* آخر العماير المضافة */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  آخر العماير
                </h2>
                <Link href="/dashboard/buildings" className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer">
                  عرض الكل
                </Link>
              </div>

              <div className="space-y-3">
                {recentBuildings.map((building) => {
                  const buildingUnits = units.filter(u => u.building_id === building.id)
                  const availableUnits = buildingUnits.filter(u => u.status === 'available').length
                  
                  return (
                    <Link 
                      key={building.id} 
                      href={can('building_details') ? `/dashboard/buildings/details?buildingId=${building.id}` : '/dashboard/buildings'}
                      className="group relative flex items-center gap-4 p-4 bg-gradient-to-r from-white to-gray-50 hover:from-blue-50 hover:to-purple-50 rounded-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200 hover:shadow-lg cursor-pointer overflow-hidden"
                    >
                      {/* Animated Background */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      {/* Building Icon */}
                      <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        {building.image_urls ? (
                          <span className="text-2xl">🏢</span>
                        ) : (
                          <Building2 className="w-7 h-7" />
                        )}
                        {/* Badge */}
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                          ✓
                        </div>
                      </div>
                      
                      {/* Building Info */}
                      <div className="flex-1 min-w-0 relative z-10">
                        <h4 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors truncate mb-1">{building.name}</h4>
                        <p className="text-xs text-gray-500 truncate mb-2 flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" />
                          رقم القطعة: {building.plot_number}
                        </p>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                            {building.total_units || 0} وحدة
                          </span>
                          <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                            {availableUnits} متاحة
                          </span>
                        </div>
                      </div>
                      
                      {/* Arrow Icon */}
                      <div className="relative z-10">
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                      </div>
                    </Link>
                  )
                })}
              </div>

              {recentBuildings.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-4 text-sm">لا توجد عماير مضافة حتى الآن</p>
                  {can('buildings_create') ? (
                    <Link
                      href="/dashboard/buildings/new"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold cursor-pointer"
                    >
                      <Plus className="w-5 h-5" />
                      إضافة أول عمارة
                    </Link>
                  ) : (
                    <p className="text-amber-600 text-sm font-medium">ليس لديك صلاحية إضافة عمارة. تواصل مع المالك.</p>
                  )}
                </div>
              )}
            </div>

            {/* التقويم والمواعيد — بيانات حقيقية من dashboard_appointments */}
            {can('marketing_view') && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  المواعيد القادمة
                </h2>
                <span className="relative inline-flex items-center">
                <Link
                  href="/dashboard/tasks"
                  className="text-xs font-medium text-amber-600 hover:text-amber-700"
                >
                  المهام والملاحظات
                </Link>
                {tasksCount > 0 && (
                  <span
                    className="absolute -top-2 -end-5 flex aspect-square min-w-4 min-h-4 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 px-1 text-[9px] font-bold text-white shadow-md shadow-amber-500/30 tabular-nums"
                    aria-label={`${tasksCount} مهمة أو ملاحظة`}
                  >
                    {tasksCount > 99 ? '99+' : tasksCount}
                  </span>
                )}
              </span>
              </div>

              <div className="space-y-3">
                {upcomingAppointments.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">لا توجد مواعيد قادمة. أضف موعداً أو عيّن مهمة لموظف لجدولتها.</p>
                ) : (
                  upcomingAppointments.map((a, i) => {
                    const d = new Date(a.scheduled_at)
                    const day = d.getDate()
                    const month = d.toLocaleDateString('en-GB', { month: 'short' })
                    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                    const cardStyles = [
                      { card: 'bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 hover:border-blue-300', icon: 'bg-gradient-to-br from-blue-600 to-cyan-600' },
                      { card: 'bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 hover:border-purple-300', icon: 'bg-gradient-to-br from-purple-600 to-pink-600' },
                      { card: 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 hover:border-green-300', icon: 'bg-gradient-to-br from-green-600 to-emerald-600' },
                      { card: 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 hover:border-amber-300', icon: 'bg-gradient-to-br from-amber-600 to-orange-600' },
                      { card: 'bg-gradient-to-r from-slate-50 to-gray-50 border-2 border-slate-200 hover:border-slate-300', icon: 'bg-gradient-to-br from-slate-600 to-gray-600' },
                    ]
                    const s = cardStyles[i % cardStyles.length]
                    return (
                      <Link
                        key={a.id}
                        href="/dashboard/appointments"
                        className={`group relative flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer hover:shadow-md ${s.card}`}
                      >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all ${s.icon}`}>
                          <div className="text-center">
                            <div className="text-xl">{day}</div>
                            <div className="text-xs opacity-80">{month}</div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-800 text-sm mb-1 group-hover:text-blue-600 transition-colors truncate">{a.title}</h4>
                          <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 shrink-0" />
                            {time}
                            {a.buildings?.name && <span className="truncate"> · {a.buildings.name}</span>}
                          </p>
                        </div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse shrink-0" />
                      </Link>
                    )
                  })
                )}
              </div>

              <Link
                href="/dashboard/appointments"
                className="w-full mt-5 py-3.5 border-2 border-dashed border-gray-300 rounded-2xl text-sm font-semibold text-gray-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 group"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                إضافة موعد جديد
              </Link>
            </div>
            )}

            {/* بطاقة مؤشرات الأداء — تتمدد لملء العمود ومحاذاة الأسفل مع آخر النشاطات */}
            <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl shadow-lg p-6 text-white flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">مؤشرات الأداء</h3>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full">محدث</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>الوحدات المتاحة</span>
                    <span className="font-bold">{availableUnits} ({availablePercentage}%)</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-green-300 rounded-full transition-all duration-500" style={{ width: `${availablePercentage}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>الوحدات المحجوزة</span>
                    <span className="font-bold">{reservedUnits} ({reservedPercentage}%)</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-300 rounded-full transition-all duration-500" style={{ width: `${reservedPercentage}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>الوحدات المباعة</span>
                    <span className="font-bold">{soldUnits} ({soldPercentage}%)</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-red-300 rounded-full transition-all duration-500" style={{ width: `${soldPercentage}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}