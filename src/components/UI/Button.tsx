import React, { useState } from 'react';
import { Pressable, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Text } from '../AppText';
import { colors, typography, radius, spacing } from '../../theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
}: ButtonProps) {
  const [pressed, setPressed] = useState(false);

  const sizeMap: { [key: string]: { paddingVertical: number; paddingHorizontal: number } } = {
    sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
    lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
  };

  const variants: { [key: string]: { backgroundColor: string; textColor: string; borderColor?: string } } = {
    primary: { backgroundColor: colors.navy, textColor: colors.onNavy },
    secondary: { backgroundColor: colors.gold, textColor: colors.onNavy },
    outline: { backgroundColor: 'transparent', textColor: colors.navy, borderColor: colors.navy },
    ghost: { backgroundColor: 'transparent', textColor: colors.navy },
  };

  const currentVariant = variants[variant];
  const size_ = sizeMap[size];

  const containerStyle: ViewStyle = {
    ...size_,
    borderRadius: radius.md,
    backgroundColor: disabled ? colors.line : currentVariant.backgroundColor,
    borderWidth: variant === 'outline' ? 1 : 0,
    borderColor: currentVariant.borderColor || 'transparent',
    opacity: pressed && !disabled ? 0.8 : 1,
    width: fullWidth ? '100%' : 'auto',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const textStyle: TextStyle = {
    color: disabled ? colors.muted : currentVariant.textColor,
  };

  return (
    <Pressable
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
    >
      <Text style={textStyle}>{loading ? 'Cargando…' : label}</Text>
    </Pressable>
  );
}





