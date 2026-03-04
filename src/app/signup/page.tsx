// src/app/signup/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle, Building2, ArrowRight, Chrome, Phone } from 'lucide-react'
import { validatePasswordStrength, validateEmail, phoneDigitsOnly, isValidPhone10Digits } from '@/lib/validation-utils'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  
  const router = useRouter()
  const supabase = createClient()

  // حساب قوة كلمة المرور
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0)
      setPasswordErrors([])
      return
    }
    
    const validation = validatePasswordStrength(password)
    const strengthMap = { 'weak': 0, 'fair': 2, 'good': 3, 'strong': 4, 'very-strong': 5 }
    setPasswordStrength(strengthMap[validation.strength] || 0)
    setPasswordErrors(validation.errors)
  }, [password])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // التحقق من الاسم
    if (!fullName.trim()) {
      setError('يرجى إدخال اسمك الكامل')
      setLoading(false)
      return
    }

    // التحقق من البريد الإلكتروني
    if (!validateEmail(email)) {
      setError('يرجى إدخال بريد إلكتروني صحيح')
      setLoading(false)
      return
    }

    // التحقق من الجوال إن وُجد (اختياري — 10 أرقام)
    const phoneTrimmed = phone.trim().replace(/\s/g, '')
    if (phoneTrimmed && !isValidPhone10Digits(phoneTrimmed)) {
      setError('رقم الجوال يجب أن يكون 10 أرقام صحيحة')
      setLoading(false)
      return
    }

    // التحقق من كلمة المرور
    const pwValidation = validatePasswordStrength(password)
    if (!pwValidation.isValid) {
      setError(pwValidation.errors[0])
      setLoading(false)
      return
    }

    // التحقق من تطابق كلمات المرور
    if (password !== confirmPassword) {
      setError('كلمات المرور غير متطابقة')
      setLoading(false)
      return
    }

    // التحقق من الموافقة على الشروط
    if (!agreeToTerms) {
      setError('يرجى الموافقة على شروط الاستخدام والسياسة الخصوصية')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phoneTrimmed ? phoneDigitsOnly(phoneTrimmed) : null,
            created_at: new Date().toISOString(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (error) throw error
      
      setSuccess('تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني')
      
      // تنظيف النموذج
      setTimeout(() => {
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        setFullName('')
        setPhone('')
      }, 1500)
      
    } catch (error: any) {
      setError(error.message || 'حدث خطأ أثناء إنشاء الحساب')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialSignup = async (provider: 'google') => {
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
      setError(`فشل الاشتراك عبر Google`)
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
                <Building2 className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">إنشاء حساب جديد</h1>
            <p className="text-slate-400">انضم إلى منصة عماير Pro</p>
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

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="space-y-5 animate-slideInUp" style={{animationDelay: '0.3s'}}>
            
            {/* Full Name Input */}
            <div className="relative group">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                الاسم الكامل
              </label>
              <div className="relative">
                <User className="absolute right-3 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="أحمد محمد"
                  className="w-full pr-10 pl-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition duration-300"
                  required
                />
              </div>
            </div>

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
                />
              </div>
            </div>

            {/* Phone Input (optional) */}
            <div className="relative group">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                رقم الجوال <span className="text-slate-500 font-normal">(اختياري)</span>
              </label>
              <div className="relative">
                <Phone className="absolute right-3 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition" />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(phoneDigitsOnly(e.target.value))}
                  placeholder="05xxxxxxxx"
                  className="w-full pr-10 pl-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition duration-300"
                  dir="ltr"
                  maxLength={10}
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

                  {/* Password Requirements */}
                  {passwordErrors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {passwordErrors.map((error, idx) => (
                        <p key={idx} className="text-xs text-orange-400 flex items-center gap-1">
                          <span>⚠</span> {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
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

            {/* Terms and Conditions */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                className="w-4 h-4 mt-1 rounded border border-slate-600 bg-slate-700 checked:bg-blue-600 checked:border-blue-500 cursor-pointer flex-shrink-0"
              />
              <span className="text-xs text-slate-400 group-hover:text-slate-300 transition leading-relaxed">
                أوافق على{' '}
                <a href="#" className="text-blue-400 hover:text-blue-300">شروط الاستخدام</a>{' '}
                و{' '}
                <a href="#" className="text-blue-400 hover:text-blue-300">سياسة الخصوصية</a>
              </span>
            </label>

            {/* Signup Button */}
            <button
              type="submit"
              disabled={loading || !fullName || !email || !password || !confirmPassword || !agreeToTerms}
              className="w-full btn-gradient text-white py-3 rounded-lg font-bold text-base transition duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-blue-400/30"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  جاري الإنشاء...
                </>
              ) : (
                'إنشاء حساب'
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

          {/* Social Signup */}
          <div className="space-y-3 animate-slideInUp" style={{animationDelay: '0.5s'}}>
            <button
              onClick={() => handleSocialSignup('google')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600/50 text-white py-3 rounded-lg font-medium transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Chrome className="w-5 h-5" />
              Google
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-8 border-t border-slate-700/50 text-center animate-slideInUp" style={{animationDelay: '0.6s'}}>
            <p className="text-slate-400 text-sm">
              لديك حساب بالفعل؟{' '}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition">
                دخول
              </Link>
            </p>
          </div>
        </div>

        {/* Security Info */}
        <div className="mt-6 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 text-center animate-slideInUp" style={{animationDelay: '0.7s'}}>
          <p className="text-xs text-slate-500">
            🔒 بيانات تسجيلك آمنة ومشفرة بشكل كامل
          </p>
        </div>
      </div>
    </main>
  )
}