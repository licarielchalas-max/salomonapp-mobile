import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { Icon } from './brand/Icon';
import { colors, radius, spacing } from '../theme';
import { SOURCE_BADGE, SOURCE_ICON, type LedgerItemData } from '../lib/ledger';
import { formatCurrency } from '../lib/currency';

function dayLabel(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

// Una línea del libro de movimientos: qué pasó, con qué cuenta y cuánto.
export function LedgerItem({ item }: { item: LedgerItemData }) {
  const transfer = item.accountTo !== undefined;
  const positive = !transfer && item.amount >= 0;
  const color = transfer ? colors.neonAmber : positive ? colors.green : colors.rust;
  return (
    <View style={styles.card}>
      <View style={[styles.icon, { backgroundColor: transfer ? 'rgba(247,184,75,0.16)' : positive ? 'rgba(123,224,176,0.16)' : 'rgba(255,143,122,0.16)' }]}>
        <Icon name={SOURCE_ICON[item.source]} size={17} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
        <Text style={styles.sub} numberOfLines={1}>
          {dayLabel(item.occurred_on)} · {transfer ? `${item.account} → ${item.accountTo}` : item.account}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={[styles.amount, { color }]}>
          {transfer ? '' : positive ? '+' : '−'}{formatCurrency(Math.abs(item.amount), item.moneda)}
          {item.amountTo !== undefined && item.monedaTo ? ` → ${formatCurrency(item.amountTo, item.monedaTo)}` : ''}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{SOURCE_BADGE[item.source]}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, marginBottom: spacing.sm,
    borderRadius: radius.md, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder,
  },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: colors.onDark },
  sub: { fontSize: 11.5, color: colors.onDarkMuted, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '800' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.08)' },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6, color: colors.onDarkMuted },
});
