// src/app/auth/reset-password/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle, Building2, ArrowRight } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [passwordStrength, setPasswordStrength] = useState(0)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // التحقق من تطابق كلمات المرور
    if (password !== confirmPassword) {
      setError('كلمات المرور غير متطابقة')
      setLoading(false)
      return
    }

    // التحقق من قوة كلمة المرور
    if (passwordStrength < 3) {
      setError('كلمة المرور ضعيفة جداً. يجب استخدام أحرف كبيرة وصغيرة وأرقام')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess('تم تحديث كلمة المرور بنجاح! جاري إعادة التوجيه...')
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 2000)
      
    } catch (error: any) {
      setError(error.message || 'فشل تحديث كلمة المرور. يرجى المحاولة مجدداً')
    } finally {
      setLoading(false)
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
                <Lock className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">تعيين كلمة المرور الجديدة</h1>
            <p className="text-slate-400">أنشئ كلمة مرور قوية وآمنة</p>
          </div>

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

          {/* Reset Password Form */}
          <form onSubmit={handleResetPassword} className="space-y-6 animate-slideInUp" style={{animationDelay: '0.3s'}}>
            
            {/* Password Input */}
            <div className="relative group">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                كلمة المرور الجديدة
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-10 pl-10 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition duration-300"
                  dir="ltr"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3.5 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Strength */}
              {password && (
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

              {/* Password Requirements */}
              <div className="mt-3 space-y-1">
                <p className="text-xs text-slate-400 mb-2">متطلبات كلمة المرور:</p>
                <div className="space-y-1">
                  <div className={`flex items-center gap-2 text-xs ${password.length >= 8 ? 'text-green-400' : 'text-slate-500'}`}>
                    <div className={`w-2 h-2 rounded-full ${password.length >= 8 ? 'bg-green-400' : 'bg-slate-600'}`}></div>
                    8 أحرف على الأقل
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${/[a-z]/.test(password) && /[A-Z]/.test(password) ? 'text-green-400' : 'text-slate-500'}`}>
                    <div className={`w-2 h-2 rounded-full ${/[a-z]/.test(password) && /[A-Z]/.test(password) ? 'bg-green-400' : 'bg-slate-600'}`}></div>
                    أحرف كبيرة وصغيرة
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${/\d/.test(password) ? 'text-green-400' : 'text-slate-500'}`}>
                    <div className={`w-2 h-2 rounded-full ${/\d/.test(password) ? 'bg-green-400' : 'bg-slate-600'}`}></div>
                    أرقام
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${/[^a-zA-Z\d]/.test(password) ? 'text-green-400' : 'text-slate-500'}`}>
                    <div className={`w-2 h-2 rounded-full ${/[^a-zA-Z\d]/.test(password) ? 'bg-green-400' : 'bg-slate-600'}`}></div>
                    رموز خاصة (!@#$%^&*)
                  </div>
                </div>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="relative group">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                تأكيد كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-10 pl-10 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition duration-300"
                  dir="ltr"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute left-3 top-3.5 text-slate-500 hover:text-slate-300 transition"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Match Indicator */}
              {confirmPassword && (
                <div className={`mt-2 flex items-center gap-2 text-xs ${password === confirmPassword ? 'text-green-400' : 'text-red-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${password === confirmPassword ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  {password === confirmPassword ? 'كلمات المرور متطابقة' : 'كلمات المرور غير متطابقة'}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !password || !confirmPassword || password !== confirmPassword}
              className="w-full btn-gradient text-white py-3 rounded-lg font-bold text-base transition duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-400/30"
            >
              {loading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-8 border-t border-slate-700/50 text-center animate-slideInUp" style={{animationDelay: '0.4s'}}>
            <p className="text-slate-400 text-sm">
              تذكرت كلمتك؟{' '}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition">
                عد إلى تسجيل الدخول
              </Link>
            </p>
          </div>
        </div>

        {/* Security Info */}
        <div className="mt-6 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 text-center animate-slideInUp" style={{animationDelay: '0.5s'}}>
          <p className="text-xs text-slate-500">
            🔒 تحديثك لكلمة المرور آمن تماماً ومشفر بشكل كامل
          </p>
        </div>
      </div>
    </main>
  )
}
