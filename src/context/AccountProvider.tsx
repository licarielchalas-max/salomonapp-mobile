import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { computeAccess, type AccessState } from '../lib/plans';
import type { HouseholdRow, SubscriptionPlan, SubscriptionRow } from '../types/db';

interface AccountContextValue {
  loading: boolean;
  household: HouseholdRow | null;
  subscription: SubscriptionRow | null;
  isAdmin: boolean;
  plan: SubscriptionPlan;
  access: AccessState;
  refresh: () => Promise<void>;
  chooseTrialPlan: (plan: SubscriptionPlan) => Promise<{ error: string | null }>;
  setOnboardingCompleted: (done: boolean) => Promise<{ error: string | null }>;
}

const claimTried = new Set<string>();

const AccountContext = createContext<AccountContextValue | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { user, householdId, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [household, setHousehold] = useState<HouseholdRow | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || !householdId) {
      setHousehold(null);
      setSubscription(null);
      setIsAdmin(false);
      setLoading(authLoading);
      return;
    }
    const [{ data: h }, { data: s }, { data: a }] = await Promise.all([
      supabase.from('households').select('*').eq('id', householdId).maybeSingle(),
      supabase.from('subscriptions').select('*').eq('household_id', householdId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('app_admins').select('user_id').eq('user_id', user.id).maybeSingle(),
    ]);
    setHousehold((h as HouseholdRow) ?? null);
    // Si se registró con un código de referido, se asocia a su hogar (una sola vez por sesión; el servidor ignora repeticiones).
    const code = (user.user_metadata as { referral_code?: string } | undefined)?.referral_code;
    if (code && h && !claimTried.has(user.id)) {
      claimTried.add(user.id);
      supabase.rpc('claim_referral', { p_code: code }).then(() => {});
    }
    setSubscription((s as SubscriptionRow) ?? null);
    setIsAdmin(Boolean(a));
    setLoading(false);
  }, [user, householdId, authLoading]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Al volver de PayPal (u otra app) el estado de la suscripción pudo cambiar.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // Al volver de PayPal (web: /?checkout=success) el aviso del cobro puede tardar unos segundos en llegar:
  // se consulta la suscripción varias veces y se limpia la dirección.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!/[?&]checkout=(success|cancel)/.test(window.location.search)) return;
    const ok = /checkout=success/.test(window.location.search);
    window.history.replaceState(null, '', window.location.pathname);
    if (!ok) return;
    const timers = [2000, 5000, 10000, 20000].map((ms) => setTimeout(() => { refreshRef.current(); }, ms));
    return () => timers.forEach(clearTimeout);
  }, []);

  const chooseTrialPlan = useCallback(
    async (plan: SubscriptionPlan) => {
      const { error } = await supabase.rpc('choose_plan', { p_plan: plan });
      if (!error) await refresh();
      return { error: error?.message ?? null };
    },
    [refresh],
  );

  const setOnboardingCompleted = useCallback(
    async (done: boolean) => {
      if (!householdId) return { error: 'Sin hogar activo.' };
      const { error } = await supabase.from('households').update({ onboarding_completed: done }).eq('id', householdId);
      if (!error) await refresh();
      return { error: error?.message ?? null };
    },
    [householdId, refresh],
  );

  const value = useMemo<AccountContextValue>(
    () => ({
      loading,
      household,
      subscription,
      isAdmin,
      plan: household?.plan ?? 'personal',
      access: computeAccess(subscription, isAdmin),
      refresh,
      chooseTrialPlan,
      setOnboardingCompleted,
    }),
    [loading, household, subscription, isAdmin, refresh, chooseTrialPlan, setOnboardingCompleted],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount debe usarse dentro de <AccountProvider>');
  return ctx;
}
