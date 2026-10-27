import React from 'react';
import { Text } from '../components/AppText';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthProvider';
import { useAccount } from '../context/AccountProvider';
import { colors, fonts } from '../theme';
import { NotificationsProvider } from '../context/NotificationsProvider';
import { DrawerProvider } from './DrawerContext';
import { BottomNav } from './BottomNav';
import { HeaderLeft, HeaderRight } from './HeaderButtons';
import { DrawerMenu } from './DrawerMenu';
import {
  navigationRef,
  type AuthStackParamList,
  type RootStackParamList,
  type TabParamList,
} from './navigationRef';

// Auth screens
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';

// App screens
import { DashboardScreen } from '../screens/DashboardScreen';
import { MovimientosScreen } from '../screens/MovimientosScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SalomonChatScreen } from '../screens/SalomonChatScreen';
import { AddTransactionScreen } from '../screens/AddTransactionScreen';
import { PresupuestoScreen } from '../screens/PresupuestoScreen';
import { ScoreScreen } from '../screens/ScoreScreen';
import { CarteraScreen } from '../screens/CarteraScreen';
import { MetasScreen } from '../screens/MetasScreen';
import { DeudasScreen } from '../screens/DeudasScreen';
import { GastosProgramadosScreen } from '../screens/GastosProgramadosScreen';
import { AgendaScreen } from '../screens/AgendaScreen';
import { BancosScreen } from '../screens/BancosScreen';
import { ConciliacionScreen } from '../screens/ConciliacionScreen';
import { ReferidosScreen } from '../screens/ReferidosScreen';
import { PlanesScreen } from '../screens/PlanesScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { AcademiaScreen } from '../screens/AcademiaScreen';
import { TalleresScreen } from '../screens/TalleresScreen';
import { InversionesScreen } from '../screens/InversionesScreen';
import { MarketplaceScreen } from '../screens/MarketplaceScreen';
import { SoporteScreen } from '../screens/SoporteScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';

// Re-export types for screens that import from here
export type { AuthStackParamList, RootStackParamList, TabParamList };
export { navigationRef };

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.gold,
    background: colors.bg,
    card: colors.bgDeep,
    text: colors.onDark,
    border: colors.glassBorder,
  },
};

// ─── Navigators ──────────────────────────────────────────────────────────────

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

const sharedHeaderOptions = {
  headerTintColor: colors.gold,
  headerStyle: { backgroundColor: colors.bgDeep },
  headerTitleStyle: { fontFamily: fonts.heading, color: colors.onDark, fontSize: 19 },
  headerShadowVisible: false,
  // El título pasa por Text para salir en el idioma elegido.
  headerTitle: ({ children }: { children: string }) => (
    <Text numberOfLines={1} style={{ fontFamily: fonts.heading, color: colors.onDark, fontSize: 19, fontWeight: '600' }}>
      {children}
    </Text>
  ),
  headerLeft: () => <HeaderLeft />,
  headerRight: () => <HeaderRight />,
};

function AppNavigator() {
  return (
    <RootStack.Navigator screenOptions={sharedHeaderOptions}>
      <RootStack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="Movimientos"
        component={MovimientosScreen}
        options={{ title: 'Movimientos' }}
      />
      <RootStack.Screen
        name="Salomon"
        component={SalomonChatScreen}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{ title: 'Nuevo registro', presentation: 'modal' }}
      />
      <RootStack.Screen name="Presupuesto" component={PresupuestoScreen} />
      <RootStack.Screen name="Score" component={ScoreScreen} options={{ title: 'Score financiero' }} />
      <RootStack.Screen name="Cartera" component={CarteraScreen} />
      <RootStack.Screen name="Metas" component={MetasScreen} />
      <RootStack.Screen name="Deudas" component={DeudasScreen} />
      <RootStack.Screen
        name="GastosProgramados"
        component={GastosProgramadosScreen}
        options={{ title: 'Gastos programados' }}
      />
      <RootStack.Screen name="Agenda" component={AgendaScreen} />
      <RootStack.Screen
        name="Bancos"
        component={BancosScreen}
        options={{ title: 'Cuentas bancarias' }}
      />
      <RootStack.Screen
        name="Conciliacion"
        component={ConciliacionScreen}
        options={{ title: 'Conciliación' }}
      />
      <RootStack.Screen name="Referidos" component={ReferidosScreen} />
      <RootStack.Screen
        name="Planes"
        component={PlanesScreen}
        options={{ title: 'Planes y suscripción' }}
      />
      <RootStack.Screen name="Academia" component={AcademiaScreen} />
      <RootStack.Screen name="Talleres" component={TalleresScreen} />
      <RootStack.Screen
        name="Inversiones"
        component={InversionesScreen}
        options={{ title: 'Inversiones' }}
      />
      <RootStack.Screen
        name="Marketplace"
        component={MarketplaceScreen}
        options={{ title: 'Marketplace' }}
      />
      <RootStack.Screen name="Soporte" component={SoporteScreen} options={{ title: 'Soporte' }} />
      <RootStack.Screen
        name="Preferencias"
        component={SettingsScreen}
        options={{ title: 'Preferencias' }}
      />
    </RootStack.Navigator>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

function RootContent() {
  const { loading, session, recovering } = useAuth();
  const [routeName, setRouteName] = React.useState<string | undefined>();
  const { loading: accountLoading, household, access } = useAccount();

  if (loading || (session && accountLoading)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.neonCyan} size="large" />
      </View>
    );
  }

  // Llegó desde el enlace de "recuperar contraseña": primero elige la nueva.
  if (recovering) return <ResetPasswordScreen />;

  // Cuenta nueva (o "repetir configuración"): primero el onboarding.
  if (session && household && !household.onboarding_completed) {
    return <OnboardingScreen />;
  }

  // Prueba terminada y sin suscripción: solo se muestra la pantalla de planes.
  if (session && !access.hasAccess) {
    return <PlanesScreen locked />;
  }

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer
        ref={navigationRef}
        theme={navTheme}
        onReady={() => setRouteName(navigationRef.getCurrentRoute()?.name)}
        onStateChange={() => setRouteName(navigationRef.getCurrentRoute()?.name)}
      >
        {session ? <AppNavigator /> : <AuthNavigator />}
      </NavigationContainer>
      {session && (
        <>
          <BottomNav routeName={routeName} />
          <DrawerMenu />
        </>
      )}
    </View>
  );
}

export function RootNavigator() {
  return (
    <DrawerProvider>
      <NotificationsProvider>
        <RootContent />
      </NotificationsProvider>
    </DrawerProvider>
  );
}

export default RootNavigator;
