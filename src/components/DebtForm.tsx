import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { TextInput } from './AppTextInput';
import { Text } from './AppText';
import { GoldButton } from './brand/Buttons';
import { Chip, FieldLabel, Sheet } from './budget/ui';
import { DueDatesFields } from './DueDatesFields';
import { parseDay } from '../lib/debtDates';
import { CurrencyChips } from './CurrencyChips';
import { baseCurrency, CURRENCIES, isCurrency, type CurrencyCode } from '../lib/currency';
import { colors, radius, spacing } from '../theme';
import type { CardRow, DebtInsert, DebtRow, DebtType } from '../types/db';

type Input = Omit<DebtInsert, 'household_id'>;

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Deuda a editar; null = nueva. */
  debt: DebtRow | null;
  /** Tarjetas de crédito registradas, para no escribir sus datos dos veces. */
  cards: CardRow[];
  onSave: (input: Input, id?: string) => Promise<{ error: string | null }>;
}

const TIPOS: { key: DebtType; label: string }[] = [
  { key: 'prestamo', label: 'Préstamo' },
  { key: 'otro', label: 'Otra deuda' },
];

const num = (v: string) => parseFloat(v.replace(/,/g, ''));

// Alta y edición de una deuda. Tarjetas y préstamos exigen su fecha de pago (y la de corte, las tarjetas)
// para poder avisarte cuándo pagar.
export function DebtForm({ visible, onClose, debt, cards, onSave }: Props) {
  const [tipo, setTipo] = useState<DebtType>('tarjeta');
  const [cardId, setCardId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [saldo, setSaldo] = useState('');
  const [cuota, setCuota] = useState('');
  const [tasa, setTasa] = useState('');
  const [corte, setCorte] = useState('');
  const [pago, setPago] = useState('');
  const [aviso, setAviso] = useState<number | null>(3);
  const [pagada, setPagada] = useState(false);
  const [saving, setSaving] = useState(false);
  const [moneda, setMoneda] = useState<CurrencyCode>(baseCurrency());

  useEffect(() => {
    if (!visible) return;
    setTipo(debt?.tipo ?? 'prestamo');
    setMoneda(isCurrency(debt?.moneda) ? debt.moneda : baseCurrency());
    setCardId(debt?.card_id ?? null);
    setNombre(debt?.nombre ?? '');
    setSaldo(debt ? String(debt.saldo) : '');
    setCuota(debt ? String(debt.cuota_mensual) : '');
    setTasa(debt && Number(debt.tasa_anual) ? String(debt.tasa_anual) : '');
    setCorte(debt?.dia_corte ? String(debt.dia_corte) : '');
    setPago(debt?.dia_pago ? String(debt.dia_pago) : '');
    setAviso(debt ? debt.aviso_dias_antes : 3);
    setPagada(false);
  }, [visible, debt]);

  const creditCards = cards.filter((c) => c.tipo === 'credito');
  // Las tarjetas se registran en Bancos y aparecen aquí solas; esta pantalla las deja editar (saldo, tasa, cuota).
  const isCardDebt = !!debt?.card_id;
  const needsDates = tipo !== 'otro' && !pagada;

  function pickCard(c: CardRow | null) {
    setCardId(c?.id ?? null);
    if (!c) return;
    setNombre(`${c.nombre} ••••${c.ultimos4}`);
    if (c.dia_corte) setCorte(String(c.dia_corte));
    if (c.dia_pago) setPago(String(c.dia_pago));
    if (c.aviso_dias_antes !== null) setAviso(c.aviso_dias_antes);
  }

  async function submit() {
    const saldoVal = num(saldo);
    const cuotaVal = num(cuota);
    if (!nombre.trim()) return Alert.alert('Falta el nombre', 'Escribe a quién le debes, por ejemplo "Visa Banco Popular".');
    if (isNaN(saldoVal) || saldoVal < 0 || (!isCardDebt && saldoVal <= 0)) return Alert.alert('Saldo inválido', 'Escribe cuánto debes hoy.');
    if (!isCardDebt && (!cuotaVal || cuotaVal <= 0)) return Alert.alert('Cuota inválida', 'Escribe la cuota mensual o el pago mínimo.');
    const tasaVal = tasa.trim() ? num(tasa) : 0;
    if (isNaN(tasaVal) || tasaVal < 0 || tasaVal > 400) return Alert.alert('Tasa inválida', 'Escribe la tasa anual en porcentaje, por ejemplo 36.');
    const corteDay = parseDay(corte);
    const pagoDay = parseDay(pago);
    if (needsDates) {
      if (!pagoDay) return Alert.alert('Falta el día de pago', 'Indica el día del mes (1 al 31) en que vence tu pago.');
      if (tipo === 'tarjeta' && !corteDay) return Alert.alert('Falta el día de corte', 'Indica el día del mes (1 al 31) en que corta tu tarjeta.');
    }
    setSaving(true);
    const { error } = await onSave(
      {
        nombre: nombre.trim(),
        saldo: saldoVal,
        cuota_mensual: isNaN(cuotaVal) ? 0 : cuotaVal,
        tasa_anual: tasaVal,
        tipo,
        card_id: tipo === 'tarjeta' ? cardId : null,
        moneda,
        dia_corte: tipo === 'tarjeta' ? corteDay : null,
        dia_pago: tipo === 'otro' ? null : pagoDay,
        aviso_dias_antes: tipo === 'otro' ? null : aviso,
        ...(debt ? {} : { status: pagada ? 'pagada' : 'pendiente' }),
      },
      debt?.id,
    );
    setSaving(false);
    if (error) return Alert.alert('No se pudo guardar', error);
    onClose();
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={debt ? 'Editar deuda' : 'Nueva deuda'}>
      {isCardDebt ? (
        <Text style={styles.hint}>Es una tarjeta de crédito: su moneda, límite y fechas se cambian desde Bancos. Aquí puedes ajustar el saldo, la tasa y el pago mínimo.</Text>
      ) : (
        <>
          <View style={styles.wrap}>
            {TIPOS.concat(debt?.tipo === 'tarjeta' ? [{ key: 'tarjeta', label: 'Tarjeta de crédito' }] : []).map((t) => (
              <Chip key={t.key} label={t.label} active={tipo === t.key} onPress={() => setTipo(t.key)} />
            ))}
          </View>
          <Text style={styles.hint}>Las tarjetas de crédito se registran en Bancos → Tarjetas y aparecen aquí con su saldo.</Text>
          <View style={styles.group}>
            <FieldLabel>Moneda de la deuda</FieldLabel>
            <CurrencyChips value={moneda} onChange={setMoneda} locked={!!debt} lockedNote="La moneda no se cambia después de crear la deuda." />
          </View>
        </>
      )}

      {tipo === 'tarjeta' && creditCards.length > 0 && (
        <View style={styles.group}>
          <FieldLabel>¿Es una de tus tarjetas registradas?</FieldLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hscroll}>
            <Chip label="Otra" active={cardId === null} onPress={() => pickCard(null)} />
            {creditCards.map((c) => (
              <Chip key={c.id} icon="card" label={`${c.nombre} ••••${c.ultimos4}`} active={cardId === c.id} onPress={() => pickCard(c)} />
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.group}>
        <FieldLabel>Nombre</FieldLabel>
        <TextInput
          style={styles.input}
          value={nombre}
          onChangeText={setNombre}
          placeholder={tipo === 'tarjeta' ? 'Ej. Visa Banco Popular' : tipo === 'prestamo' ? 'Ej. Préstamo del carro' : 'Ej. Deuda con un amigo'}
          placeholderTextColor={colors.onDarkMuted}
          maxLength={60}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.col}>
          <FieldLabel>{`Saldo que debes (${CURRENCIES[moneda].symbol})`}</FieldLabel>
          <TextInput style={styles.input} value={saldo} onChangeText={setSaldo} placeholder="0.00" placeholderTextColor={colors.onDarkMuted} keyboardType="decimal-pad" />
        </View>
        <View style={styles.col}>
          <FieldLabel>{`${tipo === 'tarjeta' ? 'Pago mínimo' : 'Cuota mensual'} (${CURRENCIES[moneda].symbol})`}</FieldLabel>
          <TextInput style={styles.input} value={cuota} onChangeText={setCuota} placeholder="0.00" placeholderTextColor={colors.onDarkMuted} keyboardType="decimal-pad" />
        </View>
      </View>

      <View style={styles.group}>
        <FieldLabel>Tasa de interés anual % (opcional)</FieldLabel>
        <TextInput style={styles.input} value={tasa} onChangeText={setTasa} placeholder="Ej. 36" placeholderTextColor={colors.onDarkMuted} keyboardType="decimal-pad" />
      </View>

      {tipo !== 'otro' && !pagada && (
        <DueDatesFields
          showCorte={tipo === 'tarjeta'}
          corte={corte}
          pago={pago}
          aviso={aviso}
          onCorte={setCorte}
          onPago={setPago}
          onAviso={setAviso}
        />
      )}

      {!debt && (
        <View style={styles.wrap}>
          <Chip label="Ya está pagada" icon="check" active={pagada} onPress={() => setPagada((v) => !v)} />
        </View>
      )}
      {pagada && <Text style={styles.hint}>Se guardará como deuda pagada, solo para tu historial.</Text>}

      <GoldButton label={debt ? 'Guardar cambios' : 'Guardar deuda'} onPress={submit} loading={saving} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  col: { flex: 1, gap: spacing.sm },
  hscroll: { gap: spacing.sm, paddingVertical: 2 },
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
