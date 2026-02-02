-- Schema inicial para la aplicación POS

-- Categorías de productos
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Productos
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  has_inventory_control BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Empleados
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  daily_pay_base DECIMAL(10, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ventas
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  items JSONB NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  cash_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  transfer_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('cash', 'transfer', 'mixed')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by TEXT
);

-- Gastos
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Pagos a empleados
CREATE TABLE IF NOT EXISTS employee_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  employee_name TEXT NOT NULL,
  position TEXT NOT NULL,
  base_amount DECIMAL(10, 2) NOT NULL,
  final_amount DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Cierres diarios
CREATE TABLE IF NOT EXISTS daily_closures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  sales JSONB NOT NULL,
  total_sales DECIMAL(10, 2) NOT NULL,
  total_cash DECIMAL(10, 2) NOT NULL,
  total_transfer DECIMAL(10, 2) NOT NULL,
  expenses JSONB NOT NULL,
  total_expenses DECIMAL(10, 2) NOT NULL,
  employee_payments JSONB NOT NULL,
  total_payments DECIMAL(10, 2) NOT NULL,
  low_stock_products JSONB NOT NULL,
  daily_base DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(date)
);

-- Configuración del sistema
CREATE TABLE IF NOT EXISTS system_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  top_n INTEGER NOT NULL DEFAULT 10,
  alert_email TEXT,
  business_name TEXT NOT NULL DEFAULT 'Mi Restaurante',
  business_address TEXT,
  business_phone TEXT,
  business_nit TEXT,
  daily_base DECIMAL(10, 2) NOT NULL DEFAULT 500,
  reopen_password TEXT NOT NULL DEFAULT '1234',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insertar configuración inicial
INSERT INTO system_config (id, top_n, business_name, daily_base, reopen_password)
VALUES ('11111111-1111-1111-1111-111111111111', 10, 'Mi Restaurante', 500, '1234')
ON CONFLICT (id) DO NOTHING;

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);
CREATE INDEX IF NOT EXISTS idx_daily_closures_date ON daily_closures(date);