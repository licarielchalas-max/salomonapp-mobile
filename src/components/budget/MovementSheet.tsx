import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { TextInput } from '../AppTextInput';
import { Text } from '../AppText';
import { GoldButton } from '../brand/Buttons';
import { AccountPicker } from '../AccountPicker';
import { Chip, FieldLabel, Sheet, fmt } from './ui';
import { colors, radius, spacing } from '../../theme';
import { baseCash, fundingFor, fundsErrorBase, type AccountRef } from '../../lib/money';
import { applyBaseSymbol } from '../../lib/currency';
import type { AccountBalanceRow } from '../../types/db';
import type { BudgetSummary } from '../../hooks/useBudgets';

export type MoveTipo = 'abono' | 'retiro';

interface Props {
  visible: boolean;
  onClose: () => void;
  budget: BudgetSummary | null;
  initialTipo: MoveTipo;
  accounts: AccountBalanceRow[];
  findAccount: (ref: AccountRef | null) => AccountBalanceRow | undefined;
  onSubmit: (budgetId: string, tipo: MoveTipo, monto: number, account: AccountRef, nota?: string, funding?: Record<string, unknown>) => Promise<{ error: string | null }>;
}

// Abonar saca dinero de una cuenta hacia el presupuesto; devolver lo regresa a una cuenta.
export function MovementSheet({ visible, onClose, budget, initialTipo, accounts, findAccount, onSubmit }: Props) {
  const [tipo, setTipo] = useState<MoveTipo>(initialTipo);
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');
  const [account, setAccount] = useState<AccountRef | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTipo(initialTipo);
    setMonto('');
    setNota('');
    // Por defecto, la cuenta configurada en el presupuesto (o efectivo).
    setAccount(
      budget?.medio !== 'efectivo' && budget?.bank_account_id
        ? { kind: 'banco', id: budget.bank_account_id }
        : baseCash(),
    );
  }, [visible, initialTipo, budget?.id]);

  if (!budget) return null;

  const faltante = Math.max(0, budget.monto - budget.abonado);
  const value = parseFloat(monto.replace(/,/g, ''));

  async function submit() {
    if (!budget) return;
    if (!value || value <= 0) return Alert.alert('Monto inválido', 'Ingresa un monto mayor a 0.');
    if (!account) return Alert.alert('Elige una cuenta', tipo === 'abono' ? 'Indica de qué cuenta sale el dinero.' : 'Indica a qué cuenta vuelve el dinero.');
    if (tipo === 'abono') {
      const err = fundsErrorBase(findAccount(account), value);
      if (err) return Alert.alert('Sin fondos', err);
    } else if (value > budget.disponible + 0.0001) {
      return Alert.alert('Sin fondos', applyBaseSymbol(`El presupuesto solo tiene ¤ ${fmt(Math.max(budget.disponible, 0))} disponibles.`));
    }
    setSaving(true);
    const { error } = await onSubmit(budget.id, tipo, value, account, nota, fundingFor(findAccount(account), value));
    setSaving(false);
    if (error) return Alert.alert('No se pudo guardar', error);
    onClose();
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={budget.nombre}>
      <View style={styles.row}>
        <Chip label="Abonar" icon="plus" active={tipo === 'abono'} onPress={() => setTipo('abono')} />
        <Chip label="Devolver a una cuenta" icon="refresh" active={tipo === 'retiro'} onPress={() => setTipo('retiro')} />
      </View>

      <Text style={styles.hint}>
        {tipo === 'abono'
          ? `El dinero sale de la cuenta que elijas y queda guardado en este presupuesto. Te faltan ¤${fmt(faltante)} para la meta del mes.`
          : `Regresa dinero del presupuesto a una de tus cuentas. Disponible en el presupuesto: ¤${fmt(Math.max(budget.disponible, 0))}.`}
      </Text>

      <View style={{ gap: spacing.sm }}>
        <FieldLabel>Monto (¤)</FieldLabel>
        <TextInput
          style={[styles.input, styles.amount]}
          value={monto}
          onChangeText={setMonto}
          placeholder="0.00"
          placeholderTextColor={colors.onDarkMuted}
          keyboardType="decimal-pad"
          autoFocus
        />
        {tipo === 'abono' && faltante > 0 && (
          <View style={styles.row}>
            <Chip label="Completar meta" onPress={() => setMonto(String(faltante))} />
          </View>
        )}
        {tipo === 'retiro' && budget.disponible > 0 && (
          <View style={styles.row}>
            <Chip label="Devolver todo" onPress={() => setMonto(String(budget.disponible))} />
          </View>
        )}
      </View>

      <AccountPicker
        accounts={accounts}
        value={account}
        onChange={setAccount}
        mode={tipo === 'abono' ? 'salida' : 'entrada'}
        amount={tipo === 'abono' && value > 0 ? value : 0}
        amountBase
        label={tipo === 'abono' ? '¿De qué cuenta sale el dinero?' : '¿A qué cuenta vuelve?'}
      />

      <View style={{ gap: spacing.sm }}>
        <FieldLabel>Nota (opcional)</FieldLabel>
        <TextInput
          style={styles.input}
          value={nota}
          onChangeText={setNota}
          placeholder={tipo === 'abono' ? 'Ej. Quincena' : 'Ej. Sobró este mes'}
          placeholderTextColor={colors.onDarkMuted}
          maxLength={100}
        />
      </View>

      <GoldButton label={tipo === 'abono' ? 'Guardar abono' : 'Devolver dinero'} onPress={submit} loading={saving} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hint: { fontSize: 13, color: colors.onDarkMuted, lineHeight: 19 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.onDark,
  },
  amount: { fontSize: 22, fontWeight: '700', color: colors.goldBright },
});
