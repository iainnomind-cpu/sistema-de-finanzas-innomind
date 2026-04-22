// TypeScript types for the Innomind FinApp database

export type Partner = {
  id: string;
  user_id: string;
  name: string;
  participation_pct: number;
  bank_account: string | null;
  monthly_salary: number;
  salary_start_date: string | null;
  salary_pay_day: number;
  created_at: string;
  updated_at: string;
};

export type Client = {
  id: string;
  user_id: string;
  name: string;
  type: 'empresa' | 'persona_fisica';
  sector: string | null;
  contact_name: string | null;
  rfc: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  classification: 'recurrente' | 'unico' | 'activo' | 'inactivo';
  created_at: string;
  updated_at: string;
};

export type ProjectStatus = 'propuesta' | 'activo' | 'en_entrega' | 'completado' | 'cancelado';
export type ProjectType = 'erp' | 'crm' | 'chatbot_ia' | 'desarrollo_custom';

export type Project = {
  id: string;
  user_id: string;
  client_id: string;
  name: string;
  type: ProjectType;
  total_amount: number;
  start_date: string | null;
  estimated_months: number;
  status: ProjectStatus;
  advance_amount: number;
  advance_date: string | null;
  advance_paid: boolean;
  balance_amount: number;
  balance_due_date: string | null;
  balance_paid: boolean;
  assigned_partner: 'socio_1' | 'socio_2' | 'ambos';
  assigned_partner_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client?: Client;
  partner?: Partner;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  type: 'ingreso' | 'gasto';
  color: string | null;
  is_default: boolean;
  created_at: string;
};

export type IncomeCategory = 'anticipo_proyecto' | 'saldo_proyecto' | 'mensualidad_recurrente' | 'consultoria' | 'otro';

export type Income = {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  concept: string;
  category: IncomeCategory;
  category_id: string | null;
  client_id: string | null;
  project_id: string | null;
  payment_method: 'transferencia' | 'deposito' | 'efectivo';
  status: 'pendiente' | 'cobrado';
  has_invoice: boolean;
  iva_rate: number;
  iva_amount: number;
  base_amount: number | null;
  total_amount_with_iva: number | null;
  created_at: string;
  // Joined
  client?: Client;
  project?: Project;
};

export type ExpenseType = 'fijo' | 'variable' | 'socio' | 'inversion' | 'nomina';

export type Expense = {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  concept: string;
  type: ExpenseType;
  category_id: string | null;
  authorized_by: string | null;
  receipt_url: string | null;
  is_recurring: boolean;
  recurring_day: number | null;
  threshold_alert: number | null;
  created_at: string;
  // Joined
  category?: Category;
  authorizer?: Partner;
};

export type ReceivableStatus = 'pendiente' | 'parcial' | 'cobrada' | 'cancelada';

export type Receivable = {
  id: string;
  user_id: string;
  client_id: string;
  project_id: string | null;
  amount: number;
  due_date: string;
  status: ReceivableStatus;
  partial_amount: number;
  days_overdue: number;
  created_at: string;
  updated_at: string;
  // Joined
  client?: Client;
  project?: Project;
};

export type CashMovement = {
  id: string;
  user_id: string;
  date: string;
  type: 'entrada' | 'salida';
  amount: number;
  description: string;
  category: string | null;
  resulting_balance: number;
  source_type: 'income' | 'expense' | 'manual';
  source_id: string | null;
  created_at: string;
};

export type SalaryType = 'sueldo' | 'retiro_extraordinario';

export type Salary = {
  id: string;
  user_id: string;
  partner_id: string;
  month: number;
  year: number;
  amount: number;
  payment_date: string | null;
  type: SalaryType;
  justification: string | null;
  expense_id: string | null;
  created_at: string;
  // Joined
  partner?: Partner;
};

export type GoalType = 'sueldo_objetivo' | 'fondo_minimo' | 'pct_recurrentes' | 'proyectos_minimos';

export type Goal = {
  id: string;
  user_id: string;
  type: GoalType;
  target_value: number;
  current_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ScenarioType = 'conservador' | 'base' | 'optimista';

export type ProjectionConfig = {
  id: string;
  user_id: string;
  name: string;
  scenario_type: ScenarioType;
  monthly_income_estimate: number;
  monthly_growth_rate: number;
  fixed_expenses: number;
  projection_months: number;
  created_at: string;
  updated_at: string;
};

export type AlertType = 'fondo_bajo' | 'cxc_vencida' | 'utilidad_negativa' | 'nomina_pendiente' | 'proyecto_sin_actualizacion';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export type Alert = {
  id: string;
  user_id: string;
  type: AlertType;
  message: string;
  severity: AlertSeverity;
  is_read: boolean;
  related_id: string | null;
  created_at: string;
};

// --- Distribution (Profit First) Types ---

export type DistributionConfig = {
  id: string;
  user_id: string;
  bucket_salary: number;
  bucket_reserve: number;
  bucket_profit: number;
  bucket_opex: number;
  bucket_tax: number;
  reserve_goal: number;
  profit_payout_month: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DistributionEvent = {
  id: string;
  user_id: string;
  income_id: string;
  total_amount: number;
  amount_salary: number;
  amount_reserve: number;
  amount_profit: number;
  amount_opex: number;
  amount_tax: number;
  config_snapshot: any;
  created_at: string;
  // Joined
  income?: Income;
};

export type BucketBalance = {
  id: string;
  user_id: string;
  bucket_name: 'salary' | 'reserve' | 'profit' | 'opex' | 'tax';
  balance: number;
  total_in: number;
  total_out: number;
  updated_at: string;
};

export type BucketWithdrawal = {
  id: string;
  user_id: string;
  bucket_name: 'salary' | 'reserve' | 'profit' | 'opex' | 'tax';
  amount: number;
  concept: string;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
};

// --- IVA Management Types ---

export type IvaMovementType = 'collected' | 'paid_to_sat' | 'adjustment';

export type IvaMovement = {
  id: string;
  user_id: string;
  type: IvaMovementType;
  amount: number;
  income_id: string | null;
  concept: string;
  period_month: number | null;
  period_year: number | null;
  notes: string | null;
  created_at: string;
  // Joined
  income?: Income;
};

export type IvaBalance = {
  id: string;
  user_id: string;
  balance: number;
  total_collected: number;
  total_paid: number;
  updated_at: string;
};

export type IvaConfig = {
  id: string;
  user_id: string;
  default_iva_rate: number;
  declaration_day: number;
  alert_days_before: number;
  is_active: boolean;
  created_at: string;
};
