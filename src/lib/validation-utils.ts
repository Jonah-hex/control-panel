// src/lib/validation-utils.ts
/**
 * دوال التحقق من صحة البيانات - يمكن استخدامها في Client و Server
 * Validation Utility Functions - Can be used in both Client and Server
 */

/**
 * التحقق من صحة كلمة المرور (متطلبات الأمان)
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong'
  errors: string[]
} {
  const errors: string[] = []
  let strength = 0

  // التحقق من الطول
  if (password.length < 8) {
    errors.push('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
  } else {
    strength++
  }

  if (password.length >= 12) strength++

  // التحقق من الأحرف الكبيرة والصغيرة
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على أحرف كبيرة وصغيرة')
  } else {
    strength++
  }

  // التحقق من الأرقام
  if (!/\d/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على أرقام')
  } else {
    strength++
  }

  // التحقق من الرموز الخاصة
  if (!/[^a-zA-Z\d]/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على رموز خاصة (!@#$%^&*)')
  } else {
    strength++
  }

  const strengthMap: Record<number, 'weak' | 'fair' | 'good' | 'strong' | 'very-strong'> = {
    0: 'weak',
    1: 'weak',
    2: 'fair',
    3: 'good',
    4: 'strong',
    5: 'very-strong',
  }

  return {
    isValid: errors.length === 0,
    strength: strengthMap[strength] || 'weak',
    errors,
  }
}

/**
 * التحقق من صحة البريد الإلكتروني
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * تنظيف البريد الإلكتروني (lowercase، إزالة المسافات)
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

/**
 * التحقق من قوة اسم المستخدم
 */
export function validateUsername(username: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (username.length < 3) {
    errors.push('اسم المستخدم يجب أن يكون 3 أحرف على الأقل')
  }

  if (username.length > 20) {
    errors.push('اسم المستخدم يجب ألا يزيد عن 20 حرفاً')
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('اسم المستخدم يجب أن يحتوي على أحرف وأرقام وشرطة سفلية فقط')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * التحقق من صحة رقم الهاتف السعودي
 */
export function validateSaudiPhoneNumber(phone: string): boolean {
  const phoneRegex = /^(05|5)\d{8}$/
  return phoneRegex.test(phone.replace(/[\s-]/g, ''))
}

/** استخراج الأرقام فقط من حقل الجوال */
export function phoneDigitsOnly(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10)
}

/** التحقق من أن رقم الجوال 10 أرقام بالضبط (إلزامي للنظام) */
export function isValidPhone10Digits(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10
}

/**
 * التحقق من صحة رقم الهوية الوطنية
 */
export function validateNationalId(id: string): boolean {
  // رقم الهوية السعودي يجب أن يكون 10 أرقام
  return /^\d{10}$/.test(id)
}
