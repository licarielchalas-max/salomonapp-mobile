import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius } from '../theme';

export function Header() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.header}>
      <Text style={styles.title}>Salomon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    elevation: 2,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    fontSize: 28,
  },
  title: {
    color: colors.navy,
    fontWeight: '700' as const,
  },
  badge: {
    backgroundColor: `${colors.gold}20`,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  badgeText: {
    fontSize: 11,
    color: colors.gold,
    fontWeight: '600' as const,
  },
  actionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  pressed: {
    backgroundColor: `${colors.navy}10`,
  },
  hamburger: {
    fontSize: 18,
    color: colors.ink,
  },
  menuLabel: {
    color: colors.ink,
    fontWeight: '600' as const,
  },
  icon: {
    fontSize: 18,
    color: colors.ink,
  },
});


