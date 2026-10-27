// Raíz de la app de usuarios. La app de administración usa `appRoot.admin.tsx`: metro.config.js intercambia
// este archivo por aquel cuando se compila con EXPO_PUBLIC_APP_MODE=admin, así el panel de admin nunca viaja
// dentro del paquete de los usuarios (ni el de usuarios dentro del de admin).
export { RootNavigator as AppRoot } from './RootNavigator';
