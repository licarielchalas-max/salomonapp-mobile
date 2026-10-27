import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../AppText';
import { colors, typography, radius, spacing } from '../../theme';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
}

export function Badge({ label, variant = 'default', size = 'sm' }: BadgeProps) {
  const variants: { [key: string]: { bg: string; text: string } } = {
    default: { bg: colors.overlay, text: colors.navy },
    success: { bg: `${colors.success}20`, text: colors.success },
    warning: { bg: `${colors.warning}20`, text: colors.warning },
    error: { bg: `${colors.error}20`, text: colors.error },
    info: { bg: `${colors.info}20`, text: colors.info },
  };

  const current = variants[variant];
  const sizeMap: { [key: string]: { fontSize: number; paddingVertical: number; paddingHorizontal: number } } = {
    sm: { fontSize: 11, paddingVertical: 4, paddingHorizontal: 8 },
    md: { fontSize: 12, paddingVertical: 6, paddingHorizontal: 12 },
  };

  const sizeStyle = sizeMap[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: current.bg,
          paddingVertical: sizeStyle.paddingVertical,
          paddingHorizontal: sizeStyle.paddingHorizontal,
        },
      ]}
    >
      <Text style={[styles.text, { color: current.text, fontSize: sizeStyle.fontSize }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
    lineHeight: 16,
  },
});





