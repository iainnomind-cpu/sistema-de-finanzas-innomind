-- ============================================
-- INNOMIND FINAPP — Database Migration
-- Supabase PostgreSQL
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: partners (Socios)
-- ============================================
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  participation_pct NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  bank_account TEXT,
  monthly_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  salary_start_date DATE,
  salary_pay_day INTEGER DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: clients (Clientes)
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'empresa' CHECK (type IN ('empresa', 'persona_fisica')),
  sector TEXT,
  contact_name TEXT,
  rfc TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  state TEXT,
  classification TEXT DEFAULT 'activo' CHECK (classification IN ('recurrente', 'unico', 'activo', 'inactivo')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: categories (Categorías)
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ingreso', 'gasto')),
  color TEXT DEFAULT '#6366F1',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: projects (Proyectos)
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'desarrollo_custom' CHECK (type IN ('erp', 'crm', 'chatbot_ia', 'desarrollo_custom')),
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  start_date DATE,
  estimated_months INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'propuesta' CHECK (status IN ('propuesta', 'activo', 'en_entrega', 'completado', 'cancelado')),
  advance_amount NUMERIC(12,2) DEFAULT 0,
  advance_date DATE,
  advance_paid BOOLEAN DEFAULT false,
  balance_amount NUMERIC(12,2) DEFAULT 0,
  balance_due_date DATE,
  balance_paid BOOLEAN DEFAULT false,
  assigned_partner TEXT DEFAULT 'ambos' CHECK (assigned_partner IN ('socio_1', 'socio_2', 'ambos')),
  assigned_partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: income (Ingresos)
-- ============================================
CREATE TABLE IF NOT EXISTS income (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  concept TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'otro' CHECK (category IN ('anticipo_proyecto', 'saldo_proyecto', 'mensualidad_recurrente', 'consultoria', 'otro')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  payment_method TEXT DEFAULT 'transferencia' CHECK (payment_method IN ('transferencia', 'deposito', 'efectivo')),
  status TEXT DEFAULT 'cobrado' CHECK (status IN ('pendiente', 'cobrado')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: expenses (Gastos)
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  concept TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'variable' CHECK (type IN ('fijo', 'variable', 'socio', 'inversion', 'nomina')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  authorized_by UUID REFERENCES partners(id) ON DELETE SET NULL,
  receipt_url TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_day INTEGER,
  threshold_alert NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: receivables (Cuentas por Cobrar)
-- ============================================
CREATE TABLE IF NOT EXISTS receivables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'parcial', 'cobrada', 'cancelada')),
  partial_amount NUMERIC(12,2) DEFAULT 0,
  days_overdue INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: cash_movements (Flujo de Caja)
-- ============================================
CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL CHECK (type IN ('entrada', 'salida')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  description TEXT,
  category TEXT,
  resulting_balance NUMERIC(12,2) DEFAULT 0,
  source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('income', 'expense', 'manual')),
  source_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: salaries (Nómina)
-- ============================================
CREATE TABLE IF NOT EXISTS salaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_date DATE,
  type TEXT DEFAULT 'sueldo' CHECK (type IN ('sueldo', 'retiro_extraordinario')),
  justification TEXT,
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: goals (Metas)
-- ============================================
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sueldo_objetivo', 'fondo_minimo', 'pct_recurrentes', 'proyectos_minimos')),
  target_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_value NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: projections_config (Proyecciones)
-- ============================================
CREATE TABLE IF NOT EXISTS projections_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  scenario_type TEXT NOT NULL CHECK (scenario_type IN ('conservador', 'base', 'optimista')),
  monthly_income_estimate NUMERIC(12,2) DEFAULT 0,
  monthly_growth_rate NUMERIC(5,2) DEFAULT 0,
  fixed_expenses NUMERIC(12,2) DEFAULT 0,
  projection_months INTEGER DEFAULT 12,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: alerts (Alertas)
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fondo_bajo', 'cxc_vencida', 'utilidad_negativa', 'nomina_pendiente', 'proyecto_sin_actualizacion')),
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  is_read BOOLEAN DEFAULT false,
  related_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE projections_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for all tables
-- Users can only access their own data

-- Partners
CREATE POLICY "Users can view own partners" ON partners FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own partners" ON partners FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own partners" ON partners FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own partners" ON partners FOR DELETE USING (auth.uid() = user_id);

-- Clients
CREATE POLICY "Users can view own clients" ON clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clients" ON clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clients" ON clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clients" ON clients FOR DELETE USING (auth.uid() = user_id);

-- Categories
CREATE POLICY "Users can view own categories" ON categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON categories FOR DELETE USING (auth.uid() = user_id);

-- Projects
CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

-- Income
CREATE POLICY "Users can view own income" ON income FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own income" ON income FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own income" ON income FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own income" ON income FOR DELETE USING (auth.uid() = user_id);

-- Expenses
CREATE POLICY "Users can view own expenses" ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON expenses FOR DELETE USING (auth.uid() = user_id);

-- Receivables
CREATE POLICY "Users can view own receivables" ON receivables FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own receivables" ON receivables FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own receivables" ON receivables FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own receivables" ON receivables FOR DELETE USING (auth.uid() = user_id);

-- Cash Movements
CREATE POLICY "Users can view own cash_movements" ON cash_movements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cash_movements" ON cash_movements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cash_movements" ON cash_movements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cash_movements" ON cash_movements FOR DELETE USING (auth.uid() = user_id);

-- Salaries
CREATE POLICY "Users can view own salaries" ON salaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own salaries" ON salaries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own salaries" ON salaries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own salaries" ON salaries FOR DELETE USING (auth.uid() = user_id);

-- Goals
CREATE POLICY "Users can view own goals" ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON goals FOR DELETE USING (auth.uid() = user_id);

-- Projections Config
CREATE POLICY "Users can view own projections" ON projections_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projections" ON projections_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projections" ON projections_config FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projections" ON projections_config FOR DELETE USING (auth.uid() = user_id);

-- Alerts
CREATE POLICY "Users can view own alerts" ON alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alerts" ON alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON alerts FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_income_date ON income(date);
CREATE INDEX idx_income_client ON income(client_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_type ON expenses(type);
CREATE INDEX idx_receivables_status ON receivables(status);
CREATE INDEX idx_receivables_due_date ON receivables(due_date);
CREATE INDEX idx_cash_movements_date ON cash_movements(date);
CREATE INDEX idx_salaries_partner ON salaries(partner_id);
CREATE INDEX idx_alerts_user_read ON alerts(user_id, is_read);

-- ============================================
-- Updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_receivables_updated_at BEFORE UPDATE ON receivables FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_projections_updated_at BEFORE UPDATE ON projections_config FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Profit First / Distribution Module
-- ============================================

-- Table: distribution_config
CREATE TABLE IF NOT EXISTS distribution_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bucket_salary NUMERIC(5,2) NOT NULL DEFAULT 35.00,
  bucket_reserve NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  bucket_profit  NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  bucket_opex    NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  bucket_tax     NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  reserve_goal   NUMERIC(12,2) NOT NULL DEFAULT 75000.00,
  profit_payout_month INTEGER NOT NULL DEFAULT 12,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT buckets_sum_100 CHECK (
    bucket_salary + bucket_reserve + bucket_profit + bucket_opex + bucket_tax = 100
  )
);

-- Table: distribution_events
CREATE TABLE IF NOT EXISTS distribution_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  income_id UUID REFERENCES income(id) ON DELETE CASCADE NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  amount_salary NUMERIC(12,2) NOT NULL,
  amount_reserve NUMERIC(12,2) NOT NULL,
  amount_profit  NUMERIC(12,2) NOT NULL,
  amount_opex    NUMERIC(12,2) NOT NULL,
  amount_tax     NUMERIC(12,2) NOT NULL,
  config_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: bucket_balances
CREATE TABLE IF NOT EXISTS bucket_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bucket_name TEXT NOT NULL,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_in NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_out NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, bucket_name)
);

-- Table: bucket_withdrawals
CREATE TABLE IF NOT EXISTS bucket_withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bucket_name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  concept TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE distribution_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own distribution_config" ON distribution_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own distribution_config" ON distribution_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own distribution_config" ON distribution_config FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE distribution_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own distribution_events" ON distribution_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own distribution_events" ON distribution_events FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE bucket_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own bucket_balances" ON bucket_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own bucket_balances" ON bucket_balances FOR UPDATE USING (auth.uid() = user_id);
-- Insert via triggers/functions

ALTER TABLE bucket_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own bucket_withdrawals" ON bucket_withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bucket_withdrawals" ON bucket_withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_dist_config_updated_at BEFORE UPDATE ON distribution_config FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger to init default distribution config and buckets on new user
CREATE OR REPLACE FUNCTION handle_new_user_distribution()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO distribution_config (user_id) VALUES (NEW.id);
  INSERT INTO bucket_balances (user_id, bucket_name, balance) VALUES
    (NEW.id, 'salary', 0),
    (NEW.id, 'reserve', 0),
    (NEW.id, 'profit', 0),
    (NEW.id, 'opex', 0),
    (NEW.id, 'tax', 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: We assume auth.users trigger exists or we attach it here
DROP TRIGGER IF EXISTS on_auth_user_created_dist ON auth.users;
CREATE TRIGGER on_auth_user_created_dist
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_distribution();

-- RPC for Income Distribution
CREATE OR REPLACE FUNCTION distribute_income(p_income_id UUID, p_amount NUMERIC, p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config RECORD;
  v_salary NUMERIC;
  v_reserve NUMERIC;
  v_profit NUMERIC;
  v_opex NUMERIC;
  v_tax NUMERIC;
  v_distributed NUMERIC;
  v_diff NUMERIC;
BEGIN
  -- Get active config
  SELECT * INTO v_config
  FROM distribution_config
  WHERE user_id = p_user_id AND is_active = true
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active distribution config found for user';
  END IF;

  -- Calculate amounts
  v_salary := ROUND((p_amount * v_config.bucket_salary / 100.0), 2);
  v_reserve := ROUND((p_amount * v_config.bucket_reserve / 100.0), 2);
  v_profit := ROUND((p_amount * v_config.bucket_profit / 100.0), 2);
  v_opex := ROUND((p_amount * v_config.bucket_opex / 100.0), 2);
  v_tax := ROUND((p_amount * v_config.bucket_tax / 100.0), 2);

  v_distributed := v_salary + v_reserve + v_profit + v_opex + v_tax;
  v_diff := p_amount - v_distributed;
  
  -- Adjust rounding to salary
  v_salary := v_salary + v_diff;

  -- Insert event
  INSERT INTO distribution_events (
    user_id, income_id, total_amount, amount_salary, amount_reserve, 
    amount_profit, amount_opex, amount_tax, config_snapshot
  ) VALUES (
    p_user_id, p_income_id, p_amount, v_salary, v_reserve, 
    v_profit, v_opex, v_tax, row_to_json(v_config)::jsonb
  );

  -- Update balances
  UPDATE bucket_balances SET balance = balance + v_salary, total_in = total_in + v_salary, updated_at = NOW() WHERE user_id = p_user_id AND bucket_name = 'salary';
  UPDATE bucket_balances SET balance = balance + v_reserve, total_in = total_in + v_reserve, updated_at = NOW() WHERE user_id = p_user_id AND bucket_name = 'reserve';
  UPDATE bucket_balances SET balance = balance + v_profit, total_in = total_in + v_profit, updated_at = NOW() WHERE user_id = p_user_id AND bucket_name = 'profit';
  UPDATE bucket_balances SET balance = balance + v_opex, total_in = total_in + v_opex, updated_at = NOW() WHERE user_id = p_user_id AND bucket_name = 'opex';
  UPDATE bucket_balances SET balance = balance + v_tax, total_in = total_in + v_tax, updated_at = NOW() WHERE user_id = p_user_id AND bucket_name = 'tax';

END;
$$;

-- ============================================
-- Módulo de Gestión de IVA
-- ============================================

ALTER TABLE income
  ADD COLUMN IF NOT EXISTS has_invoice BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS iva_rate NUMERIC(5,4) NOT NULL DEFAULT 0.16,
  ADD COLUMN IF NOT EXISTS iva_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS base_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS total_amount_with_iva NUMERIC(12,2);

-- Migración de datos existentes
UPDATE income
SET
  has_invoice = false,
  iva_rate = 0,
  iva_amount = 0,
  base_amount = amount,
  total_amount_with_iva = amount
WHERE base_amount IS NULL;

CREATE TABLE IF NOT EXISTS iva_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('collected', 'paid_to_sat', 'adjustment')),
  amount NUMERIC(12,2) NOT NULL,
  income_id UUID REFERENCES income(id) ON DELETE SET NULL,
  concept TEXT NOT NULL,
  period_month INTEGER,
  period_year INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS iva_balance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_collected NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS iva_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  default_iva_rate NUMERIC(5,4) NOT NULL DEFAULT 0.16,
  declaration_day INTEGER NOT NULL DEFAULT 17,
  alert_days_before INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE iva_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own iva_movements" ON iva_movements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own iva_movements" ON iva_movements FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE iva_balance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own iva_balance" ON iva_balance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own iva_balance" ON iva_balance FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE iva_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own iva_config" ON iva_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own iva_config" ON iva_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own iva_config" ON iva_config FOR UPDATE USING (auth.uid() = user_id);

-- Actualizar trigger existente de usuario nuevo para que también cree configuración y balance de IVA
CREATE OR REPLACE FUNCTION handle_new_user_distribution()
RETURNS TRIGGER AS $$
BEGIN
  -- Profit First
  INSERT INTO distribution_config (user_id) VALUES (NEW.id);
  INSERT INTO bucket_balances (user_id, bucket_name, balance) VALUES
    (NEW.id, 'salary', 0),
    (NEW.id, 'reserve', 0),
    (NEW.id, 'profit', 0),
    (NEW.id, 'opex', 0),
    (NEW.id, 'tax', 0);
    
  -- IVA
  INSERT INTO iva_config (user_id) VALUES (NEW.id);
  INSERT INTO iva_balance (user_id, balance, total_collected, total_paid) VALUES (NEW.id, 0, 0, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPCs para transacciones atómicas
CREATE OR REPLACE FUNCTION separate_iva(p_income_id UUID, p_iva_amount NUMERIC, p_base_amount NUMERIC, p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now_month INTEGER;
  v_now_year INTEGER;
BEGIN
  v_now_month := EXTRACT(MONTH FROM NOW());
  v_now_year := EXTRACT(YEAR FROM NOW());

  -- Insertar movimiento
  INSERT INTO iva_movements (
    user_id, type, amount, income_id, concept, period_month, period_year
  ) VALUES (
    p_user_id, 'collected', p_iva_amount, p_income_id, 
    'IVA separado — ingreso de $' || TO_CHAR(p_base_amount, 'FM99,999,999.00'),
    v_now_month, v_now_year
  );

  -- Actualizar balance
  UPDATE iva_balance 
  SET balance = balance + p_iva_amount, 
      total_collected = total_collected + p_iva_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;

END;
$$;

CREATE OR REPLACE FUNCTION pay_iva_sat(p_amount NUMERIC, p_period_month INTEGER, p_period_year INTEGER, p_notes TEXT, p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insertar movimiento
  INSERT INTO iva_movements (
    user_id, type, amount, concept, period_month, period_year, notes
  ) VALUES (
    p_user_id, 'paid_to_sat', p_amount, 
    'Declaración IVA ' || p_period_month || '/' || p_period_year,
    p_period_month, p_period_year, p_notes
  );

  -- Actualizar balance
  UPDATE iva_balance 
  SET balance = balance - p_amount, 
      total_paid = total_paid + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;

END;
$$;

 
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 - -   T a b l e :   c l i e n t _ d o c u m e n t s   ( D o c u m e n t o s   d e   C l i e n t e ) 
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 C R E A T E   T A B L E   I F   N O T   E X I S T S   c l i e n t _ d o c u m e n t s   ( 
     i d   U U I D   P R I M A R Y   K E Y   D E F A U L T   u u i d _ g e n e r a t e _ v 4 ( ) , 
     u s e r _ i d   U U I D   R E F E R E N C E S   a u t h . u s e r s ( i d )   O N   D E L E T E   C A S C A D E   N O T   N U L L , 
     c l i e n t _ i d   U U I D   R E F E R E N C E S   c l i e n t s ( i d )   O N   D E L E T E   C A S C A D E   N O T   N U L L , 
     n a m e   T E X T   N O T   N U L L , 
     f i l e _ u r l   T E X T   N O T   N U L L , 
     f i l e _ t y p e   T E X T , 
     f i l e _ s i z e   I N T E G E R , 
     c r e a t e d _ a t   T I M E S T A M P T Z   D E F A U L T   N O W ( ) 
 ) ; 
 
 A L T E R   T A B L E   c l i e n t _ d o c u m e n t s   E N A B L E   R O W   L E V E L   S E C U R I T Y ; 
 C R E A T E   P O L I C Y   \  
 U s e r s  
 c a n  
 v i e w  
 o w n  
 c l i e n t _ d o c u m e n t s \   O N   c l i e n t _ d o c u m e n t s   F O R   S E L E C T   U S I N G   ( a u t h . u i d ( )   =   u s e r _ i d ) ; 
 C R E A T E   P O L I C Y   \ U s e r s  
 c a n  
 i n s e r t  
 o w n  
 c l i e n t _ d o c u m e n t s \   O N   c l i e n t _ d o c u m e n t s   F O R   I N S E R T   W I T H   C H E C K   ( a u t h . u i d ( )   =   u s e r _ i d ) ; 
 C R E A T E   P O L I C Y   \ U s e r s  
 c a n  
 d e l e t e  
 o w n  
 c l i e n t _ d o c u m e n t s \   O N   c l i e n t _ d o c u m e n t s   F O R   D E L E T E   U S I N G   ( a u t h . u i d ( )   =   u s e r _ i d ) ; 
 
  
 