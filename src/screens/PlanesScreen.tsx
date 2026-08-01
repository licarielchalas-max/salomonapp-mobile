import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthProvider';
import { supabase } from '../lib/supabase';
import type { SubscriptionPlan } from '../types/db';

const PLANES: { id: SubscriptionPlan; label: string; precio: string; detalle: string }[] = [
  { id: 'personal', label: '👤 Salomón Sabiduría', precio: '$5/mes', detalle: '1 usuario · acceso completo' },
  { id: 'premium', label: '💍 Salomón Alianza', precio: '$10/mes', detalle: '2 perfiles compartidos' },
  { id: 'familiar', label: '👨‍👩‍👧 Salomón Legado', precio: '$15/mes', detalle: 'Hasta 5 perfiles' },
];

export function PlanesScreen() {
  const { householdId } = useAuth();
  const [planActivo, setPlanActivo] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!householdId) return;
    supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPlanActivo(data.plan);
          setStatus(data.status);
        }
      });
  }, [householdId]);

  async function handleElegir(plan: SubscriptionPlan) {
    setLoadingPlan(plan);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('paypal-subscribe', { body: { plan } });
      if (invokeError) throw invokeError;
      if (data?.url) await Linking.openURL(data.url);
      else if (data?.error) setError(data.error);
    } catch (e) {
      setError('No se pudo iniciar el pago. Verifica que PayPal esté configurado.');
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 12 }}>
      {planActivo ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusText}>
            Plan actual: <Text style={{ fontWeight: '700' }}>{planActivo}</Text> ({status})
          </Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {PLANES.map((p) => (
        <View key={p.id} style={styles.card}>
          <Text style={styles.cardLabel}>{p.label}</Text>
          <Text style={styles.cardPrecio}>{p.precio}</Text>
          <Text style={styles.cardDetalle}>{p.detalle}</Text>
          <Pressable style={styles.btn} onPress={() => handleElegir(p.id)} disabled={loadingPlan === p.id}>
            <Text style={styles.btnText}>{loadingPlan === p.id ? 'Abriendo checkout…' : 'Elegir plan (30 días gratis)'}</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF8EE' },
  statusCard: { backgroundColor: '#E3EFE7', borderWidth: 1, borderColor: '#BFDBC9', borderRadius: 10, padding: 12 },
  statusText: { fontSize: 13, color: '#0F5132' },
  error: { color: '#8C4A3B', fontSize: 12.5 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 14, padding: 18, gap: 4 },
  cardLabel: { fontWeight: '700', fontSize: 15 },
  cardPrecio: { fontFamily: 'monospace', fontSize: 22, color: '#0F5132', marginVertical: 4 },
  cardDetalle: { fontSize: 12.5, color: '#6E6E68', marginBottom: 10 },
  btn: { backgroundColor: '#0F5132', borderRadius: 9, padding: 11, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
