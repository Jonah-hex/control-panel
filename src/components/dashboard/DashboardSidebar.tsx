'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Home,
  FileText,
  Users,
  Megaphone,
  BarChart3,
  CheckSquare,
  Calendar,
  Activity,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Wifi,
} from 'lucide-react'
import { RiyalIcon } from '@/components/icons/RiyalIcon'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { createClient } from '@/lib/supabase/client'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number | string; className?: string }>
  permission?: string
}
const navConfig: NavItem[] = [
  { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { href: '/dashboard/buildings', label: 'العماير', icon: Building2, permission: 'buildings' },
  { href: '/dashboard/units', label: 'الوحدات', icon: Home, permission: 'units' },
  { href: '/dashboard/reservations', label: 'الحجوزات', icon: FileText, permission: 'reservations' },
  { href: '/dashboard/sales', label: 'المبيعات', icon: RiyalIcon, permission: 'sales' },
  { href: '/dashboard/owners-investors', label: 'الملاك والمستثمرون', icon: Users, permission: 'owners_view' },
  { href: '/dashboard/marketing', label: 'التسويق', icon: Megaphone, permission: 'marketing_view' },
  { href: '/dashboard/marketing/reports', label: 'التقارير', icon: BarChart3, permission: 'marketing_view' },
  { href: '/dashboard/tasks', label: 'المهام', icon: CheckSquare },
  { href: '/dashboard/appointments', label: 'المواعيد', icon: Calendar },
  { href: '/dashboard/activities', label: 'السجلات', icon: Activity, permission: 'activities' },
  { href: '/dashboard/security', label: 'الأمن', icon: ShieldCheck, permission: 'security' },
]

const SIDEBAR_OPEN_KEY = 'dashboard-sidebar-open'

export default function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { can, currentUserDisplayName, isOwner, ready, user } = useDashboardAuth()
  const isConnected = ready && !!user
  const [open, setOpen] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_OPEN_KEY)
      if (stored !== null) setOpen(stored === '1')
    } catch {}
  }, [])

  const setOpenAndPersist = (value: boolean) => {
    setOpen(value)
    try {
      localStorage.setItem(SIDEBAR_OPEN_KEY, value ? '1' : '0')
    } catch {}
  }

  const handleLogout = async () => {
    await createClient().auth.signOut()
    router.push('/login')
  }

  const navItems = navConfig.filter((item) => {
    if (!item.permission) return true
    if (item.permission === 'owners_view') return can('owners_view') || can('investors_view')
    return can(item.permission as Parameters<typeof can>[0])
  })

  return (
    <aside
      dir="rtl"
      className="relative flex flex-col z-20 h-full min-h-screen transition-[width] duration-300 ease-out overflow-x-visible"
      style={{ width: open ? 250 : 72, background: '#ffffff' }}
    >
      {/* حالة الاتصال — أخضر متصل، أحمر غير متصل */}
      {open && (
        <div
          className={`flex items-center gap-2 mx-3 mt-3 px-3 py-2 rounded-xl border flex-shrink-0 ${
            isConnected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <Wifi size={14} className="shrink-0" />
          <span className="text-xs font-medium">
            {isConnected ? 'متصل بالنظام' : 'غير متصل'}
          </span>
        </div>
      )}

      {/* التنقل — محاذي مع الحاوية */}
      <nav className="dashboard-sidebar-nav flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 flex flex-col gap-1 min-h-0">
        {navItems.map((item) => {
          // تمييز الرابط الحالي فقط: إما تطابق تام أو أطول مسار يطابق (لتجنب تمييز "التسويق" و"التقارير" معاً)
          const isExact = pathname === item.href
          const isChildPath = pathname.startsWith(item.href + '/')
          const hasStricterMatch = navItems.some(
            (o) => o.href !== item.href && pathname.startsWith(o.href) && o.href.length > item.href.length
          )
          const active = isExact || (isChildPath && !hasStricterMatch)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-right no-underline transition-all duration-200 w-full min-w-0 overflow-hidden
                focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-1 focus:ring-offset-white
                ${active
                  ? 'bg-gradient-to-l from-blue-50 to-indigo-50 border border-blue-200/70 text-slate-800 shadow-md shadow-blue-500/10'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800 border border-transparent hover:border-slate-100'
                }
              `}
              aria-current={active ? 'page' : undefined}
            >
              {Icon === RiyalIcon ? (
                <RiyalIcon
                  className={`w-5 h-5 flex-shrink-0 ${active ? 'text-blue-600' : 'text-slate-500'}`}
                />
              ) : (
                <Icon
                  size={20}
                  className={`flex-shrink-0 ${active ? 'text-blue-600' : 'text-slate-500'}`}
                />
              )}
              {open && (
                <span className={`text-sm font-medium whitespace-nowrap truncate min-w-0 flex-1 ${active ? 'text-slate-800 font-semibold' : ''}`}>
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* المستخدم + تسجيل الخروج */}
      <div className="border-t border-blue-200/50 p-3 flex-shrink-0 bg-gradient-to-t from-blue-50/60 to-white">
        {open && (
          <Link
            href="/user"
            className="group flex items-center gap-3 p-3 rounded-xl mb-2 border border-blue-200/60 bg-white hover:bg-gradient-to-l hover:from-blue-50/50 hover:to-indigo-50/30 hover:border-blue-200/80 hover:shadow-md shadow-sm transition-all duration-200 no-underline text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 focus:ring-offset-white rounded-xl"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-lg shadow-blue-500/30 ring-1 ring-white/70 group-hover:shadow-blue-500/40 transition-shadow">
              {currentUserDisplayName?.charAt(0) || 'م'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {currentUserDisplayName || '—'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{isOwner ? 'مدير النظام' : 'موظف'}</p>
            </div>
            <Settings size={16} className="text-slate-500 shrink-0 hover:text-slate-700 transition-colors" aria-hidden />
          </Link>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 hover:border-slate-200 border border-transparent transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-1 focus:ring-offset-white"
        >
          <LogOut size={18} className="flex-shrink-0" />
          {open && <span>تسجيل الخروج</span>}
        </button>
      </div>

      {/* زر الطي/التوسيع — مدمج مع حد السلايدر */}
      <button
        type="button"
        onClick={() => setOpenAndPersist(!open)}
        className="absolute -left-3 top-[18px] w-6 h-7 -translate-x-1/2 flex items-center justify-center z-30 bg-slate-100 border border-slate-300/90 border-r-0 rounded-l-full rounded-r-none text-slate-600 shadow-sm hover:bg-gradient-to-br hover:from-blue-600 hover:to-purple-600 hover:text-white hover:border-blue-400/80 hover:shadow-md hover:shadow-blue-500/30 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-1 focus:ring-offset-white"
        aria-label={open ? 'طي القائمة الجانبية' : 'توسيع القائمة الجانبية'}
      >
        {open ? (
          <ChevronRight size={14} className="shrink-0" strokeWidth={2.25} />
        ) : (
          <ChevronLeft size={14} className="shrink-0" strokeWidth={2.25} />
        )}
      </button>
    </aside>
  )
}
