// src/app/dashboard/security/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, LogOut, Smartphone, MapPin, Clock, AlertTriangle, Trash2, Check, LayoutDashboard } from 'lucide-react'

interface Session {
  id: string
  device_info: any
  ip_address: string
  user_agent: string
  login_at: string
  last_activity_at: string
  is_active: boolean
}

export default function SecurityDashboard() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/auth/sessions')
      const data = await response.json()
      
      if (data.data) {
        setSessions(data.data)
      }
    } catch (err) {
      console.error('Error loading sessions:', err)
      setError('فشل تحميل الجلسات')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoutSession = async (sessionId: string) => {
    try {
      setLoading(true)
      const response = await fetch('/api/auth/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: 'logout',
        }),
      })

      const data = await response.json()
      if (data.success) {
        setSuccess('تم إنهاء الجلسة بنجاح')
        loadSessions()
      }
    } catch (err) {
      setError('فشل إنهاء الجلسة')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoutAll = async () => {
    if (!confirm('هل تريد فعلاً إنهاء جميع الجلسات الأخرى؟')) return

    try {
      setLoading(true)
      const response = await fetch('/api/auth/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logoutAll' }),
      })

      const data = await response.json()
      if (data.success) {
        setSuccess('تم إنهاء جميع الجلسات')
        await router.push('/login')
      }
    } catch (err) {
      setError('فشل إنهاء الجلسات')
    } finally {
      setLoading(false)
    }
  }

  const getDeviceType = (userAgent?: string) => {
    if (!userAgent) return 'جهاز غير معروف'
    if (userAgent.includes('Mobile')) return 'هاتف ذكي'
    if (userAgent.includes('Tablet')) return 'جهاز لوحي'
    return 'كمبيوتر'
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('ar-SA')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
      {/* Back Navigation */}
      <nav className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-blue-400">
            <Shield className="w-5 h-5" />
            <span>إدارة الأمان</span>
          </div>
          <Link
            href="/dashboard"
            className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
          >
            <LayoutDashboard className="w-4 h-4" />
            لوحة التحكم
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Header */}
        <div className="mb-12 animate-slideInUp">
          <h1 className="text-4xl font-bold text-white mb-2">إدارة الأمان</h1>
          <p className="text-slate-400">راقب جلسات حسابك والأنشطة الأمنية</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex gap-3 animate-slideInUp">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex gap-3 animate-slideInUp">
            <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-300 text-sm">{success}</p>
          </div>
        )}

        {/* Security Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 animate-slideInUp">
            <div className="flex items-center gap-3 mb-2">
              <Smartphone className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-medium text-slate-400">الجلسات النشطة</h3>
            </div>
            <p className="text-3xl font-bold text-white">{sessions.length}</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 animate-slideInUp" style={{animationDelay: '0.1s'}}>
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-green-400" />
              <h3 className="text-sm font-medium text-slate-400">آخر نشاط</h3>
            </div>
            <p className="text-sm text-slate-300">
              {sessions.length > 0 
                ? formatDate(sessions[0].last_activity_at)
                : 'لا توجد جلسات'
              }
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 animate-slideInUp" style={{animationDelay: '0.2s'}}>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-medium text-slate-400">حالة الأمان</h3>
            </div>
            <p className="text-sm text-green-400 font-medium">✓ آمن</p>
          </div>
        </div>

        {/* Sessions */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-8 animate-slideInUp" style={{animationDelay: '0.3s'}}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">الجلسات النشطة</h2>
            {sessions.length > 0 && (
              <button
                onClick={handleLogoutAll}
                disabled={loading}
                className="px-4 py-2 text-sm bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 rounded-lg transition disabled:opacity-50"
              >
                إنهاء جميع الجلسات
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin"></div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Shield className="w-12 h-12 mx-auto mb-4 text-slate-600" />
              <p>لا توجد جلسات نشطة</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4 hover:bg-slate-700/50 transition"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">الجهاز</p>
                      <p className="text-white font-medium">{getDeviceType(session.user_agent)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">الموقع</p>
                      <div className="flex items-center gap-1 text-white">
                        <MapPin className="w-4 h-4" />
                        {session.ip_address || 'غير معروف'}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">آخر نشاط</p>
                      <p className="text-white text-sm">
                        {formatDate(session.last_activity_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-600/30">
                    <p className="text-xs text-slate-500">
                      تسجيل الدخول: {formatDate(session.login_at)}
                    </p>
                    <button
                      onClick={() => handleLogoutSession(session.id)}
                      disabled={loading}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs bg-slate-600/50 hover:bg-slate-600 text-slate-300 rounded transition disabled:opacity-50"
                    >
                      <LogOut className="w-4 h-4" />
                      إنهاء
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Additional Security Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 animate-slideInUp" style={{animationDelay: '0.4s'}}>
          <Link
            href="/auth/reset-password"
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:bg-slate-800 transition"
          >
            <h3 className="text-lg font-bold text-white mb-2">تغيير كلمة المرور</h3>
            <p className="text-slate-400 text-sm">حدّث كلمة المرور برقم قوي وآمن</p>
          </Link>

          <Link
            href="/dashboard/security"
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:bg-slate-800 transition"
          >
            <h3 className="text-lg font-bold text-white mb-2">المصادقة الثنائية</h3>
            <p className="text-slate-400 text-sm">قريباً: سيتم توفير إعدادات المصادقة الثنائية في هذه الصفحة</p>
          </Link>
        </div>
      </div>
    </main>
  )
}
