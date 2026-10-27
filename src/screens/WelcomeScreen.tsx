import React, { useMemo } from 'react';
import { TRIAL_DAYS } from '../lib/plans';
import { Dimensions, StatusBar, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, fonts } from '../theme';
import type { AuthStackParamList } from '../navigation/RootNavigator';
import { SalomonEmblem } from '../components/brand/SalomonEmblem';
import { Icon, type IconName } from '../components/brand/Icon';
import { Glass } from '../components/brand/Glass';
import { GoldButton } from '../components/brand/Buttons';
import { Pressable } from 'react-native';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'> };

const { height: SCREEN_H } = Dimensions.get('window');
const COMPACT = SCREEN_H < 720;

const VERSES = [
  { text: 'Los planes del diligente ciertamente tienden a la abundancia.', ref: 'Proverbios 21:5' },
  { text: 'El que recoge en el verano es hijo prudente.', ref: 'Proverbios 10:5' },
  { text: 'En todo trabajo hay ganancia.', ref: 'Proverbios 14:23' },
  { text: 'Honra a Jehová con tus bienes y con las primicias de todos tus frutos.', ref: 'Proverbios 3:9' },
  { text: 'El alma de los diligentes será prosperada.', ref: 'Proverbios 13:4' },
  { text: 'El que guarda con diligencia verá aumentar su riqueza.', ref: 'Proverbios 13:11' },
  { text: 'Mejor es lo poco con justicia que la muchedumbre de frutos sin derecho.', ref: 'Proverbios 16:8' },
];

const FEATURES: { label: string; icon: IconName }[] = [
  { label: 'Presupuesto', icon: 'bars' },
  { label: 'Metas', icon: 'target' },
  { label: 'Deudas', icon: 'card' },
  { label: 'Inversiones', icon: 'trending' },
];

export function WelcomeScreen({ navigation }: Props) {
  const verse = useMemo(() => VERSES[new Date().getDate() % VERSES.length], []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <LinearGradient colors={['#09432A', '#06301A', '#041F0F']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <SafeAreaView style={styles.hero} edges={['top', 'left', 'right']}>
        <SalomonEmblem size={COMPACT ? 132 : 188} />
        <Text style={[styles.name, COMPACT && { fontSize: 25 }]}>SALOMÓN</Text>
        <View style={styles.rule}>
          <View style={styles.ruleLine} />
          <View style={styles.diamond} />
          <View style={styles.ruleLine} />
        </View>
        <Text style={styles.subtitle}>FINANZAS CON SABIDURÍA</Text>

        <Glass radius={22} padding={18} style={styles.verseCard} innerStyle={{ paddingLeft: 22 }}>
          <View style={styles.verseBar} />
          <Text style={styles.verseText}>“{verse.text}”</Text>
          <Text style={styles.verseRef}>{verse.ref.toUpperCase()}</Text>
        </Glass>

        {!COMPACT && (
          <View style={styles.chips}>
            {FEATURES.map((f) => (
              <View key={f.label} style={styles.chip}>
                <Icon name={f.icon} size={16} color={colors.gold} strokeWidth={2} />
                <Text style={styles.chipText}>{f.label}</Text>
              </View>
            ))}
          </View>
        )}
      </SafeAreaView>

      <SafeAreaView style={styles.bottom} edges={['bottom', 'left', 'right']}>
        <GoldButton label={`Comenzar · ${TRIAL_DAYS} días gratis`} onPress={() => navigation.navigate('Register')} />
        <Pressable onPress={() => navigation.navigate('Login')} style={styles.loginLink} accessibilityRole="button">
          <Text style={styles.loginText}>Ya tengo cuenta</Text>
        </Pressable>
        <Text style={styles.legal}>Sin tarjeta · Al continuar aceptas los Términos y la Privacidad</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  // overflow hidden: los círculos de luz decorativos se salen de la pantalla y en la web hacían que se moviera de lado
  root: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  glowTop: {
    position: 'absolute',
    top: -140,
    left: -120,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(18,122,71,0.35)',
    opacity: 0.55,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -120,
    right: -120,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(226,190,75,0.10)',
  },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, overflow: 'hidden' },
  name: {
    marginTop: 6,
    fontFamily: fonts.heading,
    fontSize: 31,
    letterSpacing: 8,
    color: colors.gold,
    paddingLeft: 8,
    textAlign: 'center',
  },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  ruleLine: { width: 34, height: 1, backgroundColor: 'rgba(226,190,75,0.7)' },
  diamond: { width: 5, height: 5, backgroundColor: colors.gold, transform: [{ rotate: '45deg' }] },
  subtitle: { marginTop: 10, fontSize: 11, fontWeight: '800', letterSpacing: 3.6, color: colors.onDarkMuted, paddingLeft: 4 },

  verseCard: { alignSelf: 'stretch', marginTop: 26 },
  verseBar: { position: 'absolute', left: 0, top: 6, bottom: 6, width: 3, borderRadius: 2, backgroundColor: colors.gold },
  verseText: { fontFamily: fonts.headingRegular, fontStyle: 'italic', fontSize: 18, lineHeight: 26, color: colors.onDark },
  verseRef: { marginTop: 8, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: colors.goldBright },

  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 34,
    paddingHorizontal: 13,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(226,190,75,0.5)',
    backgroundColor: 'rgba(226,190,75,0.07)',
  },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.goldBright },

  bottom: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, gap: 4 },
  loginLink: { alignSelf: 'center', paddingVertical: 14 },
  loginText: { fontSize: 15, fontWeight: '700', color: colors.onDark },
  legal: { fontSize: 11, color: colors.onDarkSubtle, textAlign: 'center' },
});
