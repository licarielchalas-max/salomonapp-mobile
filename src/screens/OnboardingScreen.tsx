import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { TextInput } from '../components/AppTextInput';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, fonts } from '../theme';
import { PlanPicker } from '../components/PlanPicker';
import { useAuth } from '../context/AuthProvider';
import { useAccount } from '../context/AccountProvider';
import { useHouseholdSettings } from '../hooks/useHouseholdSettings';
import { useProfiles } from '../hooks/useProfiles';
import { useGoals } from '../hooks/useGoals';
import { usePlanActions } from '../hooks/usePlanActions';
import { isUnlimited, planInfo, profilesCap, TRIAL_DAYS } from '../lib/plans';
import type { SubscriptionPlan } from '../types/db';

type Step = 'plan' | 'finanzas' | 'perfiles' | 'meta' | 'listo';

function parseAmount(raw: string): number {
  const n = parseFloat(raw.replace(/,/g, '').trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

const MONEDA = '¤';

function money(n: number) {
  return `${MONEDA}${Math.round(n).toLocaleString('es-DO')}`;
}

export function OnboardingScreen() {
  const { householdId } = useAuth();
  const { plan, access, setOnboardingCompleted } = useAccount();
  const settings = useHouseholdSettings();
  const profiles = useProfiles();
  const { addGoal } = useGoals(householdId);
  const { busy, startTrial, payWithPayPal } = usePlanActions();

  const [stepIndex, setStepIndex] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('premium');
  const [salary, setSalary] = useState('');
  const [budget, setBudget] = useState('');
  const [newProfile, setNewProfile] = useState('');
  const [createGoal, setCreateGoal] = useState(true);
  const [goalAmount, setGoalAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const planChosen = planInfo(plan);
  const steps = useMemo<Step[]>(
    () => ['plan', 'finanzas', ...(planChosen.profiles > 1 ? (['perfiles'] as Step[]) : []), 'meta', 'listo'],
    [planChosen.profiles],
  );
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const salaryValue = parseAmount(salary);
  const suggestedGoal = salaryValue * 2;

  function next() {
    setError(null);
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function back() {
    setError(null);
    setNotice(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function handleStartTrial() {
    setError(null);
    const { error: err } = await startTrial(selectedPlan);
    if (err) return setError(err);
    next();
  }

  async function handlePayNow() {
    setError(null);
    setNotice(null);
    const trial = await startTrial(selectedPlan);
    if (trial.error) return setError(trial.error);
    const pay = await payWithPayPal(selectedPlan);
    if (pay.notConfigured) {
      setNotice('Los pagos con PayPal aún no están activos, así que empiezas con tu prueba gratis. Podrás suscribirte después desde Planes.');
    } else if (pay.error) {
      setNotice(`No pudimos abrir PayPal (${pay.error}). Empiezas con tu prueba gratis y puedes suscribirte después.`);
    }
    next();
  }

  async function saveFinanzas() {
    setSaving(true);
    setError(null);
    if (salaryValue > 0) await settings.updateMonthlySalary(salaryValue);
    if (parseAmount(budget) > 0) await settings.updateMonthlyBudget(parseAmount(budget));
    setSaving(false);
    if (salaryValue > 0 && !goalAmount) setGoalAmount(String(Math.round(salaryValue * 2)));
    next();
  }

  async function handleAddProfile() {
    setError(null);
    const { error: err } = await profiles.addProfile(newProfile);
    if (err) return setError(err);
    setNewProfile('');
  }

  async function saveMeta() {
    setError(null);
    const amount = parseAmount(goalAmount) || suggestedGoal;
    if (createGoal && amount > 0) {
      setSaving(true);
      const { error: err } = await addGoal({ nombre: 'Fondo de Emergencia', target_amount: amount });
      setSaving(false);
      if (err) return setError(err);
    }
    next();
  }

  async function finish() {
    setSaving(true);
    const { error: err } = await setOnboardingCompleted(true);
    setSaving(false);
    if (err) setError(err);
  }

  const daysLeft = access.daysLeft ?? TRIAL_DAYS;

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={[colors.bgDeep, colors.bg, '#041F0F']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.progressRow}>
            {steps.map((s, i) => (
              <View key={s} style={[styles.progressDot, i <= stepIndex && styles.progressDotOn]} />
            ))}
          </View>
          <Text style={styles.stepLabel}>PASO {Math.min(stepIndex + 1, steps.length)} DE {steps.length}</Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {step === 'plan' && (
            <>
              <Text style={styles.title}>Bienvenido a Salomón</Text>
              <Text style={styles.sub}>
                Elige cómo quieres empezar. Los tres planes tienen todas las funciones; cambia solo cuántas personas lo usan.
              </Text>
              <PlanPicker selected={selectedPlan} onSelect={setSelectedPlan} />
              <Pressable style={styles.primaryWrap} onPress={handleStartTrial} disabled={busy}>
                <LinearGradient colors={[colors.goldBright, colors.gold, colors.goldDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                  {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Empezar mi prueba gratis · {TRIAL_DAYS} días</Text>}
                </LinearGradient>
              </Pressable>
              <Text style={styles.hint}>Sin tarjeta. Al terminar la prueba eliges si te suscribes.</Text>
              <Pressable style={styles.linkBtn} onPress={handlePayNow} disabled={busy}>
                <Text style={styles.linkText}>Prefiero suscribirme ahora con PayPal</Text>
              </Pressable>
            </>
          )}

          {step === 'finanzas' && (
            <>
              <Text style={styles.title}>Tu punto de partida</Text>
              <Text style={styles.sub}>Con esto calculo tu fondo de emergencia, tu presupuesto y tu Score Salomón. Puedes cambiarlo después en Preferencias.</Text>

              <Text style={styles.label}>Salario neto mensual (¤)</Text>
              <TextInput style={styles.input} value={salary} onChangeText={setSalary} placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" />

              <Text style={styles.label}>Presupuesto mensual de gastos</Text>
              <TextInput style={styles.input} value={budget} onChangeText={setBudget} placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" />
              {salaryValue > 0 && (
                <Pressable onPress={() => setBudget(String(Math.round(salaryValue * 0.8)))}>
                  <Text style={styles.linkText}>Sugerencia: {money(salaryValue * 0.8)} (80% de tu salario)</Text>
                </Pressable>
              )}

              <Pressable style={styles.primaryWrap} onPress={saveFinanzas} disabled={saving}>
                <LinearGradient colors={[colors.goldBright, colors.gold, colors.goldDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                  {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Continuar</Text>}
                </LinearGradient>
              </Pressable>
            </>
          )}

          {step === 'perfiles' && (
            <>
              <Text style={styles.title}>Tu familia en Salomón</Text>
              <Text style={styles.sub}>
                {isUnlimited(planChosen.profiles)
                  ? `${planChosen.name} permite perfiles ilimitados que comparten los datos del hogar. Agrégalos ahora o después en Preferencias.`
                  : `${planChosen.name} permite ${planChosen.profiles} perfiles que comparten los datos del hogar. Agrégalos ahora o después en Preferencias.`}
              </Text>
              {profiles.members.map((m) => (
                <View key={m.id} style={styles.profileRow}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{m.display_name.charAt(0).toUpperCase()}</Text></View>
                  <Text style={styles.profileName}>{m.display_name}</Text>
                  {m.role === 'owner' && <Text style={styles.ownerTag}>Titular</Text>}
                </View>
              ))}
              {profiles.canAdd ? (
                <>
                  <Text style={styles.label}>Nombre del nuevo perfil</Text>
                  <TextInput style={styles.input} value={newProfile} onChangeText={setNewProfile} placeholder="Ej: María" placeholderTextColor={colors.muted} />
                  <Pressable style={styles.secondaryBtn} onPress={handleAddProfile}>
                    <Text style={styles.secondaryText}>+ Agregar perfil ({profiles.members.length}/{profilesCap(profiles.limit)})</Text>
                  </Pressable>
                </>
              ) : (
                <Text style={styles.hint}>Ya usas los {profiles.limit} perfiles de tu plan.</Text>
              )}
              <Pressable style={styles.primaryWrap} onPress={next}>
                <LinearGradient colors={[colors.goldBright, colors.gold, colors.goldDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                  <Text style={styles.primaryText}>Continuar</Text>
                </LinearGradient>
              </Pressable>
            </>
          )}

          {step === 'meta' && (
            <>
              <Text style={styles.title}>Tu primera meta</Text>
              <Text style={styles.sub}>Lo primero que recomienda el Rey Salomón: un fondo de emergencia equivalente a 2 meses de salario.</Text>
              <Pressable style={[styles.choiceCard, createGoal && styles.choiceCardOn]} onPress={() => setCreateGoal(true)}>
                <Text style={styles.choiceTitle}>🛡️ Crear mi Fondo de Emergencia</Text>
                <Text style={styles.choiceSub}>Objetivo</Text>
                <TextInput
                  style={styles.input}
                  value={goalAmount}
                  onChangeText={setGoalAmount}
                  placeholder={suggestedGoal > 0 ? String(Math.round(suggestedGoal)) : '0.00'}
                  placeholderTextColor={colors.muted}
                  keyboardType="decimal-pad"
                />
              </Pressable>
              <Pressable style={[styles.choiceCard, !createGoal && styles.choiceCardOn]} onPress={() => setCreateGoal(false)}>
                <Text style={styles.choiceTitle}>Lo haré más adelante</Text>
              </Pressable>
              <Pressable style={styles.primaryWrap} onPress={saveMeta} disabled={saving}>
                <LinearGradient colors={[colors.goldBright, colors.gold, colors.goldDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                  {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Continuar</Text>}
                </LinearGradient>
              </Pressable>
            </>
          )}

          {step === 'listo' && (
            <>
              <Text style={styles.bigIcon}>👑</Text>
              <Text style={styles.title}>Todo listo</Text>
              {notice && (
                <View style={styles.noticeBox}>
                  <Text style={styles.noticeText}>{notice}</Text>
                </View>
              )}
              <View style={styles.summary}>
                <Text style={styles.summaryRow}>Plan: <Text style={styles.summaryVal}>{planChosen.name}</Text></Text>
                <Text style={styles.summaryRow}>Prueba gratis: <Text style={styles.summaryVal}>{daysLeft} días restantes</Text></Text>
                {salaryValue > 0 && <Text style={styles.summaryRow}>Salario: <Text style={styles.summaryVal}>{money(salaryValue)}</Text></Text>}
                {planChosen.profiles > 1 && <Text style={styles.summaryRow}>Perfiles: <Text style={styles.summaryVal}>{isUnlimited(planChosen.profiles) ? `${profiles.members.length}` : `${profiles.members.length} de ${planChosen.profiles}`}</Text></Text>}
              </View>
              <Text style={styles.sub}>Siguiente paso: registra tu primer gasto o pregúntale algo al Rey Salomón con el botón de la corona.</Text>
              <Pressable style={styles.primaryWrap} onPress={finish} disabled={saving}>
                <LinearGradient colors={[colors.goldBright, colors.gold, colors.goldDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                  {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Entrar a Salomón</Text>}
                </LinearGradient>
              </Pressable>
            </>
          )}

          {stepIndex > 0 && step !== 'listo' && (
            <Pressable style={styles.linkBtn} onPress={back}>
              <Text style={styles.linkText}>← Atrás</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: 60, maxWidth: 560, width: '100%', alignSelf: 'center' },
  progressRow: { flexDirection: 'row', gap: 6, marginTop: spacing.md, marginBottom: spacing.sm },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line },
  progressDotOn: { backgroundColor: colors.gold },
  stepLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: colors.onDarkMuted, marginBottom: spacing.lg },
  title: { fontSize: 28, fontFamily: fonts.heading, fontWeight: '700', color: colors.gold, marginBottom: spacing.sm },
  sub: { fontSize: 14, lineHeight: 21, color: colors.onDarkMuted, marginBottom: spacing.xl },
  label: { fontSize: 12, fontWeight: '700', color: colors.onDark, marginTop: spacing.md, marginBottom: 6 },
  input: {
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 16, color: colors.onDark,
  },
  primaryWrap: { marginTop: spacing.xl },
  primaryBtn: { paddingVertical: 16, borderRadius: radius.pill, alignItems: 'center' },
  primaryText: { fontSize: 15, fontWeight: '800', color: colors.onNavy },
  secondaryBtn: { marginTop: spacing.md, paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.navy, alignItems: 'center' },
  secondaryText: { fontSize: 14, fontWeight: '700', color: colors.navy },
  linkBtn: { alignSelf: 'center', paddingVertical: spacing.md },
  linkText: { fontSize: 13, color: colors.navy, fontWeight: '600', textDecorationLine: 'underline' },
  hint: { fontSize: 12, color: colors.onDarkMuted, textAlign: 'center', marginTop: spacing.sm },
  errorBox: { backgroundColor: colors.rustSoft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  errorText: { color: colors.rust, fontSize: 13 },
  noticeBox: { backgroundColor: colors.bgDeep, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  noticeText: { fontSize: 12, lineHeight: 18, color: colors.onDark },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.glassBorder },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontWeight: '800' },
  profileName: { flex: 1, fontSize: 15, color: colors.onDark, fontWeight: '600' },
  ownerTag: { fontSize: 10, fontWeight: '800', color: colors.gold },
  choiceCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 2, borderColor: colors.glassBorder },
  choiceCardOn: { borderColor: colors.navy },
  choiceTitle: { fontSize: 15, fontWeight: '700', color: colors.onDark },
  choiceSub: { fontSize: 11, color: colors.onDarkMuted, marginTop: spacing.sm, marginBottom: 6 },
  bigIcon: { fontSize: 56, textAlign: 'center', marginTop: spacing.lg, marginBottom: spacing.sm },
  summary: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg, gap: 8, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.glassBorder },
  summaryRow: { fontSize: 14, color: colors.onDarkMuted },
  summaryVal: { color: colors.onDark, fontWeight: '700' },
});
