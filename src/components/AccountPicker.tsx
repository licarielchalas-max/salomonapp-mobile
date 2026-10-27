import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { Icon } from './brand/Icon';
import { colors, radius, spacing } from '../theme';
import { accountCurrency, accountMoney, amountInAccount, refKey, refOf, type AccountRef } from '../lib/money';
import { baseCurrency, type CurrencyCode } from '../lib/currency';
import type { AccountBalanceRow } from '../types/db';

interface Props {
  accounts: AccountBalanceRow[];
  value: AccountRef | null;
  onChange: (ref: AccountRef) => void;
  /** Monto de la operación: las cuentas que no alcanzan se marcan sin fondos. Solo para salidas. */
  amount?: number;
  /** El monto está en moneda base: se convierte a la moneda de cada cuenta para validar y avisar. */
  amountBase?: boolean;
  /** Moneda del monto (por ejemplo, la de una deuda en dólares). Sustituye a amountBase. */
  amountCurrency?: CurrencyCode;
  /** "salida" = de dónde sale el dinero; "entrada" = dónde entra. */
  mode?: 'salida' | 'entrada';
  label?: string;
  /** Excluye una cuenta (por ejemplo, el origen en una transferencia). */
  exclude?: AccountRef | null;
}

// Selector de cuenta con el saldo disponible de cada una.
export function AccountPicker({ accounts, value, onChange, amount = 0, amountBase = false, amountCurrency, mode = 'salida', label, exclude }: Props) {
  const title = label ?? (mode === 'salida' ? '¿De dónde sale el dinero?' : '¿Dónde entra el dinero?');
  const list = accounts.filter((a) => !exclude || refKey(refOf(a)) !== refKey(exclude));
  const from: CurrencyCode | null = amountCurrency ?? (amountBase ? baseCurrency() : null);
  const onlyCash = accounts.every((a) => a.kind === 'efectivo');
  const selected = value ? accounts.find((a) => refKey(refOf(a)) === refKey(value)) : undefined;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{title}</Text>
      <View style={styles.grid}>
        {list.map((a) => {
          const ref = refOf(a);
          const active = value !== null && refKey(value) === refKey(ref);
          const needed = from ? amountInAccount(a, amount, from) : amount;
          const short = mode === 'salida' && amount > 0 && a.saldo < needed - 0.0001;
          return (
            <Pressable
              key={refKey(ref)}
              onPress={() => onChange(ref)}
              accessibilityRole="button"
              accessibilityLabel={`${a.nombre}, saldo ${accountMoney(a)}`}
              accessibilityState={{ selected: active }}
              style={[styles.card, active && styles.cardActive, short && !active && styles.cardShort]}
            >
              <View style={[styles.icon, active && styles.iconActive]}>
                <Icon name={a.kind === 'efectivo' ? 'coin' : 'bank'} size={16} color={active ? colors.onNavy : colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, active && styles.nameActive]} numberOfLines={1}>{a.nombre}</Text>
                <Text style={[styles.saldo, short && styles.saldoShort, active && !short && styles.saldoActive]} numberOfLines={1}>
                  {accountMoney(a)}
                </Text>
                {short && <Text style={styles.noAlcanza}>No alcanza</Text>}
              </View>
            </Pressable>
          );
        })}
      </View>
      {from && amount > 0 && selected && accountCurrency(selected) !== from && (
        <Text style={styles.hint}>
          {mode === 'salida' ? 'Se descontarán ' : 'Se acreditarán '}
          {accountMoney(selected, amountInAccount(selected, amount, from))} de {selected.nombre}, al cambio de tus tasas.
        </Text>
      )}
      {onlyCash && mode === 'salida' && (
        <Text style={styles.hint}>Solo tienes efectivo. Registra tus cuentas en Bancos para pagar desde ellas.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: { fontSize: 11, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: {
    flexBasis: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, borderRadius: radius.md, borderWidth: 1.5,
    borderColor: 'rgba(226,190,75,0.35)', backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cardActive: { borderColor: colors.gold, backgroundColor: 'rgba(226,190,75,0.16)' },
  cardShort: { borderColor: 'rgba(255,143,122,0.5)' },
  icon: {
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.goldSoft,
  },
  iconActive: { backgroundColor: colors.gold },
  name: { fontSize: 13, fontWeight: '700', color: colors.onDark },
  nameActive: { color: colors.goldBright },
  saldo: { fontSize: 12, color: colors.onDarkMuted, marginTop: 1 },
  saldoActive: { color: colors.onDark },
  saldoShort: { color: colors.rust, fontWeight: '600' },
  noAlcanza: { fontSize: 10.5, fontWeight: '700', color: colors.rust, marginTop: 1 },
  hint: { fontSize: 12, color: colors.onDarkMuted, lineHeight: 17 },
});
