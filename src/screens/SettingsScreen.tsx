import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { TextInput } from '../components/AppTextInput';
import { Text } from '../components/AppText';
import { CurrencySettings } from '../components/CurrencySettings';
import { AccountSettings } from '../components/AccountSettings';
import { LocaleSettings } from '../components/LocaleSettings';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthProvider';
import { useAccount } from '../context/AccountProvider';
import { useProfiles } from '../hooks/useProfiles';
import { planInfo, profilesCap } from '../lib/plans';
import { navigationRef } from '../navigation/navigationRef';
import { useHouseholdSettings } from '../hooks/useHouseholdSettings';
import { useNotifications } from '../context/NotificationsProvider';
import { colors, spacing, radius, shadow, glass } from '../theme';
import { isAppLockEnabled, setAppLockEnabled, isBiometricAvailable } from '../lib/appLock';

function fmt(n: number) {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SettingsScreen() {
  const { user, signOut } = useAuth();
  const notif = useNotifications();
  const { monthlyBudgetTotal, monthlySalary, moneda, nombreUsuario, loading, updateMonthlyBudget, updateMonthlySalary, updatePreferences } = useHouseholdSettings();
  const { plan, access, setOnboardingCompleted } = useAccount();
  const { members, limit, canAdd, addProfile, renameProfile, removeProfile } = useProfiles();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [newProfile, setNewProfile] = useState('');

  const [editName, setEditName] = useState(false);
  const [nameVal, setNameVal] = useState('');
  const [editBudget, setEditBudget] = useState(false);
  const [budgetVal, setBudgetVal] = useState('');
  const [editSalary, setEditSalary] = useState(false);
  const [salaryVal, setSalaryVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [appLockEnabled, setAppLockState] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const emergencyFundGoal = monthlySalary * 2;

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
    isAppLockEnabled().then(setAppLockState);
  }, []);

  async function toggleAppLock(value: boolean) {
    if (value && !biometricAvailable) {
      Alert.alert(
        'Biometría no disponible',
        'Configura la huella digital o Face ID en los ajustes de tu teléfono primero.',
      );
      return;
    }
    await setAppLockEnabled(value);
    setAppLockState(value);
  }

  async function saveName() {
    if (!nameVal.trim()) return;
    setSaving(true);
    await updatePreferences({ nombreUsuario: nameVal.trim() });
    setSaving(false);
    setEditName(false);
  }

  async function saveBudget() {
    const v = parseFloat(budgetVal.replace(',', '.'));
    if (!v || v <= 0) return Alert.alert('Monto inválido', 'Ingresa un presupuesto mayor a 0.');
    setSaving(true);
    await updateMonthlyBudget(v);
    setSaving(false);
    setEditBudget(false);
  }

  async function saveSalary() {
    const v = parseFloat(salaryVal.replace(',', '.'));
    if (!v || v <= 0) return Alert.alert('Monto inválido', 'Ingresa tu salario mensual.');
    setSaving(true);
    await updateMonthlySalary(v);
    setSaving(false);
    setEditSalary(false);
  }

  function confirmSignOut() {
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: signOut },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[colors.bgDeep, colors.bg]} locations={[0, 0.4]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator color={colors.navy} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[colors.bgDeep, colors.bg]} locations={[0, 0.4]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{(nombreUsuario || user?.email || 'U').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{nombreUsuario || 'Configurar nombre'}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? 'Sin sesión'}</Text>
          </View>
          <Pressable onPress={() => { setNameVal(nombreUsuario); setEditName(true); }}>
            <Text style={styles.editLink}>Editar</Text>
          </Pressable>
        </View>

        {editName && (
          <View style={styles.editCard}>
            <Text style={styles.editLabel}>NOMBRE DE USUARIO</Text>
            <TextInput style={styles.editInput} value={nameVal} onChangeText={setNameVal} placeholder="Tu nombre..." placeholderTextColor={colors.muted} autoFocus />
            <View style={styles.editActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setEditName(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={saveName} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
              </Pressable>
            </View>
          </View>
        )}

        {/* Financial setup */}
        <Text style={styles.sectionTitle}>MI CUENTA</Text>
        <AccountSettings />

        <Text style={styles.sectionTitle}>IDIOMA Y ZONA</Text>
        <LocaleSettings />

        <Text style={styles.sectionTitle}>MONEDA Y TASAS DE CAMBIO</Text>
        <CurrencySettings />

        <Text style={styles.sectionTitle}>CONFIGURACIÓN FINANCIERA</Text>

        {/* Salary */}
        <View style={styles.settingCard}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>💰 Salario mensual</Text>
            <Text style={styles.settingSubtitle}>Base para calcular tu Fondo de Emergencia</Text>
            <Text style={styles.settingValue}>{moneda}{fmt(monthlySalary)}/mes</Text>
          </View>
          <Pressable onPress={() => { setSalaryVal(String(monthlySalary)); setEditSalary(!editSalary); }}>
            <Text style={styles.editLink}>{editSalary ? 'Cerrar' : 'Editar'}</Text>
          </Pressable>
        </View>
        {editSalary && (
          <View style={styles.editCard}>
            <Text style={styles.editLabel}>SALARIO NETO MENSUAL (¤)</Text>
            <TextInput style={styles.editInput} value={salaryVal} onChangeText={setSalaryVal} placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" autoFocus />
            <View style={styles.emergencyNote}>
              <Text style={styles.emergencyText}>
                🛡️ Tu fondo de emergencia ideal: <Text style={{ fontWeight: '700', color: colors.gold }}>{moneda}{fmt(parseFloat(salaryVal || '0') * 2)}</Text> (2x tu salario)
              </Text>
            </View>
            <View style={styles.editActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setEditSalary(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={saveSalary} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
              </Pressable>
            </View>
          </View>
        )}

        {/* Monthly budget */}
        <View style={styles.settingCard}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>📊 Presupuesto mensual total</Text>
            <Text style={styles.settingSubtitle}>Límite global para el módulo de presupuesto</Text>
            <Text style={styles.settingValue}>{moneda}{fmt(monthlyBudgetTotal)}/mes</Text>
          </View>
          <Pressable onPress={() => { setBudgetVal(String(monthlyBudgetTotal)); setEditBudget(!editBudget); }}>
            <Text style={styles.editLink}>{editBudget ? 'Cerrar' : 'Editar'}</Text>
          </Pressable>
        </View>
        {editBudget && (
          <View style={styles.editCard}>
            <Text style={styles.editLabel}>PRESUPUESTO MENSUAL TOTAL (¤)</Text>
            <TextInput style={styles.editInput} value={budgetVal} onChangeText={setBudgetVal} placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" autoFocus />
            <View style={styles.editActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setEditBudget(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={saveBudget} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
              </Pressable>
            </View>
          </View>
        )}

        {/* Emergency fund summary */}
        {monthlySalary > 0 && (
          <View style={styles.emergencyCard}>
            <Text style={styles.emergencyCardTitle}>🛡️ Fondo de Emergencia recomendado</Text>
            <Text style={styles.emergencyCardValue}>{moneda}{fmt(emergencyFundGoal)}</Text>
            <Text style={styles.emergencyCardSub}>Equivale a 2 meses de tu salario de {moneda}{fmt(monthlySalary)}</Text>
          </View>
        )}

        {/* Plan */}
        <Text style={styles.sectionTitle}>MI PLAN</Text>
        <View style={styles.settingCard}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>⭐ {planInfo(plan).name}</Text>
            <Text style={styles.settingSubtitle}>
              {access.isPaid
                ? 'Suscripción activa'
                : access.isTrial
                  ? `Prueba gratis · te quedan ${access.daysLeft} día${access.daysLeft === 1 ? '' : 's'}`
                  : 'Sin suscripción activa'}
            </Text>
          </View>
          <Pressable onPress={() => navigationRef.current?.navigate('Planes')}>
            <Text style={styles.editLink}>Ver planes</Text>
          </Pressable>
        </View>

        {/* Profiles */}
        <Text style={styles.sectionTitle}>PERFILES DEL HOGAR ({members.length}/{profilesCap(limit)})</Text>
        {members.map((m) => (
          <View key={m.id} style={styles.settingCard}>
            <View style={styles.settingInfo}>
              {renamingId === m.id ? (
                <TextInput
                  style={styles.editInput}
                  value={renameVal}
                  onChangeText={setRenameVal}
                  autoFocus
                  maxLength={40}
                  accessibilityLabel="Nombre del perfil"
                />
              ) : (
                <Text style={styles.settingTitle}>{m.display_name}{m.role === 'owner' ? ' · Titular' : ''}</Text>
              )}
            </View>
            {renamingId === m.id ? (
              <>
                <Pressable
                  onPress={async () => {
                    const { error } = await renameProfile(m.id, renameVal);
                    if (error) Alert.alert('No se pudo guardar', error);
                    else setRenamingId(null);
                  }}
                >
                  <Text style={styles.editLink}>Guardar</Text>
                </Pressable>
                <Pressable onPress={() => setRenamingId(null)}>
                  <Text style={[styles.editLink, { color: colors.onDarkMuted }]}>Cancelar</Text>
                </Pressable>
              </>
            ) : (
              <Pressable onPress={() => { setRenamingId(m.id); setRenameVal(m.display_name); }} accessibilityLabel={`Editar ${m.display_name}`}>
                <Text style={styles.editLink}>Editar</Text>
              </Pressable>
            )}
            {m.role !== 'owner' && renamingId !== m.id && (
              <Pressable
                onPress={() =>
                  Alert.alert('Eliminar perfil', `¿Eliminar a ${m.display_name}? Sus movimientos se conservan.`, [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: () => removeProfile(m.id) },
                  ])
                }
              >
                <Text style={[styles.editLink, { color: colors.rust }]}>Quitar</Text>
              </Pressable>
            )}
          </View>
        ))}
        {canAdd ? (
          <View style={styles.editCard}>
            <Text style={styles.editLabel}>NUEVO PERFIL</Text>
            <TextInput style={styles.editInput} value={newProfile} onChangeText={setNewProfile} placeholder="Nombre" placeholderTextColor={colors.muted} />
            <Pressable
              style={styles.saveBtn}
              onPress={async () => {
                const { error } = await addProfile(newProfile);
                if (error) Alert.alert('No se pudo agregar', error);
                else setNewProfile('');
              }}
            >
              <Text style={styles.saveBtnText}>Agregar perfil</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.settingCard} onPress={() => navigationRef.current?.navigate('Planes')}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingSubtitle}>
                Tu plan permite {limit} perfil{limit === 1 ? '' : 'es'}. Toca para mejorar tu plan y agregar más.
              </Text>
            </View>
          </Pressable>
        )}

        {/* Security */}
        <Text style={styles.sectionTitle}>SEGURIDAD</Text>
        <View style={styles.settingCard}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>
              {biometricAvailable ? '🔒 Bloqueo biométrico' : '🔒 Bloqueo de app'}
            </Text>
            <Text style={styles.settingSubtitle}>
              {biometricAvailable
                ? 'Requiere huella o Face ID al abrir Salomón'
                : 'Configura biometría en tu teléfono para activar'}
            </Text>
          </View>
          <Switch
            value={appLockEnabled}
            onValueChange={toggleAppLock}
            trackColor={{ false: colors.line, true: colors.navy }}
            thumbColor={appLockEnabled ? colors.gold : colors.paper}
            disabled={!biometricAvailable}
          />
        </View>

        {/* Avisos */}
        <Text style={styles.sectionTitle}>AVISOS Y RECORDATORIOS</Text>
        <View style={styles.settingCard}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Avisos de agenda y pagos</Text>
            <Text style={styles.settingSubtitle}>
              {notif.scheduled > 0
                ? `${notif.scheduled} aviso${notif.scheduled !== 1 ? 's' : ''} programado${notif.scheduled !== 1 ? 's' : ''}`
                : 'Citas, reuniones y pagos pendientes'}
            </Text>
          </View>
          <Switch
            value={notif.enabled}
            onValueChange={(v) => notif.setEnabled(v)}
            trackColor={{ false: colors.line, true: colors.navy }}
            thumbColor={notif.enabled ? colors.gold : colors.paper}
          />
        </View>

        <Text style={styles.notifLabel}>Cómo te avisamos</Text>
        <View style={styles.toneRow}>
          {([
            ['sonido', 'Sonido'],
            ['vibracion', 'Vibración'],
            ['silencioso', 'Silencioso'],
          ] as const).map(([key, label]) => {
            const active = notif.tone === key;
            return (
              <Pressable
                key={key}
                onPress={() => notif.setTone(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.toneChip, active && styles.toneChipActive]}
              >
                <Text style={[styles.toneText, active && styles.toneTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {Platform.OS !== 'web' && notif.permission !== 'granted' && (
          <Pressable
            style={styles.notifWarn}
            onPress={async () => {
              const p = await notif.askPermission();
              if (p === 'denied') Alert.alert('Permiso desactivado', 'Activa las notificaciones de Salomón en los ajustes de tu teléfono.');
            }}
          >
            <Text style={styles.notifWarnText}>Las notificaciones están desactivadas. Toca para activarlas.</Text>
          </Pressable>
        )}

        <Pressable
          style={styles.testBtn}
          onPress={async () => {
            const ok = await notif.sendTest();
            if (!ok) Alert.alert('No se pudo enviar', 'Activa los permisos de notificaciones e inténtalo de nuevo.');
            else if (Platform.OS !== 'web') Alert.alert('Aviso en camino', 'Llegará en unos 3 segundos. Para ver cómo suena con la app cerrada, ciérrala ahora.');
          }}
          accessibilityLabel="Enviar un aviso de prueba"
        >
          <Text style={styles.testText}>Enviar aviso de prueba</Text>
        </Pressable>
        {Platform.OS === 'web' && (
          <Text style={styles.notifDesc}>En el navegador los avisos aparecen dentro de la app mientras está abierta. En el teléfono llegan a la barra de notificaciones, incluso con la app cerrada.</Text>
        )}

        {/* App info */}
        <Text style={styles.sectionTitle}>ACERCA DE SALOMÓN</Text>
        {[
          { label: 'Versión', value: Constants.expoConfig?.version ?? '1.0.0' },
          { label: 'Plan activo', value: planInfo(plan).name },
          { label: 'Moneda', value: moneda },
          { label: 'Soporte', value: 'soporte@salomon.app' },
        ].map((i) => (
          <View key={i.label} style={styles.infoRow}>
            <Text style={styles.infoLabel}>{i.label}</Text>
            <Text style={styles.infoValue}>{i.value}</Text>
          </View>
        ))}

        {/* Repeat onboarding */}
        <Pressable
          style={styles.settingCard}
          onPress={() =>
            Alert.alert('Repetir configuración inicial', 'Volverás a ver la guía de bienvenida (plan, finanzas, perfiles y meta). Tus datos no se borran.', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Repetir', onPress: () => setOnboardingCompleted(false) },
            ])
          }
        >
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>🧭 Repetir configuración inicial</Text>
            <Text style={styles.settingSubtitle}>Vuelve a la guía de bienvenida paso a paso</Text>
          </View>
        </Pressable>

        {/* Sign out */}
        <Pressable style={styles.signOutBtn} onPress={confirmSignOut}>
          <Text style={styles.signOutText}>Cerrar sesión</Text>
        </Pressable>

        <Text style={styles.footer}>Salomón © {new Date().getFullYear()} · Finanzas personales con sabiduría</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 130 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgDeep, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, gap: spacing.md, ...shadow.hero },
  avatarWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '800', color: colors.onNavy },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '700', color: colors.onDark, marginBottom: 3 },
  profileEmail: { fontSize: 12, color: colors.onDarkMuted },
  editLink: { fontSize: 13, fontWeight: '700', color: colors.gold },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2, marginTop: spacing.lg, marginBottom: spacing.md },
  editCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.glassBorder, gap: spacing.md },
  editLabel: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2 },
  editInput: { backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: spacing.md, paddingVertical: 13, fontSize: 15, color: colors.onDark },
  editActions: { flexDirection: 'row', gap: spacing.md },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.glassBorder, alignItems: 'center' },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: colors.onDarkMuted },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.pill, backgroundColor: colors.bgDeep, alignItems: 'center' },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: colors.onDark },
  settingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.glassBorder, gap: spacing.sm },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: 14, fontWeight: '600', color: colors.onDark, marginBottom: 2 },
  settingSubtitle: { fontSize: 11, color: colors.onDarkMuted, marginBottom: 4 },
  settingValue: { fontSize: 15, fontWeight: '800', color: colors.gold },
  emergencyNote: { backgroundColor: colors.greenSoft, borderRadius: radius.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.greenBorder },
  emergencyText: { fontSize: 13, color: colors.green, lineHeight: 20 },
  emergencyCard: { backgroundColor: colors.bgDeep, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md, ...shadow.hero, alignItems: 'center' },
  emergencyCardTitle: { fontSize: 12, fontWeight: '700', color: colors.gold, marginBottom: spacing.sm },
  emergencyCardValue: { fontSize: 26, fontWeight: '800', color: colors.onDark, letterSpacing: -1 },
  emergencyCardSub: { fontSize: 11, color: colors.onDarkMuted, marginTop: 4, textAlign: 'center' },
  toneRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  toneChip: {
    flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: radius.pill, borderWidth: 1,
    borderColor: 'rgba(226,190,75,0.45)', backgroundColor: 'rgba(255,255,255,0.05)',
  },
  toneChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  toneText: { fontSize: 13, fontWeight: '700', color: colors.goldBright },
  toneTextActive: { color: colors.onNavy },
  notifWarn: {
    padding: spacing.md, borderRadius: radius.md, backgroundColor: 'rgba(247,184,75,0.14)',
    borderWidth: 1, borderColor: 'rgba(247,184,75,0.4)', marginBottom: spacing.sm,
  },
  notifWarnText: { fontSize: 12.5, color: colors.neonAmber, lineHeight: 18, fontWeight: '600' },
  testBtn: {
    alignItems: 'center', paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1.5,
    borderColor: 'rgba(226,190,75,0.55)', marginBottom: spacing.sm,
  },
  testText: { fontSize: 14, fontWeight: '700', color: colors.goldBright },
  notifRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.glassBorder, gap: spacing.md },
  notifIcon: { fontSize: 22 },
  notifInfo: { flex: 1 },
  notifLabel: { fontSize: 13, fontWeight: '600', color: colors.onDark, marginBottom: 2 },
  notifDesc: { fontSize: 11, color: colors.onDarkMuted },
  soonTag: { fontSize: 10, fontWeight: '800', color: colors.onDarkMuted, backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden' },
  notifToggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: colors.green, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 2 },
  notifToggleOn: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.glassBorder },
  infoLabel: { fontSize: 13, color: colors.onDarkMuted },
  infoValue: { fontSize: 13, fontWeight: '700', color: colors.onDark },
  signOutBtn: { backgroundColor: colors.rustSoft, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', marginTop: spacing.lg, borderWidth: 1, borderColor: colors.rustBorder },
  signOutText: { fontSize: 15, fontWeight: '700', color: colors.rust },
  footer: { textAlign: 'center', fontSize: 11, color: colors.onDarkMuted, marginTop: spacing.lg },
});
