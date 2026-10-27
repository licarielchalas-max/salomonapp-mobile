import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { TextInput } from '../AppTextInput';
import { Text } from '../AppText';
import { Icon } from '../brand/Icon';
import { Chip } from '../budget/ui';
import { colors, radius, spacing } from '../../theme';
import {
  EVENT_ALERTS,
  PAYMENT_ALERT_DAYS,
  RECURRENCES,
  formatTime,
  isValidTime,
  normalizeTime,
  parseLocal,
  toISODate,
} from '../../lib/reminders';
import type { Recurrence } from '../../types/db';
import { dateLocale } from '../../lib/i18n';

let NativePicker: React.ComponentType<any> | null = null;
if (Platform.OS !== 'web') {
  NativePicker = require('@react-native-community/datetimepicker').default;
}

interface DateFieldProps {
  /** YYYY-MM-DD */
  value: string;
  onChange: (v: string) => void;
  minimumDate?: Date;
}

// Fecha: selector del sistema en el teléfono, texto AAAA-MM-DD en la web.
export function DateField({ value, onChange, minimumDate }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const date = parseLocal(value, '12:00');

  if (Platform.OS === 'web') {
    return (
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder="AAAA-MM-DD"
        placeholderTextColor={colors.onDarkMuted}
        accessibilityLabel="Fecha"
      />
    );
  }
  return (
    <>
      <Pressable style={styles.pick} onPress={() => setOpen(true)} accessibilityLabel="Elegir fecha">
        <Icon name="calendar" size={18} color={colors.gold} />
        <Text style={styles.pickText}>
          {date.toLocaleDateString(dateLocale(), { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
      </Pressable>
      {open && NativePicker && (
        <NativePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minimumDate}
          onChange={(_: unknown, selected?: Date) => {
            setOpen(Platform.OS === 'ios');
            if (selected) onChange(toISODate(selected));
          }}
        />
      )}
    </>
  );
}

interface TimeFieldProps {
  /** HH:MM, o '' si no hay hora. */
  value: string;
  onChange: (v: string) => void;
  /** Muestra la opción "Sin hora (todo el día)". */
  clearable?: boolean;
  placeholder?: string;
}

export function TimeField({ value, onChange, clearable, placeholder = 'HH:MM (24 h), ej. 15:30' }: TimeFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  React.useEffect(() => setDraft(value), [value]);

  if (Platform.OS === 'web') {
    const invalid = draft !== '' && !isValidTime(draft);
    return (
      <View style={{ gap: 6 }}>
        <TextInput
          style={[styles.input, invalid && { borderColor: colors.rust }]}
          value={draft}
          onChangeText={(v) => {
            setDraft(v);
            if (v === '') onChange('');
            else if (isValidTime(v)) onChange(normalizeTime(v));
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.onDarkMuted}
          accessibilityLabel="Hora"
        />
        {invalid && <Text style={styles.invalid}>Usa el formato 24 h, por ejemplo 08:30 o 15:45.</Text>}
      </View>
    );
  }

  const date = parseLocal('2000-01-01', value || '09:00');
  return (
    <>
      <View style={styles.timeRow}>
        <Pressable style={[styles.pick, { flex: 1 }]} onPress={() => setOpen(true)} accessibilityLabel="Elegir hora">
          <Icon name="bell" size={18} color={colors.gold} />
          <Text style={styles.pickText}>{value ? formatTime(value) : 'Sin hora (todo el día)'}</Text>
        </Pressable>
        {clearable && !!value && (
          <Pressable onPress={() => onChange('')} style={styles.clear} accessibilityLabel="Quitar hora">
            <Icon name="close" size={16} color={colors.onDarkMuted} />
          </Pressable>
        )}
      </View>
      {open && NativePicker && (
        <NativePicker
          value={date}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_: unknown, selected?: Date) => {
            setOpen(Platform.OS === 'ios');
            if (selected) onChange(`${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`);
          }}
        />
      )}
    </>
  );
}

// ── Selectores de aviso y repetición ─────────────────────────────────────────

export function EventAlertChips({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <View style={styles.wrap}>
      {EVENT_ALERTS.map((a) => (
        <Chip key={String(a.minutes)} label={a.label} icon={a.minutes === null ? undefined : 'bell'} active={value === a.minutes} onPress={() => onChange(a.minutes)} />
      ))}
    </View>
  );
}

export function PaymentAlertChips({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <View style={styles.wrap}>
      {PAYMENT_ALERT_DAYS.map((a) => (
        <Chip key={String(a.days)} label={a.label} icon={a.days === null ? undefined : 'bell'} active={value === a.days} onPress={() => onChange(a.days)} />
      ))}
    </View>
  );
}

export function RecurrenceChips({ value, onChange }: { value: Recurrence; onChange: (v: Recurrence) => void }) {
  return (
    <View style={styles.wrap}>
      {RECURRENCES.map((r) => (
        <Chip key={r.key} label={r.label} icon={r.key === 'ninguna' ? undefined : 'refresh'} active={value === r.key} onPress={() => onChange(r.key)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
  invalid: { fontSize: 12, color: colors.rust },
  pick: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md, paddingVertical: 13,
  },
  pickText: { fontSize: 15, color: colors.onDark },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  clear: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder,
  },
});
