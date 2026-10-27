import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { TextInput } from '../AppTextInput';
import { Text } from '../AppText';
import { GoldButton } from '../brand/Buttons';
import { Chip, FieldLabel, Sheet } from '../budget/ui';
import { DateField, EventAlertChips, RecurrenceChips, TimeField } from './Fields';
import { EVENT_TYPES, eventReminderDate, trimTime, toISODate, parseLocal } from '../../lib/reminders';
import { colors, radius, spacing } from '../../theme';
import type { CalendarEventInsert, CalendarEventRow, CalendarEventType, Recurrence } from '../../types/db';
import { dateLocale } from '../../lib/i18n';

type Input = Omit<CalendarEventInsert, 'household_id'>;

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Evento a editar; null = nuevo. */
  event: CalendarEventRow | null;
  /** Fecha sugerida para un evento nuevo. */
  defaultDate: string;
  onSave: (input: Input, id?: string) => Promise<{ error: string | null }>;
}

const isRealDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(parseLocal(v, '12:00').getTime()) && toISODate(parseLocal(v, '12:00')) === v;

export function EventForm({ visible, onClose, event, defaultDate, onSave }: Props) {
  const [tipo, setTipo] = useState<CalendarEventType>('cita');
  const [titulo, setTitulo] = useState('');
  const [fecha, setFecha] = useState(defaultDate);
  const [hora, setHora] = useState('');
  const [lugar, setLugar] = useState('');
  const [notas, setNotas] = useState('');
  const [aviso, setAviso] = useState<number | null>(30);
  const [rec, setRec] = useState<Recurrence>('ninguna');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTipo(event?.tipo ?? 'cita');
    setTitulo(event?.titulo ?? '');
    setFecha(event?.event_date ?? defaultDate);
    setHora(trimTime(event?.event_time));
    setLugar(event?.lugar ?? '');
    setNotas(event?.notas ?? '');
    setAviso(event ? event.aviso_minutos : 30);
    setRec(event?.recurrencia ?? 'ninguna');
  }, [visible, event, defaultDate]);

  const validDate = isRealDate(fecha);
  const reminderAt = validDate ? eventReminderDate({ event_date: fecha, event_time: hora || null, aviso_minutos: aviso }) : null;
  const past = reminderAt !== null && reminderAt.getTime() <= Date.now() && rec === 'ninguna';

  async function submit() {
    if (!titulo.trim()) return Alert.alert('Falta el título', 'Escribe de qué se trata, por ejemplo "Cita con el contador".');
    if (!validDate) return Alert.alert('Fecha inválida', 'Escribe la fecha como AAAA-MM-DD.');
    setSaving(true);
    const { error } = await onSave(
      {
        titulo: titulo.trim(),
        tipo,
        event_date: fecha,
        event_time: hora || null,
        lugar: lugar.trim() || null,
        notas: notas.trim() || null,
        aviso_minutos: aviso,
        recurrencia: rec,
      },
      event?.id,
    );
    setSaving(false);
    if (error) return Alert.alert('No se pudo guardar', error);
    onClose();
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={event ? 'Editar evento' : 'Nuevo evento'}>
      <View style={styles.wrap}>
        {EVENT_TYPES.map((t) => (
          <Chip key={t.key} label={t.label} active={tipo === t.key} onPress={() => setTipo(t.key)} />
        ))}
      </View>

      <View style={styles.group}>
        <FieldLabel>Título</FieldLabel>
        <TextInput
          style={styles.input}
          value={titulo}
          onChangeText={setTitulo}
          placeholder="Ej. Cita con el contador, reunión con el banco"
          placeholderTextColor={colors.onDarkMuted}
          maxLength={80}
        />
      </View>

      <View style={styles.group}>
        <FieldLabel>Fecha</FieldLabel>
        <DateField value={fecha} onChange={setFecha} />
      </View>

      <View style={styles.group}>
        <FieldLabel>Hora</FieldLabel>
        <TimeField value={hora} onChange={setHora} clearable />
      </View>

      <View style={styles.group}>
        <FieldLabel>Lugar (opcional)</FieldLabel>
        <TextInput style={styles.input} value={lugar} onChangeText={setLugar} placeholder="Ej. Oficina del banco, Zoom" placeholderTextColor={colors.onDarkMuted} maxLength={80} />
      </View>

      <View style={styles.group}>
        <FieldLabel>¿Cuándo te avisamos?</FieldLabel>
        <EventAlertChips value={aviso} onChange={setAviso} />
        {aviso !== null && !hora && aviso < 1440 && (
          <Text style={styles.hint}>Sin hora, el aviso llega a las 9:00 a. m. del día del evento.</Text>
        )}
        {reminderAt && !past && (
          <Text style={styles.hint}>
            Te avisaremos el {reminderAt.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })} a las{' '}
            {reminderAt.toLocaleTimeString(dateLocale(), { hour: 'numeric', minute: '2-digit' })}.
          </Text>
        )}
        {past && <Text style={[styles.hint, { color: colors.neonAmber }]}>Ese momento ya pasó: este aviso no sonará. Elige una fecha u hora futura.</Text>}
      </View>

      <View style={styles.group}>
        <FieldLabel>Repetir</FieldLabel>
        <RecurrenceChips value={rec} onChange={setRec} />
      </View>

      <View style={styles.group}>
        <FieldLabel>Notas (opcional)</FieldLabel>
        <TextInput
          style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
          value={notas}
          onChangeText={setNotas}
          placeholder="Qué llevar, con quién hablar..."
          placeholderTextColor={colors.onDarkMuted}
          multiline
          maxLength={300}
        />
      </View>

      <GoldButton label={event ? 'Guardar cambios' : 'Guardar evento'} onPress={submit} loading={saving} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  group: { gap: spacing.sm },
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
});
