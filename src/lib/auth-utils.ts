// src/lib/auth-utils.ts
/**
 * دوال مساعدة للتعامل مع المصادقة والأمان
 * Authentication and Security Utility Functions
 */

import { createClient } from '@/lib/supabase/server'

/**
 * تسجيل محاولة تسجيل دخول
 */
export async function logLoginAttempt(
  email: string,
  status: 'success' | 'failed',
  reason?: string,
  userAgent?: string
) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('login_attempts')
      .insert({
        user_id: user?.id,
        email,
        status,
        failure_reason: reason,
        user_agent: userAgent,
        ip_address: null, // يمكن الحصول عليها من الـ headers في API route
      })

    if (error) console.error('Failed to log login attempt:', error)
    return !error
  } catch (err) {
    console.error('Error logging login attempt:', err)
    return false
  }
}

/**
 * التحقق من وجود حساب مقفول
 */
export async function checkIfAccountLocked(email: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('locked_accounts')
      .select('*')
      .eq('email', email)
      .gt('locked_until', new Date().toISOString())
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking locked account:', error)
    }

    return data ? true : false
  } catch (err) {
    console.error('Error in checkIfAccountLocked:', err)
    return false
  }
}

/**
 * قفل الحساب مؤقتاً
 */
export async function lockAccount(
  email: string,
  userId?: string,
  failedAttempts: number = 5
) {
  try {
    const supabase = await createClient()

    const lockedUntil = new Date()
    lockedUntil.setMinutes(lockedUntil.getMinutes() + 15) // قفل لمدة 15 دقيقة

    const { error } = await supabase
      .from('locked_accounts')
      .insert({
        email,
        user_id: userId,
        locked_until: lockedUntil.toISOString(),
        failed_attempts: failedAttempts,
        reason: 'too_many_attempts',
      })

    if (error) console.error('Failed to lock account:', error)
    return !error
  } catch (err) {
    console.error('Error locking account:', err)
    return false
  }
}

/**
 * فتح قفل الحساب
 */
export async function unlockAccount(email: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('locked_accounts')
      .delete()
      .eq('email', email)

    if (error) console.error('Failed to unlock account:', error)
    return !error
  } catch (err) {
    console.error('Error unlocking account:', err)
    return false
  }
}

/**
 * تسجيل نشاط المستخدم
 */
export async function logActivity(
  actionType: string,
  description?: string,
  metadata?: Record<string, any>,
  userAgent?: string
) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return false

    const { error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action_type: actionType,
        action_description: description,
        metadata,
        user_agent: userAgent,
      })

    if (error) console.error('Failed to log activity:', error)
    return !error
  } catch (err) {
    console.error('Error logging activity:', err)
    return false
  }
}

/**
 * إنشاء تنبيه أمان للمستخدم
 */
export async function createSecurityAlert(
  userId: string,
  alertType: string,
  title: string,
  description?: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('security_alerts')
      .insert({
        user_id: userId,
        alert_type: alertType,
        title,
        description,
        severity,
        action_required: severity === 'critical',
      })

    if (error) console.error('Failed to create security alert:', error)
    return !error
  } catch (err) {
    console.error('Error creating security alert:', err)
    return false
  }
}

/**
 * الحصول على آخر محاولات تسجيل دخول للمستخدم
 */
export async function getRecentLoginAttempts(
  email: string,
  limit: number = 5
) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('login_attempts')
      .select('*')
      .eq('email', email)
      .order('attempted_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error getting login attempts:', err)
    return []
  }
}

/**
 * الحصول على عدد محاولات التسجيل الفاشلة في آخر ساعة
 */
export async function getFailedLoginAttemptsInLastHour(
  email: string
): Promise<number> {
  try {
    const supabase = await createClient()
    
    const oneHourAgo = new Date()
    oneHourAgo.setHours(oneHourAgo.getHours() - 1)

    const { data, error } = await supabase
      .from('login_attempts')
      .select('id', { count: 'exact' })
      .eq('email', email)
      .eq('status', 'failed')
      .gte('attempted_at', oneHourAgo.toISOString())

    if (error) throw error
    return data?.length || 0
  } catch (err) {
    console.error('Error getting failed login attempts:', err)
    return 0
  }
}

/**
 * إنشاء جلسة مستخدم
 */
export async function createUserSession(
  userId: string,
  userAgent?: string
) {
  try {
    const supabase = await createClient()

    const sessionToken = require('crypto').randomBytes(32).toString('hex')

    const { error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_token: sessionToken,
        user_agent: userAgent,
      })

    if (error) throw error
    return sessionToken
  } catch (err) {
    console.error('Error creating user session:', err)
    return null
  }
}

/**
 * تحديث آخر نشاط للجلسة
 */
export async function updateSessionActivity(sessionToken: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('user_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('session_token', sessionToken)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error updating session activity:', err)
    return false
  }
}

/**
 * إنهاء جلسة المستخدم
 */
export async function endUserSession(sessionToken: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('user_sessions')
      .update({
        is_active: false,
        logout_at: new Date().toISOString(),
      })
      .eq('session_token', sessionToken)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error ending user session:', err)
    return false
  }
}

/**
 * الحصول على الجلسات النشطة للمستخدم
 */
export async function getActiveSessions(userId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('login_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error getting active sessions:', err)
    return []
  }
}

/**
 * الحصول على إعدادات أمان المستخدم
 */
export async function getUserSecuritySettings(userId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_security_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  } catch (err) {
    console.error('Error getting user security settings:', err)
    return null
  }
}

/**
 * تحديث إعدادات أمان المستخدم
 */
export async function updateUserSecuritySettings(
  userId: string,
  updates: Record<string, any>
) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('user_security_settings')
      .update(updates)
      .eq('user_id', userId)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error updating user security settings:', err)
    return false
  }
}

/**
 * التحقق من ما إذا كان المستخدم مضافاً في القائمة السوداء
 */
export async function isUserBlacklisted(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { data } = await supabase
      .from('user_security_settings')
      .select('is_blacklisted')
      .eq('user_id', userId)
      .single()

    return data?.is_blacklisted ?? false
  } catch (err) {
    console.error('Error checking if user is blacklisted:', err)
    return false
  }
}
