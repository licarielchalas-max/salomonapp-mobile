import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../theme';
import { SalomonEmblem } from './brand/SalomonEmblem';

interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** "icon" = emblema con anillo · "horizontal" = corona+S y nombre · "full" = emblema y nombre debajo. */
  variant?: 'full' | 'icon' | 'horizontal';
  /** Sobre fondo oscuro (por defecto) el nombre va en oro; sobre claro, en verde. */
  onDark?: boolean;
  showName?: boolean;
}

const SIZES = {
  xs: { emblem: 34, name: 12, sub: 7 },
  sm: { emblem: 44, name: 15, sub: 8 },
  md: { emblem: 72, name: 20, sub: 9 },
  lg: { emblem: 120, name: 28, sub: 10 },
  xl: { emblem: 170, name: 36, sub: 12 },
};

const GOLD = '#E2BE4B';

export function SalomonLogo({ size = 'md', variant = 'icon', onDark = true }: Props) {
  const s = SIZES[size];
  const nameColor = onDark ? GOLD : '#0A4A2A';
  const subColor = onDark ? 'rgba(244,240,226,0.78)' : '#8A6200';
  const tone = onDark ? 'foil' : 'ink';

  if (variant === 'icon') {
    return <SalomonEmblem size={s.emblem} tone={tone} />;
  }

  if (variant === 'horizontal') {
    return (
      <View style={styles.horizontal}>
        <SalomonEmblem size={Math.round(s.emblem * 0.62)} ring={false} tone={tone} />
        <View style={styles.textCol}>
          <Text style={[styles.wordmark, { fontSize: s.name, color: nameColor, letterSpacing: s.name * 0.18 }]}>SALOMÓN</Text>
          <Text style={[styles.sub, { fontSize: s.sub, color: subColor, letterSpacing: s.sub * 0.3 }]}>FINANZAS CON SABIDURÍA</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.vertical}>
      <SalomonEmblem size={s.emblem} tone={tone} />
      <Text style={[styles.wordmark, { fontSize: s.name, color: nameColor, letterSpacing: s.name * 0.24 }]}>SALOMÓN</Text>
      <View style={styles.rule}>
        <View style={[styles.ruleLine, { backgroundColor: nameColor }]} />
        <View style={[styles.diamond, { backgroundColor: nameColor }]} />
        <View style={[styles.ruleLine, { backgroundColor: nameColor }]} />
      </View>
      <Text style={[styles.sub, { fontSize: s.sub, color: subColor, letterSpacing: s.sub * 0.34 }]}>FINANZAS CON SABIDURÍA</Text>
    </View>
  );
}

/** Versión compacta para encabezados. */
export function SalomonBrand({ size = 'sm', onDark = true }: { size?: 'xs' | 'sm' | 'md'; onDark?: boolean }) {
  return <SalomonLogo size={size} variant="horizontal" onDark={onDark} />;
}

const styles = StyleSheet.create({
  wordmark: {
    fontFamily: fonts.heading,
    textAlign: 'center',
    paddingLeft: 2,
  },
  sub: {
    fontWeight: '800',
    textAlign: 'center',
  },
  textCol: { gap: 3 },
  horizontal: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vertical: { alignItems: 'center', gap: 6 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  ruleLine: { width: 32, height: 1, opacity: 0.7 },
  diamond: { width: 5, height: 5, transform: [{ rotate: '45deg' }] },
});
