-- ==========================================
-- تحسينات قاعدة البيانات لنظام تسجيل الدخول
-- Database Enhancements for Login System
-- ==========================================

-- 1. جدول محاولات تسجيل الدخول (Login Attempts Table)
-- لتتبع المحاولات الفاشلة وتطبيق الأمان
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(50) NOT NULL, -- 'success', 'failed'
  failure_reason TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. جدول الحسابات المقفولة (Locked Accounts Table)
-- لتخزين معلومات قفل الحسابات المؤقتة
CREATE TABLE IF NOT EXISTS locked_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  locked_until TIMESTAMP WITH TIME ZONE,
  failed_attempts INTEGER DEFAULT 0,
  reason TEXT, -- 'too_many_attempts', 'suspicious_activity'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. جدول سجل الأنشطة (Activity Log Table)
-- لتتبع جميع أنشطة المستخدم
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL, -- 'login', 'logout', 'password_reset', 'profile_update', etc
  action_description TEXT,
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(50) DEFAULT 'success', -- 'success', 'failed'
  metadata JSONB, -- بيانات إضافية
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. جدول إعدادات أمان المستخدم (User Security Settings Table)
-- لحفظ إعدادات الأمان والحماية
CREATE TABLE IF NOT EXISTS user_security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- تفعيل حماية سريعة العوامل (2FA)
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_method VARCHAR(50), -- 'sms', 'email', 'totp', 'app'
  two_factor_secret TEXT, -- مثل TOTP secret
  
  -- إعدادات كلمة المرور
  password_changed_at TIMESTAMP WITH TIME ZONE,
  password_expiry_days INTEGER DEFAULT 90,
  require_password_reset BOOLEAN DEFAULT FALSE,
  
  -- العناوين IP الموثوقة
  trusted_ips TEXT[],
  
  -- إشعارات الأمان
  email_on_login BOOLEAN DEFAULT TRUE,
  email_on_suspicious_activity BOOLEAN DEFAULT TRUE,
  
  -- قائمة سوداء
  is_blacklisted BOOLEAN DEFAULT FALSE,
  blacklist_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. جدول جلسات المستخدم (User Sessions Table)
-- لتتبع جلسات المستخدم
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  session_token VARCHAR(255) UNIQUE,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB, -- معلومات الجهاز
  
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  logout_at TIMESTAMP WITH TIME ZONE,
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. جدول تنبيهات الأمان (Security Alerts Table)
-- للتنبيهات الأمنية المهمة
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type VARCHAR(100) NOT NULL, -- 'login_from_new_location', 'multiple_failed_attempts', 'suspicious_activity', etc
  severity VARCHAR(50) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  action_required BOOLEAN DEFAULT FALSE,
  action_description TEXT,
  
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- الفهارس (Indexes) لتحسين الأداء
-- ==========================================

-- فهرس للبحث السريع عن محاولات تسجيل الدخول
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at DESC);

-- فهرس للحسابات المقفولة
CREATE INDEX IF NOT EXISTS idx_locked_accounts_user_id ON locked_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_locked_accounts_email ON locked_accounts(email);
CREATE INDEX IF NOT EXISTS idx_locked_accounts_locked_until ON locked_accounts(locked_until);

-- فهرس لسجل الأنشطة
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- فهرس لجلسات المستخدم
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);

-- فهرس لتنبيهات الأمان
CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id ON security_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_alert_type ON security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_is_resolved ON security_alerts(is_resolved);

-- ==========================================
-- Policies (RLS) لسياسات الوصول
-- ==========================================

-- تفعيل RLS على جميع الجداول الجديدة
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE locked_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- سياسات login_attempts
CREATE POLICY "Users can view their own login attempts" 
ON login_attempts 
FOR SELECT 
USING (user_id = auth.uid() OR user_id IS NULL);

-- سياسات activity_logs
CREATE POLICY "Users can view their own activity logs" 
ON activity_logs 
FOR SELECT 
USING (user_id = auth.uid());

-- سياسات user_security_settings
CREATE POLICY "Users can view and update their own security settings" 
ON user_security_settings 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- سياسات user_sessions
CREATE POLICY "Users can view their own sessions" 
ON user_sessions 
FOR SELECT 
USING (user_id = auth.uid());

-- سياسات security_alerts
CREATE POLICY "Users can view their own security alerts" 
ON security_alerts 
FOR SELECT 
USING (user_id = auth.uid());

-- ==========================================
-- Functions و Triggers
-- ==========================================

-- دالة تحديث تاريخ التعديل تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث updated_at في locked_accounts
DROP TRIGGER IF EXISTS update_locked_accounts_updated_at ON locked_accounts;
CREATE TRIGGER update_locked_accounts_updated_at
BEFORE UPDATE ON locked_accounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger لتحديث updated_at في user_security_settings
DROP TRIGGER IF EXISTS update_user_security_settings_updated_at ON user_security_settings;
CREATE TRIGGER update_user_security_settings_updated_at
BEFORE UPDATE ON user_security_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger لتحديث updated_at في user_sessions
DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER update_user_sessions_updated_at
BEFORE UPDATE ON user_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger لتحديث updated_at في security_alerts
DROP TRIGGER IF EXISTS update_security_alerts_updated_at ON security_alerts;
CREATE TRIGGER update_security_alerts_updated_at
BEFORE UPDATE ON security_alerts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- دالة لإنشاء إعدادات أمان جديدة للمستخدم الجديد
CREATE OR REPLACE FUNCTION create_user_security_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_security_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- يمكن تفعيل هذا Trigger عند إنشاء مستخدم جديد
-- CREATE TRIGGER create_security_settings_on_user_creation
-- AFTER INSERT ON auth.users
-- FOR EACH ROW
-- EXECUTE FUNCTION create_user_security_settings();

-- ==========================================
-- Views للتقارير والإحصائيات
-- ==========================================

-- عرض ملخص أنشطة المستخدم
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
  user_id,
  COUNT(*) as total_actions,
  COUNT(CASE WHEN action_type = 'login' THEN 1 END) as login_count,
  COUNT(CASE WHEN action_type = 'logout' THEN 1 END) as logout_count,
  MAX(created_at) as last_activity,
  COUNT(DISTINCT DATE(created_at)) as active_days
FROM activity_logs
GROUP BY user_id;

-- عرض محاولات تسجيل الدخول الأخيرة
CREATE OR REPLACE VIEW recent_login_attempts AS
SELECT
  la.*,
  u.email as user_email
FROM login_attempts la
LEFT JOIN auth.users u ON la.user_id = u.id
ORDER BY attempted_at DESC
LIMIT 100;

-- عرض الحسابات المقفولة حالياً
CREATE OR REPLACE VIEW active_locked_accounts AS
SELECT *
FROM locked_accounts
WHERE locked_until > NOW() AND is_blacklisted = FALSE;

-- ==========================================
-- بيانات أولية (Initial Data)
-- ==========================================

-- يمكنك إضافة بيانات افتراضية أو معالجات مزيدة هنا
