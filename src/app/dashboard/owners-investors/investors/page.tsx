"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, LayoutDashboard, Users } from "lucide-react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";

export default function InvestorsPage() {
  const router = useRouter();
  const { can, ready } = useDashboardAuth();

  useEffect(() => {
    if (!ready) return;
    if (!can("investors_view")) router.replace("/dashboard");
  }, [ready, can, router]);

  if (ready && !can("investors_view")) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <p className="text-gray-500">جاري التحويل...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-teal-50/40 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">المستثمرين</h1>
              <p className="text-sm text-gray-500">إدارة المستثمرين واستثماراتهم</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/owners-investors"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
            >
              <Users className="w-4 h-4" />
              إدارة الملاك والمستثمرين
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
            >
              <LayoutDashboard className="w-4 h-4" />
              لوحة التحكم
            </Link>
          </div>
        </header>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-gray-500">صفحة المستثمرين — جاري إعداد المحتوى.</p>
        </div>
      </div>
    </main>
  );
}
