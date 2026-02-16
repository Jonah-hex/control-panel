// src/app/page.tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  Building2, 
  Home as HomeIcon, 
  TrendingUp,
  ArrowRight,
  CheckCircle,
  Users,
  Zap,
  Shield,
  BarChart3,
  Lightbulb,
  Smartphone,
  Clock
} from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('Error checking user:', error)
      }
    }
    checkUser()
  }, [router, supabase.auth])

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
      {/* Background Blur */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-indigo-600/5 rounded-full blur-3xl"></div>
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-slate-900/95 via-slate-900/98 to-slate-950/95 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-xl group-hover:shadow-blue-500/50 transition duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition duration-500 group-hover:animate-pulse"></div>
                <Building2 className="w-6 h-6 text-white group-hover:scale-110 group-hover:rotate-12 transition duration-300 relative z-10" />
              </div>
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-white tracking-tight group-hover:text-blue-400 transition duration-300">عماير Pro</h1>
                <span className="text-xs text-blue-300/70 font-semibold group-hover:text-blue-300 transition duration-300">إدارة عقارات ذكية</span>
              </div>
            </div>

            {/* Nav Links */}
            <div className="flex items-center gap-3">
              <Link 
                href="/login"
                className="px-6 py-2.5 text-sm text-white/80 border border-white/15 rounded-lg hover:border-white/30 hover:text-white hover:bg-white/5 transition duration-300 font-medium backdrop-blur-sm"
              >
                تسجيل الدخول
              </Link>
              <Link 
                href="/signup"
                className="px-6 py-2.5 text-sm btn-gradient text-white rounded-lg font-bold border border-blue-400/40 backdrop-blur-sm transition duration-300 hover:scale-105 active:scale-95"
              >
                ابدأ الآن
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative w-full mx-auto px-2 sm:px-4 lg:px-6 py-16 sm:py-24 animate-slideInUp" style={{animationDelay: '0.1s'}}>
        <div className="text-center mx-auto max-w-screen-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-blue-500/30 rounded-full mb-10 animate-scaleIn" style={{animationDelay: '0.2s'}}>
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
            <span className="text-blue-400 text-sm font-medium">منصة إدارة عقارات متقدمة</span>
          </div>
          
          <div className="py-6 mb-6">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold animate-slideInUp hero-title" style={{animationDelay: '0.3s'}}>
              أدر عملك العقاري بكفاءة
            </h1>
          </div>
          
          <p className="text-lg sm:text-xl lg:text-2xl text-white/90 mb-12 leading-relaxed animate-slideInUp max-w-4xl mx-auto font-normal" style={{animationDelay: '0.4s'}}>
            منصة عماير Pro توفر لك أدوات متقدمة وسهلة الاستخدام لإدارة عقاراتك والوحدات السكنية بكل احترافية
          </p>

          <div className="flex gap-4 justify-center flex-wrap animate-slideInUp" style={{animationDelay: '0.5s'}}>
            <Link 
              href="/signup"
              className="px-8 py-3.5 btn-gradient text-white rounded-xl font-bold text-base transition duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 border border-blue-400/30 shadow-lg shadow-blue-500/20"
            >
              ابدأ مجاناً
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
            </Link>
            <Link 
              href="#features"
              className="px-8 py-3.5 bg-white/10 backdrop-blur-md text-white border border-white/30 rounded-xl font-semibold text-base hover:bg-white/20 hover:border-white/40 transition duration-200 hover:scale-105 active:scale-95"
            >
              المميزات
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="relative py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-slideInUp">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 glow-text">مميزات أساسية</h2>
            <p className="text-slate-400 text-base sm:text-lg">كل ما تحتاجه لإدارة عملك العقاري</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Building2,
                title: 'إدارة العماير',
                description: 'أنشئ وأدر أملاكك بسهولة مع جميع البيانات المهمة'
              },
              {
                icon: HomeIcon,
                title: 'إدارة الوحدات',
                description: 'لوحة تحكم شاملة لتتبع حالة جميع الوحدات'
              },
              {
                icon: BarChart3,
                title: 'تقارير شاملة',
                description: 'احصائيات ودراسات مفصلة للأداء'
              },
              {
                icon: Users,
                title: 'إدارة اتحاد الملاك',
                description: 'نظم اجتماعات وقرارات اتحاد الملاك بكفاءة'
              },
              {
                icon: Clock,
                title: 'الجدولة الذكية',
                description: 'نظم المواعيد والعروض بسهولة'
              },
              {
                icon: Smartphone,
                title: 'توافق الأجهزة',
                description: 'استخدم المنصة على أي جهاز'
              }
            ].map((feature, i) => (
              <div key={i} className="stat-card feature-card p-8 rounded-xl border border-slate-800 bg-slate-800/30 hover:bg-slate-800/50 transition duration-300 group hover:scale-105 animate-slideInUp overflow-hidden" style={{animationDelay: `${0.1 + i * 0.08}s`}}>
                {/* Shine effect */}
                <div className="absolute bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500" style={{top: 0, left: 0, right: 0, bottom: 0}}></div>
                
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-lg bg-blue-600/20 flex items-center justify-center mb-5 group-hover:bg-blue-600/30 transition transform group-hover:scale-110 duration-300">
                    <feature.icon className="w-7 h-7 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-400 text-base leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Why Choose Us */}
      <div className="relative py-16 sm:py-20 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white text-center mb-16 animate-slideInUp glow-text">لماذا عماير Pro؟</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                icon: Lightbulb,
                title: 'سهل الاستخدام',
                description: 'واجهة بسيطة وسهلة'
              },
              {
                icon: Zap,
                title: 'سريع وموثوق',
                description: 'أداء عالي وسرعة فائقة'
              },
              {
                icon: Shield,
                title: 'آمن جداً',
                description: 'تشفير عالي وحماية كاملة'
              },
              {
                icon: Users,
                title: 'دعم متميز',
                description: 'فريق دعم متاح 24/7'
              }
            ].map((item, i) => (
              <div key={i} className="stat-card feature-card p-8 rounded-xl border border-slate-800 bg-slate-800/30 hover:bg-slate-800/50 transition duration-300 flex gap-6 group hover:scale-105 animate-slideInUp overflow-hidden" style={{animationDelay: `${0.1 + i * 0.12}s`}}>
                {/* Shine effect */}
                <div className="absolute bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500" style={{top: 0, left: 0, right: 0, bottom: 0}}></div>
                
                <div className="flex gap-6 relative z-10 w-full">
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 rounded-lg bg-blue-600/20 flex items-center justify-center group-hover:bg-blue-600/30 transition transform group-hover:scale-110 duration-300">
                      <item.icon className="w-7 h-7 text-blue-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-slate-400 text-base">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative py-16 sm:py-20 bg-gradient-to-b from-slate-900/50 to-transparent border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white text-center mb-16 animate-slideInUp glow-text">إنجازاتنا</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                num: '1,250+', 
                text: 'مالك عقار',
                icon: Building2,
                delay: 0
              },
              { 
                num: '8,500+', 
                text: 'وحدة سكنية',
                icon: HomeIcon,
                delay: 1
              },
              { 
                num: '100%', 
                text: 'تسهيل أعمالك الإدارية',
                icon: Users,
                delay: 2
              }
            ].map((stat, i) => (
              <div key={i} className="stat-card feature-card p-8 sm:p-10 rounded-xl border border-slate-800 bg-slate-800/30 hover:bg-slate-800/50 transition duration-300 group hover:scale-105 animate-slideInUp overflow-hidden" style={{animationDelay: `${0.5 + i * 0.1}s`}} data-stat={i}>
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500 animate-shimmer" style={{animation: 'shimmer 3s infinite', animationDelay: `${i * 1}s`}}></div>
                
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-lg bg-blue-600/20 flex items-center justify-center mb-6 group-hover:bg-blue-600/30 transition transform group-hover:scale-110 duration-300">
                    <stat.icon className="w-7 h-7 text-blue-400" />
                  </div>
                  <h3 className="text-4xl sm:text-5xl font-bold text-white mb-3 number-counter" data-target={stat.num.replace(/[^0-9]/g, '')}>{stat.num}</h3>
                  <p className="text-slate-400 text-base font-medium">{stat.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="relative py-16 sm:py-20 border-t border-slate-800/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 animate-slideInUp glow-text">جاهز للبدء؟</h2>
          <p className="text-slate-400 mb-10 text-lg sm:text-xl leading-relaxed animate-slideInUp" style={{animationDelay: '0.1s'}}>
            جرب المنصة مجاناً لمدة 14 يوم
          </p>
          <div className="flex gap-4 justify-center flex-wrap animate-slideInUp" style={{animationDelay: '0.2s'}}>
            <Link
              href="/signup"
              className="px-8 py-3.5 btn-gradient text-white rounded-xl font-bold text-base transition duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 border border-blue-400/30 shadow-lg shadow-blue-500/20"
            >
              ابدأ الآن
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 bg-white/10 backdrop-blur-md text-white border border-white/30 rounded-xl font-semibold text-base hover:bg-white/20 hover:border-white/40 transition duration-200 hover:scale-105 active:scale-95"
            >
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500 text-sm">
          <p>© 2026 عماير Pro - منصة إدارة عقارات احترافية</p>
        </div>
      </footer>
    </main>
  )
}