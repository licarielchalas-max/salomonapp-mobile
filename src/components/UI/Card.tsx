import React from 'react';
import { View, ViewStyle } from 'react-native';
import { colors, shadow, radius, spacing } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'sm' | 'md' | 'lg';
}

export function Card({ children, style, variant = 'default', padding = 'md' }: CardProps) {
  const paddingMap = { sm: spacing.sm, md: spacing.md, lg: spacing.lg };
  const paddingValue = paddingMap[padding];

  const variants: { [key: string]: ViewStyle } = {
    default: {
      backgroundColor: colors.paper,
      borderRadius: radius.lg,
      shadowColor: colors.navy,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    outlined: {
      backgroundColor: colors.cream,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
    },
    elevated: {
      backgroundColor: colors.paper,
      borderRadius: radius.lg,
      shadowColor: colors.navy,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
  };

  return (
    <View style={[variants[variant], { padding: paddingValue }, style]}>
      {children}
    </View>
  );
}




