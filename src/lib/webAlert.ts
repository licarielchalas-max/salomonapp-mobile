import { Alert, Platform } from 'react-native';

// react-native-web deja Alert.alert vacío, y los cuadros del navegador (window.alert/confirm) no
// funcionan en todos los visores. En web los avisos se dibujan dentro de la app (ver AlertHost).

export interface AlertButtonSpec {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface AlertRequest {
  title: string;
  message?: string;
  buttons: AlertButtonSpec[];
}

let listener: ((req: AlertRequest) => void) | null = null;

/** Lo usa AlertHost para recibir los avisos. Devuelve la función para dejar de escuchar. */
export function subscribeAlerts(fn: (req: AlertRequest) => void): () => void {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  (Alert as unknown as { alert: (title: string, message?: string, buttons?: AlertButtonSpec[]) => void }).alert = (
    title,
    message,
    buttons,
  ) => {
    const list = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
    if (listener) {
      listener({ title, message, buttons: list });
      return;
    }
    // Sin AlertHost montado (no debería pasar): cuadros del navegador.
    const text = [title, message].filter(Boolean).join('\n\n');
    if (list.length <= 1) {
      window.alert(text);
      list[0]?.onPress?.();
      return;
    }
    const cancel = list.find((b) => b.style === 'cancel');
    const action = [...list].reverse().find((b) => b !== cancel) ?? list[0];
    if (window.confirm(text)) action.onPress?.();
    else cancel?.onPress?.();
  };
}
