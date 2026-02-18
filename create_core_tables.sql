-- سكريبت إنشاء الجداول الأساسية إذا لم تكن موجودة
-- نفذ هذا السكريبت أولاً قبل سكريبت التعريب

CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  plot_number VARCHAR(100),
  neighborhood VARCHAR(255),
  address TEXT,
  description TEXT,
  phone VARCHAR(20),
  total_floors INTEGER DEFAULT 1,
  total_units INTEGER DEFAULT 0,
  reserved_units INTEGER DEFAULT 0,
  parking_slots INTEGER DEFAULT 0,
  driver_rooms INTEGER DEFAULT 0,
  elevators INTEGER DEFAULT 1,
  street_type VARCHAR(50) DEFAULT 'one',
  building_facing VARCHAR(50) DEFAULT 'north',
  year_built INTEGER,
  build_status VARCHAR(50) DEFAULT 'ready',
  deed_number VARCHAR(100),
  land_area DECIMAL(10, 2),
  building_license_number VARCHAR(100),
  insurance_available BOOLEAN DEFAULT FALSE,
  insurance_policy_number VARCHAR(100),
  has_main_water_meter BOOLEAN DEFAULT FALSE,
  water_meter_number VARCHAR(100),
  has_main_electricity_meter BOOLEAN DEFAULT FALSE,
  electricity_meter_number VARCHAR(100),
  guard_name VARCHAR(255),
  guard_phone VARCHAR(20),
  guard_room_number VARCHAR(50),
  guard_id_photo TEXT,
  guard_shift VARCHAR(50),
  guard_has_salary BOOLEAN DEFAULT FALSE,
  guard_salary_amount DECIMAL(15, 2),
  google_maps_link TEXT,
  image_urls TEXT[],
  floors_data JSONB,
  owner_association JSONB,
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL,
  unit_number VARCHAR(50) NOT NULL,
  floor INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'apartment',
  facing VARCHAR(50) DEFAULT 'front',
  area DECIMAL(8, 2) NOT NULL DEFAULT 0,
  rooms INTEGER DEFAULT 1,
  bathrooms INTEGER DEFAULT 1,
  living_rooms INTEGER DEFAULT 1,
  kitchens INTEGER DEFAULT 1,
  maid_room BOOLEAN DEFAULT FALSE,
  driver_room BOOLEAN DEFAULT FALSE,
  entrances INTEGER DEFAULT 1,
  ac_type VARCHAR(50) DEFAULT 'split',
  status VARCHAR(50) NOT NULL DEFAULT 'available',
  price DECIMAL(15, 2),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(building_id, unit_number)
);

CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL,
  building_id UUID NOT NULL,
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

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL,
  building_id UUID NOT NULL,
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

CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL,
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

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL,
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

CREATE TABLE IF NOT EXISTS income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  amount DECIMAL(15, 2) NOT NULL,
  income_date DATE NOT NULL,
  payment_method VARCHAR(100),
  received BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
