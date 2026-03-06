// src/app/dashboard/security/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Shield, AlertTriangle, Check, LayoutDashboard, Lock, FileCheck, UserCheck, ChevronDown, Database, KeyRound, Eye } from 'lucide-react'

const POLICY_ITEMS = [
  {
    id: 'auth',
    icon: Lock,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    title: 'المصادقة وحماية الحساب',
    summary: 'تسجيل الدخول عبر جلسات موثوقة. كلمة المرور لا تُخزَّن بنص واضح، واستعادة الدخول تتم عبر روابط آمنة مرتبطة بحسابك فقط.',
    details: [
      'كلمات المرور مشفّرة ولا يطّلع عليها أحد من فريق المنصة.',
      'رابط استعادة كلمة المرور يُرسل إلى بريدك فقط ويُنتهي صلاحيته بعد مدة محددة.',
      'يمكنك إنهاء الجلسات غير المعروفة من صفحة حسابك.',
    ],
  },
  {
    id: 'roles',
    icon: UserCheck,
    iconBg: 'bg-violet-500/20',
    iconColor: 'text-violet-400',
    title: 'الصلاحيات حسب الدور',
    summary: 'كل مستخدم يصل فقط إلى ما يسمح به دوره. إدارة العماير والوحدات والمبيعات والحجوزات خاضعة لصلاحيات محددة.',
    details: [
      'المالك يتحكم بمن يدخل المنصة وبصلاحيات كل موظف.',
      'لا يستطيع أحد تعديل أو حذف بيانات لا يملك صلاحية الوصول إليها.',
      'فصل واضح بين الأدوار يقلّل الأخطاء ويحمي من سوء الاستخدام.',
    ],
  },
  {
    id: 'audit',
    icon: FileCheck,
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    title: 'سجلات النشاط والمراجعة',
    summary: 'إجراءات مهمة مثل البيع ونقل الملكية وتعديل البيانات تُسجَّل في السجلات.',
    details: [
      'كل عملية بيع أو نقل ملكية أو تعديل حساس يُسجَّل مع التاريخ والمستخدم.',
      'السجلات تساعد في المراجعة الداخلية وحل النزاعات عند الحاجة.',
      'الاحتفاظ بالسجلات وفق ممارسات محاسبية سليمة.',
    ],
  },
  {
    id: 'usage',
    icon: Shield,
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    title: 'توصياتك لتعزيز الأمان',
    summary: 'استخدم كلمة مرور قوية ولا تشارك بيانات الدخول. راجع الجلسات من صفحة حسابك.',
    details: [
      'استخدم كلمة مرور لا تقل عن 8 أحرف وتضم حروفاً وأرقاماً.',
      'لا تشارك اسم المستخدم أو كلمة المرور مع أي شخص.',
      'غيّر كلمة المرور من صفحة «حسابي» عند الشك بأي تسريب.',
    ],
  },
] as const

export default function SecurityDashboard() {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
      {/* Back Navigation */}
      <nav className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-blue-400">
            <Shield className="w-5 h-5" />
            <span>الأمان</span>
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

        {/* مقدمة — التزام المنصة بالأمان */}
        <div className="mb-8 animate-slideInUp rounded-2xl bg-slate-800/40 border border-slate-600/50 p-6 sm:p-8">
          <p className="text-slate-300 leading-relaxed text-center max-w-2xl mx-auto">
            نلتزم بحماية بياناتك وعمل منصتك. سياسة الأمان التالية توضّح <strong className="text-white">كيف نحمي الحسابات والصلاحيات والبيانات</strong>، وما الذي يمكنك فعله لتعزيز أمان حسابك.
          </p>
        </div>

        {/* ما الذي نحميه — تفاعلي */}
        <div className="mb-10 animate-slideInUp bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 sm:p-8" style={{ animationDelay: '0.05s' }}>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-emerald-400" />
            ما الذي نحميه؟
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
            {[
              { icon: Database, text: 'بيانات العماير والوحدات والمبيعات والحجوزات' },
              { icon: KeyRound, text: 'حسابات المستخدمين وصلاحيات الوصول' },
              { icon: Lock, text: 'كلمات المرور وروابط استعادة الدخول' },
              { icon: FileCheck, text: 'سجلات النشاط والإجراءات الحساسة' },
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-700/20 border border-slate-600/30 hover:border-slate-500/40 transition-colors">
                <item.icon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-sm">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* سياسة أمان المنصة — بنود قابلة للتوسيع */}
        <div className="mb-10 animate-slideInUp bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 sm:p-8" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">سياسة أمان المنصة</h2>
              <p className="text-sm text-slate-400">اضغط على أي بند لقراءة التفاصيل</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {POLICY_ITEMS.map((item) => {
              const Icon = item.icon
              const isExpanded = expandedId === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="flex flex-col gap-3 text-right p-4 rounded-xl bg-slate-700/20 border border-slate-600/30 hover:border-slate-500/50 hover:bg-slate-700/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3 min-w-0 flex-1">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${item.iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white mb-0.5">{item.title}</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">{item.summary}</p>
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 flex-shrink-0 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                  {isExpanded && (
                    <ul className="pr-12 space-y-2 border-t border-slate-600/40 pt-3 mt-1">
                      {item.details.map((detail, j) => (
                        <li key={j} className="flex gap-2 text-sm text-slate-400">
                          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* إجراء سريع — تفاعلي */}
        <div className="animate-slideInUp">
          <p className="text-sm text-slate-400 mb-3">لتحديث كلمة المرور أو مراجعة جلساتك:</p>
          <Link
            href="/user"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm shadow-lg shadow-emerald-500/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            <Shield className="w-4 h-4" />
            الذهاب إلى صفحة حسابي
          </Link>
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
      </div>
    </main>
  )
}
