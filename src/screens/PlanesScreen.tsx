import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, shadow, fonts } from '../theme';
import { PlanPicker } from '../components/PlanPicker';
import { PLANS, isUnlimited, planInfo, profilesLabel, TRIAL_DAYS } from '../lib/plans';
import { useAccount } from '../context/AccountProvider';
import { useAuth } from '../context/AuthProvider';
import { usePlanActions } from '../hooks/usePlanActions';
import type { SubscriptionPlan } from '../types/db';

const ALL_FEATURES = [
  { icon: '🤖', label: 'Rey Salomón IA' },
  { icon: '💰', label: 'Ingresos y gastos ilimitados' },
  { icon: '📊', label: 'Presupuesto por categoría' },
  { icon: '🎯', label: 'Metas de ahorro ilimitadas' },
  { icon: '🏦', label: 'Cuentas bancarias ilimitadas' },
  { icon: '📅', label: 'Gastos programados' },
  { icon: '📈', label: 'Reportes y análisis avanzados' },
  { icon: '💳', label: 'Calculadora de deudas' },
  { icon: '📚', label: 'Academia financiera completa' },
  { icon: '🏆', label: 'Talleres interactivos' },
  { icon: '💹', label: 'Inversiones y portafolio' },
  { icon: '🤝', label: 'Conciliación automática' },
];

// locked = la prueba terminó y no hay plan pagado: esta pantalla reemplaza a la app.
export function PlanesScreen({ locked = false }: { locked?: boolean }) {
  const { plan: currentPlan, access } = useAccount();
  const { signOut } = useAuth();
  const { busy, startTrial, payWithPayPal } = usePlanActions();
  const [selected, setSelected] = useState<SubscriptionPlan>(
    locked || currentPlan === 'personal' ? 'premium' : currentPlan,
  );
  const [notice, setNotice] = useState<string | null>(null);

  const chosen = planInfo(selected);
  const canSwitchInTrial = access.isTrial && selected !== currentPlan;

  async function handlePay() {
    setNotice(null);
    const { error, notConfigured } = await payWithPayPal(selected);
    if (!error) return;
    if (notConfigured) {
      setNotice(
        access.isTrial
          ? 'Los pagos con PayPal aún no están activos. Mientras tanto puedes seguir con tu prueba gratis.'
          : 'Los pagos con PayPal aún no están activos. Escríbenos a soporte@salomon.app y activamos tu plan.',
      );
    } else {
      Alert.alert('No se pudo iniciar el pago', error);
    }
  }

  async function handleSwitch() {
    setNotice(null);
    const { error } = await startTrial(selected);
    if (error) Alert.alert('No se pudo cambiar el plan', error);
    else setNotice(`Listo: ahora estás en ${chosen.name}. Tu prueba gratis continúa.`);
  }

  const statusText = access.isPaid
    ? 'Suscripción activa'
    : access.isTrial
      ? `Prueba gratis · te quedan ${access.daysLeft} día${access.daysLeft === 1 ? '' : 's'}`
      : 'Tu prueba gratis terminó';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{locked ? 'Tu prueba terminó' : 'Elige tu plan'}</Text>
          <View style={styles.heroPillWrap}>
            <Text style={styles.heroPill}>
              Los tres planes dan acceso a <Text style={styles.heroPillBold}>todas</Text> las funciones
            </Text>
          </View>
          <Text style={styles.heroSub}>
            {locked
              ? 'Tus datos están seguros. Elige un plan para seguir usando Salomón.'
              : 'Lo único que varía es cuántas personas lo usan.\nNadie queda fuera de una función por pagar menos.'}
          </Text>
        </View>

        <View style={[styles.statusCard, !access.hasAccess && styles.statusCardWarn]}>
          <Text style={styles.statusLabel}>TU CUENTA</Text>
          <Text style={styles.statusPlan}>{planInfo(currentPlan).name}</Text>
          <Text style={styles.statusLine}>{statusText}</Text>
        </View>

        <PlanPicker selected={selected} onSelect={setSelected} currentPlan={access.hasAccess ? currentPlan : null} />

        {notice && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        )}

        {!access.isPaid && (
          <Pressable style={[styles.ctaBtn, busy && styles.ctaBtnDisabled]} onPress={handlePay} disabled={busy}>
            {busy ? (
              <ActivityIndicator color={colors.onDark} />
            ) : (
              <>
                <Text style={styles.ctaBtnText}>
                  Suscribirme — US${chosen.priceUsd}/mes · {profilesLabel(chosen.profiles)}
                </Text>
                <Text style={styles.ctaBtnSub}>Visa · Mastercard · PayPal · Cancela cuando quieras</Text>
              </>
            )}
          </Pressable>
        )}

        {canSwitchInTrial && (
          <Pressable style={styles.secondaryBtn} onPress={handleSwitch} disabled={busy}>
            <Text style={styles.secondaryBtnText}>
              Probar {chosen.name} gratis (continúa tu prueba de {TRIAL_DAYS} días)
            </Text>
          </Pressable>
        )}

        {access.isPaid && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              Tu suscripción se administra desde tu cuenta de PayPal (cambios de plan y cancelación).
            </Text>
          </View>
        )}

        {locked && (
          <Pressable style={styles.signOutLink} onPress={signOut}>
            <Text style={styles.signOutText}>Cerrar sesión</Text>
          </Pressable>
        )}

        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>Todo incluido en los 3 planes</Text>
          <Text style={styles.featuresSub}>
            Alianza y Legado permiten crear perfiles adicionales con acceso completo a la app
            y la información compartida del hogar. La suscripción siempre pertenece a la cuenta titular.
          </Text>
          <View style={styles.featuresList}>
            {ALL_FEATURES.map((f) => (
              <View key={f.label} style={styles.featureRow}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureLabel}>{f.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionLabel}>COMPARACIÓN DE PERFILES</Text>
        <View style={styles.compTable}>
          <View style={[styles.compRow, styles.compHeader]}>
            <Text style={[styles.compCell, styles.compPlan]}>Plan</Text>
            <Text style={[styles.compCell, styles.compColHead]}>Perfiles</Text>
            <Text style={[styles.compCell, styles.compColHead]}>Precio/mes</Text>
            <Text style={[styles.compCell, styles.compColHead]}>Por perfil</Text>
          </View>
          {PLANS.map((p, i) => {
            const hl = p.key === 'alianza';
            return (
              <View key={p.id} style={[styles.compRow, i % 2 === 0 && styles.compRowAlt, hl && styles.compRowHL]}>
                <Text style={[styles.compCell, styles.compPlan, hl && styles.compCellHL]}>{p.name.replace('Salomón ', '')}</Text>
                <Text style={[styles.compCell, hl && styles.compCellHL]}>{isUnlimited(p.profiles) ? 'Ilimitados' : p.profiles === 1 ? '1' : `Hasta ${p.profiles}`}</Text>
                <Text style={[styles.compCell, hl && styles.compCellHL]}>US${p.priceUsd}</Text>
                <Text style={[styles.compCell, hl && styles.compCellHL]}>{isUnlimited(p.profiles) ? '—' : `US$${(p.priceUsd / p.profiles).toFixed(2)}`}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.trust}>
          {[
            { icon: '🔒', text: 'Pago seguro vía PayPal\nVisa · Mastercard incluidas' },
            { icon: '↩️', text: 'Sin contratos\nCancela cuando quieras' },
            { icon: '🇩🇴', text: 'Hecho en RD\nPara dominicanos' },
          ].map((t) => (
            <View key={t.text} style={styles.trustItem}>
              <Text style={styles.trustIcon}>{t.icon}</Text>
              <Text style={styles.trustText}>{t.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.verse}>
          <Text style={styles.verseText}>
            "Los planes del diligente ciertamente tienden a la abundancia."
          </Text>
          <Text style={styles.verseRef}>Proverbios 21:5</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 130 },

  hero: { alignItems: 'center', paddingVertical: spacing.xl, marginBottom: spacing.lg },
  heroTitle: { fontSize: 30, fontWeight: '700', fontFamily: fonts.heading, color: colors.gold, marginBottom: spacing.md },
  heroPillWrap: {
    backgroundColor: colors.bgDeep, borderRadius: radius.pill,
    paddingHorizontal: spacing.lg, paddingVertical: 8, marginBottom: spacing.md,
  },
  heroPill: { fontSize: 13, color: colors.onDarkMuted },
  heroPillBold: { fontWeight: '800', color: colors.gold },
  heroSub: { fontSize: 13, color: colors.onDarkMuted, textAlign: 'center', lineHeight: 20 },

  ctaBtn: {
    backgroundColor: colors.bgDeep, borderRadius: radius.pill,
    paddingVertical: 18, alignItems: 'center',
    marginBottom: spacing.xl, ...shadow.hero,
  },
  ctaBtnText: { fontSize: 15, fontWeight: '800', color: colors.onDark, marginBottom: 4 },
  ctaBtnSub: { fontSize: 11, color: colors.onDarkMuted },
  ctaBtnDisabled: { opacity: 0.6 },
  secondaryBtn: {
    borderRadius: radius.pill, paddingVertical: 14, paddingHorizontal: spacing.lg, alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.navy, marginBottom: spacing.lg,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '700', color: colors.navy, textAlign: 'center' },
  statusCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.glassBorder, marginBottom: spacing.lg, gap: 4,
  },
  statusCardWarn: { borderColor: colors.rust, backgroundColor: colors.rustSoft },
  statusLabel: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2 },
  statusPlan: { fontSize: 17, fontWeight: '800', color: colors.gold },
  statusLine: { fontSize: 13, color: colors.onDark },
  noticeBox: {
    backgroundColor: colors.bgDeep, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg,
  },
  noticeText: { fontSize: 12, color: colors.onDark, lineHeight: 18 },
  signOutLink: { alignSelf: 'center', paddingVertical: spacing.md, marginBottom: spacing.lg },
  signOutText: { fontSize: 12, color: colors.onDarkMuted, textDecorationLine: 'underline' },

  featuresCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.glassBorder,
    marginBottom: spacing.lg,
  },
  featuresTitle: { fontSize: 15, fontWeight: '800', color: colors.gold, marginBottom: spacing.sm },
  featuresSub: { fontSize: 12, color: colors.onDarkMuted, lineHeight: 18, marginBottom: spacing.lg },
  featuresList: { gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureIcon: { fontSize: 18, width: 26 },
  featureLabel: { fontSize: 13, color: colors.onDark, flex: 1 },

  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  compTable: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.glassBorder, overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  compHeader: { backgroundColor: colors.bgDeep },
  compRow: { flexDirection: 'row', paddingVertical: 11, paddingHorizontal: spacing.sm },
  compRowAlt: { backgroundColor: colors.bg },
  compRowHL: { backgroundColor: colors.greenSoft },
  compCell: { flex: 1, fontSize: 12, textAlign: 'center', color: colors.onDark },
  compCellHL: { fontWeight: '700', color: colors.gold },
  compPlan: { textAlign: 'left', fontWeight: '600', flex: 1.2 },
  compColHead: { color: colors.onDark, fontWeight: '700', fontSize: 11 },

  trust: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  trustItem: { flex: 1, alignItems: 'center', gap: 6 },
  trustIcon: { fontSize: 22 },
  trustText: { fontSize: 10, color: colors.onDarkMuted, textAlign: 'center', lineHeight: 15 },

  verse: {
    backgroundColor: colors.bgDeep, borderRadius: radius.lg,
    padding: spacing.xl, ...shadow.card,
  },
  verseText: { fontSize: 13, color: colors.onDark, fontStyle: 'italic', lineHeight: 20, marginBottom: 6 },
  verseRef: { fontSize: 11, color: colors.gold, fontWeight: '700' },
});
