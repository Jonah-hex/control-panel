// src/app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
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
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Plus,
  Eye,
  Edit,
  Trash2,
  MapPin,
  Clock,
  Star,
  Phone,
  Mail,
  MessageCircle,
  FileText,
  Activity,
  BarChart3,
  PieChart,
  Target,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Upload,
  Share2,
  Heart,
  Bookmark,
  Filter,
  Search,
  DollarSign,
  ShoppingCart,
  CheckSquare
} from 'lucide-react'

interface Building {
  id: string
  name: string
  address: string
  total_units: number
  image_urls: string[] | null
  created_at: string
}

interface Unit {
  id: string
  building_id: string
  unit_number: string
  floor: number
  status: 'available' | 'reserved' | 'sold'
  created_at: string
}

interface Activity {
  id: string
  type: 'add' | 'edit' | 'delete' | 'booking'
  building_name: string
  user_name: string
  timestamp: string
  details: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState(3)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [greeting, setGreeting] = useState('')
  const [activities, setActivities] = useState<Activity[]>([
    {
      id: '1',
      type: 'add',
      building_name: 'عمارة النخيل',
      user_name: 'أحمد محمد',
      timestamp: new Date().toISOString(),
      details: 'تم إضافة عمارة جديدة'
    },
    {
      id: '2',
      type: 'edit',
      building_name: 'عمارة الزهور',
      user_name: 'سارة أحمد',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      details: 'تم تحديث معلومات العمارة'
    },
    {
      id: '3',
      type: 'booking',
      building_name: 'عمارة الأندلس',
      user_name: 'محمد علي',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      details: 'تم بيع وحدة جديدة'
    }
  ])

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        fetchBuildings()
      }
    }
    getUser()

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
    
    return () => clearInterval(timer)
  }, [])

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
            if (newBuilding.owner_id && newBuilding.owner_id !== user.id) return

            const activity = {
              id: String(Date.now()),
              type: 'add' as const,
              building_name: newBuilding.name || 'عمارة جديدة',
              user_name: user.email || 'المستخدم',
              timestamp: new Date().toISOString(),
              details: 'تم إضافة عمارة جديدة'
            }

            setActivities(prev => [activity, ...prev].slice(0, 10))
            // إعادة جلب العماير لعرض أحدثها في البطاقات
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
  }, [user])

  const fetchBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6)

      if (error) throw error
      setBuildings(data || [])

      // جلب جميع الوحدات لهذا المستخدم
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('*')
        .in('building_id', (data || []).map(b => b.id))

      if (unitsError) throw unitsError
      setUnits(unitsData || [])
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

  // حساب النسب المئوية
  const availablePercentage = totalUnits > 0 ? Math.round((availableUnits / totalUnits) * 100) : 0
  const reservedPercentage = totalUnits > 0 ? Math.round((reservedUnits / totalUnits) * 100) : 0
  const soldPercentage = totalUnits > 0 ? Math.round((soldUnits / totalUnits) * 100) : 0

  const stats = [
    {
      title: 'إجمالي العماير',
      value: totalBuildings,
      change: '+12%',
      icon: Building2,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      chart: [40, 70, 50, 80, 60, 90, 70]
    },
    {
      title: 'إجمالي الوحدات',
      value: totalUnits,
      change: '+8%',
      icon: Home,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      chart: [30, 60, 45, 70, 55, 85, 65]
    },
    {
      title: 'الشقق المتاحة',
      value: availableUnits,
      change: '+5%',
      icon: CheckSquare,
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      chart: [60, 75, 65, 85, 70, 90, 80]
    },
    {
      title: 'الشقق المحجوزة',
      value: reservedUnits,
      change: '+3%',
      icon: Calendar,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      chart: [30, 45, 35, 50, 40, 55, 45]
    },
    {
      title: 'الشقق المباعة',
      value: soldUnits,
      change: '+15%',
      icon: ShoppingCart,
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      chart: [50, 80, 60, 90, 70, 95, 85]
    }
  ]

  const quickActions = [
    { icon: Plus, label: 'إضافة عمارة', href: '/dashboard/buildings/new', color: 'blue' },
    { icon: Eye, label: 'عرض العماير', href: '/dashboard/buildings', color: 'green' },
    { icon: FileText, label: 'تقارير', href: '#', color: 'purple' },
    { icon: Settings, label: 'الإعدادات', href: '#', color: 'gray' }
  ]

  const recentBuildings = buildings.slice(0, 3)

  const getActivityIcon = (type: string) => {
    switch(type) {
      case 'add': return <Plus className="w-4 h-4 text-green-600" />
      case 'edit': return <Edit className="w-4 h-4 text-blue-600" />
      case 'delete': return <Trash2 className="w-4 h-4 text-red-600" />
      case 'booking': return <ShoppingCart className="w-4 h-4 text-purple-600" />
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
                <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors relative">
                  <Bell className="w-5 h-5 text-gray-600" />
                  {notifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                      {notifications}
                    </span>
                  )}
                </button>
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
                    <p className="text-xs text-gray-500">مدير النظام</p>
                  </div>
                  <div className="p-2">
                    <button className="w-full px-3 py-2 text-right text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      الإعدادات
                    </button>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)}>
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
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  href={action.href}
                  className="flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-50 rounded-xl transition mb-1"
                >
                  <action.icon className={`w-5 h-5 text-${action.color}-600`} />
                  <span>{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* المحتوى الرئيسي */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* بطاقات الإحصائيات المحدثة */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-200"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 ${stat.bgColor} rounded-xl group-hover:scale-110 transition-transform`}>
                    <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                  </div>
                  <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    {stat.change}
                  </span>
                </div>
                
                <h3 className="text-3xl font-bold text-gray-800 mb-1">{stat.value}</h3>
                <p className="text-gray-500 text-sm mb-4">{stat.title}</p>
                
                {/* رسم بياني بسيط */}
                <div className="flex items-end gap-1 h-12">
                  {stat.chart.map((height, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-blue-200 to-blue-500 rounded-t-sm transition-all duration-300 group-hover:from-blue-300 group-hover:to-blue-600"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* إجراءات سريعة */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-4 border border-gray-100 hover:border-blue-200 text-center"
            >
              <div className={`w-12 h-12 bg-${action.color}-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                <action.icon className={`w-6 h-6 text-${action.color}-600`} />
              </div>
              <h3 className="font-semibold text-gray-800 text-sm">{action.label}</h3>
            </Link>
          ))}
        </div>

        {/* صفين من المحتوى */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* العمود الأيمن - آخر النشاطات */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* بطاقة النشاطات الأخيرة */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  آخر النشاطات
                </h2>
                <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  <span>عرض الكل</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition group">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-gray-800">{activity.building_name}</h4>
                        <span className="text-xs text-gray-400">{formatDate(activity.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{activity.details}</p>
                      <p className="text-xs text-gray-400">بواسطة {activity.user_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* بطاقة التحديثات والتحليلات */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">تحليلات الأداء</h3>
                <div className="bg-white/20 p-2 rounded-xl">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-blue-100 text-sm">نمو هذا الشهر</p>
                  <p className="text-2xl font-bold">+24%</p>
                </div>
                <div>
                  <p className="text-blue-100 text-sm">الوحدات الجديدة</p>
                  <p className="text-2xl font-bold">18</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm py-2 rounded-xl text-sm font-medium transition">
                  تقرير شهري
                </button>
                <button className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm py-2 rounded-xl text-sm font-medium transition">
                  تصدير بيانات
                </button>
              </div>
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
                <Link href="/dashboard/buildings" className="text-sm text-blue-600 hover:text-blue-700">
                  عرض الكل
                </Link>
              </div>

              <div className="space-y-4">
                {recentBuildings.map((building) => (
                  <div key={building.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition group">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xs">
                      {building.image_urls ? '🖼️' : <Building2 className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800 truncate">{building.name}</h4>
                      <p className="text-xs text-gray-400 truncate">{building.address}</p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {building.total_units || 0} وحدات
                    </div>
                  </div>
                ))}
              </div>

              {recentBuildings.length === 0 && (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">لا توجد عماير مضافة</p>
                  <Link
                    href="/dashboard/buildings/new"
                    className="inline-flex items-center gap-2 text-blue-600 text-sm mt-2 hover:text-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة عمارة
                  </Link>
                </div>
              )}
            </div>

            {/* التقويم والمواعيد */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  المواعيد القادمة
                </h2>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-xl">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">
                    ١٥
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 text-sm">معاينة عمارة النخيل</h4>
                    <p className="text-xs text-gray-500">٣:٠٠ مساءً</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 font-bold">
                    ١٦
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 text-sm">اجتماع الملاك</h4>
                    <p className="text-xs text-gray-500">١٠:٠٠ صباحاً</p>
                  </div>
                </div>
l
                <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600 font-bold">
                    ١٨
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 text-sm">صيانة دورية</h4>
                    <p className="text-xs text-gray-500">٩:٠٠ صباحاً</p>
                  </div>
                </div>
              </div>

              <button className="w-full mt-4 py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-500 hover:text-blue-600 transition">
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