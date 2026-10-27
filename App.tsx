import 'react-native-gesture-handler';
import './src/lib/webAlert';
import './src/lib/alertI18n';
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_400Regular,
} from '@expo-google-fonts/playfair-display';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { AuthProvider } from './src/context/AuthProvider';
import { AccountProvider } from './src/context/AccountProvider';
import { AppRoot } from './src/navigation/appRoot';
import { AppLockGate } from './src/components/AppLockGate';
import { AlertHost } from './src/components/AlertHost';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { CurrencyProvider } from './src/context/CurrencyProvider';
import { LanguageProvider, loadStoredLanguage } from './src/context/LanguageProvider';
import { colors } from './src/theme';

export default function App() {
  const [langReady, setLangReady] = React.useState(false);
  React.useEffect(() => {
    loadStoredLanguage().finally(() => setLangReady(true));
  }, []);
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  if (!fontsLoaded || !langReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <AuthProvider>
          <AccountProvider>
            <AppLockGate>
              <LanguageProvider>
                <CurrencyProvider>
                  <AppRoot />
                </CurrencyProvider>
              </LanguageProvider>
            </AppLockGate>
          </AccountProvider>
          <AlertHost />
          <StatusBar style="light" />
        </AuthProvider>
      </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
