import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { TextInput } from '../AppTextInput';
import { Text } from '../AppText';
import { GhostButton, GoldButton } from '../brand/Buttons';
import { Chip, FieldLabel, MEDIO_ICON, MEDIO_LABEL, Sheet } from './ui';
import { colors, radius, spacing } from '../../theme';
import type { BankAccountRow, BudgetInsert, CategoryRow, PaymentMethod } from '../../types/db';
import type { BudgetSummary } from '../../hooks/useBudgets';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Presupuesto a editar; null = crear uno nuevo. */
  budget: BudgetSummary | null;
  categories: CategoryRow[];
  accounts: BankAccountRow[];
  onSave: (input: Omit<BudgetInsert, 'household_id'>, id?: string) => Promise<{ error: string | null }>;
  onDelete: (id: string) => Promise<{ error: string | null }>;
}

const MEDIOS: PaymentMethod[] = ['efectivo', 'tarjeta', 'transferencia'];

export function BudgetForm({ visible, onClose, budget, categories, accounts, onSave, onDelete }: Props) {
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [medio, setMedio] = useState<PaymentMethod>('efectivo');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setNombre(budget?.nombre ?? '');
    setMonto(budget ? String(budget.monto) : '');
    setCategoryId(budget?.category_id ?? null);
    setMedio(budget?.medio ?? 'efectivo');
    setAccountId(budget?.bank_account_id ?? null);
    setNota(budget?.nota ?? '');
  }, [visible, budget]);

  async function submit() {
    const value = parseFloat(monto.replace(/,/g, ''));
    if (!nombre.trim()) return Alert.alert('Falta el nombre', 'Dale un nombre al presupuesto, por ejemplo "Supermercado".');
    if (!value || value <= 0) return Alert.alert('Monto inválido', 'Ingresa un monto mayor a 0.');
    if (medio !== 'efectivo' && !accountId) {
      return Alert.alert('Elige la cuenta', 'Indica de qué cuenta saldrá el dinero de este presupuesto.');
    }
    setSaving(true);
    const { error } = await onSave(
      { nombre, monto: value, category_id: categoryId, medio, bank_account_id: accountId, nota },
      budget?.id,
    );
    setSaving(false);
    if (error) return Alert.alert('No se pudo guardar', error);
    onClose();
  }

  function confirmDelete() {
    if (!budget) return;
    Alert.alert(
      'Eliminar presupuesto',
      `Se borrará "${budget.nombre}" con todos sus abonos y gastos. Tus transacciones no se tocan.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await onDelete(budget.id);
            if (error) Alert.alert('No se pudo eliminar', error);
            else onClose();
          },
        },
      ],
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={budget ? 'Editar presupuesto' : 'Nuevo presupuesto'}>
      <View style={styles.group}>
        <FieldLabel>Nombre</FieldLabel>
        <TextInput
          style={styles.input}
          value={nombre}
          onChangeText={setNombre}
          placeholder="Ej. Supermercado, Gasolina, Vacaciones"
          placeholderTextColor={colors.onDarkMuted}
          maxLength={60}
        />
      </View>

      <View style={styles.group}>
        <FieldLabel>Monto del mes (¤)</FieldLabel>
        <TextInput
          style={[styles.input, styles.amount]}
          value={monto}
          onChangeText={setMonto}
          placeholder="0.00"
          placeholderTextColor={colors.onDarkMuted}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.group}>
        <FieldLabel>¿De dónde sale este dinero?</FieldLabel>
        <View style={styles.wrap}>
          {MEDIOS.map((m) => (
            <Chip
              key={m}
              label={MEDIO_LABEL[m]}
              icon={MEDIO_ICON[m]}
              active={medio === m}
              onPress={() => {
                setMedio(m);
                if (m === 'efectivo') setAccountId(null);
                else if (!accountId && accounts.length > 0) setAccountId(accounts[0].id);
              }}
            />
          ))}
        </View>
        {medio !== 'efectivo' &&
          (accounts.length > 0 ? (
            <View style={styles.wrap}>
              {accounts.map((a) => (
                <Chip
                  key={a.id}
                  icon="bank"
                  label={`${a.banco}${a.ultimos4 ? ` ···${a.ultimos4}` : ''}`}
                  active={accountId === a.id}
                  onPress={() => setAccountId(a.id)}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.hint}>Registra tus cuentas en Bancos y podrás elegir aquí exactamente cuál guarda este dinero.</Text>
          ))}
      </View>

      <View style={styles.group}>
        <FieldLabel>Categoría vinculada (opcional)</FieldLabel>
        <Text style={styles.hint}>Si eliges una, los gastos que registres en esa categoría se descuentan solos de este presupuesto.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          <Chip label="Ninguna" active={categoryId === null} onPress={() => setCategoryId(null)} />
          {categories.map((c) => (
            <Chip key={c.id} label={c.label} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
          ))}
        </ScrollView>
      </View>

      <View style={styles.group}>
        <FieldLabel>Nota (opcional)</FieldLabel>
        <TextInput
          style={styles.input}
          value={nota}
          onChangeText={setNota}
          placeholder="Para qué es este dinero"
          placeholderTextColor={colors.onDarkMuted}
          maxLength={140}
        />
      </View>

      <GoldButton label={budget ? 'Guardar cambios' : 'Crear presupuesto'} onPress={submit} loading={saving} />
      {budget && <GhostButton label="Eliminar presupuesto" onPress={confirmDelete} />}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hScroll: { gap: spacing.sm, paddingVertical: 2 },
  hint: { fontSize: 12, color: colors.onDarkMuted, lineHeight: 17 },
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
