"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, DollarSign, User2, UserPlus, LayoutDashboard, FileText, LineChart, BellRing, Clock3, NotebookPen } from "lucide-react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";

/** لوجو إدارة التسويق — نفس شكل بطاقة لوحة التحكم (User2) بلون تسويقي */
function MarketingLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-600 flex items-center justify-center shadow-lg shadow-sky-500/25 ring-2 ring-white/80">
        <User2 className="w-7 h-7 text-white" />
      </div>
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">إدارة التسويق</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">لوحة تشغيل التسويق — تنقل سريع بين الحجوزات والمبيعات</p>
      </div>
    </div>
  );
}

export default function MarketingPage() {
  const router = useRouter();
  const { can, ready } = useDashboardAuth();

  useEffect(() => {
    if (!ready) return;
    if (!can("reservations")) {
      router.replace("/dashboard");
    }
  }, [ready, can, router]);

  if (ready && !can("reservations")) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <p className="text-gray-500">جاري التحويل...</p>
      </main>
    );
  }

  const cardBase = "group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300";
  const cardOverlay = "absolute inset-0 bg-gradient-to-br from-sky-500 to-teal-600 opacity-10 transition-opacity duration-300";
  const iconBox = "w-16 h-16 bg-gradient-to-br from-sky-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-500/20";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-sky-50/40 p-4 sm:p-6 lg:p-8" dir="rtl">
      {/* خلفية حيوية خفيفة */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_60%_50%_at_20%_0%,rgba(14,165,233,0.06),transparent)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_50%_60%_at_80%_100%,rgba(20,184,166,0.05),transparent)]" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        {/* هيدر بنفس أسلوب البطاقات */}
        <header className="relative rounded-2xl overflow-hidden mb-8 shadow-lg border border-gray-200/90 bg-gradient-to-br from-white to-gray-50">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500 to-teal-600 opacity-10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_70%_0%,rgba(14,165,233,0.06),transparent)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6">
            <MarketingLogo />
            <Link
              href="/dashboard"
              className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 border border-gray-200/90 text-gray-700 font-medium text-sm shadow-sm hover:bg-white hover:border-sky-200 hover:text-sky-700 transition-all duration-200"
            >
              <LayoutDashboard className="w-4 h-4" />
              لوحة التحكم
            </Link>
          </div>
        </header>

        {/* عنوان القسم */}
        <div className="flex items-center gap-3 mb-5">
          <span className="h-px flex-1 max-w-[4rem] bg-gradient-to-l from-sky-300 to-transparent rounded-full" />
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">أقسام إدارة التسويق</h2>
          <span className="h-px flex-1 max-w-[4rem] bg-gradient-to-r from-teal-300 to-transparent rounded-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          <Link
            href="/dashboard/reservations"
            className={`${cardBase} p-6 hover:shadow-xl hover:-translate-y-1 cursor-pointer`}
          >
            <div className={`${cardOverlay} group-hover:opacity-100`} />
            <div className="relative z-10 text-center">
              <div className={`${iconBox} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-800 group-hover:text-white transition-colors duration-300 text-sm mb-1">
                إدارة الحجوزات
              </h3>
              <p className="text-xs text-gray-500 group-hover:text-white/90 transition-colors duration-300">
                إنشاء الحجز ومتابعة الحالات وطباعة السندات
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/sales"
            className={`${cardBase} p-6 hover:shadow-xl hover:-translate-y-1 cursor-pointer`}
          >
            <div className={`${cardOverlay} group-hover:opacity-100`} />
            <div className="relative z-10 text-center">
              <div className={`${iconBox} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-800 group-hover:text-white transition-colors duration-300 text-sm mb-1">
                إدارة المبيعات
              </h3>
              <p className="text-xs text-gray-500 group-hover:text-white/90 transition-colors duration-300">
                تتبع عمليات البيع والمدفوعات وسجل الإنجاز
              </p>
            </div>
          </Link>

          <div className={`${cardBase} p-6`}>
            <div className={cardOverlay} />
            <div className="relative z-10 text-center">
              <div className={iconBox}>
                <UserPlus className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">قسم المسوقين</h3>
              <p className="text-xs text-gray-500">تمت إزالة الهيكل القديم وسيعاد إنشاؤه لاحقًا.</p>
            </div>
          </div>

          {/* تقارير خاصة بقسم التسويق فقط — منفصلة عن لوحة التحكم الرئيسية */}
          <div className={`${cardBase} p-6`}>
            <div className={cardOverlay} />
            <div className="relative z-10 text-center">
              <div className={iconBox}>
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">التقارير</h3>
              <p className="text-xs text-gray-500">تقارير الحجوزات والمبيعات والمسوقين — بيانات قسم التسويق فقط.</p>
            </div>
          </div>

          {/* تحليلات خاصة بقسم التسويق — منفصلة عن إحصائيات المنصة */}
          <div className={`${cardBase} p-6`}>
            <div className={cardOverlay} />
            <div className="relative z-10 text-center">
              <div className={iconBox}>
                <LineChart className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">التحليلات</h3>
              <p className="text-xs text-gray-500">تحليلات أداء التسويق — منفصلة عن تحليلات لوحة التحكم الرئيسية.</p>
            </div>
          </div>
        </div>

        {/* لمسة احترافية: مستجدات + مواعيد + ملاحظات فريق العمل */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="relative rounded-2xl border border-gray-200 bg-white/90 shadow-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500 to-teal-600 opacity-10" />
            <div className="relative p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-teal-600 flex items-center justify-center">
                  <BellRing className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-800">مستجدات القسم</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="rounded-xl bg-white/80 border border-gray-100 px-3 py-2">تم إنشاء حجز جديد ويتطلب متابعة المسوق.</li>
                <li className="rounded-xl bg-white/80 border border-gray-100 px-3 py-2">تمت إضافة عملية بيع جديدة ضمن حملات هذا الأسبوع.</li>
                <li className="rounded-xl bg-white/80 border border-gray-100 px-3 py-2">تم تحديث حالة عميل مهتم إلى "متابعة نهائية".</li>
              </ul>
            </div>
          </div>

          <div className="relative rounded-2xl border border-gray-200 bg-white/90 shadow-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500 to-teal-600 opacity-10" />
            <div className="relative p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-teal-600 flex items-center justify-center">
                  <Clock3 className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-800">مواعيد اليوم</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="rounded-xl bg-white/80 border border-gray-100 px-3 py-2">10:30 ص — متابعة عميل مشروع الهنا.</li>
                <li className="rounded-xl bg-white/80 border border-gray-100 px-3 py-2">1:00 م — مراجعة حالة العربون مع فريق المبيعات.</li>
                <li className="rounded-xl bg-white/80 border border-gray-100 px-3 py-2">4:30 م — اجتماع تقييم أداء الحملات التسويقية.</li>
              </ul>
            </div>
          </div>

          <div className="relative rounded-2xl border border-gray-200 bg-white/90 shadow-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500 to-teal-600 opacity-10" />
            <div className="relative p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-teal-600 flex items-center justify-center">
                  <NotebookPen className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-800">ملاحظات فريق العمل</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="rounded-xl bg-white/80 border border-gray-100 px-3 py-2">تأكيد جودة بيانات العملاء قبل رفع التقرير الأسبوعي.</li>
                <li className="rounded-xl bg-white/80 border border-gray-100 px-3 py-2">رفع نسبة التحويل من الاستفسار إلى الحجز بنسبة 12%.</li>
                <li className="rounded-xl bg-white/80 border border-gray-100 px-3 py-2">تحديث قوالب الرسائل التسويقية بما يتوافق مع الخطة الجديدة.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
