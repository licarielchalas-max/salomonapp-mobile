import type { SubscriptionPlan, SubscriptionStatus } from '../types/db';

/** Días de prueba gratis al registrarse. Debe coincidir con la base de datos (handle_new_user / choose_plan) y con el plan de PayPal. */
export const TRIAL_DAYS = 15;

/** Perfiles sin límite (plan Legado). */
export const UNLIMITED = Number.POSITIVE_INFINITY;

export function isUnlimited(n: number): boolean {
  return !Number.isFinite(n);
}

/** "1 perfil", "2 perfiles" o "Perfiles ilimitados". */
export function profilesLabel(n: number): string {
  return isUnlimited(n) ? 'Perfiles ilimitados' : n === 1 ? '1 perfil' : `${n} perfiles`;
}

/** Tope para mostrar junto al conteo: "3/5" o "3/∞". */
export function profilesCap(n: number): string {
  return isUnlimited(n) ? '∞' : String(n);
}

export interface PlanInfo {
  id: SubscriptionPlan;
  key: 'sabiduria' | 'alianza' | 'legado';
  name: string;
  tagline: string;
  priceUsd: number;
  profiles: number;
}

export const PLANS: PlanInfo[] = [
  { id: 'personal', key: 'sabiduria', name: 'Salomón Sabiduría', tagline: '1 usuario', priceUsd: 5, profiles: 1 },
  { id: 'premium', key: 'alianza', name: 'Salomón Alianza', tagline: '2 perfiles', priceUsd: 10, profiles: 2 },
  { id: 'familiar', key: 'legado', name: 'Salomón Legado', tagline: 'Perfiles ilimitados', priceUsd: 15, profiles: UNLIMITED },
];

export function planInfo(id: SubscriptionPlan): PlanInfo {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export interface AccessState {
  hasAccess: boolean;
  isTrial: boolean;
  isPaid: boolean;
  expired: boolean;
  daysLeft: number | null;
}

const DAY_MS = 86_400_000;

export function computeAccess(
  sub: { status: SubscriptionStatus; current_period_end: string | null } | null,
  isAdmin: boolean,
  now: number = Date.now(),
): AccessState {
  const end = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  const daysLeft = end === null ? null : Math.max(0, Math.ceil((end - now) / DAY_MS));

  if (isAdmin) return { hasAccess: true, isTrial: false, isPaid: false, expired: false, daysLeft };
  if (!sub) return { hasAccess: false, isTrial: false, isPaid: false, expired: true, daysLeft: null };

  if (sub.status === 'active') return { hasAccess: true, isTrial: false, isPaid: true, expired: false, daysLeft };
  if (sub.status === 'trialing') {
    const valid = end !== null && end > now;
    return { hasAccess: valid, isTrial: valid, isPaid: false, expired: !valid, daysLeft };
  }
  // past_due / canceled: conserva acceso hasta el fin del periodo ya pagado.
  const grace = end !== null && end > now;
  return { hasAccess: grace, isTrial: false, isPaid: grace, expired: !grace, daysLeft };
}
