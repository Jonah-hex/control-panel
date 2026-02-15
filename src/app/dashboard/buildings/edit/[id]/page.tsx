'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

// إعادة توجيه إلى صفحة التفاصيل
// في الواقع العملي، قد تريد جعل صفحة التعديل منفصلة تماماً
// لكن الآن سنستخدم الصفحة الديناميكية مع وضع التعديل

export default function EditBuildingPage() {
  const params = useParams()
  const router = useRouter()
  const buildingId = params.id as string

  useEffect(() => {
    // إعادة توجيه إلى صفحة التفاصيل
    // يمكنك إضافة query parameter للتعديل المباشر إذا أردت
    router.push(`/dashboard/buildings/${buildingId}`)
  }, [buildingId, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">جاري تحميل صفحة التعديل...</p>
      </div>
    </div>
  )
}
