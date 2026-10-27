import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { TextInput } from '../AppTextInput';
import { Text } from '../AppText';
import { GoldButton } from '../brand/Buttons';
import { Chip, FieldLabel, Sheet } from '../budget/ui';
import { DateField, PaymentAlertChips, RecurrenceChips, TimeField } from './Fields';
import { PAYMENT_PRESETS, addDays, paymentReminderDate, parseLocal, toISODate } from '../../lib/reminders';
import { colors, radius, spacing } from '../../theme';
import type { Recurrence, ScheduledExpenseInsert, ScheduledExpenseRow } from '../../types/db';
import { dateLocale } from '../../lib/i18n';

type Input = Omit<ScheduledExpenseInsert, 'household_id'>;

interface Props {
  visible: boolean;
  onClose: () => void;
  defaultDate: string;
  /** Pago a editar; null = nuevo. */
  expense?: ScheduledExpenseRow | null;
  onSave: (input: Input, id?: string) => Promise<{ error: string | null }>;
}

const isRealDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && toISODate(parseLocal(v, '12:00')) === v;

// Pago pendiente: tarjeta, luz, agua, préstamo... con aviso, hora y repetición mensual.
export function PaymentForm({ visible, onClose, defaultDate, expense = null, onSave }: Props) {
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(defaultDate);
  const [aviso, setAviso] = useState<number | null>(1);
  const [hora, setHora] = useState('09:00');
  const [rec, setRec] = useState<Recurrence>('ninguna');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (expense) {
      setDescripcion(expense.descripcion);
      setMonto(String(expense.monto));
      setFecha(expense.fecha_pago);
      setAviso(expense.aviso_dias_antes);
      setHora(expense.hora_aviso ? expense.hora_aviso.slice(0, 5) : '09:00');
      setRec(expense.recurrencia);
      return;
    }
    setDescripcion('');
    setMonto('');
    setFecha(defaultDate < toISODate(new Date()) ? addDays(toISODate(new Date()), 1) : defaultDate);
    setAviso(1);
    setHora('09:00');
    setRec('ninguna');
  }, [visible, defaultDate, expense]);

  const validDate = isRealDate(fecha);
  const at = validDate && aviso !== null ? paymentReminderDate({ fecha_pago: fecha, hora_aviso: hora || '09:00', aviso_dias_antes: aviso, status: 'pendiente' }) : null;

  async function submit() {
    const value = parseFloat(monto.replace(/,/g, ''));
    if (!descripcion.trim()) return Alert.alert('Falta la descripción', 'Escribe qué se paga, por ejemplo "Luz".');
    if (!value || value <= 0) return Alert.alert('Monto inválido', 'Ingresa un monto mayor a 0.');
    if (!validDate) return Alert.alert('Fecha inválida', 'Escribe la fecha como AAAA-MM-DD.');
    setSaving(true);
    const { error } = await onSave({
      descripcion: descripcion.trim(),
      monto: value,
      fecha_pago: fecha,
      status: 'pendiente',
      aviso_dias_antes: aviso,
      hora_aviso: hora || '09:00',
      recurrencia: rec,
    }, expense?.id);
    setSaving(false);
    if (error) return Alert.alert('No se pudo guardar', error);
    onClose();
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={expense ? 'Editar pago' : 'Programar pago'}>
      <View style={styles.group}>
        <FieldLabel>¿Qué pagas?</FieldLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets}>
          {PAYMENT_PRESETS.map((p) => (
            <Chip key={p} label={p} active={descripcion === p} onPress={() => setDescripcion(p)} />
          ))}
        </ScrollView>
        <TextInput
          style={styles.input}
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="Ej. Tarjeta Visa, Luz, Préstamo del carro"
          placeholderTextColor={colors.onDarkMuted}
          maxLength={80}
        />
      </View>

      <View style={styles.group}>
        <FieldLabel>Monto (¤)</FieldLabel>
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
        <FieldLabel>Fecha de pago</FieldLabel>
        <DateField value={fecha} onChange={setFecha} minimumDate={expense ? undefined : new Date()} />
      </View>

      <View style={styles.group}>
        <FieldLabel>Repetir</FieldLabel>
        <RecurrenceChips value={rec} onChange={setRec} />
        {rec !== 'ninguna' && (
          <Text style={styles.hint}>Al pagarlo, el siguiente queda programado solo con el mismo aviso.</Text>
        )}
      </View>

      <View style={styles.group}>
        <FieldLabel>¿Cuándo te avisamos?</FieldLabel>
        <PaymentAlertChips value={aviso} onChange={setAviso} />
        {aviso !== null && (
          <>
            <FieldLabel>Hora del aviso</FieldLabel>
            <TimeField value={hora} onChange={(v) => setHora(v || '09:00')} />
          </>
        )}
        {at && (
          <Text style={styles.hint}>
            Te avisaremos el {at.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })} a las{' '}
            {at.toLocaleTimeString(dateLocale(), { hour: 'numeric', minute: '2-digit' })}, y cada día si se vence sin pagar.
          </Text>
        )}
      </View>

      <GoldButton label={expense ? 'Guardar cambios' : 'Programar pago'} onPress={submit} loading={saving} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  presets: { gap: spacing.sm, paddingVertical: 2 },
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
