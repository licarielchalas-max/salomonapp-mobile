import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const APP_LOCK_KEY = 'salomon_app_lock_enabled';

// El biometro NO es el método de autenticación contra Supabase — solo es un
// candado local sobre una sesión que ya existe en el dispositivo (evita que
// alguien con el teléfono desbloqueado abra la app sin tu huella/rostro).
export async function isAppLockEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(APP_LOCK_KEY);
  return value === 'true';
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(APP_LOCK_KEY, enabled ? 'true' : 'false');
}

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

export async function unlockWithBiometrics(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Desbloquea Salomon',
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
  });
  return result.success;
}
