import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../AppText';
import { colors, typography, radius, spacing } from '../../theme';

interface ProgressBarProps {
  label: string;
  current: number;
  total: number;
  showPercentage?: boolean;
  colorOverride?: string;
}

export function ProgressBar({
  label,
  current,
  total,
  showPercentage = true,
  colorOverride,
}: ProgressBarProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  const isWarning = percentage > 80;
  const isExceeded = percentage > 100;

  const barColor = colorOverride
    ? colorOverride
    : isExceeded
      ? colors.error
      : isWarning
        ? colors.warning
        : colors.success;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {showPercentage && (
          <Text style={[styles.percentage, { color: barColor }]}>
            {Math.round(percentage)}%
          </Text>
        )}
      </View>
      <View style={styles.barContainer}>
        <View
          style={[
            styles.bar,
            {
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: colors.ink,
    fontWeight: '600',
  },
  percentage: {
    fontWeight: '700',
  },
  barContainer: {
    height: 8,
    backgroundColor: colors.line,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: radius.full,
  },
});





