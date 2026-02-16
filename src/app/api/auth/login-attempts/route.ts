// src/app/api/auth/login-attempts/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, status, reason } = body

    const supabase = await createClient()

    // الحصول على IP Address من Headers
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    const userAgent = request.headers.get('user-agent')

    // الحصول على المستخدم
    let userId = null
    if (status === 'success') {
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id
    }

    // تسجيل محاولة الدخول
    const { error } = await supabase
      .from('login_attempts')
      .insert({
        user_id: userId,
        email,
        status,
        failure_reason: reason,
        user_agent: userAgent,
        ip_address: ip,
      })

    if (error) {
      console.error('Error logging login attempt:', error)
      return NextResponse.json(
        { error: 'Failed to log login attempt' },
        { status: 500 }
      )
    }

    // إذا كانت محاولة ناجحة، حذف محاولات الدخول الفاشلة
    if (status === 'success') {
      await supabase
        .from('login_attempts')
        .delete()
        .eq('email', email)
        .eq('status', 'failed')
        .lt('attempted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in login-attempts API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - الحصول على محاولات تسجيل الدخول الأخيرة
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // الحصول على آخر 10 محاولات
    const { data, error } = await supabase
      .from('login_attempts')
      .select('*')
      .eq('user_id', user.id)
      .order('attempted_at', { ascending: false })
      .limit(10)

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching login attempts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
