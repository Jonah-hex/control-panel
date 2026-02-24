import { createClient } from '@supabase/supabase-js'

/**
 * عميل Supabase بصلاحيات المدير (service_role).
 * يُستخدم فقط في مسارات API أو سيرفر - لا تستورده في مكونات العميل.
 * يستخدم لدعوة الموظفين عبر auth.admin.inviteUserByEmail وربطهم بجدول dashboard_employees.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
