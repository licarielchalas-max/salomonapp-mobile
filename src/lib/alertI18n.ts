import { Alert, type AlertButton } from 'react-native';
import { applyBaseSymbol } from './currency';
import { trPiece } from './i18n';

// Los avisos (Alert.alert) también salen en el idioma elegido y con el símbolo de la moneda base.
// Se instala después de lib/webAlert para envolver también la versión web.
const original = Alert.alert.bind(Alert);
const fix = (s?: string) => (s ? applyBaseSymbol(trPiece(s)) : s);

(Alert as { alert: typeof Alert.alert }).alert = (title, message, buttons, options) =>
  original(
    fix(title) ?? '',
    fix(message),
    buttons?.map((b: AlertButton) => ({ ...b, text: fix(b.text) })),
    options,
  );
