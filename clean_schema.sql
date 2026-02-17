-- ==========================================
-- سكريبت نظيف لإنشاء الجداول
-- Clean Script for Creating Tables
-- ==========================================

-- 1. جدول العماير
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  plot_number VARCHAR(100),
  neighborhood VARCHAR(255),
  address TEXT,
  description TEXT,
  total_floors INTEGER DEFAULT 1,
  total_units INTEGER DEFAULT 0,
  reserved_units INTEGER DEFAULT 0,
  parking_slots INTEGER DEFAULT 0,
  driver_rooms INTEGER DEFAULT 0,
  elevators INTEGER DEFAULT 1,
  street_type VARCHAR(50) DEFAULT 'one',
  building_facing VARCHAR(50) DEFAULT 'north',
  year_built INTEGER,
  phone VARCHAR(20),
  
  -- حالة البناء ومعلومات البناء
  build_status VARCHAR(50) DEFAULT 'ready',
  deed_number VARCHAR(100),
  land_area DECIMAL(10, 2),
  building_license_number VARCHAR(100),
  
  -- معلومات التأمين
  insurance_available BOOLEAN DEFAULT FALSE,
  insurance_policy_number VARCHAR(100),
  
  -- عدادات المياه والكهرباء
  has_main_water_meter BOOLEAN DEFAULT FALSE,
  water_meter_number VARCHAR(100),
  has_main_electricity_meter BOOLEAN DEFAULT FALSE,
  electricity_meter_number VARCHAR(100),
  
  -- معلومات الحارس
  guard_name VARCHAR(255),
  guard_phone VARCHAR(20),
  guard_room_number VARCHAR(50),
  guard_id_photo TEXT,
  guard_shift VARCHAR(50),
  guard_has_salary BOOLEAN DEFAULT FALSE,
  guard_salary_amount DECIMAL(15, 2),
  
  -- الموقع
  google_maps_link TEXT,
  
  -- بيانات إضافية
  image_urls TEXT[],
  floors_data JSONB,
  owner_association JSONB, -- يحتوي على hasAssociation, startDate, endDate, monthlyFee, contactNumber, managerName, registrationNumber, registeredUnitsCount, iban, accountNumber, includesElectricity, includesWater
  
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. جدول الوحدات
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  unit_number VARCHAR(50) NOT NULL,
  floor INTEGER NOT NULL,
  type VARCHAR(50) DEFAULT 'apartment',
  facing VARCHAR(50) DEFAULT 'front', -- front, back, corner
  area DECIMAL(8, 2) DEFAULT 0,
  rooms INTEGER DEFAULT 1,
  bathrooms INTEGER DEFAULT 1,
  living_rooms INTEGER DEFAULT 1,
  kitchens INTEGER DEFAULT 1,
  maid_room BOOLEAN DEFAULT FALSE,
  driver_room BOOLEAN DEFAULT FALSE,
  entrances INTEGER DEFAULT 1,
  ac_type VARCHAR(50) DEFAULT 'split',
  status VARCHAR(50) DEFAULT 'available',
  price DECIMAL(15, 2),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(building_id, unit_number)
);

-- 3. جدول الحجوزات
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20) NOT NULL,
  reservation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  deposit_amount DECIMAL(15, 2),
  deposit_paid BOOLEAN DEFAULT FALSE,
  deposit_paid_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. جدول المبيعات
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  buyer_name VARCHAR(255) NOT NULL,
  buyer_email VARCHAR(255),
  buyer_phone VARCHAR(20),
  buyer_id_number VARCHAR(20),
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sale_price DECIMAL(15, 2) NOT NULL,
  payment_method VARCHAR(100),
  down_payment DECIMAL(15, 2),
  remaining_payment DECIMAL(15, 2),
  payment_status VARCHAR(50) DEFAULT 'pending',
  contract_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. جدول الموظفين
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  id_number VARCHAR(20) NOT NULL,
  position VARCHAR(100) NOT NULL,
  shift VARCHAR(50) DEFAULT 'day',
  hire_date DATE NOT NULL,
  salary DECIMAL(10, 2),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. جدول المصروفات
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  expense_date DATE NOT NULL,
  payment_method VARCHAR(100),
  paid BOOLEAN DEFAULT FALSE,
  paid_date DATE,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. جدول الإيرادات
CREATE TABLE income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  amount DECIMAL(15, 2) NOT NULL,
  income_date DATE NOT NULL,
  payment_method VARCHAR(100),
  received BOOLEAN DEFAULT FALSE,
  received_date DATE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  related_sale_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. جدول طلبات الصيانة
CREATE TABLE maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(50) DEFAULT 'normal',
  category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  assigned_to UUID,
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_date DATE,
  completion_date DATE,
  estimated_cost DECIMAL(15, 2),
  actual_cost DECIMAL(15, 2),
  notes TEXT,
  completion_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. جدول سجل الأنشطة
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  description TEXT,
  changes JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. جدول الإخطارات
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  related_entity_type VARCHAR(100),
  related_entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- الفهارس
-- ==========================================

CREATE INDEX idx_buildings_owner_id ON buildings(owner_id);
CREATE INDEX idx_buildings_created_at ON buildings(created_at DESC);
CREATE INDEX idx_units_building_id ON units(building_id);
CREATE INDEX idx_units_status ON units(status);
CREATE INDEX idx_reservations_building_id ON reservations(building_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_sales_building_id ON sales(building_id);
CREATE INDEX idx_staff_building_id ON staff(building_id);
CREATE INDEX idx_expenses_building_id ON expenses(building_id);
CREATE INDEX idx_income_building_id ON income(building_id);
CREATE INDEX idx_maintenance_building_id ON maintenance_requests(building_id);
CREATE INDEX idx_activity_building_id ON activity_log(building_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- ==========================================
-- تفعيل Row Level Security
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
-- سياسات الأمان
-- ==========================================

CREATE POLICY "Users view own buildings" ON buildings
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users create buildings" ON buildings
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users update own buildings" ON buildings
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users delete own buildings" ON buildings
  FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "Users view own units" ON units
  FOR SELECT USING (EXISTS(SELECT 1 FROM buildings WHERE id = building_id AND owner_id = auth.uid()));

CREATE POLICY "Users manage own reservations" ON reservations
  FOR ALL USING (EXISTS(SELECT 1 FROM buildings WHERE id = building_id AND owner_id = auth.uid()));

CREATE POLICY "Users manage own sales" ON sales
  FOR ALL USING (EXISTS(SELECT 1 FROM buildings WHERE id = building_id AND owner_id = auth.uid()));

CREATE POLICY "Users manage own staff" ON staff
  FOR ALL USING (EXISTS(SELECT 1 FROM buildings WHERE id = building_id AND owner_id = auth.uid()));

CREATE POLICY "Users manage own expenses" ON expenses
  FOR ALL USING (EXISTS(SELECT 1 FROM buildings WHERE id = building_id AND owner_id = auth.uid()));

CREATE POLICY "Users manage own income" ON income
  FOR ALL USING (EXISTS(SELECT 1 FROM buildings WHERE id = building_id AND owner_id = auth.uid()));

CREATE POLICY "Users manage own maintenance" ON maintenance_requests
  FOR ALL USING (EXISTS(SELECT 1 FROM buildings WHERE id = building_id AND owner_id = auth.uid()));

CREATE POLICY "Users view own activity" ON activity_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());
