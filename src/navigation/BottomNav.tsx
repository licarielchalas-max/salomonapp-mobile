import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { useDrawer } from './DrawerContext';
import { navigationRef, type RootStackParamList } from './navigationRef';
import { SalomonEmblem } from '../components/brand/SalomonEmblem';
import { Icon, type IconName } from '../components/brand/Icon';

// Pantallas donde la barra no se muestra (tienen su propio pie o son modales).
const HIDDEN_ON: (keyof RootStackParamList)[] = ['Salomon', 'AddTransaction'];

const FOIL = ['#FBEBB0', '#EBC95E', '#D8AE3C', '#B88A25'] as const;

interface Item {
  key: string;
  label: string;
  icon: IconName;
  screen?: keyof RootStackParamList;
}

const LEFT: Item[] = [
  { key: 'home', label: 'Inicio', icon: 'home', screen: 'Dashboard' },
  { key: 'moves', label: 'Movimientos', icon: 'list', screen: 'Movimientos' },
];
const RIGHT: Item[] = [
  { key: 'budget', label: 'Presupuesto', icon: 'pie', screen: 'Presupuesto' },
  { key: 'more', label: 'Más', icon: 'dots' },
];

export function BottomNav({ routeName }: { routeName?: string }) {
  const insets = useSafeAreaInsets();
  const { open } = useDrawer();

  if (routeName && HIDDEN_ON.includes(routeName as keyof RootStackParamList)) return null;

  function press(item: Item) {
    if (item.screen) navigationRef.current?.navigate(item.screen as any);
    else open();
  }

  function renderItem(item: Item) {
    const active = item.screen === routeName;
    return (
      <Pressable
        key={item.key}
        style={styles.item}
        onPress={() => press(item)}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: active }}
      >
        <Icon name={item.icon} size={24} color={active ? colors.gold : colors.onDarkMuted} strokeWidth={active ? 2.1 : 1.9} />
        <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
          {item.label}
        </Text>
      </Pressable>
    );
  }

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 6 }]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.05)', 'rgba(226,190,75,0.4)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.border}
      >
        <View style={styles.bar}>
          {LEFT.map(renderItem)}
          <View style={styles.centerSlot}>
            <Pressable
              onPress={() => navigationRef.current?.navigate('Salomon')}
              accessibilityRole="button"
              accessibilityLabel="Rey Salomón"
              style={({ pressed }) => [styles.fabShadow, pressed && { transform: [{ scale: 0.95 }] }]}
            >
              <LinearGradient colors={FOIL} locations={[0, 0.44, 0.54, 1]} style={styles.fab}>
                <SalomonEmblem size={22} ring={false} tone="ink" ink="#06301A" />
              </LinearGradient>
            </Pressable>
          </View>
          {RIGHT.map(renderItem)}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14 },
  border: { borderRadius: 36, padding: 1, boxShadow: '0 22px 34px -10px rgba(0,0,0,0.65)' },
  bar: {
    height: 68,
    borderRadius: 35,
    backgroundColor: '#052A17',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 6 },
  label: { fontSize: 10.5, fontWeight: '700', color: colors.onDarkMuted },
  labelActive: { color: colors.gold },
  centerSlot: { width: 72, alignItems: 'center' },
  fabShadow: { marginTop: -26, borderRadius: 32, boxShadow: '0 10px 22px rgba(226,190,75,0.4)' },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#06301A',
  },
});
