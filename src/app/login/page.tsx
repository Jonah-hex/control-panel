// src/app/login/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle, Building2, ArrowRight, Chrome } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState('')
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [showPasswordStrength, setShowPasswordStrength] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()
  const [sessionExpired, setSessionExpired] = useState(false)

  // انتهت الجلسة (refresh token غير صالح)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (new URLSearchParams(window.location.search).get('reason') === 'session_expired') {
      setSessionExpired(true)
    }
  }, [])

  // تحقق من التخزين المؤقت عند التحميل (تذكرني)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedEmail = localStorage.getItem('rememberedEmail')
    const savedAttempts = localStorage.getItem('loginAttempts')
    const lockTime = localStorage.getItem('lockTime')

    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }

    // تحقق من الحظر
    if (lockTime) {
      const now = new Date().getTime()
      const timeDiff = now - parseInt(lockTime)
      if (timeDiff < 15 * 60 * 1000) { // 15 دقيقة
        setIsLocked(true)
        setError('تم قفل الحساب مؤقتاً. يرجى محاولة لاحقاً')
      } else {
        localStorage.removeItem('lockTime')
        localStorage.removeItem('loginAttempts')
        setAttempts(0)
      }
    }

    if (savedAttempts) {
      setAttempts(parseInt(savedAttempts, 10))
    }
  }, [])

  // مزامنة البريد مع التخزين عند تفعيل "تذكرني"
  useEffect(() => {
    if (typeof window === 'undefined' || !rememberMe) return
    if (email) localStorage.setItem('rememberedEmail', email)
  }, [rememberMe, email])

  // حساب قوة كلمة المرور
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0)
      return
    }
    
    let strength = 0
    if (password.length >= 8) strength++
    if (password.length >= 12) strength++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[^a-zA-Z\d]/.test(password)) strength++
    
    setPasswordStrength(Math.min(strength, 5))
  }, [password])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isLocked) {
      setError('تم قفل الحساب مؤقتاً. يرجى محاولة لاحقاً')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        localStorage.setItem('loginAttempts', newAttempts.toString())

        if (newAttempts >= 5) {
          setIsLocked(true)
          const lockTime = new Date().getTime()
          localStorage.setItem('lockTime', lockTime.toString())
          setError('تم قفل الحساب بسبب عدة محاولات خاطئة. يرجى المحاولة بعد 15 دقيقة')
        } else {
          setError(`بيانات اعتماد غير صحيحة. المحاولات المتبقية: ${5 - newAttempts}`)
        }
        throw error
      }
      
      // حفظ البريد إذا تم اختيار "تذكرني" (يُحفظ أيضاً عند تفعيل الخيار قبل الدخول)
      if (rememberMe) {
        if (typeof window !== 'undefined') localStorage.setItem('rememberedEmail', email)
      } else {
        if (typeof window !== 'undefined') localStorage.removeItem('rememberedEmail')
      }

      // امسح محاولات الدخول عند النجاح
      localStorage.removeItem('loginAttempts')
      localStorage.removeItem('lockTime')

      setSuccess('تم تسجيل الدخول بنجاح!')
      // التوجيه إلى لوحة التحكم فقط بعد النجاح عند الضغط على تسجيل الدخول
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 800)
      
    } catch (error: any) {
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = async (provider: 'google') => {
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (error) throw error
    } catch (error: any) {
      setError(`فشل تسجيل الدخول عبر Google`)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setError('')
    setResetSuccess('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error

      setResetSuccess('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني')
      setForgotEmail('')
    } catch (error: any) {
      setError('فشل إرسال رابط إعادة التعيين. تأكد من صحة البريد الإلكتروني')
    } finally {
      setResetLoading(false)
    }
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500'
    if (passwordStrength <= 2) return 'bg-orange-500'
    if (passwordStrength <= 3) return 'bg-yellow-500'
    if (passwordStrength <= 4) return 'bg-lime-500'
    return 'bg-green-500'
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 1) return 'ضعيفة'
    if (passwordStrength <= 2) return 'متوسطة'
    if (passwordStrength <= 3) return 'جيدة'
    if (passwordStrength <= 4) return 'قوية'
    return 'قوية جداً'
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 flex items-center justify-center p-4">
      {/* Background Blur */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-indigo-600/5 rounded-full blur-3xl"></div>
      </div>

      {/* Back to Home */}
      <Link 
        href="/"
        className="absolute top-6 right-6 p-3 rounded-lg border border-white/15 hover:border-white/30 hover:bg-white/5 transition duration-300 backdrop-blur-sm"
      >
        <ArrowRight className="w-5 h-5 text-white" />
      </Link>

      <div className="w-full max-w-md relative z-10 animate-slideInUp">
        {/* Container */}
        <div className="bg-gradient-to-br from-slate-800/50 via-slate-900/50 to-slate-950/50 border border-slate-800/50 rounded-2xl backdrop-blur-2xl p-8 sm:p-10 shadow-2xl shadow-slate-950/50">
          
          {/* Header */}
          <div className="text-center mb-10 animate-slideInUp" style={{animationDelay: '0.1s'}}>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Building2 className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">عماير Pro</h1>
            <p className="text-slate-400">أدخل إلى لوحة التحكم الخاصة بك</p>
          </div>

          {/* انتهت الجلسة — سجّل دخول من جديد */}
          {sessionExpired && (
            <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/25 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-amber-200 text-sm">
                انتهت صلاحية الجلسة أو انقطعت. سجّل الدخول مرة أخرى (أحياناً يحدث بعد إغلاق المتصفح أو تسجيل الخروج من جهاز آخر).
              </p>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex gap-3 animate-slideInUp" style={{animationDelay: '0.2s'}}>
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex gap-3 animate-slideInUp" style={{animationDelay: '0.2s'}}>
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-green-300 text-sm">{success}</p>
            </div>
          )}

          {/* Reset Success Alert */}
          {resetSuccess && (
            <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex gap-3 animate-slideInUp" style={{animationDelay: '0.2s'}}>
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-green-300 text-sm">{resetSuccess}</p>
            </div>
          )}

          {!showForgotPassword ? (
            <>
              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-6 animate-slideInUp" style={{animationDelay: '0.3s'}}>
                
                {/* Email Input */}
                <div className="relative group">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pr-10 pl-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition duration-300"
                      dir="ltr"
                      required
                      disabled={isLocked}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="relative group">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setShowPasswordStrength(true)}
                      placeholder="••••••••"
                      className="w-full pr-10 pl-10 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition duration-300"
                      dir="ltr"
                      required
                      disabled={isLocked}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-3.5 text-slate-500 hover:text-slate-300 transition"
                      disabled={isLocked}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* قوة كلمة المرور — تظهر بعد خروج المؤشر من الحقل لتفادي استهلاك الضغطة الأولى على تسجيل الدخول */}
                  {password && showPasswordStrength && (
                    <div className="mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-400">قوة كلمة المرور:</span>
                        <span className={`text-xs font-medium ${getPasswordStrengthText() === 'ضعيفة' ? 'text-red-400' : getPasswordStrengthText() === 'متوسطة' ? 'text-orange-400' : getPasswordStrengthText() === 'جيدة' ? 'text-yellow-400' : 'text-green-400'}`}>
                          {getPasswordStrengthText()}
                        </span>
                      </div>
                      <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`}
                          style={{width: `${(passwordStrength / 5) * 100}%`}}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setRememberMe(checked)
                        if (typeof window !== 'undefined') {
                          if (checked) localStorage.setItem('rememberedEmail', email)
                          else localStorage.removeItem('rememberedEmail')
                        }
                      }}
                      className="w-4 h-4 rounded border border-slate-600 bg-slate-700 checked:bg-blue-600 checked:border-blue-500 cursor-pointer"
                      disabled={isLocked}
                    />
                    <span className="text-sm text-slate-400 group-hover:text-slate-300 transition">تذكرني</span>
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowForgotPassword(true)
                      setError('')
                      setSuccess('')
                    }}
                    className="text-sm text-blue-400 hover:text-blue-300 transition"
                    disabled={isLocked}
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading || isLocked}
                  className="w-full btn-gradient text-white py-3 rounded-lg font-bold text-base transition duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-blue-400/30"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      جاري المعالجة...
                    </>
                  ) : (
                    'تسجيل الدخول'
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-8 animate-slideInUp" style={{animationDelay: '0.4s'}}>
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700/50"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gradient-to-b from-slate-800/50 via-slate-900/50 to-slate-950/50 text-slate-500">أو</span>
                </div>
              </div>

              {/* Social Login */}
              <div className="space-y-3 animate-slideInUp" style={{animationDelay: '0.5s'}}>
                <button
                  onClick={() => handleSocialLogin('google')}
                  disabled={loading || isLocked}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600/50 text-white py-3 rounded-lg font-medium transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Chrome className="w-5 h-5" />
                  Google
                </button>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-8 border-t border-slate-700/50 text-center animate-slideInUp" style={{animationDelay: '0.6s'}}>
                <p className="text-slate-400 text-sm">
                  ليس لديك حساب؟{' '}
                  <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition">
                    سجل الآن
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Forgot Password Form */}
              <form onSubmit={handleForgotPassword} className="space-y-6 animate-slideInUp" style={{animationDelay: '0.3s'}}>
                <p className="text-slate-400 text-sm">أدخل عنوان بريدك الإلكتروني وسنرسل لك رابط استعادة كلمة المرور</p>
                
                <div className="relative group">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pr-10 pl-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition duration-300"
                      dir="ltr"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full btn-gradient text-white py-3 rounded-lg font-bold text-base transition duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 border border-blue-400/30"
                >
                  {resetLoading ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowForgotPassword(false)
                  }}
                  className="w-full text-slate-400 hover:text-slate-300 py-2 rounded-lg transition"
                >
                  العودة إلى تسجيل الدخول
                </button>
              </form>
            </>
          )}
        </div>

        {/* Security Info */}
        <div className="mt-6 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 text-center animate-slideInUp" style={{animationDelay: '0.7s'}}>
          <p className="text-xs text-slate-500">
            🔒 بياناتك آمنة تماماً. نستخدم تشفير عالي المستوى لحماية معلوماتك الشخصية
          </p>
        </div>
      </div>
    </main>
  )
}