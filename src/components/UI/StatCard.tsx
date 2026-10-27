import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../AppText';
import { colors, typography, radius, spacing } from '../../theme';
import { Card } from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: { direction: 'up' | 'down' | 'flat'; value: number };
  color?: string;
}

export function StatCard({ title, value, subtitle, icon, trend, color }: StatCardProps) {
  const displayColor = color || colors.navy;

  return (
    <Card variant="elevated">
      <View style={styles.container}>
        {icon && <Text style={[styles.icon, { color: displayColor }]}>{icon}</Text>}
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={[styles.value, { color: displayColor }]}>{value}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          {trend && (
            <View style={styles.trend}>
              <Text style={[styles.trendText, { color: trend.direction === 'up' ? colors.success : colors.error }]}>
                {trend.direction === 'up' ? 'â†‘' : trend.direction === 'down' ? 'â†“' : 'â†’'} {trend.value}%
              </Text>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  icon: {
    fontSize: 32,
    lineHeight: 40,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.muted,
    fontWeight: '500',
  },
  value: {
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
  },
  trend: {
    marginTop: spacing.xs,
  },
  trendText: {
    fontWeight: '600',
  },
});





