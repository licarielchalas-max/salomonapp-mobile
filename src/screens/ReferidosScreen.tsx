import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Text } from '../components/AppText';
import { TextInput } from '../components/AppTextInput';
import { Chip, FieldLabel, Sheet } from '../components/budget/ui';
import { GoldButton } from '../components/brand/Buttons';
import { useReloadOnFocus } from '../hooks/useReloadOnFocus';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currency';
import { dateLocale, tr } from '../lib/i18n';
import { colors, spacing, radius, shadow } from '../theme';
import type { CommissionStatus, MyReferralStats, MyReferrer } from '../types/db';

const usd = (n: number) => formatCurrency(n, 'USD', { space: true });

const STATUS_LABEL: Record<CommissionStatus, string> = {
  pendiente: 'Por aprobar',
  aprobada: 'Aprobada',
  pagada: 'Pagada',
  rechazada: 'Rechazada',
};
const STATUS_COLOR: Record<CommissionStatus, string> = {
  pendiente: colors.neonAmber,
  aprobada: colors.goldBright,
  pagada: colors.green,
  rechazada: colors.rust,
};

// Referidos: tu código, quiénes llegaron con él y lo que ganas (comisión por el primer pago de cada uno).
export function ReferidosScreen() {
  const [me, setMe] = useState<MyReferrer | null>(null);
  const [stats, setStats] = useState<MyReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const load = useCallback(async () => {
    const [r, s] = await Promise.all([supabase.rpc('my_referrer'), supabase.rpc('my_referral_stats')]);
    setMe(((r.data ?? []) as MyReferrer[])[0] ?? null);
    setStats((s.data ?? null) as MyReferralStats | null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useReloadOnFocus(load);

  const code = me?.code ?? '---';

  async function handleCopy() {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    await Share.share({
      message: tr(`¡Únete a Salomón, la app de finanzas personales para dominicanos! 🇩🇴♛\n\nUsa mi código de referido: ${code}\n\nDescárgala en: https://salomon.app`),
      title: tr('Salomón Finanzas — Código de referido'),
    });
  }

  const porCobrar = (stats?.pendiente ?? 0) + (stats?.aprobada ?? 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Invita y gana</Text>
          <Text style={styles.heroSub}>
            Ganas el {me ? Number(me.commission_pct) : 5}% del primer pago de cada persona que se suscriba con tu código.
          </Text>
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>TU CÓDIGO DE REFERIDO</Text>
          {loading ? <ActivityIndicator color={colors.gold} /> : <Text style={styles.codeValue}>{code}</Text>}
          <View style={styles.codeActions}>
            <Pressable style={[styles.codeBtn, copied && styles.codeBtnOn]} onPress={handleCopy} accessibilityLabel="Copiar el código">
              <Text style={[styles.codeBtnText, copied && { color: colors.onNavy }]}>{copied ? 'Copiado' : 'Copiar'}</Text>
            </Pressable>
            <Pressable style={[styles.codeBtn, styles.codeBtnOn]} onPress={handleShare} accessibilityLabel="Compartir el código">
              <Text style={[styles.codeBtnText, { color: colors.onNavy }]}>Compartir</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statGrid}>
          <View style={styles.stat}><Text style={styles.statNum}>{stats?.referidos ?? 0}</Text><Text style={styles.statLabel}>Referidos</Text></View>
          <View style={styles.stat}><Text style={styles.statNum}>{stats?.suscritos ?? 0}</Text><Text style={styles.statLabel}>Suscritos</Text></View>
          <View style={styles.stat}><Text style={[styles.statNum, { color: colors.neonAmber }]}>{usd(porCobrar)}</Text><Text style={styles.statLabel}>Por cobrar</Text></View>
          <View style={styles.stat}><Text style={[styles.statNum, { color: colors.green }]}>{usd(stats?.pagada ?? 0)}</Text><Text style={styles.statLabel}>Cobrado</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>¿Cómo cobras?</Text>
          {me?.payout_method === 'paypal' && <Text style={styles.cardText}>PayPal: {me.payout_paypal}</Text>}
          {me?.payout_method === 'banco' && (
            <Text style={styles.cardText}>{me.payout_banco} · cuenta {me.payout_cuenta} · {me.payout_titular}</Text>
          )}
          {!me?.payout_method && <Text style={styles.cardText}>Aún no registraste dónde depositarte. Hazlo para recibir tus comisiones.</Text>}
          {me?.can_edit ? (
            <GoldButton label={me.payout_method ? 'Cambiar mi cuenta de cobro' : 'Registrar mi cuenta de cobro'} onPress={() => setPayOpen(true)} small />
          ) : (
            <Text style={styles.cardText}>La cuenta de cobro la administra el titular del hogar.</Text>
          )}
          <Text style={styles.note}>
            Las comisiones se aprueban y se pagan una vez al mes. Si PayPal reembolsa el pago de un referido, esa comisión se cancela.
          </Text>
        </View>

        <Text style={styles.section}>MIS REFERIDOS</Text>
        {loading ? (
          <ActivityIndicator color={colors.gold} />
        ) : !stats || stats.lista.length === 0 ? (
          <Text style={styles.empty}>Aún no has referido a nadie.</Text>
        ) : (
          stats.lista.map((r) => (
            <View key={r.alias} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Referido #{r.alias}</Text>
                <Text style={styles.rowSub}>
                  {new Date(r.desde).toLocaleDateString(dateLocale(), { day: '2-digit', month: 'short', year: 'numeric' })}
                  {r.plan ? ` · plan ${r.plan}` : ''}
                </Text>
              </View>
              {r.estado ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.rowAmt}>{usd(Number(r.comision ?? 0))}</Text>
                  <Text style={[styles.rowState, { color: STATUS_COLOR[r.estado] }]}>{STATUS_LABEL[r.estado]}</Text>
                </View>
              ) : (
                <Text style={styles.rowSub}>Aún no se suscribe</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <PayoutSheet visible={payOpen} me={me} onClose={() => setPayOpen(false)} onSaved={() => { setPayOpen(false); load(); }} />
    </SafeAreaView>
  );
}

function PayoutSheet({ visible, me, onClose, onSaved }: { visible: boolean; me: MyReferrer | null; onClose: () => void; onSaved: () => void }) {
  const [method, setMethod] = useState<'paypal' | 'banco'>('paypal');
  const [paypal, setPaypal] = useState('');
  const [banco, setBanco] = useState('');
  const [cuenta, setCuenta] = useState('');
  const [tipo, setTipo] = useState('');
  const [titular, setTitular] = useState('');
  const [documento, setDocumento] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setMethod(me?.payout_method ?? 'paypal');
    setPaypal(me?.payout_paypal ?? '');
    setBanco(me?.payout_banco ?? '');
    setCuenta(me?.payout_cuenta ?? '');
    setTipo(me?.payout_tipo_cuenta ?? '');
    setTitular(me?.payout_titular ?? '');
    setDocumento(me?.payout_documento ?? '');
  }, [visible, me]);

  async function save() {
    setSaving(true);
    const { error } = await supabase.rpc('save_my_payout', {
      p_method: method, p_paypal: paypal || null, p_banco: banco || null, p_cuenta: cuenta || null,
      p_tipo: tipo || null, p_titular: titular || null, p_documento: documento || null,
    });
    setSaving(false);
    if (error) return Alert.alert('No se pudo guardar', error.message);
    onSaved();
  }

  const field = (label: string, v: string, set: (s: string) => void, placeholder = '', keyboard: 'default' | 'email-address' = 'default') => (
    <View style={{ gap: 6 }}>
      <FieldLabel>{label}</FieldLabel>
      <TextInput
        style={styles.input}
        value={v}
        onChangeText={set}
        placeholder={placeholder}
        placeholderTextColor={colors.onDarkMuted}
        keyboardType={keyboard}
        autoCapitalize="none"
        accessibilityLabel={label}
      />
    </View>
  );

  return (
    <Sheet visible={visible} onClose={onClose} title="Mi cuenta de cobro">
      <Text style={styles.cardText}>Aquí te depositaremos tus comisiones. Solo tú y el administrador de Salomón ven estos datos.</Text>
      <View style={styles.chipRow}>
        <Chip label="PayPal" active={method === 'paypal'} onPress={() => setMethod('paypal')} />
        <Chip label="Cuenta bancaria" active={method === 'banco'} onPress={() => setMethod('banco')} />
      </View>
      {method === 'paypal' ? (
        field('Correo de PayPal', paypal, setPaypal, 'cobro@correo.com', 'email-address')
      ) : (
        <>
          {field('Banco', banco, setBanco, 'Ej. Banco Popular')}
          {field('Número de cuenta', cuenta, setCuenta)}
          {field('Tipo de cuenta', tipo, setTipo, 'Ahorros o corriente')}
          {field('Nombre del titular', titular, setTitular)}
          {field('Cédula o RNC (opcional)', documento, setDocumento)}
        </>
      )}
      <GoldButton label="Guardar" onPress={save} loading={saving} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 130, gap: spacing.md, maxWidth: 640, width: '100%', alignSelf: 'center' },
  hero: { alignItems: 'center', paddingVertical: spacing.lg },
  heroTitle: { fontSize: 26, fontWeight: '900', color: colors.gold, marginBottom: spacing.sm },
  heroSub: { fontSize: 14, color: colors.onDarkMuted, textAlign: 'center', lineHeight: 22 },
  codeCard: { backgroundColor: colors.bgDeep, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', ...shadow.hero },
  codeLabel: { fontSize: 10, fontWeight: '700', color: colors.gold, letterSpacing: 1.8, marginBottom: spacing.sm },
  codeValue: { fontSize: 32, fontWeight: '900', color: colors.onDark, letterSpacing: 3, marginBottom: spacing.lg },
  codeActions: { flexDirection: 'row', gap: spacing.md, width: '100%' },
  codeBtn: { flex: 1, borderRadius: radius.pill, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder },
  codeBtnOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  codeBtnText: { fontSize: 13, fontWeight: '700', color: colors.onDark },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { flexBasis: '48%', flexGrow: 1, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.glassBorder, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: colors.goldBright },
  statLabel: { fontSize: 11, color: colors.onDarkMuted, marginTop: 2 },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.glassBorder, gap: spacing.sm },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.gold },
  cardText: { fontSize: 13, color: colors.onDark, lineHeight: 19 },
  note: { fontSize: 11.5, color: colors.onDarkMuted, lineHeight: 17 },
  section: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2, marginTop: spacing.sm },
  empty: { fontSize: 13, color: colors.onDarkMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.onDark },
  rowSub: { fontSize: 11.5, color: colors.onDarkMuted, marginTop: 2 },
  rowAmt: { fontSize: 14, fontWeight: '800', color: colors.goldBright },
  rowState: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, color: colors.onDark,
  },
});
