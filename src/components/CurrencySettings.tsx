import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, View } from 'react-native';
import { TextInput } from './AppTextInput';
import { Text } from './AppText';
import { CurrencyChips } from './CurrencyChips';
import { GoldButton } from './brand/Buttons';
import { useCurrency } from '../context/CurrencyProvider';
import { CURRENCIES, numberText, parseAmount, type CurrencyCode } from '../lib/currency';
import { dateLocale } from '../lib/i18n';
import { colors, radius, spacing } from '../theme';
import { navigationRef } from '../navigation/navigationRef';

// Preferencias de moneda: la moneda principal del hogar y las tasas de cambio para convertir
// las cuentas en dólares o euros.
export function CurrencySettings() {
  const { base, rates, ratesConfirmed, ratesAuto, ratesUpdatedAt, refreshRates, setRatesAuto, saveBase, saveRates } = useCurrency();
  const [refreshing, setRefreshing] = useState(false);
  const [usd, setUsd] = useState(String(rates.USD));
  const [eur, setEur] = useState(String(rates.EUR));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setUsd(String(rates.USD));
    setEur(String(rates.EUR));
  }, [rates.USD, rates.EUR]);

  function changeBase(code: CurrencyCode) {
    if (code === base) return;
    Alert.alert(
      `Usar ${CURRENCIES[code].names.es.toLowerCase()} como moneda principal`,
      `Presupuestos, metas, deudas, inversiones y pagos programados se mostrarán con ${CURRENCIES[code].symbol}. ` +
        'Los montos que ya registraste no se convierten: se quedan con el mismo número. Tus cuentas bancarias conservan su propia moneda.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cambiar',
          onPress: async () => {
            const { error } = await saveBase(code);
            if (error) return Alert.alert('No se pudo cambiar la moneda', error);
            // Al cambiar la moneda la app se vuelve a dibujar completa: volvemos a esta pantalla.
            setTimeout(() => {
              if (navigationRef.isReady()) navigationRef.navigate('Preferencias');
            }, 600);
          },
        },
      ],
    );
  }

  async function toggleAuto(on: boolean) {
    setRefreshing(true);
    const { error } = await setRatesAuto(on);
    setRefreshing(false);
    if (error) Alert.alert('No se pudieron actualizar las tasas', error);
  }

  async function refreshNow() {
    setRefreshing(true);
    const { error } = await refreshRates();
    setRefreshing(false);
    if (error) Alert.alert('No se pudieron actualizar las tasas', error);
  }

  const dirty = parseAmount(usd) !== rates.USD || parseAmount(eur) !== rates.EUR;

  const updatedLabel = ratesUpdatedAt
    ? new Date(ratesUpdatedAt).toLocaleString(dateLocale(), { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : null;

  async function saveRatesNow() {
    const u = parseAmount(usd);
    const e = parseAmount(eur);
    if (!(u > 0) || !(e > 0)) return Alert.alert('Tasa inválida', 'Escribe cuántos pesos vale 1 dólar y 1 euro (mayor que 0).');
    setSaving(true);
    const { error } = await saveRates({ USD: u, EUR: e });
    setSaving(false);
    if (error) return Alert.alert('No se pudieron guardar las tasas', error);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.title}>Moneda principal</Text>
        <Text style={styles.desc}>
          La usan presupuestos, metas, deudas e inversiones, y es en la que se suman todas tus cuentas.
        </Text>
        <CurrencyChips value={base} onChange={changeBase} />
      </View>

      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Tasas de cambio</Text>
          {!ratesConfirmed && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Por confirmar</Text>
            </View>
          )}
        </View>
        <Text style={styles.desc}>
          Con estas tasas se convierten tus cuentas en otra moneda y los pagos que haces desde ellas.
        </Text>

        <View style={styles.autoRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.autoTitle}>Actualizar automáticamente</Text>
            <Text style={styles.desc}>
              {ratesAuto
                ? `Tasa de mercado${updatedLabel ? ` · actualizada ${updatedLabel}` : ''}. Cada banco aplica la suya al cobrar: al pagar puedes escribir lo que te cobraron.`
                : 'Estás usando las tasas que escribiste tú.'}
            </Text>
          </View>
          <Switch
            value={ratesAuto}
            onValueChange={toggleAuto}
            disabled={refreshing}
            accessibilityLabel="Actualizar las tasas automáticamente"
            trackColor={{ false: 'rgba(255,255,255,0.18)', true: colors.gold }}
          />
        </View>
        <View style={styles.sourceRow}>
          <Text style={styles.sourceText}>
            {ratesAuto ? 'Fuente: tasa de mercado de ' : 'Fuente: tasas que escribiste tú'}
          </Text>
          {ratesAuto && (
            <Pressable onPress={() => Linking.openURL('https://www.exchangerate-api.com')} accessibilityLabel="Abrir la fuente de las tasas">
              <Text style={[styles.sourceText, styles.sourceLink]}>exchangerate-api.com</Text>
            </Pressable>
          )}
        </View>
        {ratesAuto && (
          <Pressable onPress={refreshNow} disabled={refreshing} accessibilityLabel="Actualizar las tasas ahora">
            <Text style={styles.refreshLink}>{refreshing ? 'Actualizando…' : 'Actualizar ahora'}</Text>
          </Pressable>
        )}

        {([['USD', usd, setUsd], ['EUR', eur, setEur]] as const).map(([code, value, setValue]) => (
          <View key={code} style={styles.rateRow}>
            <Text style={styles.rateLabel}>{`1 ${CURRENCIES[code].symbol} =`}</Text>
            <View style={styles.rateInputWrap}>
              <Text style={styles.ratePrefix}>{CURRENCIES.DOP.symbol}</Text>
              <TextInput
                style={styles.rateInput}
                value={value}
                onChangeText={setValue}
                keyboardType="decimal-pad"
                accessibilityLabel={`Tasa de ${CURRENCIES[code].names.es}`}
                placeholder={numberText(code === 'USD' ? 60 : 65)}
                placeholderTextColor={colors.onDarkMuted}
              />
            </View>
          </View>
        ))}

        {(!ratesAuto || dirty) && (
          <>
            {ratesAuto && <Text style={styles.desc}>Si guardas tus propias tasas, se dejan de actualizar solas. Puedes volver a activarlas con el interruptor.</Text>}
            <GoldButton label={saved ? 'Tasas guardadas' : 'Guardar mis tasas'} onPress={saveRatesNow} loading={saving} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, gap: spacing.md,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  autoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  autoTitle: { fontSize: 13.5, fontWeight: '700', color: colors.onDark, marginBottom: 2 },
  sourceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  sourceText: { fontSize: 12, color: colors.onDarkMuted },
  sourceLink: { color: colors.gold, fontWeight: '700', textDecorationLine: 'underline' },
  refreshLink: { fontSize: 13, fontWeight: '700', color: colors.gold },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 14, fontWeight: '700', color: colors.onDark },
  desc: { fontSize: 12, color: colors.onDarkMuted, lineHeight: 17 },
  badge: {
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill,
    backgroundColor: 'rgba(247,184,75,0.16)', borderWidth: 1, borderColor: 'rgba(247,184,75,0.45)',
  },
  badgeText: { fontSize: 10.5, fontWeight: '700', color: colors.neonAmber, letterSpacing: 0.4 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rateLabel: { width: 74, fontSize: 14, fontWeight: '700', color: colors.onDark },
  rateInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md,
  },
  ratePrefix: { fontSize: 13, fontWeight: '700', color: colors.onDarkMuted },
  rateInput: { flex: 1, fontSize: 16, color: colors.onDark, paddingVertical: 11 },
});
