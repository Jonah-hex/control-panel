// src/app/subscriptions/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Building2,
  ArrowRight,
  Check,
  Zap,
  Crown,
  ArrowLeft,
} from 'lucide-react'

interface PlanFeature {
  text?: string
}

interface SubscriptionPlan {
  id: string
  slug: string
  name_ar: string
  name_en?: string | null
  description_ar?: string | null
  price_monthly: number
  price_yearly?: number | null
  currency: string
  max_buildings?: number | null
  features: string[] | PlanFeature[]
  is_featured?: boolean
  sort_order?: number
}

// خطط افتراضية عند عدم توفر الجدول أو الفشل في الجلب
const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    slug: 'free',
    name_ar: 'مجاني',
    name_en: 'Free',
    description_ar: 'ابدأ بتجربة المنصة مع إمكانيات أساسية',
    price_monthly: 0,
    price_yearly: 0,
    currency: 'SAR',
    max_buildings: 1,
    features: ['عمارة واحدة', 'حتى 18 وحدة لكل عمارة', 'تقارير أساسية', 'دعم البريد'],
    is_featured: false,
    sort_order: 0,
  },
  {
    id: 'starter',
    slug: 'starter',
    name_ar: 'مبتدئ',
    name_en: 'Starter',
    description_ar: 'مناسب للمشاريع الصغيرة',
    price_monthly: 99,
    price_yearly: 990,
    currency: 'SAR',
    max_buildings: 3,
    features: ['حتى 3 عماير', 'حتى 18 وحدة لكل عمارة', 'تقارير وتنبيهات', 'دعم فني'],
    is_featured: false,
    sort_order: 1,
  },
  {
    id: 'pro',
    slug: 'pro',
    name_ar: 'احترافي',
    name_en: 'Pro',
    description_ar: 'الأفضل للأعمال النامية',
    price_monthly: 249,
    price_yearly: 2490,
    currency: 'SAR',
    max_buildings: 15,
    features: [
      'حتى 15 عمارة',
      'حتى 36 وحدة لكل عمارة',
      'ذكاء صناعي وتقارير متقدمة',
      'تنبيهات ذكية',
      'دعم أولوية',
    ],
    is_featured: true,
    sort_order: 2,
  },
  {
    id: 'enterprise',
    slug: 'enterprise',
    name_ar: 'شركات',
    name_en: 'Enterprise',
    description_ar: 'حلول مخصصة مع دعم كامل',
    price_monthly: 499,
    price_yearly: 4990,
    currency: 'SAR',
    max_buildings: null,
    features: [
      'عماير غير محدودة',
      'وحدات غير محدودة',
      'ذكاء صناعي و APIs',
      'مدير حساب مخصص',
      'SLA مضمون',
    ],
    is_featured: false,
    sort_order: 3,
  },
]

function parseFeatures(f: string[] | PlanFeature[]): string[] {
  if (!Array.isArray(f)) return []
  return f.map((item) => (typeof item === 'string' ? item : (item as PlanFeature).text || '')).filter(Boolean)
}

export default function SubscriptionsPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS)
  const [loading, setLoading] = useState(true)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')

  useEffect(() => {
    const supabase = createClient()
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('id, slug, name_ar, name_en, description_ar, price_monthly, price_yearly, currency, max_buildings, features, is_featured, sort_order')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })

        if (!error && data && data.length > 0) {
          setPlans(
            data.map((row) => ({
              id: row.id,
              slug: row.slug,
              name_ar: row.name_ar,
              name_en: row.name_en ?? null,
              description_ar: row.description_ar ?? null,
              price_monthly: Number(row.price_monthly) ?? 0,
              price_yearly: row.price_yearly != null ? Number(row.price_yearly) : null,
              currency: row.currency ?? 'SAR',
              max_buildings: row.max_buildings ?? null,
              features: Array.isArray(row.features) ? row.features : [],
              is_featured: row.is_featured ?? false,
              sort_order: row.sort_order ?? 0,
            }))
          )
        }
      } catch (_) {
        // استمر بالخطط الافتراضية
      } finally {
        setLoading(false)
      }
    }
    fetchPlans()
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950" dir="rtl">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-indigo-600/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-violet-600/5 rounded-full blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-slate-900/95 via-slate-900/98 to-slate-950/95 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-xl transition duration-300">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xl font-bold text-white">عماير Pro</span>
                <span className="text-xs text-blue-300/70">منصة إدارة عقارات ذكية</span>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 text-white/80 hover:text-white border border-white/15 rounded-lg hover:bg-white/5 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                الرئيسية
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 text-sm text-white/80 border border-white/15 rounded-lg hover:border-white/30 hover:text-white hover:bg-white/5 transition font-medium"
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2.5 text-sm btn-gradient text-white rounded-lg font-bold border border-blue-400/40 backdrop-blur-sm transition hover:scale-105 active:scale-95"
              >
                ابدأ الآن
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative pt-16 pb-12 sm:pt-20 sm:pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
            خطط اشتراك ذكية
          </h1>
          <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto mb-8">
            اختر الخطة المناسبة لعملك — منصة عماير Pro تنمو معك وتُحسّن قراراتك في الإدارة الصحيحة لعقاراتك
          </p>
          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 p-1.5 bg-slate-800/60 rounded-xl border border-slate-700/80">
            <button
              type="button"
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                billingPeriod === 'monthly'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              شهري
            </button>
            <button
              type="button"
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                billingPeriod === 'yearly'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              سنوي
              <span className="mr-1.5 text-xs text-emerald-400 font-normal">وفر حتى 17%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="relative pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-96 rounded-2xl bg-slate-800/30 border border-slate-700/50 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan, index) => {
                const price =
                  billingPeriod === 'yearly' && plan.price_yearly != null
                    ? plan.price_yearly
                    : plan.price_monthly
                const periodLabel = billingPeriod === 'yearly' ? 'سنوياً' : 'شهرياً'
                const isPro = plan.slug === 'pro'
                const isFree = plan.slug === 'free'

                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl border overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
                      isPro
                        ? 'bg-gradient-to-b from-indigo-900/40 to-slate-900/60 border-indigo-500/50 shadow-xl shadow-indigo-500/20 ring-2 ring-indigo-400/30'
                        : 'bg-slate-800/30 border-slate-700/60 hover:border-slate-600'
                    }`}
                    style={{ animationDelay: `${index * 0.08}s` }}
                  >
                    {plan.is_featured && (
                      <div className="absolute top-0 left-0 right-0 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-center">
                        <span className="text-xs font-bold text-white flex items-center justify-center gap-1">
                          <Zap className="w-3.5 h-3.5" />
                          الأكثر اختياراً
                        </span>
                      </div>
                    )}
                    <div className={`p-6 ${plan.is_featured ? 'pt-10' : ''}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {isPro ? (
                          <Crown className="w-5 h-5 text-amber-400" />
                        ) : isFree ? (
                          <Building2 className="w-5 h-5 text-slate-400" />
                        ) : null}
                        <h2 className="text-xl font-bold text-white">{plan.name_ar}</h2>
                      </div>
                      {plan.description_ar && (
                        <p className="text-slate-400 text-sm mb-4">{plan.description_ar}</p>
                      )}
                      <div className="mb-6">
                        <span className="text-3xl font-bold text-white">
                          {price === 0 ? 'مجاني' : `${price} ${plan.currency}`}
                        </span>
                        {price > 0 && (
                          <span className="text-slate-400 text-sm font-normal"> / {periodLabel}</span>
                        )}
                      </div>
                      <ul className="space-y-3 mb-8">
                        {parseFeatures(plan.features).map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                            <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        href="/signup"
                        className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm transition ${
                          isPro
                            ? 'btn-gradient text-white border border-blue-400/30 shadow-lg shadow-blue-500/20 hover:scale-105'
                            : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                        }`}
                      >
                        {isFree ? 'ابدأ مجاناً' : 'اشترك الآن'}
                        {!isFree && <ArrowRight className="w-4 h-4" />}
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="relative border-t border-slate-800/50 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-slate-400 mb-6">
            غير متأكد؟ جرّب المنصة مجاناً لمدة 14 يوم — بدون بطاقة ائتمان
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 btn-gradient text-white rounded-xl font-bold border border-blue-400/30 shadow-lg shadow-blue-500/20 hover:scale-105 transition"
          >
            ابدأ التجربة المجانية
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p>© 2026 عماير Pro — منصة إدارة عقارات احترافية مدعومة بالذكاء الصناعي</p>
        </div>
      </footer>
    </main>
  )
}
