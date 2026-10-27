import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { Chip } from './budget/ui';
import { CURRENCY_LIST, type CurrencyCode } from '../lib/currency';
import { tr } from '../lib/i18n';
import { colors } from '../theme';

interface Props {
  value: CurrencyCode;
  onChange: (code: CurrencyCode) => void;
  /** Muestra la moneda sin dejar cambiarla (por ejemplo, en una cuenta que ya tiene movimientos). */
  locked?: boolean;
  lockedNote?: string;
}

// Selector de moneda: pesos, dólares o euros.
export function CurrencyChips({ value, onChange, locked, lockedNote }: Props) {
  const list = locked ? CURRENCY_LIST.filter((c) => c.code === value) : CURRENCY_LIST;
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {list.map((c) => (
          <Chip
            key={c.code}
            label={`${c.symbol}  ${tr(c.names.es)}`}
            active={c.code === value}
            onPress={() => !locked && onChange(c.code)}
          />
        ))}
      </View>
      {locked && !!lockedNote && <Text style={styles.note}>{lockedNote}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  note: { fontSize: 11.5, color: colors.onDarkMuted, lineHeight: 16 },
});
