'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-2">خطأ حرج في التطبيق</h2>
          <p className="text-gray-600 mb-2">يرجى إعادة المحاولة. إذا استمرت المشكلة تواصل مع الدعم.</p>
          {error?.digest && <p className="text-xs text-gray-400 mb-6">Ref: {error.digest}</p>}
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition"
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  )
}
