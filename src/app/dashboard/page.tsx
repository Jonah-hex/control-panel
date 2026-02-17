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
  Trash2
} from 'lucide-react'

interface Building {
  id: string
  name: string
  plot_number: string
  neighborhood?: string
  total_units: number
  total_floors: number
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
  const [animateStats, setAnimateStats] = useState(false)
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
    
    // Animate stats after load
    setTimeout(() => setAnimateStats(true), 300)
    
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
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6)

      if (error) throw error
      setBuildings(data || [])

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

  // حساب النسب المئوية
  const availablePercentage = totalUnits > 0 ? Math.round((availableUnits / totalUnits) * 100) : 0
  const reservedPercentage = totalUnits > 0 ? Math.round((reservedUnits / totalUnits) * 100) : 0
  const soldPercentage = totalUnits > 0 ? Math.round((soldUnits / totalUnits) * 100) : 0

  const stats = [
    {
      title: 'إجمالي العماير',
      value: totalBuildings,
      change: '+12%',
      trend: 'up',
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
      change: '+8%',
      trend: 'up',
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
      change: '+5%',
      trend: 'up',
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
      change: '+3%',
      trend: 'up',
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
      change: '+15%',
      trend: 'up',
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
      change: '+7%',
      trend: 'up',
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
    { icon: Plus, label: 'إضافة عمارة', href: '/dashboard/buildings/new', color: 'blue', gradient: 'from-blue-500 to-cyan-500' },
    { icon: Eye, label: 'عرض العماير', href: '/dashboard/buildings', color: 'green', gradient: 'from-emerald-500 to-green-500' },
    { icon: Home, label: 'الوحدات', href: '/dashboard/units', color: 'purple', gradient: 'from-purple-500 to-pink-500' },
    { icon: FileText, label: 'التقارير', href: '/dashboard/reports', color: 'orange', gradient: 'from-orange-500 to-red-500' },
    { icon: BarChart3, label: 'الإحصائيات', href: '/dashboard/statistics', color: 'indigo', gradient: 'from-indigo-500 to-purple-500' },
    { icon: Settings, label: 'الإعدادات', href: '#', color: 'gray', gradient: 'from-slate-500 to-gray-500' }
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
          {quickActions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className="group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 p-6 border border-gray-200 hover:border-transparent overflow-hidden hover:-translate-y-2"
            >
              {/* Background Gradient on Hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
              
              {/* Content */}
              <div className="relative z-10 text-center">
                <div className={`w-14 h-14 bg-gradient-to-br ${action.gradient} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                  <action.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-gray-800 group-hover:text-white transition-colors duration-300 text-sm">
                  {action.label}
                </h3>
              </div>
              
              {/* Sparkle Effect */}
              <Sparkles className="absolute top-2 right-2 w-4 h-4 text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </Link>
          ))}
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
                <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:gap-2 transition-all group">
                  <span>عرض الكل</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="relative flex items-start gap-4 p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-xl transition-all duration-300 group border border-transparent hover:border-blue-200 cursor-pointer">
                    {/* Colored Bar */}
                    <div className={`absolute right-0 top-0 bottom-0 w-1 rounded-r-xl ${
                      activity.type === 'add' ? 'bg-gradient-to-b from-green-400 to-emerald-600' :
                      activity.type === 'edit' ? 'bg-gradient-to-b from-blue-400 to-cyan-600' :
                      activity.type === 'delete' ? 'bg-gradient-to-b from-red-400 to-rose-600' :
                      activity.type === 'booking' ? 'bg-gradient-to-b from-purple-400 to-pink-600' :
                      'bg-gradient-to-b from-gray-400 to-slate-600'
                    } opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                    
                    <div className={`w-12 h-12 bg-gradient-to-br ${
                      activity.type === 'add' ? 'from-green-100 to-emerald-200' :
                      activity.type === 'edit' ? 'from-blue-100 to-cyan-200' :
                      activity.type === 'delete' ? 'from-red-100 to-rose-200' :
                      activity.type === 'booking' ? 'from-purple-100 to-pink-200' :
                      'from-gray-100 to-slate-200'
                    } rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors truncate">{activity.building_name}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatDate(activity.timestamp)}</span>
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
                <Link href="/dashboard/buildings" className="text-sm text-blue-600 hover:text-blue-700">
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
                      href={`/dashboard/buildings/${building.id}`}
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
                  <Link
                    href="/dashboard/buildings/new"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold"
                  >
                    <Plus className="w-5 h-5" />
                    إضافة أول عمارة
                  </Link>
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