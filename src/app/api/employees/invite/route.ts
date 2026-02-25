import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

export type PermissionKey =
  | 'dashboard'
  | 'buildings'
  | 'buildings_create'
  | 'buildings_edit'
  | 'building_details'
  | 'buildings_delete'
  | 'details_basic'
  | 'details_building'
  | 'details_facilities'
  | 'details_guard'
  | 'details_location'
  | 'details_association'
  | 'details_engineering'
  | 'details_electricity'
  | 'units'
  | 'units_edit'
  | 'deeds'
  | 'statistics'
  | 'activities'
  | 'reports'
  | 'reservations'
  | 'sales'
  | 'marketing_cancel_reservation'
  | 'marketing_complete_sale'
  | 'marketing_building_details'
  | 'security'
  | 'settings'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const body = await request.json()
    const { full_name, email, temporary_password, permissions } = body as {
      full_name: string
      email: string
      temporary_password?: string
      permissions: Record<PermissionKey, boolean>
    }
    const trimmedEmail = (email || '').trim().toLowerCase()
    const trimmedName = (full_name || '').trim()
    const password = typeof temporary_password === 'string' ? temporary_password.trim() : ''
    if (!trimmedName) {
      return NextResponse.json({ error: 'اسم الموظف مطلوب' }, { status: 400 })
    }
    if (!trimmedEmail) {
      return NextResponse.json({ error: 'البريد الإلكتروني مطلوب' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'كلمة المرور المؤقتة مطلوبة (6 أحرف على الأقل). أرسلها للموظف يدوياً أو بالبريد ليدخل بها ثم يغيّرها عبر «نسيت كلمة المرور»' },
        { status: 400 }
      )
    }
    const allowedPermissions = permissions && typeof permissions === 'object' ? permissions : {}

    const admin = createAdminClient()

    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: trimmedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: trimmedName },
    })
    if (createError) {
      const msg = createError.message || 'فشل إنشاء الحساب'
      if (msg.includes('already been registered') || msg.includes('already exists') || msg.includes('User already registered')) {
        return NextResponse.json(
          { error: 'هذا البريد مسجل مسبقاً في المنصة. استخدم «نسيت كلمة المرور» أو أضفه من لوحة التحكم.' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    if (!newUser?.user?.id) {
      return NextResponse.json({ error: 'لم يتم إنشاء المستخدم' }, { status: 500 })
    }

    const { error: insertError } = await admin.from('dashboard_employees').insert({
      owner_id: user.id,
      auth_user_id: newUser.user.id,
      full_name: trimmedName,
      email: trimmedEmail,
      permissions: allowedPermissions,
      is_active: true,
    })
    if (insertError) {
      return NextResponse.json(
        { error: insertError.message || 'تم إنشاء الحساب لكن تعذر ربط الموظف. راجع الجدول dashboard_employees.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'تم إنشاء حساب الموظف. أرسل له البريد الإلكتروني وكلمة المرور المؤقتة (يدوياً أو بالبريد) ليدخل منها، ويمكنه لاحقاً استخدام «نسيت كلمة المرور» لتعيين كلمة خاصة به.',
    })
  } catch (e) {
    console.error('Invite employee error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'حدث خطأ أثناء إرسال الدعوة' },
      { status: 500 }
    )
  }
}
