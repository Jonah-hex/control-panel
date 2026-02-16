// src/app/api/auth/sessions/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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

    // الحصول على جميع الجلسات النشطة
    const { data: sessions, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('login_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data: sessions })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (action === 'create') {
      // إنشاء جلسة جديدة
      const sessionToken = require('crypto').randomBytes(32).toString('hex')
      const userAgent = request.headers.get('user-agent')
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')

      const { error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          session_token: sessionToken,
          user_agent: userAgent,
          ip_address: ip,
        })

      if (error) throw error

      return NextResponse.json({
        success: true,
        sessionToken,
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in sessions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { sessionId, action } = body

    if (action === 'logout') {
      // إنهاء جلسة معينة
      const { error } = await supabase
        .from('user_sessions')
        .update({
          is_active: false,
          logout_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('user_id', user.id)

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: 'Session ended',
      })
    }

    if (action === 'logoutAll') {
      // إنهاء جميع الجلسات
      const { error } = await supabase
        .from('user_sessions')
        .update({
          is_active: false,
          logout_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: 'All sessions ended',
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error updating sessions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
