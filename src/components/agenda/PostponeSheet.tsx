import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Text } from '../AppText';
import { GoldButton } from '../brand/Buttons';
import { Chip, FieldLabel, Sheet } from '../budget/ui';
import { DateField } from './Fields';
import { POSTPONE_OPTIONS, addDays, parseLocal, toISODate } from '../../lib/reminders';
import { colors, spacing } from '../../theme';
import { dateLocale } from '../../lib/i18n';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Vencimiento actual (YYYY-MM-DD). */
  currentDate: string;
  onConfirm: (newDate: string) => Promise<{ error: string | null }>;
}

function pretty(d: string) {
  return parseLocal(d, '12:00').toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
}

// Posponer un pago: elegir cuántos días o una fecha exacta. El aviso se mueve junto con el vencimiento.
export function PostponeSheet({ visible, onClose, title, currentDate, onConfirm }: Props) {
  const today = toISODate(new Date());
  // Si ya venció, se cuenta desde hoy; si no, desde el vencimiento actual.
  const base = currentDate < today ? today : currentDate;
  const [custom, setCustom] = useState(addDays(base, 1));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setCustom(addDays(base, 1));
  }, [visible, base]);

  async function apply(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(parseLocal(date, '12:00').getTime())) {
      return Alert.alert('Fecha inválida', 'Escribe la fecha como AAAA-MM-DD.');
    }
    if (date < today) return Alert.alert('Fecha inválida', 'Elige hoy o una fecha futura.');
    setSaving(true);
    const { error } = await onConfirm(date);
    setSaving(false);
    if (error) return Alert.alert('No se pudo posponer', error);
    onClose();
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Posponer pago">
      <Text style={styles.what}>{title}</Text>
      <Text style={styles.hint}>Vence: {pretty(currentDate)}. Al posponer, el aviso se mueve a la nueva fecha.</Text>
      <View style={{ gap: spacing.sm }}>
        {POSTPONE_OPTIONS.map((o) => {
          const d = addDays(base, o.days);
          return <Chip key={o.days} label={`${o.label} · ${pretty(d)}`} icon="calendar" onPress={() => apply(d)} />;
        })}
      </View>
      <FieldLabel>O elige otra fecha</FieldLabel>
      <DateField value={custom} onChange={setCustom} minimumDate={new Date()} />
      <GoldButton label="Posponer a esa fecha" onPress={() => apply(custom)} loading={saving} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  what: { fontSize: 16, fontWeight: '700', color: colors.onDark },
  hint: { fontSize: 13, color: colors.onDarkMuted, lineHeight: 19 },
});
