import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { TextInput } from './AppTextInput';
import { Chip } from './budget/ui';
import { GoldButton } from './brand/Buttons';
import { useLanguage } from '../context/LanguageProvider';
import { useUserZone } from '../hooks/useUserZone';
import { LANGUAGES } from '../lib/i18n';
import { COUNTRIES, DR_CITIES, isDominicanRepublic } from '../lib/zones';
import { colors, radius, spacing } from '../theme';

// Preferencias de idioma y de zona (país y ciudad).
export function LocaleSettings() {
  const { lang, changeLanguage } = useLanguage();
  const { pais, ciudad, saveZone } = useUserZone();
  const [paisVal, setPaisVal] = useState(pais);
  const [ciudadVal, setCiudadVal] = useState(ciudad);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => setPaisVal(pais), [pais]);
  useEffect(() => setCiudadVal(ciudad), [ciudad]);

  async function pickLanguage(code: (typeof LANGUAGES)[number]['code']) {
    if (code === lang) return;
    const { error } = await changeLanguage(code);
    if (error) Alert.alert('No se pudo guardar', error);
  }

  async function save() {
    setSaving(true);
    const { error } = await saveZone(paisVal, ciudadVal);
    setSaving(false);
    if (error) return Alert.alert('No se pudo guardar', error);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const cityHints = isDominicanRepublic(paisVal) ? DR_CITIES : [];

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.title}>Idioma</Text>
        <View style={styles.row}>
          {LANGUAGES.map((l) => (
            <Chip key={l.code} label={l.native} active={l.code === lang} onPress={() => pickLanguage(l.code)} />
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>País y ciudad</Text>
        <Text style={styles.desc}>
          Con tu zona te mostramos en el Marketplace los productos, proyectos y ofertas disponibles donde vives. Solo guardamos el país y la ciudad que escribas aquí, nunca tu ubicación exacta.
        </Text>

        <Text style={styles.label}>País</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {COUNTRIES.map((c) => (
            <Chip key={c} label={c} active={paisVal === c} onPress={() => setPaisVal(c)} />
          ))}
        </ScrollView>

        <Text style={styles.label}>Ciudad</Text>
        <TextInput
          style={styles.input}
          value={ciudadVal}
          onChangeText={setCiudadVal}
          placeholder="Ej. Santo Domingo"
          placeholderTextColor={colors.onDarkMuted}
          maxLength={60}
          accessibilityLabel="Ciudad"
        />
        {cityHints.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {cityHints.map((c) => (
              <Pressable key={c} onPress={() => setCiudadVal(c)} style={[styles.hint, ciudadVal === c && styles.hintActive]}>
                <Text style={[styles.hintText, ciudadVal === c && styles.hintTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <GoldButton label={saved ? 'Zona guardada' : 'Guardar zona'} onPress={save} loading={saving} />
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
  title: { fontSize: 14, fontWeight: '700', color: colors.onDark },
  desc: { fontSize: 12, color: colors.onDarkMuted, lineHeight: 17 },
  label: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2, textTransform: 'uppercase' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chips: { flexDirection: 'row', gap: 8, paddingRight: spacing.md },
  input: {
    backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, color: colors.onDark,
  },
  hint: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1,
    borderColor: colors.glassBorder, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  hintActive: { borderColor: colors.gold, backgroundColor: 'rgba(226,190,75,0.16)' },
  hintText: { fontSize: 12, fontWeight: '600', color: colors.onDarkMuted },
  hintTextActive: { color: colors.goldBright },
});
