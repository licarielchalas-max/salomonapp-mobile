import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { Sheet } from './budget/ui';
import { LedgerItem } from './LedgerItem';
import { useLedger } from '../hooks/useLedger';
import { toLedgerItems } from '../lib/ledger';
import { type AccountRef } from '../lib/money';
import { formatCurrency, type CurrencyCode } from '../lib/currency';
import { colors, spacing } from '../theme';
import type { AccountBalanceRow } from '../types/db';

interface Props {
  visible: boolean;
  onClose: () => void;
  householdId: string | null;
  /** Cuenta a mostrar; null cierra la hoja. */
  account: AccountRef | null;
  accounts: AccountBalanceRow[];
  nombre: string;
  saldo: number;
  moneda: CurrencyCode;
}

// Estado de cuenta: todos los movimientos de dinero de una cuenta, del más reciente al más antiguo.
export function AccountHistorySheet({ visible, onClose, householdId, account, accounts, nombre, saldo, moneda }: Props) {
  const { rows, loading } = useLedger(householdId, { account, limit: 100, enabled: visible && !!account });
  const items = useMemo(() => toLedgerItems(rows, accounts), [rows, accounts]);

  return (
    <Sheet visible={visible} onClose={onClose} title={nombre}>
      <View>
        <Text style={styles.kicker}>SALDO ACTUAL</Text>
        <Text style={[styles.saldo, saldo < 0 && { color: colors.rust }]}>{formatCurrency(saldo, moneda, { space: true })}</Text>
      </View>
      <Text style={styles.section}>MOVIMIENTOS</Text>
      {loading ? (
        <ActivityIndicator color={colors.gold} />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>Esta cuenta aún no tiene movimientos.</Text>
      ) : (
        items.map((item) => <LedgerItem key={item.key} item={item} />)
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 1.3, color: colors.onDarkMuted },
  saldo: { fontSize: 28, fontWeight: '800', color: colors.goldBright, marginTop: 4 },
  section: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: colors.onDarkMuted, marginTop: spacing.sm },
  empty: { fontSize: 13, color: colors.onDarkMuted },
});
