import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from '../AppText';
import { supabase } from '../../lib/supabase';
import { formatCurrency, isCurrency } from '../../lib/currency';
import { dateLocale } from '../../lib/i18n';
import { colors, radius, spacing } from '../../theme';
import type { AdminPayment } from '../../types/db';

const money = (n: number, cur: string) => formatCurrency(n, isCurrency(cur) ? cur : 'USD', { space: true });

const SETUP = [
  'Crea tu cuenta de PayPal Business y una app en developer.paypal.com (modo Live).',
  'Crea tres planes de suscripción (Sabiduría, Alianza y Legado) con 15 días de prueba y copia el ID de cada plan. Hazlo primero en Sandbox (pruebas) y después en Live (producción).',
  'Guarda en los Secrets de Supabase (no en el chat) los de cada ambiente: PAYPAL_SANDBOX_… y PAYPAL_LIVE_… (CLIENT_ID, CLIENT_SECRET, WEBHOOK_ID, PLAN_PERSONAL, PLAN_PREMIUM, PLAN_FAMILIAR), más APP_URL. PAYPAL_ENV (sandbox o live) elige cuál se usa.',
  'Registra la URL de la función paypal-webhook en PayPal con los eventos de suscripción y PAYMENT.SALE.COMPLETED / REFUNDED.',
  'Haz una compra de prueba en el modo Sandbox antes de pasar a Live.',
];

// Cobros de suscripciones que PayPal avisa por la función paypal-webhook (tarjeta o cuenta PayPal).
export function AdminPayments() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('admin_payments', { p_limit: 200 });
    setPayments((data ?? []) as AdminPayment[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />;

  // Los cobros de prueba (Sandbox) se listan pero no suman a los ingresos.
  const real = payments.filter((p) => p.environment !== 'sandbox');
  const gross = real.reduce((s, p) => s + Number(p.amount), 0);
  const fees = real.reduce((s, p) => s + Number(p.fee), 0);
  const month = new Date().toISOString().slice(0, 7);
  const thisMonth = real.filter((p) => p.paid_at.slice(0, 7) === month).reduce((s, p) => s + Number(p.amount), 0);

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.statRow}>
        <View style={styles.stat}><Text style={styles.statNum}>{money(thisMonth, 'USD')}</Text><Text style={styles.statLabel}>Este mes</Text></View>
        <View style={styles.stat}><Text style={styles.statNum}>{money(gross, 'USD')}</Text><Text style={styles.statLabel}>Cobrado</Text></View>
        <View style={styles.stat}><Text style={styles.statNum}>{money(fees, 'USD')}</Text><Text style={styles.statLabel}>Comisión PayPal</Text></View>
      </View>

      <Text style={styles.section}>COBROS RECIENTES</Text>
      {payments.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.title}>Aún no hay cobros registrados</Text>
          <Text style={styles.sub}>Cuando PayPal cobre una suscripción, aparecerá aquí con el plan y el correo del titular. Para activarlo:</Text>
          {SETUP.map((s, i) => (
            <Text key={i} style={styles.sub}>{i + 1}. {s}</Text>
          ))}
        </View>
      ) : (
        payments.map((p) => (
          <View key={p.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{money(Number(p.amount), p.currency)} · {p.plan ?? 'plan'}{p.environment === 'sandbox' ? ' · PRUEBA' : ''}</Text>
              <Text style={styles.sub}>
                {p.email ?? 'sin correo'} · {new Date(p.paid_at).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <Text style={styles.sub}>PayPal −{money(Number(p.fee), p.currency)}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.glassBorder, alignItems: 'center' },
  statNum: { fontSize: 15, fontWeight: '800', color: colors.goldBright },
  statLabel: { fontSize: 11, color: colors.onDarkMuted, marginTop: 2, textAlign: 'center' },
  section: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2 },
  card: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, flexWrap: 'wrap' },
  title: { fontSize: 14, fontWeight: '700', color: colors.onDark },
  sub: { fontSize: 12, color: colors.onDarkMuted, marginTop: 3, lineHeight: 18 },
});
