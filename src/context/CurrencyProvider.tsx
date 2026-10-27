import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { useAccount } from './AccountProvider';
import {
  isCurrency,
  normalizeRates,
  setCurrencyState,
  type CurrencyCode,
  type Rates,
} from '../lib/currency';
import { RATES_SOURCE, fetchMarketRates, ratesAreStale } from '../lib/rates';

interface CurrencyContextValue {
  /** Moneda en la que se llevan presupuestos, metas, deudas e inversiones. */
  base: CurrencyCode;
  rates: Rates;
  /** La persona ya revisó las tasas de cambio (mientras no, se usan valores de referencia). */
  ratesConfirmed: boolean;
  /** Las tasas se traen solas del mercado (si no, son las que escribió la persona). */
  ratesAuto: boolean;
  ratesUpdatedAt: string | null;
  /** Trae ahora las tasas de mercado y las guarda. */
  refreshRates: () => Promise<{ error: string | null }>;
  setRatesAuto: (auto: boolean) => Promise<{ error: string | null }>;
  /** Saldo inicial del efectivo en dólares y euros. */
  walletExtra: { USD: number; EUR: number };
  saveBase: (code: CurrencyCode) => Promise<{ error: string | null }>;
  saveRates: (next: { USD: number; EUR: number }) => Promise<{ error: string | null }>;
  /** Saldo inicial del efectivo en una moneda distinta de pesos (los pesos viven en wallet_initial_balance). */
  saveWalletOpening: (code: 'USD' | 'EUR', amount: number) => Promise<{ error: string | null }>;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { householdId } = useAuth();
  const { household, refresh } = useAccount();

  const base: CurrencyCode = isCurrency(household?.moneda_base) ? household.moneda_base : 'DOP';
  const rates = useMemo(() => normalizeRates(household?.tasas), [household?.tasas]);

  // El resto de la app lee la moneda base y las tasas desde lib/currency mientras dibuja:
  // se actualizan antes de pintar a los hijos.
  setCurrencyState(base, rates);

  const walletExtra = useMemo(
    () => ({ USD: Number(household?.wallet_extra?.USD ?? 0), EUR: Number(household?.wallet_extra?.EUR ?? 0) }),
    [household?.wallet_extra],
  );

  const saveBase = useCallback(
    async (code: CurrencyCode) => {
      if (!householdId) return { error: 'No hay un hogar activo.' };
      const { error } = await supabase.from('households').update({ moneda_base: code }).eq('id', householdId);
      if (!error) await refresh();
      return { error: error?.message ?? null };
    },
    [householdId, refresh],
  );

  const saveRates = useCallback(
    async (next: { USD: number; EUR: number }) => {
      if (!householdId) return { error: 'No hay un hogar activo.' };
      if (!(next.USD > 0) || !(next.EUR > 0)) return { error: 'Cada tasa debe ser mayor que cero.' };
      const { error } = await supabase
        .from('households')
        .update({ tasas: { USD: next.USD, EUR: next.EUR }, tasas_confirmadas: true, tasas_auto: false, tasas_fuente: 'manual' })
        .eq('id', householdId);
      if (!error) await refresh();
      return { error: error?.message ?? null };
    },
    [householdId, refresh],
  );

  const refreshRates = useCallback(async () => {
    if (!householdId) return { error: 'No hay un hogar activo.' };
    const market = await fetchMarketRates();
    if (!market) return { error: 'No se pudieron traer las tasas del mercado. Revisa tu conexión e inténtalo de nuevo.' };
    const { error } = await supabase
      .from('households')
      .update({
        tasas: market,
        tasas_confirmadas: true,
        tasas_auto: true,
        tasas_actualizadas_at: new Date().toISOString(),
        tasas_fuente: RATES_SOURCE,
      })
      .eq('id', householdId);
    if (!error) await refresh();
    return { error: error?.message ?? null };
  }, [householdId, refresh]);

  const setRatesAuto = useCallback(
    async (auto: boolean) => {
      if (!householdId) return { error: 'No hay un hogar activo.' };
      if (auto) return refreshRates();
      const { error } = await supabase.from('households').update({ tasas_auto: false }).eq('id', householdId);
      if (!error) await refresh();
      return { error: error?.message ?? null };
    },
    [householdId, refresh, refreshRates],
  );

  // Con tasas automáticas, se actualizan al abrir la app si pasaron más de unas horas.
  const lastTry = useRef(0);
  useEffect(() => {
    if (!household || !household.tasas_auto) return;
    if (!ratesAreStale(household.tasas_actualizadas_at)) return;
    if (Date.now() - lastTry.current < 10 * 60 * 1000) return;
    lastTry.current = Date.now();
    refreshRates();
  }, [household?.id, household?.tasas_auto, household?.tasas_actualizadas_at, refreshRates]);

  const saveWalletOpening = useCallback(
    async (code: 'USD' | 'EUR', amount: number) => {
      if (!householdId) return { error: 'No hay un hogar activo.' };
      const { error } = await supabase
        .from('households')
        .update({ wallet_extra: { ...(household?.wallet_extra ?? {}), [code]: amount } })
        .eq('id', householdId);
      if (!error) await refresh();
      return { error: error?.message ?? null };
    },
    [householdId, household?.wallet_extra, refresh],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      base,
      rates,
      ratesConfirmed: Boolean(household?.tasas_confirmadas),
      ratesAuto: household?.tasas_auto !== false,
      ratesUpdatedAt: household?.tasas_actualizadas_at ?? null,
      refreshRates,
      setRatesAuto,
      walletExtra,
      saveBase,
      saveRates,
      saveWalletOpening,
    }),
    [base, rates, household?.tasas_confirmadas, household?.tasas_auto, household?.tasas_actualizadas_at, refreshRates, setRatesAuto, walletExtra, saveBase, saveRates, saveWalletOpening],
  );

  // Al cambiar la moneda base se vuelve a dibujar toda la app con el nuevo símbolo.
  return (
    <CurrencyContext.Provider value={value}>
      <React.Fragment key={base}>{children}</React.Fragment>
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency debe usarse dentro de CurrencyProvider');
  return ctx;
}
