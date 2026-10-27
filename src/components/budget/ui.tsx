import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../AppText';
import { Icon, type IconName } from '../brand/Icon';
import { colors, fonts, radius, spacing } from '../../theme';
import type { BankAccountRow, BudgetRow, PaymentMethod } from '../../types/db';
import { baseSymbol } from '../../lib/currency';

export function fmt(n: number) {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Monto con signo delante del símbolo de la moneda base: −RD$7,000.00. */
export function money(n: number) {
  return `${n < 0 ? '−' : ''}${baseSymbol()}${fmt(Math.abs(n))}`;
}

export const MEDIO_LABEL: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Banco',
};

export const MEDIO_ICON: Record<PaymentMethod, IconName> = {
  efectivo: 'coin',
  tarjeta: 'card',
  transferencia: 'bank',
};

/** Texto corto de dónde está el dinero: "Efectivo", "Banco Popular ···1234", "Tarjeta". */
export function accountLabel(
  budget: Pick<BudgetRow, 'medio' | 'bank_account_id'>,
  accounts: BankAccountRow[],
): string {
  const acc = budget.bank_account_id ? accounts.find((a) => a.id === budget.bank_account_id) : null;
  if (acc) return `${acc.banco}${acc.ultimos4 ? ` ···${acc.ultimos4}` : ''}`;
  // Presupuestos viejos sin cuenta: se avisa para que la asignen
  if (budget.medio !== 'efectivo') return `${MEDIO_LABEL[budget.medio]} · falta asignar la cuenta`;
  return MEDIO_LABEL[budget.medio];
}

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

// Hoja inferior con el mismo cristal oscuro del resto de la app.
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheetWrap} onPress={() => {}}>
          <LinearGradient colors={['#14553A', '#0A3220']} style={styles.sheet}>
            <View style={styles.grabber} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Cerrar" style={styles.closeBtn}>
                <Icon name="close" size={18} color={colors.onDark} />
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
            >
              {children}
            </ScrollView>
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface ChipProps {
  label: string;
  active?: boolean;
  icon?: IconName;
  onPress: () => void;
}

export function Chip({ label, active, icon, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      style={[styles.chip, active && styles.chipActive]}
    >
      {icon && <Icon name={icon} size={15} color={active ? colors.onNavy : colors.goldBright} />}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheetWrap: { maxHeight: '92%', width: '100%', maxWidth: 560, alignSelf: 'center', flexShrink: 1 },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(226,190,75,0.35)',
    flexShrink: 1,
    maxHeight: '100%',
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: spacing.md },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  sheetTitle: { fontSize: 20, fontFamily: fonts.heading, fontWeight: '700', color: colors.onDark, flex: 1 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder,
  },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill,
    borderWidth: 1, borderColor: 'rgba(226,190,75,0.45)', backgroundColor: 'rgba(255,255,255,0.06)',
  },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.goldBright },
  chipTextActive: { color: colors.onNavy },

  fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1, textTransform: 'uppercase' },
});
