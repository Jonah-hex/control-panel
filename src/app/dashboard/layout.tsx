'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { ready, user } = useDashboardAuth()
  const hideSidebar = pathname === '/dashboard/security'

  useEffect(() => {
    if (!ready) return
    if (!user) {
      router.replace('/login')
    }
  }, [ready, user, router])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900" dir="rtl">
        <div className="text-slate-400">جاري التحميل...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-gray-100" dir="rtl">
      {!hideSidebar && (
        <div className="sticky top-0 self-start flex-shrink-0 h-screen z-30">
          <DashboardSidebar />
        </div>
      )}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
