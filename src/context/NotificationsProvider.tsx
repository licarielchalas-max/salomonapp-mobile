import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { dailyClosingReminders } from '../lib/dailySummary';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import { Icon } from '../components/brand/Icon';
import { GoldButton, GhostButton } from '../components/brand/Buttons';
import { Sheet } from '../components/budget/ui';
import { useAuth } from './AuthProvider';
import { supabase } from '../lib/supabase';
import { onRemindersChanged, emitRemindersChanged } from '../lib/reminderBus';
import { addDays, buildReminderPlan, toISODate, type PlannedReminder, type ReminderTone } from '../lib/reminders';
import {
  getPermission,
  inAppFeedback,
  onReminderOpened,
  requestPermission,
  scheduleReminders,
  sendTestNotification,
  setTone as setNativeTone,
  setupNotifications,
  type PermissionState,
} from '../lib/notifications';
import { navigationRef } from '../navigation/navigationRef';
import { loadDebtSchedule } from '../hooks/useDebtSchedule';
import { debtReminders } from '../lib/debtDates';
import { colors, spacing } from '../theme';
import type { CalendarEventRow, ScheduledExpenseRow } from '../types/db';

interface Ctx {
  tone: ReminderTone;
  enabled: boolean;
  permission: PermissionState;
  /** Cuántos avisos quedaron programados en el teléfono. */
  scheduled: number;
  setTone: (t: ReminderTone) => Promise<void>;
  setEnabled: (v: boolean) => Promise<void>;
  askPermission: () => Promise<PermissionState>;
  sendTest: () => Promise<boolean>;
  /** Reprograma los avisos con los datos actuales. */
  sync: () => Promise<void>;
}

const NotificationsContext = createContext<Ctx | null>(null);

export function useNotifications(): Ctx {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications debe usarse dentro de NotificationsProvider');
  return ctx;
}

const SEEN_KEY = 'salomon:reminders-seen';

function loadSeen(): Set<string> {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]'));
    }
  } catch {
    // sin almacenamiento: se mostrarán de nuevo al recargar
  }
  return new Set();
}

function saveSeen(seen: Set<string>) {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-200)));
    }
  } catch {
    // ignorar
  }
}

// Avisos de agenda y pagos: en el teléfono salen como notificaciones (también con la app cerrada);
// en la web, como una ventana dentro de la app mientras está abierta.
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { session, user, householdId } = useAuth();
  const [tone, setToneState] = useState<ReminderTone>('sonido');
  const [enabled, setEnabledState] = useState(true);
  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [scheduled, setScheduled] = useState(0);
  const [due, setDue] = useState<PlannedReminder | null>(null);

  const planRef = useRef<PlannedReminder[]>([]);
  const seenRef = useRef<Set<string>>(loadSeen());
  const toneRef = useRef(tone);
  toneRef.current = tone;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // Preferencias guardadas y permisos del sistema
  useEffect(() => {
    if (!session || !user) return;
    let cancelled = false;
    (async () => {
      await setupNotifications();
      const [{ data: prefs }, perm] = await Promise.all([
        supabase.from('user_preferences').select('tono_notificacion, avisos_activos').eq('user_id', user.id).maybeSingle(),
        getPermission(),
      ]);
      if (cancelled) return;
      if (prefs?.tono_notificacion) {
        setToneState(prefs.tono_notificacion);
        setNativeTone(prefs.tono_notificacion);
      }
      if (typeof prefs?.avisos_activos === 'boolean') setEnabledState(prefs.avisos_activos);
      setPermission(perm);
    })();
    return () => { cancelled = true; };
  }, [session, user]);

  const sync = useCallback(async () => {
    if (!householdId) return;
    const today = toISODate(new Date());
    const [ev, ex] = await Promise.all([
      supabase.from('calendar_events').select('*').eq('household_id', householdId).gte('event_date', addDays(today, -1)).lte('event_date', addDays(today, 130)),
      supabase.from('scheduled_expenses').select('*').eq('household_id', householdId).eq('status', 'pendiente'),
    ]);
    const debts = enabledRef.current ? await loadDebtSchedule(householdId) : { items: [], payments: [] };
    const plan = enabledRef.current
      ? [
          ...buildReminderPlan((ev.data ?? []) as CalendarEventRow[], (ex.data ?? []) as ScheduledExpenseRow[]),
          ...debtReminders(debts.items, debts.payments),
          // Cada noche: cierra tu día (registra tus gastos y mira el resumen)
          ...dailyClosingReminders(new Date()).map((r) => ({ ...r, data: { kind: 'resumen' as const, id: r.key } })),
        ]
          .sort((a, b) => a.at.getTime() - b.at.getTime())
          .slice(0, 60)
      : [];
    planRef.current = plan;
    if (Platform.OS !== 'web') {
      const perm = await getPermission();
      setPermission(perm);
      if (perm === 'granted') {
        try {
          setScheduled(await scheduleReminders(plan, toneRef.current));
        } catch {
          // si el sistema rechaza la programación, la app sigue funcionando sin avisos
        }
      } else {
        setScheduled(0);
      }
    } else {
      setScheduled(plan.length);
    }
  }, [householdId]);

  // Reprogramar al entrar, al volver a la app y cada vez que cambie algo con aviso
  useEffect(() => {
    if (!session || !householdId) return;
    sync();
    const off = onRemindersChanged(() => { void sync(); });
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void sync(); });
    return () => {
      off();
      sub.remove();
    };
  }, [session, householdId, sync]);

  // Tocar una notificación lleva a la pantalla que corresponde
  useEffect(() => {
    if (!session) return;
    return onReminderOpened((r) => {
      if (!navigationRef.isReady()) return;
      if (r.kind === 'pago') navigationRef.navigate('GastosProgramados');
      else if (r.kind === 'deuda') navigationRef.navigate('Deudas');
      else if (r.kind === 'evento') navigationRef.navigate('Agenda');
      else if (r.kind === 'resumen') navigationRef.navigate('Dashboard');
    });
  }, [session]);

  // Web: no hay notificaciones del sistema, así que se avisa con una ventana mientras la app está abierta
  useEffect(() => {
    if (Platform.OS !== 'web' || !session) return;
    const check = () => {
      if (!enabledRef.current || due) return;
      const now = Date.now();
      const next = planRef.current.find((p) => p.at.getTime() <= now && p.at.getTime() > now - 6 * 3600 * 1000 && !seenRef.current.has(p.key));
      if (next) {
        seenRef.current.add(next.key);
        saveSeen(seenRef.current);
        setDue(next);
        inAppFeedback(toneRef.current);
      }
    };
    check();
    const t = setInterval(check, 20000);
    return () => clearInterval(t);
  }, [session, due]);

  const persist = useCallback(async (changes: { tono_notificacion?: ReminderTone; avisos_activos?: boolean }) => {
    if (!user) return;
    await supabase.from('user_preferences').update(changes).eq('user_id', user.id);
  }, [user]);

  const setTone = useCallback(async (t: ReminderTone) => {
    setToneState(t);
    setNativeTone(t);
    toneRef.current = t;
    await persist({ tono_notificacion: t });
    emitRemindersChanged();
  }, [persist]);

  const setEnabled = useCallback(async (v: boolean) => {
    setEnabledState(v);
    enabledRef.current = v;
    await persist({ avisos_activos: v });
    emitRemindersChanged();
  }, [persist]);

  const askPermission = useCallback(async () => {
    const p = await requestPermission();
    setPermission(p);
    if (p === 'granted') emitRemindersChanged();
    return p;
  }, []);

  const sendTest = useCallback(async () => {
    if (Platform.OS === 'web') {
      inAppFeedback(toneRef.current);
      setDue({
        key: 'prueba',
        at: new Date(),
        title: 'Prueba de aviso de Salomón',
        body: 'Así te recordaremos tus pagos y citas cuando la app esté abierta.',
        data: { kind: 'evento', id: 'prueba' },
      });
      return true;
    }
    const perm = await requestPermission();
    setPermission(perm);
    if (perm !== 'granted') return false;
    return sendTestNotification(toneRef.current);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ tone, enabled, permission, scheduled, setTone, setEnabled, askPermission, sendTest, sync }),
    [tone, enabled, permission, scheduled, setTone, setEnabled, askPermission, sendTest, sync],
  );

  function openRelated() {
    const d = due;
    setDue(null);
    if (!d || d.data.id === 'prueba' || !navigationRef.isReady()) return;
    navigationRef.navigate(d.data.kind === 'pago' ? 'GastosProgramados' : d.data.kind === 'deuda' ? 'Deudas' : d.data.kind === 'resumen' ? 'Dashboard' : 'Agenda');
  }

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <Sheet visible={!!due} onClose={() => setDue(null)} title="Recordatorio">
        <View style={styles.dueRow}>
          <View style={styles.dueIcon}>
            <Icon name="bell" size={24} color={colors.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dueTitle}>{due?.title}</Text>
            <Text style={styles.dueBody}>{due?.body}</Text>
          </View>
        </View>
        <GoldButton
          label={due?.data.kind === 'pago' || due?.data.kind === 'deuda' ? 'Ver el pago' : due?.data.kind === 'resumen' ? 'Ver mi resumen' : 'Ver en la agenda'}
          onPress={openRelated}
        />
        <GhostButton label="Cerrar" onPress={() => setDue(null)} />
      </Sheet>
    </NotificationsContext.Provider>
  );
}

const styles = StyleSheet.create({
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dueIcon: {
    width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.goldBorder,
  },
  dueTitle: { fontSize: 16, fontWeight: '700', color: colors.onDark },
  dueBody: { fontSize: 13.5, color: colors.onDarkMuted, marginTop: 3, lineHeight: 19 },
});
