// Tipos escritos a mano para las tablas que ya usa la app.
// En cuanto el proyecto de Supabase esté creado, reemplaza este archivo con el
// resultado real de: npx supabase gen types typescript --project-id <id> > src/types/db.ts

export type TransactionKind = 'gasto' | 'ingreso';
export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';
export type TransactionNaturaleza = 'fijo' | 'variable';
export type ScheduledExpenseStatus = 'pendiente' | 'pagado';
export type SubscriptionPlan = 'personal' | 'premium' | 'familiar';

export interface CategoryRow {
  id: string;
  label: string;
  subcategories: string[];
  sort_order: number;
}

export interface TransactionRow {
  id: string;
  household_id: string;
  member_id: string | null;
  kind: TransactionKind;
  monto: number;
  descripcion: string;
  occurred_on: string; // date (YYYY-MM-DD)
  medio: PaymentMethod | null;
  category_id: string | null;
  subcategoria: string | null;
  naturaleza: TransactionNaturaleza | null;
  esencial: boolean | null;
  fuente: string | null;
  frecuencia: string | null;
  origin_scheduled_expense_id: string | null;
  created_at: string;
}

export interface TransactionInsert {
  household_id: string;
  member_id?: string | null;
  kind: TransactionKind;
  monto: number;
  descripcion: string;
  occurred_on: string;
  medio?: PaymentMethod | null;
  category_id?: string | null;
  subcategoria?: string | null;
  naturaleza?: TransactionNaturaleza | null;
  esencial?: boolean | null;
  fuente?: string | null;
  frecuencia?: string | null;
  origin_scheduled_expense_id?: string | null;
}

export interface HouseholdRow {
  id: string;
  plan: SubscriptionPlan;
  monthly_budget_total: number;
  wallet_initial_balance: number;
}

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

export interface SubscriptionRow {
  id: string;
  household_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  payment_provider: string | null;
  provider_reference: string | null;
  current_period_end: string | null;
  created_at: string;
}
export interface SubscriptionInsert {
  household_id: string;
  plan: SubscriptionPlan;
  status?: SubscriptionStatus;
  payment_provider?: string | null;
  provider_reference?: string | null;
  current_period_end?: string | null;
}

export interface HouseholdMemberRow {
  id: string;
  household_id: string;
  user_id: string | null;
  display_name: string;
  role: 'owner' | 'member';
}

export interface UserPreferencesRow {
  user_id: string;
  nombre_usuario: string | null;
  moneda: string;
  idioma: string;
  pais: string;
  tono_notificacion: 'sonido' | 'vibracion' | 'silencioso';
}

export interface CategoryBudgetRow {
  id: string;
  household_id: string;
  category_id: string;
  monthly_limit: number;
}
export interface CategoryBudgetInsert {
  household_id: string;
  category_id: string;
  monthly_limit: number;
}

export type WalletMovementType = 'entrada' | 'salida' | 'transferencia_a_banco' | 'transferencia_de_banco';

export interface WalletMovementRow {
  id: string;
  household_id: string;
  member_id: string | null;
  tipo: WalletMovementType;
  monto: number;
  descripcion: string | null;
  occurred_on: string;
  created_at: string;
}
export interface WalletMovementInsert {
  household_id: string;
  member_id?: string | null;
  tipo: WalletMovementType;
  monto: number;
  descripcion?: string | null;
  occurred_on?: string;
}

export interface GoalRow {
  id: string;
  household_id: string;
  nombre: string;
  target_amount: number;
  current_amount: number;
  created_at: string;
}
export interface GoalInsert {
  household_id: string;
  nombre: string;
  target_amount: number;
  current_amount?: number;
}

export interface GoalContributionRow {
  id: string;
  goal_id: string;
  monto: number;
  occurred_on: string;
  created_at: string;
}
export interface GoalContributionInsert {
  goal_id: string;
  monto: number;
  occurred_on?: string;
}

export interface DebtRow {
  id: string;
  household_id: string;
  nombre: string;
  saldo: number;
  cuota_mensual: number;
  tasa_anual: number;
  created_at: string;
}
export interface DebtInsert {
  household_id: string;
  nombre: string;
  saldo: number;
  cuota_mensual: number;
  tasa_anual?: number;
}

export interface ScheduledExpenseRow {
  id: string;
  household_id: string;
  descripcion: string;
  category_id: string | null;
  monto: number;
  fecha_pago: string;
  fecha_recordatorio: string | null;
  metodo_pago: PaymentMethod;
  status: ScheduledExpenseStatus;
  created_at: string;
}
export interface ScheduledExpenseInsert {
  household_id: string;
  descripcion: string;
  category_id?: string | null;
  monto: number;
  fecha_pago: string;
  fecha_recordatorio?: string | null;
  metodo_pago?: PaymentMethod;
  status?: ScheduledExpenseStatus;
}

export interface CalendarEventRow {
  id: string;
  household_id: string;
  titulo: string;
  event_date: string;
  event_time: string | null;
  created_at: string;
}
export interface CalendarEventInsert {
  household_id: string;
  titulo: string;
  event_date: string;
  event_time?: string | null;
}

export type BankAccountStatus = 'sincronizado' | 'error' | 'desconectado';

export interface BankAccountRow {
  id: string;
  household_id: string;
  banco: string;
  ultimos4: string | null;
  numero_cuenta: string | null;
  status: BankAccountStatus;
  provider: string;
  created_at: string;
}
export interface BankAccountInsert {
  household_id: string;
  banco: string;
  ultimos4?: string | null;
  numero_cuenta?: string | null;
  status?: BankAccountStatus;
  provider?: string;
}

export type ReferralStatus = 'pendiente' | 'activo';

export interface ReferralRow {
  id: string;
  household_id: string;
  referred_name: string;
  status: ReferralStatus;
  created_at: string;
}
export interface ReferralInsert {
  household_id: string;
  referred_name: string;
  status?: ReferralStatus;
}

export interface ReconciliationRunRow {
  id: string;
  household_id: string;
  bank_account_id: string | null;
  source_label: string;
  created_at: string;
}
export interface ReconciliationRunInsert {
  household_id: string;
  bank_account_id?: string | null;
  source_label: string;
}

export interface ReconciliationItemRow {
  id: string;
  run_id: string;
  fecha: string | null;
  descripcion: string | null;
  monto: number;
  matched_transaction_id: string | null;
  estado: 'conciliado' | 'pendiente';
}
export interface ReconciliationItemInsert {
  run_id: string;
  fecha?: string | null;
  descripcion?: string | null;
  monto: number;
  matched_transaction_id?: string | null;
  estado: 'conciliado' | 'pendiente';
}

export type ChatRole = 'user' | 'assistant';

export interface ChatMessageRow {
  id: string;
  household_id: string;
  member_id: string | null;
  role: ChatRole;
  content: string;
  created_at: string;
}
export interface ChatMessageInsert {
  household_id: string;
  member_id?: string | null;
  role: ChatRole;
  content: string;
}

export type TicketStatus = 'abierto' | 'resuelto';

export interface SupportTicketRow {
  id: string;
  household_id: string;
  member_id: string | null;
  mensaje: string;
  status: TicketStatus;
  created_at: string;
}
export interface SupportTicketInsert {
  household_id: string;
  member_id?: string | null;
  mensaje: string;
  status?: TicketStatus;
}

// Placeholder mínimo para que @supabase/supabase-js pueda tipar .from('tabla').
// Cubre solo las tablas usadas hasta ahora; se irá ampliando con cada pantalla nueva.
// `Relationships: []` es obligatorio: sin él, postgrest-js no logra resolver el
// tipo de cada tabla y todo colapsa silenciosamente a `never`.
// El `& Record<string, unknown>` es necesario: sin un índice de firma, el
// parser de `.select('col1, col2')` de postgrest-js no resuelve las columnas y
// el resultado colapsa a `never` (confirmado con un repro aislado).
type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row & Record<string, unknown>;
  Insert: Insert & Record<string, unknown>;
  Update: Update & Record<string, unknown>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      categories: Table<CategoryRow, Partial<CategoryRow>>;
      transactions: Table<TransactionRow, TransactionInsert, Partial<TransactionInsert>>;
      households: Table<HouseholdRow, Partial<HouseholdRow>>;
      household_members: Table<HouseholdMemberRow, Partial<HouseholdMemberRow>>;
      user_preferences: Table<UserPreferencesRow, Partial<UserPreferencesRow>>;
      category_budgets: Table<CategoryBudgetRow, CategoryBudgetInsert>;
      wallet_movements: Table<WalletMovementRow, WalletMovementInsert>;
      goals: Table<GoalRow, GoalInsert>;
      debts: Table<DebtRow, DebtInsert>;
      scheduled_expenses: Table<ScheduledExpenseRow, ScheduledExpenseInsert>;
      calendar_events: Table<CalendarEventRow, CalendarEventInsert>;
      bank_accounts: Table<BankAccountRow, BankAccountInsert>;
      referrals: Table<ReferralRow, ReferralInsert>;
      goal_contributions: Table<GoalContributionRow, GoalContributionInsert>;
      reconciliation_runs: Table<ReconciliationRunRow, ReconciliationRunInsert>;
      reconciliation_items: Table<ReconciliationItemRow, ReconciliationItemInsert>;
      chat_messages: Table<ChatMessageRow, ChatMessageInsert>;
      support_tickets: Table<SupportTicketRow, SupportTicketInsert>;
      subscriptions: Table<SubscriptionRow, SubscriptionInsert>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
