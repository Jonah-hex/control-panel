// src/app/page.tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // إذا كان المستخدم مسجل دخوله، حوله للوحة التحكم
  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700">
      {/* الشريط العلوي */}
      <nav className="bg-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">نظام حجوزات العماير</h1>
            <div className="flex gap-4">
              <Link 
                href="/login"
                className="px-4 py-2 text-white hover:bg-white/10 rounded-lg transition"
              >
                تسجيل الدخول
              </Link>
              <Link 
                href="/signup"
                className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition"
              >
                إنشاء حساب
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* المحتوى الرئيسي */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-5xl font-bold text-white mb-6">
            أدر عقاراتك بكل سهولة
          </h2>
          <p className="text-xl text-blue-100 mb-12 max-w-3xl mx-auto">
            نظام متكامل لإدارة العماير والوحدات السكنية. تابع حالة الوحدات، أضف صوراً ومستندات، وقدم لعملائك تجربة احترافية
          </p>
          
          <div className="flex gap-4 justify-center">
            <Link 
              href="/signup"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg text-lg font-semibold hover:bg-blue-50 transition shadow-lg"
            >
              ابدأ مجاناً
            </Link>
            <Link 
              href="#features"
              className="px-8 py-4 bg-white/10 text-white rounded-lg text-lg font-semibold hover:bg-white/20 transition"
            >
              تعرف على المميزات
            </Link>
          </div>
        </div>

        {/* قسم المميزات */}
        <div id="features" className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* الميزة 1: إدارة العماير */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 text-white">
            <div className="bg-white/20 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-4">إدارة العماير</h3>
            <p className="text-blue-100">أضف عمايرك بكل تفاصيلها، وصورها، ومخططاتها في مكان واحد</p>
          </div>

          {/* الميزة 2: تتبع الوحدات */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 text-white">
            <div className="bg-white/20 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-4">تتبع الوحدات</h3>
            <p className="text-blue-100">تابع حالة كل وحدة (متاح، محجوز، مباع) بشكل فوري وتحديثات لحظية</p>
          </div>

          {/* الميزة 3: تقارير وإحصائيات */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 text-white">
            <div className="bg-white/20 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-4">تقارير وإحصائيات</h3>
            <p className="text-blue-100">تقارير دقيقة عن حالة الوحدات وأدارة العقارات بشكل مباشر</p>
          </div>
        </div>

        {/* قسم الدعوة للإجراء (Call to Action) */}
        <div className="mt-32 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            جرب النظام مجاناً لمدة 14 يوماً
          </h3>
          <p className="text-xl text-blue-100 mb-8">
            لا تحتاج لبطاقة ائتمان. ابدأ الآن وأدر عقاراتك باحترافية
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg text-lg font-semibold hover:bg-blue-50 transition shadow-lg"
          >
            ابدأ النسخة التجريبية المجانية
          </Link>
        </div>

        {/* Footer بسيط */}
        <footer className="mt-32 text-center text-blue-200 text-sm">
          <p>© 2026 نظام حجوزات العماير. جميع الحقوق محفوظة.</p>
        </footer>
      </div>
    </main>
  )
}