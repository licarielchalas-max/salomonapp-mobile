import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthProvider';
import { AppLockGate } from '../components/AppLockGate';
import { ChatWidget } from '../components/ChatWidget';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { MovimientosScreen } from '../screens/MovimientosScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { PresupuestoScreen } from '../screens/PresupuestoScreen';
import { CarteraScreen } from '../screens/CarteraScreen';
import { MetasScreen } from '../screens/MetasScreen';
import { DeudasScreen } from '../screens/DeudasScreen';
import { GastosProgramadosScreen } from '../screens/GastosProgramadosScreen';
import { AgendaScreen } from '../screens/AgendaScreen';
import { BancosScreen } from '../screens/BancosScreen';
import { ConciliacionScreen } from '../screens/ConciliacionScreen';
import { ReferidosScreen } from '../screens/ReferidosScreen';
import { PlanesScreen } from '../screens/PlanesScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  Movimientos: undefined;
  Más: undefined;
  Preferencias: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  Más: undefined;
  Presupuesto: undefined;
  Cartera: undefined;
  Metas: undefined;
  Deudas: undefined;
  GastosProgramados: undefined;
  Agenda: undefined;
  Bancos: undefined;
  Conciliacion: undefined;
  Referidos: undefined;
  Planes: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerTintColor: '#0F5132' }}>
      <Tabs.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="Movimientos" component={MovimientosScreen} options={{ title: 'Movimientos' }} />
      <Tabs.Screen name="Más" component={MoreScreen} options={{ title: 'Más' }} />
      <Tabs.Screen name="Preferencias" component={SettingsScreen} options={{ title: 'Preferencias' }} />
    </Tabs.Navigator>
  );
}

function AppNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerTintColor: '#0F5132' }}>
      <RootStack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
      <RootStack.Screen name="Presupuesto" component={PresupuestoScreen} />
      <RootStack.Screen name="Cartera" component={CarteraScreen} />
      <RootStack.Screen name="Metas" component={MetasScreen} />
      <RootStack.Screen name="Deudas" component={DeudasScreen} />
      <RootStack.Screen name="GastosProgramados" component={GastosProgramadosScreen} options={{ title: 'Gastos programados' }} />
      <RootStack.Screen name="Agenda" component={AgendaScreen} />
      <RootStack.Screen name="Bancos" component={BancosScreen} options={{ title: 'Cuentas bancarias' }} />
      <RootStack.Screen name="Conciliacion" component={ConciliacionScreen} options={{ title: 'Conciliación' }} />
      <RootStack.Screen name="Referidos" component={ReferidosScreen} />
      <RootStack.Screen name="Planes" component={PlanesScreen} options={{ title: 'Planes y suscripción' }} />
    </RootStack.Navigator>
  );
}

export function RootNavigator() {
  const { loading, session, householdId } = useAuth();

  if (loading || (session && !householdId)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF8EE' }}>
        <ActivityIndicator color="#0F5132" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? (
        <AppLockGate>
          <AppNavigator />
          <ChatWidget />
        </AppLockGate>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}
