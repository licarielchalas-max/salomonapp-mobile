import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, fonts } from '../theme';
import { useDrawer } from './DrawerContext';
import { navigationRef, type RootStackParamList } from './navigationRef';
import { SalomonEmblem } from '../components/brand/SalomonEmblem';
import { Icon, type IconName } from '../components/brand/Icon';

const DRAWER_WIDTH = 304;

type Section = {
  title: string;
  items: { label: string; icon: IconName; screen: keyof RootStackParamList }[];
};

const SECTIONS: Section[] = [
  {
    title: 'Finanzas',
    items: [
      { label: 'Presupuesto', icon: 'pie', screen: 'Presupuesto' },
      { label: 'Cartera', icon: 'wallet', screen: 'Cartera' },
      { label: 'Metas', icon: 'target', screen: 'Metas' },
      { label: 'Deudas', icon: 'card', screen: 'Deudas' },
      { label: 'Inversiones', icon: 'trending', screen: 'Inversiones' },
    ],
  },
  {
    title: 'Control',
    items: [
      { label: 'Movimientos', icon: 'list', screen: 'Movimientos' },
      { label: 'Gastos programados', icon: 'calendar', screen: 'GastosProgramados' },
      { label: 'Agenda', icon: 'calendar', screen: 'Agenda' },
      { label: 'Bancos', icon: 'bank', screen: 'Bancos' },
      { label: 'Conciliación', icon: 'refresh', screen: 'Conciliacion' },
    ],
  },
  {
    title: 'Comunidad',
    items: [
      { label: 'Academia', icon: 'book', screen: 'Academia' },
      { label: 'Marketplace', icon: 'bag', screen: 'Marketplace' },
      { label: 'Referidos', icon: 'gift', screen: 'Referidos' },
    ],
  },
  {
    title: 'Cuenta',
    items: [
      { label: 'Planes', icon: 'star', screen: 'Planes' },
      { label: 'Soporte', icon: 'chat', screen: 'Soporte' },
      { label: 'Preferencias', icon: 'settings', screen: 'Preferencias' },
    ],
  },
];

export function DrawerMenu() {
  const { isOpen, close } = useDrawer();
  const insets = useSafeAreaInsets();
  const pendingScreen = useRef<keyof RootStackParamList | null>(null);
  const slideX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(slideX, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideX, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        const screen = pendingScreen.current;
        pendingScreen.current = null;
        if (screen) navigationRef.current?.navigate(screen as any);
      });
    }
  }, [isOpen]);

  // Un solo destino pendiente: los toques repetidos no apilan navegaciones.
  function navigateTo(screen: keyof RootStackParamList) {
    if (pendingScreen.current) return;
    pendingScreen.current = screen;
    close();
  }

  const sections = SECTIONS;

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Cerrar menú" />
        </Animated.View>

        <Animated.View style={[styles.panel, { transform: [{ translateX: slideX }] }]}>
          <LinearGradient
            colors={[colors.bgDeep, colors.bg, '#041F0F']}
            locations={[0, 0.5, 1]}
            style={[StyleSheet.absoluteFill, { borderRightWidth: 1, borderRightColor: colors.glassBorder }]}
          />
          <View style={{ flex: 1, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }}>
            <View style={styles.panelHeader}>
              <View style={styles.logoRow}>
                <SalomonEmblem size={30} ring={false} />
                <View>
                  <Text style={styles.logoTitle}>SALOMÓN</Text>
                  <Text style={styles.logoSub}>FINANZAS CON SABIDURÍA</Text>
                </View>
              </View>
              <Pressable onPress={close} style={styles.closeBtn} accessibilityLabel="Cerrar">
                <Icon name="close" size={18} color={colors.onDark} />
              </Pressable>
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {sections.map((section) => (
                <View key={section.title} style={styles.section}>
                  <Text style={styles.sectionLabel}>{section.title.toUpperCase()}</Text>
                  {section.items.map((item) => (
                    <Pressable
                      key={item.screen}
                      style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                      onPress={() => navigateTo(item.screen)}
                    >
                      <View style={styles.menuIconBox}>
                        <Icon name={item.icon} size={20} color={colors.gold} />
                      </View>
                      <Text style={styles.menuLabel}>{item.label}</Text>
                      <Icon name="chevron" size={18} color={colors.onDarkSubtle} />
                    </Pressable>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.6)' },
  panel: {
    width: DRAWER_WIDTH,
    backgroundColor: colors.bg,
    boxShadow: '8px 0 30px rgba(0,0,0,0.5)',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logoTitle: { fontSize: 17, fontFamily: fonts.heading, color: colors.gold, letterSpacing: 3 },
  logoSub: { fontSize: 7.5, fontWeight: '800', color: colors.onDarkMuted, letterSpacing: 2.2, marginTop: 3 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },

  scroll: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  section: { marginBottom: spacing.lg },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 1.6,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    opacity: 0.9,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 9,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
  },
  menuItemPressed: { backgroundColor: colors.bgCard },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.onDark },
});
