// Tipos escritos a mano para las tablas que ya usa la app.
// En cuanto el proyecto de Supabase estÃ© creado, reemplaza este archivo con el
// resultado real de: npx supabase gen types typescript --project-id <id> > src/types/db.ts

export type TransactionKind = 'gasto' | 'ingreso';
export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';
export type TransactionNaturaleza = 'fijo' | 'variable';
export type ScheduledExpenseStatus = 'pendiente' | 'pagado';
export type Recurrence = 'ninguna' | 'semanal' | 'mensual' | 'anual';
export type CalendarEventType = 'cita' | 'reunion' | 'evento' | 'recordatorio';
export type SubscriptionPlan = 'personal' | 'premium' | 'familiar';

export interface CategoryRow {
  id: string;
  label: string;
  subcategories: string[];
  sort_order: number;
}

export type CurrencyCodeDb = 'DOP' | 'USD' | 'EUR';

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
  bank_account_id: string | null;
  budget_id: string | null;
  income_source: string | null;
  origin_scheduled_expense_id: string | null;
  receipt_path: string | null;
  voice_path: string | null;
  /** Moneda del monto: la de su cuenta (la define la base de datos). */
  moneda: CurrencyCodeDb;
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
  bank_account_id?: string | null;
  budget_id?: string | null;
  income_source?: string | null;
  origin_scheduled_expense_id?: string | null;
  receipt_path?: string | null;
  voice_path?: string | null;
  /** Solo cuenta para efectivo; con cuenta bancaria la define la cuenta. */
  moneda?: CurrencyCodeDb;
}

export interface HouseholdRow {
  id: string;
  plan: SubscriptionPlan;
  monthly_budget_total: number;
  wallet_initial_balance: number;
  monthly_salary: number;
  onboarding_completed: boolean;
  moneda_base: CurrencyCodeDb;
  /** Pesos por 1 unidad de cada moneda: { USD: 60, EUR: 65 }. */
  tasas: { USD?: number; EUR?: number };
  tasas_confirmadas: boolean;
  /** Las tasas se actualizan solas con la tasa de mercado. */
  tasas_auto: boolean;
  tasas_actualizadas_at: string | null;
  tasas_fuente: string | null;
  /** Saldo inicial del efectivo en dólares / euros. */
  wallet_extra: { USD?: number; EUR?: number };
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
  ciudad: string | null;
  tono_notificacion: 'sonido' | 'vibracion' | 'silencioso';
  avisos_activos: boolean;
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

export interface BudgetRow {
  id: string;
  household_id: string;
  nombre: string;
  monto: number;
  category_id: string | null;
  medio: PaymentMethod;
  bank_account_id: string | null;
  nota: string | null;
  created_at: string;
}
export interface BudgetInsert {
  household_id: string;
  nombre: string;
  monto: number;
  category_id?: string | null;
  medio?: PaymentMethod;
  bank_account_id?: string | null;
  nota?: string | null;
}

export type BudgetMovementType = 'abono' | 'retiro' | 'gasto';
export interface BudgetMovementRow {
  id: string;
  household_id: string;
  budget_id: string;
  tipo: BudgetMovementType;
  monto: number;
  nota: string | null;
  medio: PaymentMethod | null;
  bank_account_id: string | null;
  transaction_id: string | null;
  moneda: CurrencyCodeDb | null;
  monto_cuenta: number | null;
  occurred_on: string;
  created_at: string;
}
export interface BudgetMovementInsert {
  household_id: string;
  budget_id: string;
  tipo: BudgetMovementType;
  monto: number;
  nota?: string | null;
  medio?: PaymentMethod | null;
  bank_account_id?: string | null;
  moneda?: CurrencyCodeDb | null;
  monto_cuenta?: number | null;
  occurred_on?: string;
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
  medio: PaymentMethod | null;
  bank_account_id: string | null;
  moneda: CurrencyCodeDb | null;
  monto_cuenta: number | null;
  occurred_on: string;
  created_at: string;
}
export interface GoalContributionInsert {
  goal_id: string;
  monto: number;
  medio?: PaymentMethod | null;
  bank_account_id?: string | null;
  moneda?: CurrencyCodeDb | null;
  monto_cuenta?: number | null;
  occurred_on?: string;
}

export type DebtType = 'tarjeta' | 'prestamo' | 'otro';

export interface DebtRow {
  id: string;
  household_id: string;
  nombre: string;
  saldo: number;
  cuota_mensual: number;
  tasa_anual: number;
  status?: 'pendiente' | 'pagada';
  bank_account_id?: string | null;
  tipo: DebtType;
  /** Día del mes en que cierra el estado de cuenta (tarjetas). */
  dia_corte: number | null;
  /** Día del mes en que vence el pago. */
  dia_pago: number | null;
  aviso_dias_antes: number | null;
  card_id: string | null;
  /** Moneda de la deuda; vacío = moneda base del hogar. */
  moneda: CurrencyCodeDb | null;
  created_at: string;
}
export interface DebtInsert {
  household_id: string;
  nombre: string;
  saldo: number;
  cuota_mensual: number;
  tasa_anual?: number;
  status?: 'pendiente' | 'pagada';
  bank_account_id?: string | null;
  tipo?: DebtType;
  dia_corte?: number | null;
  dia_pago?: number | null;
  aviso_dias_antes?: number | null;
  card_id?: string | null;
  moneda?: CurrencyCodeDb | null;
}

export interface DebtPaymentRow {
  id: string;
  debt_id: string;
  monto_total: number;
  capital: number;
  interes: number;
  saldo_anterior: number;
  saldo_nuevo: number;
  medio: PaymentMethod | null;
  bank_account_id: string | null;
  moneda: CurrencyCodeDb | null;
  monto_cuenta: number | null;
  occurred_on: string;
  created_at: string;
}
export interface DebtPaymentInsert {
  debt_id: string;
  monto_total: number;
  capital: number;
  interes: number;
  saldo_anterior: number;
  saldo_nuevo: number;
  medio?: PaymentMethod | null;
  bank_account_id?: string | null;
  moneda?: CurrencyCodeDb | null;
  monto_cuenta?: number | null;
  occurred_on?: string;
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
  bank_account_id: string | null;
  status: ScheduledExpenseStatus;
  /** Días antes del vencimiento en que se avisa (null = sin aviso). */
  aviso_dias_antes: number | null;
  /** Hora del aviso, HH:MM:SS. */
  hora_aviso: string;
  recurrencia: Recurrence;
  pospuesto_veces: number;
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
  aviso_dias_antes?: number | null;
  hora_aviso?: string;
  recurrencia?: Recurrence;
}

export interface CalendarEventRow {
  id: string;
  household_id: string;
  titulo: string;
  event_date: string;
  event_time: string | null;
  tipo: CalendarEventType;
  notas: string | null;
  lugar: string | null;
  /** Minutos antes del evento en que se avisa (null = sin aviso). */
  aviso_minutos: number | null;
  recurrencia: Recurrence;
  completado: boolean;
  created_at: string;
}
export interface CalendarEventInsert {
  household_id: string;
  titulo: string;
  event_date: string;
  event_time?: string | null;
  tipo?: CalendarEventType;
  notas?: string | null;
  lugar?: string | null;
  aviso_minutos?: number | null;
  recurrencia?: Recurrence;
  completado?: boolean;
}

export type BankAccountStatus = 'sincronizado' | 'error' | 'desconectado';

export interface BankAccountRow {
  id: string;
  household_id: string;
  banco: string;
  ultimos4: string | null;
  numero_cuenta: string | null;
  saldo_inicial: number;
  alias: string | null;
  status: BankAccountStatus;
  provider: string;
  moneda: CurrencyCodeDb;
  created_at: string;
}
export interface BankAccountInsert {
  household_id: string;
  banco: string;
  ultimos4?: string | null;
  numero_cuenta?: string | null;
  saldo_inicial?: number;
  alias?: string | null;
  status?: BankAccountStatus;
  provider?: string;
  moneda?: CurrencyCodeDb;
}

export interface AccountBalanceRow {
  household_id: string;
  kind: 'efectivo' | 'banco';
  bank_account_id: string | null;
  nombre: string;
  saldo: number;
  moneda: CurrencyCodeDb;
}

export type LedgerSource =
  | 'ingreso' | 'gasto' | 'deuda' | 'meta' | 'inversion'
  | 'presupuesto_abono' | 'presupuesto_retiro' | 'transferencia_salida' | 'transferencia_entrada';

export interface AccountLedgerRow {
  household_id: string;
  bank_account_id: string | null;
  is_cash: boolean;
  amount: number;
  source: LedgerSource;
  ref_id: string;
  occurred_on: string;
  label: string;
  created_at: string;
  moneda: CurrencyCodeDb;
}

export interface AccountTransferRow {
  id: string;
  household_id: string;
  from_bank_account_id: string | null;
  to_bank_account_id: string | null;
  monto: number;
  from_moneda: CurrencyCodeDb | null;
  to_moneda: CurrencyCodeDb | null;
  monto_destino: number | null;
  nota: string | null;
  occurred_on: string;
  created_at: string;
}
export interface AccountTransferInsert {
  household_id: string;
  from_bank_account_id: string | null;
  to_bank_account_id: string | null;
  monto: number;
  from_moneda?: CurrencyCodeDb | null;
  to_moneda?: CurrencyCodeDb | null;
  monto_destino?: number | null;
  nota?: string | null;
  occurred_on?: string;
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

export type InvestmentType = 'acciones' | 'bonos' | 'certificado' | 'fondo' | 'cripto' | 'inmueble' | 'otro';

export interface InvestmentRow {
  id: string;
  household_id: string;
  nombre: string;
  tipo: InvestmentType;
  simbolo: string | null;
  cantidad: number;
  precio_compra: number;
  precio_actual: number;
  fecha_compra: string;
  institucion: string | null;
  medio: PaymentMethod | null;
  bank_account_id: string | null;
  moneda: CurrencyCodeDb | null;
  monto_cuenta: number | null;
  created_at: string;
}
export interface InvestmentInsert {
  household_id: string;
  nombre: string;
  tipo: InvestmentType;
  simbolo?: string | null;
  cantidad: number;
  precio_compra: number;
  precio_actual?: number;
  fecha_compra: string;
  institucion?: string | null;
  medio?: PaymentMethod | null;
  bank_account_id?: string | null;
  moneda?: CurrencyCodeDb | null;
  monto_cuenta?: number | null;
}

export type CardType = 'credito' | 'debito';

export interface CardRow {
  id: string;
  household_id: string;
  banco: string;
  tipo: CardType;
  nombre: string;
  ultimos4: string;
  moneda: CurrencyCodeDb;
  limite: number | null;
  /** Lo que se debe hoy en la tarjeta de crédito. */
  saldo_actual: number;
  dia_corte: number | null;
  dia_pago: number | null;
  aviso_dias_antes: number | null;
  created_at: string;
}
export interface CardInsert {
  household_id: string;
  banco: string;
  tipo: CardType;
  nombre: string;
  ultimos4: string;
  moneda?: CurrencyCodeDb;
  limite?: number | null;
  saldo_actual?: number;
  dia_corte?: number | null;
  dia_pago?: number | null;
  aviso_dias_antes?: number | null;
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

// Placeholder mÃ­nimo para que @supabase/supabase-js pueda tipar .from('tabla').
// Cubre solo las tablas usadas hasta ahora; se irÃ¡ ampliando con cada pantalla nueva.
// `Relationships: []` es obligatorio: sin Ã©l, postgrest-js no logra resolver el
// tipo de cada tabla y todo colapsa silenciosamente a `never`.
// El `& Record<string, unknown>` es necesario: sin un Ã­ndice de firma, el
// parser de `.select('col1, col2')` de postgrest-js no resuelve las columnas y
// el resultado colapsa a `never` (confirmado con un repro aislado).
type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row & Record<string, unknown>;
  Insert: Insert & Record<string, unknown>;
  Update: Update & Record<string, unknown>;
  Relationships: [];
};

export interface AdminStats {
  users: number;
  households: number;
  transactions: number;
  goals: number;
  debts: number;
  open_tickets: number;
  trialing: number;
  active: number;
  mrr_usd: number;
  by_plan: Partial<Record<SubscriptionPlan, number>>;
}

// ── Referidos, socios, pagos y marketplace (funciones del servidor) ──────────
export interface MyReferrer {
  id: string;
  code: string;
  commission_pct: number;
  can_edit: boolean;
  payout_method: 'paypal' | 'banco' | null;
  payout_paypal: string | null;
  payout_banco: string | null;
  payout_cuenta: string | null;
  payout_tipo_cuenta: string | null;
  payout_titular: string | null;
  payout_documento: string | null;
}
export interface MyReferralStats {
  referidos: number;
  suscritos: number;
  pendiente: number;
  aprobada: number;
  pagada: number;
  lista: { alias: string; desde: string; plan: string | null; comision: number | null; estado: CommissionStatus | null; moneda: string | null }[];
}
export type CommissionStatus = 'pendiente' | 'aprobada' | 'pagada' | 'rechazada';
export interface AdminReferrer {
  id: string;
  kind: 'usuario' | 'influencer' | 'marca';
  nombre: string;
  code: string;
  commission_pct: number;
  activo: boolean;
  contacto: string | null;
  plataforma: string | null;
  handle: string | null;
  referidos: number;
  suscritos: number;
  pendiente: number;
  aprobada: number;
  pagada: number;
  payout_method: 'paypal' | 'banco' | null;
  payout_paypal: string | null;
  payout_banco: string | null;
  payout_cuenta: string | null;
  payout_tipo_cuenta: string | null;
  payout_titular: string | null;
  payout_documento: string | null;
  notas: string | null;
  email: string | null;
}
export interface AdminCommission {
  id: string;
  referrer_id: string;
  referidor: string;
  kind: string;
  alias: string;
  base_amount: number;
  pct: number;
  amount: number;
  currency: string;
  status: CommissionStatus;
  period: string;
  paid_at: string | null;
  paid_ref: string | null;
  created_at: string;
  payout_method: 'paypal' | 'banco' | null;
  payout_paypal: string | null;
  payout_banco: string | null;
  payout_cuenta: string | null;
  payout_titular: string | null;
  /** 'sandbox' = cobro de prueba de PayPal: no cuenta como ingreso ni se paga. */
  environment: 'sandbox' | 'live';
}
export interface AdminPayment {
  id: string;
  household_id: string;
  plan: string | null;
  amount: number;
  fee: number;
  currency: string;
  paid_at: string;
  email: string | null;
  environment: 'sandbox' | 'live';
}
export type SavePartnerArgs = {
  p_id: string | null; p_kind: string; p_nombre: string; p_pct: number; p_activo: boolean; p_contacto: string | null;
  p_plataforma: string | null; p_handle: string | null; p_notas: string | null; p_method: string | null; p_paypal: string | null;
  p_banco: string | null; p_cuenta: string | null; p_tipo: string | null; p_titular: string | null; p_documento: string | null;
}

export interface Database {
  public: {
    Tables: {
      categories: Table<CategoryRow, Partial<CategoryRow>>;
      transactions: Table<TransactionRow, TransactionInsert, Partial<TransactionInsert>>;
      households: Table<HouseholdRow, Partial<HouseholdRow>>;
      household_members: Table<HouseholdMemberRow, Partial<HouseholdMemberRow>>;
      user_preferences: Table<UserPreferencesRow, Partial<UserPreferencesRow>>;
      category_budgets: Table<CategoryBudgetRow, CategoryBudgetInsert>;
      budgets: Table<BudgetRow, BudgetInsert>;
      budget_movements: Table<BudgetMovementRow, BudgetMovementInsert>;
      account_transfers: Table<AccountTransferRow, AccountTransferInsert>;
      account_balances: Table<AccountBalanceRow, Partial<AccountBalanceRow>>;
      account_ledger: Table<AccountLedgerRow, Partial<AccountLedgerRow>>;
      wallet_movements: Table<WalletMovementRow, WalletMovementInsert>;
      goals: Table<GoalRow, GoalInsert>;
      debts: Table<DebtRow, DebtInsert>;
      debt_payments: Table<DebtPaymentRow, DebtPaymentInsert>;
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
      investments: Table<InvestmentRow, InvestmentInsert, Partial<InvestmentInsert>>;
      cards: Table<CardRow, CardInsert, Partial<CardInsert>>;
      app_admins: Table<{ user_id: string }, { user_id: string }>;
    };
    Views: Record<string, never>;
    Functions: {
      choose_plan: { Args: { p_plan: SubscriptionPlan }; Returns: SubscriptionRow };
      admin_stats: { Args: Record<string, never>; Returns: AdminStats };
      admin_list_tickets: { Args: Record<string, never>; Returns: SupportTicketRow[] };
      admin_resolve_ticket: { Args: { p_id: string }; Returns: undefined };
      pay_scheduled_expense: { Args: { p_id: string; p_medio: PaymentMethod; p_bank: string | null }; Returns: string };
      create_support_ticket: { Args: { p_asunto: string; p_mensaje: string }; Returns: string };
      reply_support_ticket: { Args: { p_ticket: string; p_body: string; p_as_user?: boolean }; Returns: undefined };
      admin_ticket_messages: { Args: { p_ticket: string }; Returns: { id: string; ticket_id: string; is_admin: boolean; body: string; created_at: string }[] };
      track_marketplace: { Args: { p_items: string[]; p_event: string }; Returns: undefined };
      my_referrer: { Args: Record<string, never>; Returns: MyReferrer[] };
      save_my_payout: { Args: { p_method: string; p_paypal: string | null; p_banco: string | null; p_cuenta: string | null; p_tipo: string | null; p_titular: string | null; p_documento: string | null }; Returns: undefined };
      my_referral_stats: { Args: Record<string, never>; Returns: MyReferralStats };
      claim_referral: { Args: { p_code: string }; Returns: boolean };
      admin_referrers: { Args: Record<string, never>; Returns: AdminReferrer[] };
      admin_referred: { Args: { p_referrer: string }; Returns: { alias: string; email: string | null; desde: string; plan: string | null; comision: number | null; estado: CommissionStatus | null; moneda: string | null }[] };
      admin_save_referrer: { Args: SavePartnerArgs; Returns: string };
      admin_commissions: { Args: { p_status?: string | null }; Returns: AdminCommission[] };
      admin_set_commissions: { Args: { p_ids: string[]; p_status: string; p_ref?: string | null }; Returns: number };
      admin_marketplace_stats: { Args: Record<string, never>; Returns: { id: string; vistas: number; clics: number; contactos: number }[] };
      admin_marketplace_leads: { Args: { p_item: string }; Returns: { email: string | null; nombre: string | null; ciudad: string | null; pais: string | null; created_at: string }[] };
      admin_payments: { Args: { p_limit?: number }; Returns: AdminPayment[] };
      admin_ticket_author: { Args: { p_ticket: string }; Returns: { email: string | null; nombre: string | null }[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

