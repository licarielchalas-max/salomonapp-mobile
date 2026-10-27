import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Text } from '../AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme';

export const FOIL_COLORS = ['#FBEBB0', '#EBC95E', '#D8AE3C', '#B88A25'] as const;
export const FOIL_LOCATIONS = [0, 0.44, 0.54, 1] as const;

interface GoldProps {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Botón compacto (altura 44). */
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Botón de oro líquido: degradado con reflejo duro, texto verde oscuro.
export function GoldButton({ label, onPress, loading, disabled, small, style }: GoldProps) {
  const height = small ? 44 : 56;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        { borderRadius: height / 2, opacity: disabled ? 0.5 : pressed ? 0.88 : 1 },
        styles.goldShadow,
        style,
      ]}
    >
      <LinearGradient
        colors={FOIL_COLORS}
        locations={FOIL_LOCATIONS}
        style={[styles.gold, { height, borderRadius: height / 2 }]}
      >
        {loading ? (
          <ActivityIndicator color={colors.onNavy} />
        ) : (
          <Text style={[styles.goldText, small && { fontSize: 14 }]}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

interface GhostProps {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Botón secundario: borde de oro, sin relleno.
export function GhostButton({ label, onPress, style }: GhostProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.ghost, pressed && { opacity: 0.8 }, style]}
    >
      <Text style={styles.ghostText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  goldShadow: { boxShadow: '0 12px 26px rgba(226,190,75,0.28)' },
  gold: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  goldText: { fontSize: 16, fontWeight: '800', color: colors.onNavy },
  ghost: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(226,190,75,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  ghostText: { fontSize: 15, fontWeight: '700', color: colors.goldBright },
});
