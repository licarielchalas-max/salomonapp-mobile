import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const APP_LOCK_KEY = 'salomon_app_lock_enabled';

// Web fallback: usar localStorage si SecureStore no estÃ¡ disponible
async function getSecureValue(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  }
  return SecureStore.getItemAsync(key);
}

async function setSecureValue(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

// El biometro NO es el mÃ©todo de autenticaciÃ³n contra Supabase â€” solo es un
// candado local sobre una sesiÃ³n que ya existe en el dispositivo (evita que
// alguien con el telÃ©fono desbloqueado abra la app sin tu huella/rostro).
export async function isAppLockEnabled(): Promise<boolean> {
  const value = await getSecureValue(APP_LOCK_KEY);
  return value === 'true';
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  await setSecureValue(APP_LOCK_KEY, enabled ? 'true' : 'false');
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false; // BiometrÃ­a no disponible en web
  }
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

export async function unlockWithBiometrics(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return true; // En web, saltar el bloqueo biomÃ©trico
  }
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Desbloquea Salomon',
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
  });
  return result.success;
}

