import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { colors, spacing, radius, shadow } from '../theme';
import { SalomonCrown } from './brand/SalomonEmblem';
import { PLANS } from '../lib/plans';
import type { SubscriptionPlan } from '../types/db';

interface Props {
  selected: SubscriptionPlan;
  onSelect: (plan: SubscriptionPlan) => void;
  currentPlan?: SubscriptionPlan | null;
}

export function PlanPicker({ selected, onSelect, currentPlan }: Props) {
  return (
    <View style={styles.row}>
      {PLANS.map((plan, index) => {
        const highlight = plan.key === 'alianza';
        const isSelected = selected === plan.id;
        return (
          <Pressable
            key={plan.id}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            style={[styles.card, highlight && styles.cardHighlight, isSelected && styles.cardSelected]}
            onPress={() => onSelect(plan.id)}
          >
            {highlight && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Más elegido</Text>
              </View>
            )}
            {currentPlan === plan.id && (
              <View style={[styles.badge, styles.badgeCurrent]}>
                <Text style={styles.badgeText}>Tu plan</Text>
              </View>
            )}
            <View style={styles.crowns}>
              {Array.from({ length: index + 1 }, (_, i) => (
                <SalomonCrown key={i} size={index === 0 ? 20 : index === 1 ? 17 : 15} />
              ))}
            </View>
            <Text style={styles.name}>{plan.name}</Text>
            <Text style={styles.tagline}>{plan.tagline}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceCur}>US$</Text>
              <Text style={styles.priceAmount}>{plan.priceUsd}</Text>
              <Text style={styles.pricePeriod}>/mes</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  card: {
    flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 2, borderColor: colors.glassBorder,
    alignItems: 'center', paddingTop: spacing.xl,
  },
  cardHighlight: { backgroundColor: colors.bgDeep, borderColor: colors.gold, ...shadow.hero },
  cardSelected: { borderColor: colors.goldBright, backgroundColor: 'rgba(226,190,75,0.12)' },
  crowns: { flexDirection: 'row', gap: 1, height: 22, alignItems: 'center', marginBottom: 4 },
  badge: {
    position: 'absolute', top: -11, alignSelf: 'center',
    backgroundColor: colors.gold, borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  badgeCurrent: { backgroundColor: colors.goldBright },
  badgeText: { fontSize: 10, fontWeight: '800', color: colors.onNavy },
  name: { fontSize: 11, fontWeight: '700', color: colors.gold, textAlign: 'center', marginBottom: 4 },
  tagline: { fontSize: 10, color: colors.onDarkMuted, textAlign: 'center', marginBottom: spacing.sm },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end' },
  priceCur: { fontSize: 12, fontWeight: '700', color: colors.gold, paddingBottom: 5, marginRight: 1 },
  priceAmount: { fontSize: 32, fontWeight: '900', color: colors.gold, lineHeight: 36 },
  pricePeriod: { fontSize: 11, color: colors.onDarkMuted, paddingBottom: 4, marginLeft: 1 },
});
