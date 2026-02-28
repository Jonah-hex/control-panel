-- ==========================================
-- جداول نظام إدارة حجوزات العماير
-- Building Reservation Management System
-- ==========================================

-- 1. جدول العماير (Buildings Table)
CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- معلومات أساسية
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  
  -- تفاصيل المبنى
  total_floors INTEGER NOT NULL DEFAULT 1,
  total_units INTEGER NOT NULL DEFAULT 0,
  reserved_units INTEGER DEFAULT 0,
  entrances INTEGER DEFAULT 1,
  parking_slots INTEGER DEFAULT 0,
  elevators INTEGER DEFAULT 1,
  street_type VARCHAR(50) DEFAULT 'one', -- 'one' أو 'two'
  building_facing VARCHAR(50) DEFAULT 'north', -- اتجاهات: north, south, east, west, northeast, northwest, southeast, southwest
  
  -- معلومات التاريخ والسنة
  year_built INTEGER,
  phone VARCHAR(20),
  
  -- معلومات الحارس
  guard_name VARCHAR(255),
  guard_phone VARCHAR(20),
  guard_room_number VARCHAR(50),
  guard_id_photo TEXT,
  guard_shift VARCHAR(50),
  guard_has_salary BOOLEAN DEFAULT FALSE,
  guard_salary_amount DECIMAL(15, 2),
  
  -- المصاعد والصيانة
  elevator_type VARCHAR(50),
  maintenance_company VARCHAR(255),
  maintenance_contract_number VARCHAR(100),
  last_maintenance_date DATE,
  elevator_emergency_phone VARCHAR(30),
  elevator_installation_contact_name VARCHAR(255),
  maintenance_contract_date DATE,
  warranty_months INTEGER,
  
  -- الموقع الجغرافي
  google_maps_link TEXT,
  
  -- الصور
  image_urls TEXT[] DEFAULT '{}', -- مصفوفة من روابط الصور
  
  -- بيانات الأدوار (JSON)
  floors_data JSONB,
  
  
  -- معلومات المالك والتتبع
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- فهارس
  CONSTRAINT fk_owner FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. جدول الوحدات/الشقق (Units Table)
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ارتباط بالعمارة
  building_id UUID NOT NULL,
  
  -- معلومات الوحدة الأساسية
  unit_number VARCHAR(50) NOT NULL,
  floor INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'apartment', -- 'apartment', 'studio', 'duplex', 'penthouse'
  facing VARCHAR(50) DEFAULT 'front', -- front, back, corner
  
  -- المواصفات
  area DECIMAL(8, 2) NOT NULL DEFAULT 0,
  rooms INTEGER DEFAULT 1,
  bathrooms INTEGER DEFAULT 1,
  living_rooms INTEGER DEFAULT 1,
  kitchens INTEGER DEFAULT 1,
  
  -- غرف إضافية
  maid_room BOOLEAN DEFAULT FALSE,
  driver_room BOOLEAN DEFAULT FALSE,
  entrances INTEGER DEFAULT 1,
  
  -- التكييف
  ac_type VARCHAR(50) DEFAULT 'split', -- 'split', 'window', 'splitWindow', 'central', 'none'
  
  -- الحالة والسعر
  status VARCHAR(50) NOT NULL DEFAULT 'available', -- 'available', 'sold', 'reserved'
  price DECIMAL(15, 2),
  description TEXT,
  
  -- نقل الملكية وبيانات المشتري
  owner_name VARCHAR(255),
  owner_phone VARCHAR(30),
  previous_owner_name VARCHAR(255),
  tax_exemption_status BOOLEAN DEFAULT FALSE,
  tax_exemption_file_url TEXT,
  transfer_check_image_url TEXT,        -- رابط صورة الشيك المرفقة (شيك مصدق)
  transfer_check_amount DECIMAL(15,2), -- مبلغ الشيك (شيك مصدق)
  transfer_payment_method VARCHAR(50), -- طريقة الشراء: cash | transfer | certified_check
  transfer_cash_amount DECIMAL(15,2),  -- المبلغ (كاش)
  transfer_bank_name VARCHAR(255),     -- اسم البنك المحول عليه (تحويل)
  transfer_amount DECIMAL(15,2),       -- مبلغ الحوالة (تحويل)
  transfer_reference_number VARCHAR(100), -- رقم الحوالة البنكية (تحويل)
  transfer_check_bank_name VARCHAR(255),  -- اسم البنك عند الدفع شيكاً مصدقاً
  transfer_check_number VARCHAR(100),     -- رقم الشيك (شيك مصدق)
  transfer_real_estate_request_no VARCHAR(100), -- رقم طلب التصرفات العقارية
  transfer_id_image_url TEXT,          -- رابط صورة هوية المشتري
  electricity_meter_transferred_with_sale BOOLEAN DEFAULT FALSE, -- تم نقل عداد الكهرباء مع الوحدة (غير قابل للتعديل في جدول العدادات)
  driver_room_number VARCHAR(50),                                 -- رقم غرفة السائق المرتبطة بالوحدة
  driver_room_transferred_with_sale BOOLEAN DEFAULT FALSE,        -- تم نقل غرفة السائق مع الوحدة (غير قابل للتعديل في جدول غرف السائق)
  owner_association_registered BOOLEAN DEFAULT FALSE,            -- مسجل في اتحاد الملاك
  
  -- التتبع
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- فهارس
  UNIQUE(building_id, unit_number),
  CONSTRAINT fk_building FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE
);

-- 3. جدول الحجوزات (Reservations Table)
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ارتباط بالوحدة
  unit_id UUID NOT NULL,
  building_id UUID NOT NULL,
  
  -- معلومات العميل
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20) NOT NULL,
  
  -- بيانات الحجز
  reservation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled', 'completed'
  notes TEXT,
  
  -- المبلغ المحجوز
  deposit_amount DECIMAL(15, 2),
  deposit_paid BOOLEAN DEFAULT FALSE,
  deposit_paid_date TIMESTAMP WITH TIME ZONE,
  deposit_settlement_type VARCHAR(50), -- 'included' = مشمول في البيع (تم المخالصة)، 'refund' = استرداد (تم مخالصة الاسترداد)
  
  -- التتبع
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- فهارس
  CONSTRAINT fk_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
  CONSTRAINT fk_building_res FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE
);

-- 4. جدول المبيعات (Sales Table)
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ارتباط بالوحدة
  unit_id UUID NOT NULL,
  building_id UUID NOT NULL,
  
  -- معلومات المشتري
  buyer_name VARCHAR(255) NOT NULL,
  buyer_email VARCHAR(255),
  buyer_phone VARCHAR(20),
  buyer_id_number VARCHAR(20),
  
  -- بيانات البيع
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sale_price DECIMAL(15, 2) NOT NULL,
  commission_amount DECIMAL(15, 2),
  payment_method VARCHAR(100), -- 'cash', 'transfer', 'certified_check'
  bank_name VARCHAR(255),       -- اسم البنك (عند التحويل)
  
  -- معلومات الدفع
  down_payment DECIMAL(15, 2),
  remaining_payment DECIMAL(15, 2),
  payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'partial', 'completed'
  
  -- الوثائق
  contract_url TEXT,
  notes TEXT,
  
  -- التتبع
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- فهارس
  CONSTRAINT fk_unit_sales FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
  CONSTRAINT fk_building_sales FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE
);

-- 4.1 جدول استلام الوحدات (نموذج الاستلام — مدير المبيعات يسلم الوحدة للمشتري)
-- يُنشأ عبر add_unit_handovers.sql مع RLS
-- unit_handovers: unit_id, building_id, sale_id, reservation_id, handover_date, delivered_by, received_by, checklist (JSONB), notes, status

-- 5. جدول الموظفين/الحراس (Staff Table)
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ارتباط بالعمارة
  building_id UUID NOT NULL,
  
  -- المعلومات الشخصية
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  id_number VARCHAR(20) NOT NULL,
  
  -- معلومات الوظيفة
  position VARCHAR(100) NOT NULL, -- 'guard', 'cleaner', 'maintenance', 'supervisor'
  shift VARCHAR(50) DEFAULT 'day', -- 'day', 'night', 'rotating'
  hire_date DATE NOT NULL,
  
  -- معلومات إضافية
  salary DECIMAL(10, 2),
  notes TEXT,
  
  -- الحالة
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'on_leave'
  
  -- التتبع
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- فهارس
  CONSTRAINT fk_building_staff FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE
);

-- 6. جدول المصروفات (Expenses Table)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ارتباط بالعمارة
  building_id UUID NOT NULL,
  
  -- معلومات المصروفة
  category VARCHAR(100) NOT NULL, -- 'maintenance', 'utilities', 'salary', 'cleaning', 'security', 'other'
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  expense_date DATE NOT NULL,
  
  -- معلومات الدفع
  payment_method VARCHAR(100), -- 'cash', 'bank_transfer', 'check'
  paid BOOLEAN DEFAULT FALSE,
  paid_date DATE,
  
  -- الوثائق
  receipt_url TEXT,
  notes TEXT,
  
  -- التتبع
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- فهارس
  CONSTRAINT fk_building_expenses FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE
);

-- 7. جدول الإيرادات (Income Table)
CREATE TABLE IF NOT EXISTS income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ارتباط بالعمارة
  building_id UUID NOT NULL,
  
  -- معلومات الإيراد
  category VARCHAR(100) NOT NULL, -- 'rent', 'sale', 'utility_fee', 'parking_fee', 'other'
  description TEXT,
  amount DECIMAL(15, 2) NOT NULL,
  income_date DATE NOT NULL,
  
  -- معلومات الدفع
  payment_method VARCHAR(100), -- 'cash', 'bank_transfer', 'check'
  received BOOLEAN DEFAULT FALSE,
  received_date DATE,
  
  -- ارتباطات إضافية
  unit_id UUID,
  related_sale_id UUID,
  
  -- التتبع
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- فهارس
  CONSTRAINT fk_building_income FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
  CONSTRAINT fk_unit_income FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
);

-- 8. جدول طلبات الصيانة (Maintenance Requests Table)
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ارتباط بالعمارة والوحدة
  building_id UUID NOT NULL,
  unit_id UUID,
  
  -- معلومات الطلب
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(50) DEFAULT 'normal', -- 'urgent', 'high', 'normal', 'low'
  category VARCHAR(100), -- 'electrical', 'plumbing', 'hvac', 'carpentry', 'general'
  
  -- الحالة
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'assigned', 'in_progress', 'completed', 'cancelled'
  assigned_to UUID, -- مرجع للموظف
  
  -- المواعيد
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_date DATE,
  completion_date DATE,
  
  -- التكاليف
  estimated_cost DECIMAL(15, 2),
  actual_cost DECIMAL(15, 2),
  
  -- معلومات إضافية
  notes TEXT,
  completion_notes TEXT,
  
  -- التتبع
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- فهارس
  CONSTRAINT fk_building_maint FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
  CONSTRAINT fk_unit_maint FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
);

-- 9. جدول سجل الأنشطة (Activity Log Table)
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ارتباط بالعمارة والمستخدم
  building_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  -- معلومات النشاط
  action_type VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'view', 'export'
  entity_type VARCHAR(100), -- 'building', 'unit', 'reservation', 'sale', 'expense', 'income'
  entity_id UUID,
  
  -- التفاصيل
  description TEXT,
  changes JSONB, -- تسجيل التغييرات
  ip_address VARCHAR(45),
  
  -- التتبع
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- فهارس
  CONSTRAINT fk_building_log FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_log FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 10. جدول الإخطارات (Notifications Table)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ارتباط بالمستخدم والعمارة
  user_id UUID NOT NULL,
  building_id UUID,
  
  -- محتوى الإخطار
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info', -- 'info', 'warning', 'error', 'success'
  
  -- الحالة
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- الارتباطات
  related_entity_type VARCHAR(100),
  related_entity_id UUID,
  
  -- التتبع
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- فهارس
  CONSTRAINT fk_user_notif FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_building_notif FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE SET NULL
);

-- ==========================================
-- الفهارس لتحسين الأداء
-- ==========================================

CREATE INDEX idx_buildings_owner_id ON buildings(owner_id);
CREATE INDEX idx_buildings_created_at ON buildings(created_at DESC);
CREATE INDEX idx_units_building_id ON units(building_id);
CREATE INDEX idx_units_status ON units(status);
CREATE INDEX idx_reservations_unit_id ON reservations(unit_id);
CREATE INDEX idx_reservations_building_id ON reservations(building_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_sales_unit_id ON sales(unit_id);
CREATE INDEX idx_sales_building_id ON sales(building_id);
CREATE INDEX idx_sales_date ON sales(sale_date DESC);
CREATE INDEX idx_staff_building_id ON staff(building_id);
CREATE INDEX idx_expenses_building_id ON expenses(building_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX idx_income_building_id ON income(building_id);
CREATE INDEX idx_income_date ON income(income_date DESC);
CREATE INDEX idx_maintenance_building_id ON maintenance_requests(building_id);
CREATE INDEX idx_maintenance_status ON maintenance_requests(status);
CREATE INDEX idx_activity_building_id ON activity_log(building_id);
CREATE INDEX idx_activity_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ==========================================
-- تفعيل Row Level Security (RLS)
-- ==========================================

ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- سياسات الأمان (Security Policies)
-- ==========================================

-- سياسة الوصول لجدول العماير (يمكن للمالك رؤية وتعديل عماره فقط)
CREATE POLICY "Users can view their own buildings" ON buildings
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create buildings" ON buildings
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own buildings" ON buildings
  FOR UPDATE USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete their own buildings" ON buildings
  FOR DELETE USING (owner_id = auth.uid());

-- سياسة الوصول لجدول الوحدات (مرتبطة برمز الوصول للعمارة الأب)
CREATE POLICY "Users can view units in their buildings" ON units
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM buildings WHERE buildings.id = units.building_id AND buildings.owner_id = auth.uid())
  );

CREATE POLICY "Users can create units in their buildings" ON units
  FOR INSERT WITH CHECK (
    EXISTS(SELECT 1 FROM buildings WHERE buildings.id = units.building_id AND buildings.owner_id = auth.uid())
  );

CREATE POLICY "Users can update units in their buildings" ON units
  FOR UPDATE USING (
    EXISTS(SELECT 1 FROM buildings WHERE buildings.id = units.building_id AND buildings.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS(SELECT 1 FROM buildings WHERE buildings.id = units.building_id AND buildings.owner_id = auth.uid())
  );

-- سياسات مماثلة للجداول الأخرى...
-- (يمكن إضافتها حسب الحاجة)

-- ==========================================
-- ملاحظات مهمة:
-- ==========================================
/*
1. تأكد من تشغيل هذا السكريبت في لوحة تحكم Supabase > SQL Editor
2. سيتم إنشاء جميع الجداول والفهارس والسياسات الأمنية تلقائياً
3. يمكنك تعديل أي جدول حسب احتياجات مشروعك
4. تأكد من أن خادم التخزين (Storage) يحتوي على bucket باسم 'building-images'
5. تفعيل RLS سيضمن أمان البيانات على مستوى الصف
6. يمكنك إضافة المزيد من السياسات حسب احتياجاتك
*/
