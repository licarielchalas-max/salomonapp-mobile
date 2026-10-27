import { Platform, Vibration } from 'react-native';
import { tr } from './i18n';
import Constants from 'expo-constants';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { PlannedReminder, ReminderTone } from './reminders';

// Avisos en la barra de notificaciones del teléfono (notificaciones locales, sin servidor).
// En la web no existen: ahí los avisos salen dentro de la app (ver DueReminderModal).

const isNative = Platform.OS !== 'web';
// Expo Go no incluye sonidos propios: ahí se usa el sonido por defecto del sistema.
const inExpoGo = Constants.executionEnvironment === 'storeClient';

type NotificationsModule = typeof import('expo-notifications');
const N: NotificationsModule | null = isNative ? (require('expo-notifications') as NotificationsModule) : null;

const APP_TAG = 'salomon';
const SOUND_FILE = 'recordatorio.wav';

export const CHANNELS: Record<ReminderTone, string> = {
  sonido: 'recordatorios-sonido',
  vibracion: 'recordatorios-vibracion',
  silencioso: 'recordatorios-silencio',
};

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

let currentTone: ReminderTone = 'sonido';

export function setTone(tone: ReminderTone) {
  currentTone = tone;
}

/** Prepara el manejo de avisos con la app abierta y los canales de Android. Llamar una vez al iniciar. */
export async function setupNotifications(): Promise<void> {
  if (!N) return;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: currentTone === 'sonido',
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    const soundName = inExpoGo ? 'default' : SOUND_FILE;
    await N.setNotificationChannelAsync(CHANNELS.sonido, {
      name: 'Recordatorios con sonido',
      importance: N.AndroidImportance.HIGH,
      sound: soundName,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: '#E2BE4B',
    });
    await N.setNotificationChannelAsync(CHANNELS.vibracion, {
      name: 'Recordatorios con vibración',
      importance: N.AndroidImportance.HIGH,
      sound: null,
      vibrationPattern: [0, 400, 200, 400, 200, 400],
      lightColor: '#E2BE4B',
    });
    await N.setNotificationChannelAsync(CHANNELS.silencioso, {
      name: 'Recordatorios silenciosos',
      importance: N.AndroidImportance.LOW,
      sound: null,
      enableVibrate: false,
    });
  }
}

function mapPermission(status: string): PermissionState {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export async function getPermission(): Promise<PermissionState> {
  if (!N) return 'unavailable';
  const res = await N.getPermissionsAsync();
  return mapPermission(res.status);
}

/** Pide permiso al usuario (la primera vez aparece el aviso del sistema). */
export async function requestPermission(): Promise<PermissionState> {
  if (!N) return 'unavailable';
  const current = await N.getPermissionsAsync();
  if (current.status === 'granted') return 'granted';
  const res = await N.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } });
  return mapPermission(res.status);
}

function contentSound(tone: ReminderTone): string | boolean {
  if (tone !== 'sonido') return false;
  return inExpoGo ? true : SOUND_FILE;
}

/**
 * Deja programados exactamente los avisos del plan: cancela los que ya no aplican
 * (pagados, borrados, cambiados de hora) y programa los nuevos. Devuelve cuántos quedaron.
 */
export async function scheduleReminders(plan: PlannedReminder[], tone: ReminderTone): Promise<number> {
  if (!N) return 0;
  const existing = await N.getAllScheduledNotificationsAsync();
  const wanted = new Set(plan.map((p) => p.key));
  await Promise.all(
    existing
      .filter((n) => n.content.data?.app === APP_TAG && !wanted.has(n.identifier))
      .map((n) => N.cancelScheduledNotificationAsync(n.identifier)),
  );
  for (const p of plan) {
    await N.scheduleNotificationAsync({
      identifier: p.key,
      content: {
        title: tr(p.title),
        body: tr(p.body),
        sound: contentSound(tone),
        data: { app: APP_TAG, ...p.data },
      },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: p.at, channelId: CHANNELS[tone] },
    });
  }
  return plan.length;
}

export async function cancelAllReminders(): Promise<void> {
  if (!N) return;
  const existing = await N.getAllScheduledNotificationsAsync();
  await Promise.all(
    existing.filter((n) => n.content.data?.app === APP_TAG).map((n) => N.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** Aviso de prueba a los 3 segundos, para comprobar permisos, sonido y vibración. */
export async function sendTestNotification(tone: ReminderTone): Promise<boolean> {
  if (!N) return false;
  await N.scheduleNotificationAsync({
    content: {
      title: tr('Prueba de aviso de Salomón'),
      body: tr('Así te recordaremos tus pagos y citas.'),
      sound: contentSound(tone),
      data: { app: APP_TAG, kind: 'prueba', id: 'prueba' },
    },
    trigger: { type: N.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, channelId: CHANNELS[tone] },
  });
  return true;
}

export interface OpenedReminder {
  kind: 'evento' | 'pago' | 'deuda' | 'resumen' | 'prueba';
  id: string;
}

/** Avisa cuando el usuario toca una notificación (con la app abierta, en segundo plano o cerrada). */
export function onReminderOpened(cb: (r: OpenedReminder) => void): () => void {
  if (!N) return () => {};
  const emit = (data: Record<string, unknown> | undefined) => {
    if (data?.app === APP_TAG && typeof data.kind === 'string' && typeof data.id === 'string') {
      cb({ kind: data.kind as OpenedReminder['kind'], id: data.id });
    }
  };
  const sub = N.addNotificationResponseReceivedListener((r) => emit(r.notification.request.content.data));
  N.getLastNotificationResponseAsync().then((r) => r && emit(r.notification.request.content.data));
  return () => sub.remove();
}

// ── Sonido y vibración dentro de la app ──────────────────────────────────────

export async function playChime(): Promise<void> {
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    const player = createAudioPlayer(require('../../assets/sounds/recordatorio.wav'));
    player.play();
    setTimeout(() => player.remove(), 3000);
  } catch {
    // Sin sonido no se pierde nada: el aviso sigue a la vista.
  }
}

/** Retroalimentación de un aviso con la app abierta, según el tono elegido. */
export function inAppFeedback(tone: ReminderTone): void {
  if (tone === 'silencioso') return;
  if (isNative) Vibration.vibrate(tone === 'vibracion' ? [0, 400, 200, 400, 200, 400] : [0, 300, 150, 300]);
  else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.([300, 150, 300]);
  if (tone === 'sonido') void playChime();
}
