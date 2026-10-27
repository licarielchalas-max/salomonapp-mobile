import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../AppText';
import { Icon } from '../brand/Icon';
import { GhostButton, GoldButton } from '../brand/Buttons';
import { MEDIO_ICON, Sheet, accountLabel, fmt, money } from './ui';
import { colors, radius, spacing } from '../../theme';
import type { BankAccountRow } from '../../types/db';
import type { MoveTipo } from './MovementSheet';
import { budgetStatus, type BudgetSummary } from '../../hooks/useBudgets';

interface Props {
  visible: boolean;
  onClose: () => void;
  budget: BudgetSummary | null;
  accounts: BankAccountRow[];
  categoryLabel: (id: string | null) => string | null;
  onMove: (tipo: MoveTipo) => void;
  onSpend: () => void;
  onEdit: () => void;
  onRemoveMovement: (id: string) => Promise<{ error: string | null }>;
}

function dayLabel(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export function BudgetDetail({ visible, onClose, budget, accounts, categoryLabel, onMove, onSpend, onEdit, onRemoveMovement }: Props) {
  if (!budget) return null;
  const status = budgetStatus(budget);
  const catLabel = categoryLabel(budget.category_id);

  function confirmRemove(id: string, label: string) {
    Alert.alert('Quitar movimiento', `¿Quitar "${label}"? El saldo del presupuesto se recalcula.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await onRemoveMovement(id);
          if (error) Alert.alert('No se pudo quitar', error);
        },
      },
    ]);
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={budget.nombre}>
      <View style={styles.metaRow}>
        <View style={styles.pill}>
          <Icon name={MEDIO_ICON[budget.medio]} size={14} color={colors.goldBright} />
          <Text style={styles.pillText}>{accountLabel(budget, accounts)}</Text>
        </View>
        {catLabel && (
          <View style={styles.pill}>
            <Icon name="list" size={14} color={colors.goldBright} />
            <Text style={styles.pillText}>{catLabel}</Text>
          </View>
        )}
      </View>
      {!!budget.nota && <Text style={styles.nota}>{budget.nota}</Text>}

      <View style={styles.stats}>
        <Stat label="Meta del mes" value={budget.monto} />
        <Stat label="Abonado este mes" value={budget.abonado} />
        <Stat label="Gastado este mes" value={budget.gastado} tone={status === 'over' ? 'bad' : undefined} />
        <Stat label="Hay en el presupuesto" value={budget.disponible} tone={budget.disponible <= 0 ? 'bad' : 'good'} />
      </View>

      <View style={styles.track}>
        <View style={[styles.fillAbonado, { width: `${budget.pctAbonado}%` }]} />
        <View
          style={[
            styles.fillGastado,
            {
              width: `${Math.min(100, budget.pctGastado)}%`,
              backgroundColor: status === 'over' ? colors.rust : status === 'warn' ? colors.neonAmber : colors.green,
            },
          ]}
        />
      </View>
      <Text style={styles.legend}>
        Gastaste el {budget.pctGastado}% de la meta · abonaste el {budget.pctAbonado}%
      </Text>
      {status === 'over' && (
        <Text style={styles.over}>Te pasaste de la meta por ¤{fmt(budget.gastado - budget.monto)}.</Text>
      )}

      <View style={styles.actions}>
        <GoldButton small label="Abonar" onPress={() => onMove('abono')} style={{ flex: 1 }} />
        <GoldButton small label="Registrar gasto" onPress={onSpend} style={{ flex: 1 }} />
      </View>
      {budget.disponible > 0 && (
        <Pressable onPress={() => onMove('retiro')} style={styles.returnLink} accessibilityLabel="Devolver dinero a una cuenta">
          <Icon name="refresh" size={14} color={colors.goldBright} />
          <Text style={styles.returnText}>Devolver dinero a una cuenta</Text>
        </Pressable>
      )}

      <Text style={styles.section}>MOVIMIENTOS DEL MES</Text>
      {budget.movements.length === 0 ? (
        <Text style={styles.empty}>
          Aún no hay movimientos este mes. Abona para guardar dinero aquí y registra gastos pagándolos desde este presupuesto.
        </Text>
      ) : (
        budget.movements.map((m) => (
          <View key={m.id} style={styles.mov}>
            <View style={[styles.movIcon, m.tipo === 'gasto' ? styles.movOut : m.tipo === 'retiro' ? styles.movBack : styles.movIn]}>
              <Icon
                name={m.tipo === 'abono' ? 'plus' : m.tipo === 'retiro' ? 'refresh' : 'down'}
                size={16}
                color={m.tipo === 'gasto' ? colors.rust : m.tipo === 'retiro' ? colors.neonAmber : colors.green}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.movTitle}>
                {m.nota || (m.tipo === 'abono' ? 'Abono' : m.tipo === 'retiro' ? 'Devolución' : 'Gasto')}
              </Text>
              <Text style={styles.movSub}>
                {dayLabel(m.occurred_on)}
                {m.tipo !== 'gasto' ? ` · ${accountLabel({ medio: m.medio ?? 'efectivo', bank_account_id: m.bank_account_id }, accounts)}` : ''}
              </Text>
            </View>
            <Text style={[styles.movAmt, { color: m.tipo === 'gasto' ? colors.rust : m.tipo === 'retiro' ? colors.neonAmber : colors.green }]}>
              {m.tipo === 'abono' ? '+' : '−'}¤{fmt(Number(m.monto))}
            </Text>
            {!m.transaction_id && (
              <Pressable
                hitSlop={8}
                accessibilityLabel="Quitar movimiento"
                onPress={() => confirmRemove(m.id, m.nota || (m.tipo === 'abono' ? 'Abono' : 'Devolución'))}
              >
                <Icon name="trash" size={16} color={colors.onDarkMuted} />
              </Pressable>
            )}
          </View>
        ))
      )}

      <GhostButton label="Editar presupuesto" onPress={onEdit} />
    </Sheet>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'good' | 'bad' }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[styles.statValue, tone === 'good' && { color: colors.green }, tone === 'bad' && { color: colors.rust }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {money(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.pill, backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.goldBorder,
  },
  pillText: { fontSize: 12, fontWeight: '600', color: colors.goldBright },
  nota: { fontSize: 13, color: colors.onDarkMuted, lineHeight: 19 },

  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: {
    flexBasis: '47%', flexGrow: 1, padding: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder,
  },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: colors.onDarkMuted, textTransform: 'uppercase' },
  statValue: { fontSize: 17, fontWeight: '700', color: colors.onDark, marginTop: 4 },

  track: { height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  fillAbonado: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(226,190,75,0.35)' },
  fillGastado: { position: 'absolute', left: 0, top: 3, bottom: 3, borderRadius: 3 },
  legend: { fontSize: 12, color: colors.onDarkMuted },
  over: { fontSize: 12, fontWeight: '700', color: colors.rust },

  actions: { flexDirection: 'row', gap: spacing.sm },
  section: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: colors.onDarkMuted, marginTop: spacing.sm },
  empty: { fontSize: 13, color: colors.onDarkMuted, lineHeight: 19 },
  mov: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md,
    borderRadius: radius.md, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder,
  },
  movIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  movIn: { backgroundColor: 'rgba(123,224,176,0.16)' },
  movOut: { backgroundColor: 'rgba(255,143,122,0.16)' },
  movBack: { backgroundColor: 'rgba(247,184,75,0.16)' },
  returnLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  returnText: { fontSize: 13, fontWeight: '600', color: colors.goldBright },
  movTitle: { fontSize: 14, fontWeight: '600', color: colors.onDark },
  movSub: { fontSize: 11, color: colors.onDarkMuted, marginTop: 2 },
  movAmt: { fontSize: 14, fontWeight: '700' },
});
