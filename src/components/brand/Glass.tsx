import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  children?: React.ReactNode;
  /** Radio exterior de la tarjeta. */
  radius?: number;
  /** Relleno interior (por defecto 16). */
  padding?: number;
  /** Realza el borde dorado y añade un halo (elemento destacado). */
  highlight?: boolean;
  /** Tono de alerta (ámbar). */
  warn?: boolean;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
}

// Tarjeta de cristal: borde degradado que capta la luz y relleno opaco con ligero brillo.
// (El relleno es opaco a propósito: un relleno translúcido dejaría ver el degradado del borde.)
export function Glass({ children, radius = 22, padding = 16, highlight, warn, style, innerStyle }: Props) {
  const border: readonly [string, string, string] = warn
    ? ['#FFD08A', 'rgba(247,184,75,0.5)', 'rgba(247,184,75,0.35)']
    : highlight
      ? ['#FBEBB0', '#E2BE4B', '#B88A25']
      : ['rgba(255,255,255,0.42)', 'rgba(255,255,255,0.05)', 'rgba(226,190,75,0.34)'];
  const fill: readonly [string, string] = warn
    ? ['#3B3A1E', '#2A3A22']
    : highlight
      ? ['#15663C', '#0C4A2A']
      : ['#154530', '#0D3A22'];

  return (
    <LinearGradient
      colors={border}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.border,
        { borderRadius: radius, padding: highlight ? 1.6 : 1 },
        highlight && styles.halo,
        warn && styles.haloWarn,
        style,
      ]}
    >
      <LinearGradient
        colors={fill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[{ borderRadius: radius - 1, padding }, innerStyle]}
      >
        {children}
      </LinearGradient>
    </LinearGradient>
  );
}

// Fila horizontal dentro de una tarjeta (utilidad frecuente).
export function Row({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  border: { boxShadow: '0 16px 28px -16px rgba(0,0,0,0.6)' },
  halo: { boxShadow: '0 0 30px rgba(226,190,75,0.26), 0 18px 28px -14px rgba(0,0,0,0.55)' },
  haloWarn: { boxShadow: '0 0 26px rgba(247,184,75,0.24)' },
  row: { flexDirection: 'row', alignItems: 'center' },
});
