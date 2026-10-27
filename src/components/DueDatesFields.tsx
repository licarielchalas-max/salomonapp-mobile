import React from 'react';
import { StyleSheet, View } from 'react-native';
import { TextInput } from './AppTextInput';
import { Text } from './AppText';
import { FieldLabel } from './budget/ui';
import { PaymentAlertChips } from './agenda/Fields';
import { lastAndNextDue, nextCut, parseDay } from '../lib/debtDates';
import { dueLabel, parseLocal } from '../lib/reminders';
import { colors, radius, spacing } from '../theme';
import { dateLocale } from '../lib/i18n';

interface Props {
  /** Las tarjetas tienen fecha de corte; los préstamos solo fecha de pago. */
  showCorte: boolean;
  corte: string;
  pago: string;
  aviso: number | null;
  onCorte: (v: string) => void;
  onPago: (v: string) => void;
  onAviso: (v: number | null) => void;
}

function pretty(d: string) {
  return parseLocal(d, '12:00').toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
}

// Fecha de corte y de pago (día del mes) con el aviso previo, para tarjetas y préstamos.
export function DueDatesFields({ showCorte, corte, pago, aviso, onCorte, onPago, onAviso }: Props) {
  const corteDay = parseDay(corte);
  const pagoDay = parseDay(pago);
  const nextPago = pagoDay ? lastAndNextDue(pagoDay).next : null;
  const nextCorte = corteDay ? nextCut(corteDay) : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {showCorte && (
          <View style={styles.col}>
            <FieldLabel>Día de corte</FieldLabel>
            <TextInput
              style={[styles.input, corte !== '' && !corteDay && styles.invalid]}
              value={corte}
              onChangeText={(v) => onCorte(v.replace(/[^0-9]/g, '').slice(0, 2))}
              placeholder="Ej. 20"
              placeholderTextColor={colors.onDarkMuted}
              keyboardType="number-pad"
              accessibilityLabel="Día de corte"
              maxLength={2}
            />
          </View>
        )}
        <View style={styles.col}>
          <FieldLabel>Día de pago</FieldLabel>
          <TextInput
            style={[styles.input, pago !== '' && !pagoDay && styles.invalid]}
            value={pago}
            onChangeText={(v) => onPago(v.replace(/[^0-9]/g, '').slice(0, 2))}
            placeholder="Ej. 5"
            placeholderTextColor={colors.onDarkMuted}
            keyboardType="number-pad"
            accessibilityLabel="Día de pago"
            maxLength={2}
          />
        </View>
      </View>
      {(corte !== '' && !corteDay) || (pago !== '' && !pagoDay) ? (
        <Text style={styles.error}>Escribe un día del mes entre 1 y 31.</Text>
      ) : null}
      {showCorte && (
        <Text style={styles.hint}>El corte es el día en que cierra tu estado de cuenta; el pago es la fecha límite para pagar sin cargos.</Text>
      )}
      {nextPago && (
        <Text style={styles.preview}>
          Próximo pago: {pretty(nextPago)} ({dueLabel(nextPago).toLowerCase()}).
          {nextCorte ? ` Próximo corte: ${pretty(nextCorte)}.` : ''}
        </Text>
      )}
      <FieldLabel>¿Cuándo te avisamos del pago?</FieldLabel>
      <PaymentAlertChips value={aviso} onChange={onAviso} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  col: { flex: 1, gap: spacing.sm },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    fontSize: 18,
    fontWeight: '700',
    color: colors.onDark,
    textAlign: 'center',
  },
  invalid: { borderColor: colors.rust },
  error: { fontSize: 12, color: colors.rust },
  hint: { fontSize: 12, color: colors.onDarkMuted, lineHeight: 17 },
  preview: { fontSize: 12.5, color: colors.goldBright, lineHeight: 18 },
});
