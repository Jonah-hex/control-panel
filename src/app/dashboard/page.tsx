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
  PieChart,
  Target,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
  Upload,
  Search,
  DollarSign,
  ShoppingCart,
  CheckSquare,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Zap,
  Clock,
  FileText,
  Edit,
  Trash2,
  User2,
  Crown
} from 'lucide-react'
import { showToast } from '@/app/dashboard/buildings/details/toast'
import { useSubscription } from '@/hooks/useSubscription'

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
  owner_name?: string | null
  created_at: string
  updated_at?: string
}

interface Activity {
  id: string
  type: 'add' | 'edit' | 'delete' | 'booking' | 'sold' | 'reserved' | 'association_end'
  building_name: string
  building_id?: string
  user_name: string
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
  | 'security'
  | 'settings'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  /** المالك الفعلي للبيانات: إما المالك نفسه أو المالك التابع له الموظف */
  const [effectiveOwnerId, setEffectiveOwnerId] = useState<string | null>(null)
  /** صلاحيات الموظف إن كان الدخول كموظف؛ null = مالك كامل الصلاحيات */
  const [employeePermissions, setEmployeePermissions] = useState<Record<PermissionKey, boolean> | null>(null)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [buildingsForAssoc, setBuildingsForAssoc] = useState<BuildingAssocRow[]>([])
  const [units, setUnits] = useState<Unit[]>([])
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
          .select('owner_id, permissions')
          .eq('auth_user_id', user.id)
          .eq('is_active', true)
          .limit(1)
        if (empRows?.[0]) {
          setEffectiveOwnerId(empRows[0].owner_id)
          setEmployeePermissions((empRows[0].permissions as Record<PermissionKey, boolean>) || null)
        } else {
          setEffectiveOwnerId(user.id)
          setEmployeePermissions(null)
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
    if (effectiveOwnerId) fetchBuildings()
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

      // جلب جميع الوحدات لعماير هذا المستخدم فقط
      if ((data || []).length > 0) {
        const { data: unitsData, error: unitsError } = await supabase
          .from('units')
          .select('*')
          .in('building_id', (data || []).map(b => b.id))

        if (unitsError) throw unitsError
        setUnits(unitsData || [])
      } else {
        setUnits([])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

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
    return d.toLocaleDateString('ar-SA')
  }

  // حساب الإحصائيات من جدول الوحدات
  const totalBuildings = buildings.length
  const totalUnits = units.length
  
  // حساب عدد الوحدات حسب الحالة من جدول units
  const availableUnits = units.filter(u => u.status === 'available').length
  const reservedUnits = units.filter(u => u.status === 'reserved').length
  const soldUnits = units.filter(u => u.status === 'sold').length

  // تنبيهات فواتير الكهرباء — وحدات لها عداد مسجل (فواتير شركة الكهرباء السعودية تصدر 26 من كل شهر)
  const electricityReminders = units
    .filter(u => u.electricity_meter_number && String(u.electricity_meter_number).trim())
    .map(u => ({
      unit: u,
      buildingName: buildings.find(b => b.id === u.building_id)?.name || '—'
    }))

  // تنبيهات الحجز — وحدات محجوزة منذ 3 أيام فأكثر (تذكير بمتابعة حالة الحجز)
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
  const reservationReminders = units
    .filter(u => u.status === 'reserved')
    .map(u => ({
      unit: u,
      buildingName: buildings.find(b => b.id === u.building_id)?.name || '—',
      reservedAt: u.updated_at || u.created_at
    }))
    .filter(({ reservedAt }) => reservedAt && (Date.now() - new Date(reservedAt).getTime() >= THREE_DAYS_MS))

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
  const filteredAssociationEndReminders = can('details_association') ? associationEndReminders : []
  const filteredReservationReminders = can('reservations') ? reservationReminders : []
  const filteredElectricityReminders = can('details_electricity') ? electricityReminders : []

  const notificationsCount = filteredElectricityReminders.length + filteredReservationReminders.length + filteredAssociationEndReminders.length

  // قائمة معرفات الإشعارات الحالية (لحساب غير المقروءة)
  const currentNotificationIds = useMemo(() => {
    const ids: string[] = []
    filteredAssociationEndReminders.forEach(({ buildingId, daysLeft }) => ids.push(`assoc-${buildingId}-${daysLeft}`))
    filteredReservationReminders.forEach(({ unit }) => ids.push(`res-${unit.id}`))
    filteredElectricityReminders.forEach(({ unit }) => ids.push(`elec-${unit.id}`))
    return ids
  }, [filteredAssociationEndReminders, filteredReservationReminders, filteredElectricityReminders])

  const unreadCount = useMemo(() => {
    return currentNotificationIds.filter((id) => !readNotificationIds.has(id)).length
  }, [currentNotificationIds, readNotificationIds])

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
    const fromUnits: Activity[] = []
    for (const u of units) {
      const bName = buildings.find(b => b.id === u.building_id)?.name || '—'
      if (u.status === 'sold') {
        fromUnits.push({
          id: u.id + '-sold',
          type: 'sold',
          building_name: bName,
          building_id: u.building_id,
          user_name: (u as Unit & { owner_name?: string }).owner_name || 'مشتري',
          timestamp: u.updated_at || u.created_at,
          details: `تم بيع الوحدة ${u.unit_number} (الدور ${u.floor})`
        })
      } else if (u.status === 'reserved') {
        fromUnits.push({
          id: u.id + '-reserved',
          type: 'reserved',
          building_name: bName,
          building_id: u.building_id,
          user_name: (u as Unit & { owner_name?: string }).owner_name || '—',
          timestamp: u.updated_at || u.created_at,
          details: `تم حجز الوحدة ${u.unit_number} (الدور ${u.floor})`
        })
      }
    }
    const fromBuildings: Activity[] = buildings.map(b => ({
      id: b.id + '-add',
      type: 'add',
      building_name: b.name || 'عمارة جديدة',
      building_id: b.id,
      user_name: b.created_by_name?.trim() || b.owner_name?.trim() || 'النظام',
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
    return [...fromUnits, ...fromBuildings, ...fromAssoc]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 7)
  }, [units, buildings, associationEndReminders])

  // عرض النشاطات حسب الصلاحيات (خاص بلوحة الموظف)
  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      if (a.type === 'sold') return can('sales')
      if (a.type === 'reserved') return can('reservations')
      if (a.type === 'add') return can('building_details') || can('buildings')
      if (a.type === 'association_end') return can('details_association')
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
    { icon: Plus, label: 'إضافة عمارة', href: '/dashboard/buildings/new', color: 'blue', gradient: 'from-blue-500 to-cyan-500', permission: 'buildings_create' as const, noPermissionMessage: 'ليس لديك صلاحية إضافة عمارة جديدة. تواصل مع المالك لتفعيل الصلاحية.' },
    { icon: Eye, label: 'عرض العماير', href: '/dashboard/buildings', color: 'green', gradient: 'from-emerald-500 to-green-500', permission: 'buildings' as const, noPermissionMessage: 'ليس لديك صلاحية عرض العماير.' },
    { icon: Home, label: 'الوحدات', href: '/dashboard/units', color: 'purple', gradient: 'from-purple-500 to-pink-500', permission: 'units' as const, noPermissionMessage: 'ليس لديك صلاحية الوصول للوحدات.' },
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
      default: return <Activity className="w-4 h-4 text-gray-600" />
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
      {/* الشريط العلوي */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20 backdrop-blur-lg bg-white/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* القسم الأيمن */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Menu className="w-6 h-6 text-gray-600" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">لوحة التحكم الرئيسية</h1>
                  <p className="text-xs text-gray-500">ادارة العماير</p>
                  {!subscriptionLoading && planName && (
                    <p className="text-xs text-indigo-600 font-medium mt-1">
                      خطة {planName}: {buildingsLimitLabel}
                      {!canAddBuilding && (
                        <Link href="/subscriptions" className="mr-2 inline-flex items-center gap-1 text-amber-600 hover:text-amber-700">
                          <Crown className="w-3.5 h-3.5" />
                          ترقية
                        </Link>
                      )}
                    </p>
                  )}
                  <div className="flex gap-2 mt-2">
                    {can('reservations') && (
                      <a href="/dashboard/reservations" className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200 transition cursor-pointer">سجل الحجوزات</a>
                    )}
                    {can('sales') && (
                      <a href="/dashboard/sales" className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-200 transition cursor-pointer">سجل المبيعات</a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* القسم الأوسط - مخفي على الشاشات الصغيرة */}
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                <button className="px-4 py-2 bg-white text-gray-700 rounded-lg shadow-sm text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    <span>نظرة عامة</span>
                  </div>
                </button>
                <button className="px-4 py-2 text-gray-600 hover:text-gray-800 rounded-lg text-sm font-medium transition">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    <span>نشاطات</span>
                  </div>
                </button>
                <button className="px-4 py-2 text-gray-600 hover:text-gray-800 rounded-lg text-sm font-medium transition">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4" />
                    <span>تحليلات</span>
                  </div>
                </button>
              </div>
            </div>

            {/* القسم الأيسر */}
            <div className="flex items-center gap-3">
              {/* الإشعارات */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(v => !v)}
                  className={`relative flex items-center justify-center w-11 h-11 rounded-xl border transition-all duration-200 overflow-visible ${
                    notificationsOpen
                      ? 'border-amber-200 bg-amber-50/80 text-amber-600'
                      : 'border-gray-200 bg-white/60 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  aria-expanded={notificationsOpen}
                  aria-haspopup="true"
                  aria-label={unreadCount > 0 ? `${unreadCount} تنبيه غير مقروء` : 'التنبيهات'}
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
                    <div className="fixed inset-0 z-40 cursor-pointer" onClick={() => setNotificationsOpen(false)} aria-hidden="true" />
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
                              className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition border border-emerald-200/60"
                            >
                              تحديد الكل كمقروء
                            </button>
                          )}
                        </div>
                      </div>
                      {/* محتوى القائمة */}
                      <div className="max-h-80 overflow-y-auto py-1">
                        {notificationsCount === 0 ? (
                          <div className="px-5 py-8 text-center">
                            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 text-gray-400 mb-3">
                              <Bell className="w-6 h-6" />
                            </span>
                            <p className="text-sm text-gray-500 font-medium">لا توجد تنبيهات</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {filteredAssociationEndReminders.map(({ buildingId, buildingName, endDate, daysLeft }) => (
                              <Link
                                key={`assoc-${buildingId}-${daysLeft}`}
                                href={`/dashboard/buildings/details?buildingId=${buildingId}#card-association`}
                                onClick={() => setNotificationsOpen(false)}
                                className="flex items-start gap-3 px-4 py-3.5 hover:bg-emerald-50/70 transition cursor-pointer"
                              >
                                <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                                  <Users className="w-5 h-5" />
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-800">
                                    {daysLeft === 0
                                      ? 'انتهت مدة اتحاد الملاك اليوم'
                                      : `تنتهي خلال ${daysLeft} أيام`}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-0.5">{buildingName}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">النهاية: {endDate}</p>
                                </div>
                              </Link>
                            ))}
                            {filteredReservationReminders.map(({ unit, buildingName }) => (
                              <Link
                                key={`res-${unit.id}`}
                                href={`/dashboard/buildings/details?buildingId=${unit.building_id}`}
                                onClick={() => setNotificationsOpen(false)}
                                className="flex items-start gap-3 px-4 py-3.5 hover:bg-amber-50/70 transition cursor-pointer"
                              >
                                <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                                  <Calendar className="w-5 h-5" />
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-800">تذكير بمتابعة الحجز</p>
                                  <p className="text-xs text-gray-600 mt-0.5">
                                    الوحدة {unit.unit_number} (د{unit.floor}) — {buildingName}
                                  </p>
                                </div>
                              </Link>
                            ))}
                            {filteredElectricityReminders.map(({ unit, buildingName }) => (
                              <Link
                                key={`elec-${unit.id}`}
                                href={`/dashboard/buildings/details?buildingId=${unit.building_id}#card-electricity`}
                                onClick={() => setNotificationsOpen(false)}
                                className="flex items-start gap-3 px-4 py-3.5 hover:bg-amber-50/70 transition cursor-pointer"
                              >
                                <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                                  <Zap className="w-5 h-5" />
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-800">فاتورة كهرباء</p>
                                  <p className="text-xs text-gray-600 mt-0.5 font-mono text-amber-700">{unit.electricity_meter_number}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">{buildingName} — وحدة {unit.unit_number}</p>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* الوقت والتاريخ */}
              <div className="hidden md:block px-4 py-2 bg-gray-100 rounded-xl">
                <div className="text-xs text-gray-500">{greeting}</div>
                <div className="text-sm font-medium text-gray-700">
                  {currentTime.toLocaleDateString('ar-SA', { 
                    weekday: 'short', 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
              </div>

              {/* صورة المستخدم */}
              <div className="relative group">
                <button className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {user?.email?.charAt(0).toUpperCase()}
                </button>
                
                {/* القائمة المنسدلة */}
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">{user?.email}</p>
                    {employeePermissions === null && (
                      <p className="text-xs text-gray-500">مدير النظام</p>
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
      </div>

      {/* القائمة الجانبية للجوال */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden cursor-pointer" onClick={() => setSidebarOpen(false)}>
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
                const allowed = can(action.permission)
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* بطاقات الإحصائيات المحدثة */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
          {quickActions.map((action, index) => {
            const allowed = can(action.permission)
            const showWithoutPermission = action.permission === 'buildings_create' || action.permission === 'statistics'
            if (!allowed && !showWithoutPermission) return null
            if (allowed) {
              return (
                <Link
                  key={index}
                  href={action.href}
                  className="group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 p-6 border border-gray-200 hover:border-transparent overflow-hidden hover:-translate-y-2 cursor-pointer"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
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
                <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
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

        {/* صفين من المحتوى */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* العمود الأيمن - آخر النشاطات */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* بطاقة النشاطات الأخيرة */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  آخر النشاطات
                </h2>
                <Link href="/dashboard/activities" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:gap-2 transition-all group cursor-pointer">
                  <span>عرض الكل</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="space-y-3">
                {filteredActivities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">لا توجد نشاطات بعد — ستظهر هنا عند إضافة عمارة أو بيع/حجز وحدة</div>
                ) : filteredActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="relative flex items-start gap-4 p-4 rounded-xl border border-transparent"
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${
                      activity.type === 'add' ? 'from-green-100 to-emerald-200' :
                      activity.type === 'edit' ? 'from-blue-100 to-cyan-200' :
                      activity.type === 'delete' ? 'from-red-100 to-rose-200' :
                      activity.type === 'booking' || activity.type === 'sold' ? 'from-purple-100 to-pink-200' :
                      activity.type === 'reserved' ? 'from-amber-100 to-orange-200' :
                      activity.type === 'association_end' ? 'from-emerald-100 to-teal-200' :
                      'from-gray-100 to-slate-200'
                    } rounded-xl flex items-center justify-center shadow-sm`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="font-bold text-gray-800 truncate">{activity.building_name}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
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
                  </div>
                ))}
              </div>
            </div>

            {/* بطاقة التحديثات والتحليلات */}
            <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-6 text-white overflow-hidden">
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)',
                  backgroundSize: '50px 50px'
                }}></div>
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    تحليلات الأداء
                  </h3>
                  <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl hover:bg-white/30 transition-colors cursor-pointer">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl hover:bg-white/20 transition-all cursor-pointer group">
                    <div className="flex items-center gap-2 text-blue-100 text-sm mb-2">
                      <TrendingUp className="w-4 h-4" />
                      <span>نمو هذا الشهر</span>
                    </div>
                    <p className="text-3xl font-black group-hover:scale-110 transition-transform">+24%</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl hover:bg-white/20 transition-all cursor-pointer group">
                    <div className="flex items-center gap-2 text-purple-100 text-sm mb-2">
                      <Zap className="w-4 h-4" />
                      <span>الوحدات الجديدة</span>
                    </div>
                    <p className="text-3xl font-black group-hover:scale-110 transition-transform">18</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm py-3 px-4 rounded-xl text-sm font-semibold transition-all hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    تقرير شهري
                  </button>
                  <button className="flex-1 bg-white hover:bg-gray-100 text-blue-600 py-3 px-4 rounded-xl text-sm font-semibold transition-all hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" />
                    تصدير بيانات
                  </button>
                </div>
              </div>
              
              {/* Decorative Elements */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute -top-6 -left-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
            </div>
          </div>

          {/* العمود الأيسر - آخر العماير والتقويم */}
          <div className="space-y-6">
            
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

            {/* التقويم والمواعيد */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  المواعيد القادمة
                </h2>
              </div>

              <div className="space-y-3">
                <div className="group relative flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200 hover:border-blue-300 transition-all cursor-pointer hover:shadow-md">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all">
                    <div className="text-center">
                      <div className="text-xl">١٥</div>
                      <div className="text-xs opacity-80">ديسمبر</div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 text-sm mb-1 group-hover:text-blue-600 transition-colors">معاينة عمارة النخيل</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      ٣:٠٠ مساءً
                    </p>
                  </div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                </div>

                <div className="group flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200 hover:border-purple-300 transition-all cursor-pointer hover:shadow-md">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all">
                    <div className="text-center">
                      <div className="text-xl">١٦</div>
                      <div className="text-xs opacity-80">ديسمبر</div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 text-sm mb-1 group-hover:text-purple-600 transition-colors">اجتماع الملاك</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      ١٠:٠٠ صباحاً
                    </p>
                  </div>
                </div>

                <div className="group flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 hover:border-green-300 transition-all cursor-pointer hover:shadow-md">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all">
                    <div className="text-center">
                      <div className="text-xl">١٨</div>
                      <div className="text-xs opacity-80">ديسمبر</div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 text-sm mb-1 group-hover:text-green-600 transition-colors">صيانة دورية</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      ٩:٠٠ صباحاً
                    </p>
                  </div>
                </div>
              </div>

              <button className="w-full mt-5 py-3.5 border-2 border-dashed border-gray-300 rounded-2xl text-sm font-semibold text-gray-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 group">
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                إضافة موعد جديد
              </button>
            </div>

            {/* بطاقة الأداء */}
            <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl shadow-lg p-6 text-white">
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

                <div className="pt-3 border-t border-white/20">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>إجمالي الوحدات</span>
                    <span className="font-bold">{totalUnits}</span>
                  </div>
                  <div className="text-xs text-green-100 mt-2">
                    ✓ {availablePercentage}% متاح | ⏳ {reservedPercentage}% محجوز | ✓ {soldPercentage}% مباع
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