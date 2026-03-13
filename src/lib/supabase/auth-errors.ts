/**
 * أخطاء جلسة Supabase الشائعة (انتهاء / فقدان refresh token)
 * السبب: كوكيز قديمة، تسجيل خروج من جهاز آخر، تدوير مفاتيح المشروع، أو مسح جزئي للتخزين.
 */
export function isInvalidSessionError(err: { message?: string } | null | undefined): boolean {
  if (!err?.message) return false
  const m = err.message
  return (
    m.includes('Refresh Token') ||
    m.includes('Invalid JWT') ||
    m.includes('JWT expired')
  )
}
