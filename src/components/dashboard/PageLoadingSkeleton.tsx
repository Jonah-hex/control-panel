'use client'

interface PageLoadingSkeletonProps {
  /** النص المعروض تحت مؤشر التحميل */
  message?: string
  /** حجم المؤشر: sm | md | lg */
  size?: 'sm' | 'md' | 'lg'
  /** لون الحدود: indigo | blue | amber | emerald | teal */
  variant?: 'indigo' | 'blue' | 'amber' | 'emerald' | 'teal'
}

const sizeClasses = {
  sm: 'w-8 h-8 border-2',
  md: 'w-12 h-12 border-4',
  lg: 'w-16 h-16 border-4',
}

const variantClasses = {
  indigo: 'border-indigo-200 border-t-indigo-600',
  blue: 'border-blue-200 border-t-blue-600',
  amber: 'border-amber-200 border-t-amber-600',
  emerald: 'border-emerald-200 border-t-emerald-600',
  teal: 'border-teal-200 border-t-teal-600',
}

/**
 * مكوّن توحيد حالات التحميل للصفحات الثقيلة
 */
export function PageLoadingSkeleton({
  message = 'جاري التحميل...',
  size = 'md',
  variant = 'indigo',
}: PageLoadingSkeletonProps) {
  return (
    <div className="min-h-[40vh] flex items-center justify-center p-12" dir="rtl">
      <div className="text-center">
        <div
          className={`${sizeClasses[size]} ${variantClasses[variant]} rounded-full animate-spin mx-auto mb-4`}
        />
        <p className="text-slate-600 font-medium">{message}</p>
      </div>
    </div>
  )
}
