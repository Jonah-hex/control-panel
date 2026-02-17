'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
        <h1 className="text-2xl font-black text-gray-900 mb-2">حدث خطأ غير متوقع</h1>
        <p className="text-gray-600 mb-6">تعذر تحميل الصفحة حالياً، يمكنك إعادة المحاولة أو العودة للوحة التحكم.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition"
          >
            إعادة المحاولة
          </button>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
          >
            العودة للوحة التحكم
          </Link>
        </div>
      </div>
    </div>
  )
}
