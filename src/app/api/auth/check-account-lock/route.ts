// src/app/api/auth/check-account-lock/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // التحقق من وجود حساب مقفول
    const { data: lockedAccount, error: lockError } = await supabase
      .from('locked_accounts')
      .select('*')
      .eq('email', email)
      .gt('locked_until', new Date().toISOString())
      .single()

    if (lockError && lockError.code !== 'PGRST116') {
      console.error('Error checking locked account:', lockError)
    }

    // إذا كان الحساب مقفولاً
    if (lockedAccount) {
      return NextResponse.json({
        isLocked: true,
        lockedUntil: lockedAccount.locked_until,
        reason: lockedAccount.reason,
      })
    }

    // الحساب غير مقفول
    return NextResponse.json({
      isLocked: false,
    })

  } catch (error) {
    console.error('Error in check-account-lock API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - فتح قفل الحساب (للمناظر فقط)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // التحقق من أن المستخدم مسؤول (يمكن إضافة التحقق من الأدوار لاحقاً)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // فتح قفل الحساب
    const { error } = await supabase
      .from('locked_accounts')
      .delete()
      .eq('email', email)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Account unlocked successfully',
    })

  } catch (error) {
    console.error('Error in unlock account API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
