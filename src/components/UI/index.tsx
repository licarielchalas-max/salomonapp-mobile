import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { TextInput } from '../AppTextInput';
import { Text } from '../AppText';
import { colors, spacing, radius } from '../../theme';

export { Button } from './Button';
export { Card } from './Card';
export { Badge } from './Badge';
export { StatCard } from './StatCard';
export { ProgressBar } from './ProgressBar';

export function Logo({ size = 48 }: { size?: number }) {
  return (
    <View style={[styles.logo, { width: size, height: size }]}>
      <Text style={{ fontSize: size * 0.6, fontWeight: '700' }}>♛</Text>
    </View>
  );
}

export function Wordmark({ size = 24 }: { size?: number }) {
  return (
    <Text style={[styles.wordmark, { fontSize: size }]}>Salomon</Text>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint && <Text style={styles.fieldHint}>{hint}</Text>}
      {children}
    </View>
  );
}

export function Input({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  onBlur,
}: {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: string;
  autoCapitalize?: string;
  onBlur?: () => void;
}) {
  return (
    <TextInput
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType as any}
      autoCapitalize={autoCapitalize as any}
      onBlur={onBlur}
      style={styles.input}
      placeholderTextColor={colors.muted}
    />
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

const styles = StyleSheet.create({
  logo: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
    borderRadius: radius.md,
  },
  wordmark: {
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'center',
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  fieldHint: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.paper,
  },
  error: {
    color: colors.rust,
    fontSize: 13,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
});
