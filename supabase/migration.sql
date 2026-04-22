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
  status TEXT DEFAULT 'en_cuenta' CHECK (status IN ('confirmado', 'en_cuenta')),
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
