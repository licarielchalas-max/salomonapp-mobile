import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAccount } from '../context/AccountProvider';
import type { SubscriptionPlan } from '../types/db';

export async function functionErrorMessage(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.clone().json();
      if (body?.error) return String(body.error);
    } catch {
      // cuerpo no es JSON: se usa el mensaje genérico
    }
  }
  return (error as Error)?.message ?? 'Ocurrió un error inesperado.';
}

export function usePlanActions() {
  const { chooseTrialPlan } = useAccount();
  const [busy, setBusy] = useState(false);

  const startTrial = useCallback(
    async (plan: SubscriptionPlan) => {
      setBusy(true);
      const { error } = await chooseTrialPlan(plan);
      setBusy(false);
      return { error };
    },
    [chooseTrialPlan],
  );

  // notConfigured = el cobro con PayPal aún no está activado en el servidor.
  const payWithPayPal = useCallback(async (plan: SubscriptionPlan) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('paypal-subscribe', { body: { plan } });
    setBusy(false);
    if (error) {
      const message = await functionErrorMessage(error);
      const notConfigured = /PAYPAL|sin plan de PayPal|no se pudo autenticar con paypal/i.test(message);
      return { error: message, notConfigured };
    }
    const url = (data as { url?: string } | null)?.url;
    if (!url) return { error: 'PayPal no devolvió un enlace de pago.', notConfigured: false };
    await Linking.openURL(url);
    return { error: null, notConfigured: false };
  }, []);

  return { busy, startTrial, payWithPayPal };
}
