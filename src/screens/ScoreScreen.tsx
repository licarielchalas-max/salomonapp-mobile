import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthProvider';
import { useFinancialScore } from '../hooks/useFinancialScore';
import { Glass } from '../components/brand/Glass';
import { GoldButton } from '../components/brand/Buttons';
import { Icon } from '../components/brand/Icon';
import { ScoreArc } from '../components/brand/ScoreArc';
import { Sheet } from '../components/budget/ui';
import { PILLAR_META, SCORE_METHOD_TEXT, labelFor, type Confidence } from '../lib/score';
import { colors, fonts, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  baja: 'Confianza baja',
  media: 'Confianza media',
  alta: 'Confianza alta',
};

function barColor(score: number) {
  return score >= 75 ? colors.green : score >= 45 ? colors.neonAmber : colors.rust;
}

export function ScoreScreen() {
  const navigation = useNavigation<Nav>();
  const { householdId } = useAuth();
  const score = useFinancialScore(householdId);
  const [methodOpen, setMethodOpen] = useState(false);
  const { result } = score;

  const measured = (result?.pillars ?? []).filter((p) => p.score !== null);
  // Lo que más puntos puede darte, primero.
  const next = [...measured].sort((a, b) => b.potential - a.potential).filter((p) => p.potential > 0).slice(0, 3);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[colors.bgDeep, colors.bg, '#041F0F']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View style={styles.beta}><Text style={styles.betaText}>BETA</Text></View>
          <Text style={styles.betaNote}>Estamos afinando el cálculo</Text>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => setMethodOpen(true)} style={styles.help} accessibilityLabel="Cómo se calcula el score" hitSlop={8}>
            <Icon name="info" size={20} color={colors.gold} />
          </Pressable>
        </View>
        <Text style={styles.subtitle}>Este es tu nivel de puntaje financiero.</Text>

        {score.loading ? (
          <ActivityIndicator color={colors.gold} style={{ marginVertical: 60 }} />
        ) : (
          <>
            <View style={{ alignItems: 'center', marginTop: spacing.md }}>
              <ScoreArc score={score.total} grade={score.grade} provisional={score.provisional} width={290} />
              <Text style={styles.number}>{score.total}</Text>
              <Text style={styles.level}>
                {labelFor(score.grade)} · de 300 a 850
              </Text>
              {score.provisional && (
                <View style={styles.provisional}>
                  <Text style={styles.provisionalText}>Puntaje provisional</Text>
                </View>
              )}
            </View>

            <Glass style={{ marginTop: spacing.lg }}>
              <View style={styles.basisHead}>
                <Icon name="shield" size={18} color={colors.gold} />
                <Text style={styles.basisTitle}>En qué se basa</Text>
                <View style={[styles.conf, score.confidence === 'alta' && styles.confHigh]}>
                  <Text style={styles.confText}>{CONFIDENCE_LABEL[score.confidence]}</Text>
                </View>
              </View>
              <Text style={styles.basisBody}>
                {result?.basis.movements ?? 0} movimientos · {result?.basis.historyDays ?? 0} días de historial · {result?.basis.scheduledReviewed ?? 0} pagos revisados.
              </Text>
              {(result?.missing ?? []).map((m) => (
                <View key={m} style={styles.missingRow}>
                  <Icon name="alert" size={14} color={colors.neonAmber} />
                  <Text style={styles.missingText}>{m}</Text>
                </View>
              ))}
              {score.provisional && <Text style={styles.basisNote}>{SCORE_METHOD_TEXT.provisional}</Text>}
            </Glass>

            {next.length > 0 && (
              <>
                <Text style={styles.section}>Sube tu puntaje al próximo nivel</Text>
                {next.map((p) => (
                  <View key={p.key} style={styles.tipCard}>
                    <View style={styles.tipIcon}>
                      <Icon name="check" size={18} color={colors.green} strokeWidth={2.6} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tipText}>{p.tip}</Text>
                      <Text style={styles.tipGain}>Hasta +{p.potential} puntos · {p.label}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            <Text style={styles.section}>Así se compone tu puntaje</Text>
            {(result?.pillars ?? []).map((p) => (
              <View key={p.key} style={styles.pillar}>
                <View style={styles.pillarHead}>
                  <View style={styles.pillarIcon}>
                    <Icon name={PILLAR_META[p.key].icon} size={17} color={colors.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pillarName}>{p.label}</Text>
                    <Text style={styles.pillarDetail}>{p.detail}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.pillarScore}>{p.score === null ? '—' : p.score}</Text>
                    <Text style={styles.pillarWeight}>{p.score === null ? 'sin datos' : `pesa ${p.effectiveWeight}%`}</Text>
                  </View>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${p.score ?? 0}%`, backgroundColor: p.score === null ? 'transparent' : barColor(p.score) }]} />
                </View>
              </View>
            ))}

            <Glass style={{ marginTop: spacing.lg }}>
              <View style={styles.basisHead}>
                <Icon name="bank" size={18} color={colors.gold} />
                <Text style={styles.basisTitle}>Buró de crédito</Text>
                <View style={styles.soon}><Text style={styles.soonText}>Próximamente</Text></View>
              </View>
              <Text style={styles.basisBody}>
                Conectar tu reporte de un buró de crédito necesita un convenio con la entidad y tu autorización expresa. Todavía no está disponible. Por ahora, este puntaje es propio de Salomón y se calcula solo con lo que registras aquí.
              </Text>
            </Glass>

            <GoldButton label="Preguntar al Rey Salomón" onPress={() => navigation.navigate('Salomon')} style={{ marginTop: spacing.lg }} />
            <Text style={styles.footer}>{SCORE_METHOD_TEXT.privacy} {SCORE_METHOD_TEXT.beta}</Text>
          </>
        )}
      </ScrollView>

      <Sheet visible={methodOpen} onClose={() => setMethodOpen(false)} title="¿Cómo se calcula tu score?">
        <Text style={styles.method}>{SCORE_METHOD_TEXT.intro}</Text>
        <Text style={styles.methodHead}>Cinco factores, con su peso</Text>
        {(Object.keys(PILLAR_META) as (keyof typeof PILLAR_META)[]).map((k) => (
          <View key={k} style={styles.methodRow}>
            <Text style={styles.methodName}>{PILLAR_META[k].label}</Text>
            <Text style={styles.method}>{PILLAR_META[k].what}</Text>
          </View>
        ))}
        <Text style={styles.methodHead}>Niveles</Text>
        <Text style={styles.method}>{SCORE_METHOD_TEXT.scale}</Text>
        <Text style={styles.methodHead}>Puntaje provisional</Text>
        <Text style={styles.method}>{SCORE_METHOD_TEXT.provisional}</Text>
        <Text style={styles.methodHead}>Tus datos</Text>
        <Text style={styles.method}>{SCORE_METHOD_TEXT.privacy}</Text>
        <Text style={styles.method}>{SCORE_METHOD_TEXT.beta}</Text>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 130, maxWidth: 640, width: '100%', alignSelf: 'center' },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 20, fontFamily: fonts.heading, fontWeight: '700', color: colors.onDark },
  betaNote: { fontSize: 12, color: colors.onDarkMuted },
  beta: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.goldBorder },
  betaText: { fontSize: 11, fontWeight: '800', color: colors.goldBright, letterSpacing: 0.8 },
  help: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder,
  },
  subtitle: { fontSize: 14, color: colors.onDarkMuted, marginTop: spacing.sm, textAlign: 'center' },

  number: { fontSize: 42, fontFamily: fonts.heading, fontWeight: '800', color: colors.onDark, marginTop: -4 },
  level: { fontSize: 14, color: colors.onDarkMuted, marginTop: 2 },
  provisional: {
    marginTop: spacing.sm, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill,
    backgroundColor: 'rgba(247,184,75,0.14)', borderWidth: 1, borderColor: 'rgba(247,184,75,0.45)',
  },
  provisionalText: { fontSize: 12, fontWeight: '700', color: colors.neonAmber },

  basisHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
  basisTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.onDark },
  basisBody: { fontSize: 13, color: colors.onDarkMuted, lineHeight: 19 },
  basisNote: { fontSize: 12, color: colors.onDarkMuted, lineHeight: 18, marginTop: spacing.sm },
  conf: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.08)' },
  confHigh: { backgroundColor: 'rgba(123,224,176,0.18)' },
  confText: { fontSize: 11, fontWeight: '700', color: colors.onDark },
  missingRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 8 },
  missingText: { flex: 1, fontSize: 12.5, color: colors.neonAmber, lineHeight: 18 },
  soon: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.08)' },
  soonText: { fontSize: 11, fontWeight: '700', color: colors.onDarkMuted },

  section: { fontSize: 18, fontWeight: '700', color: colors.onDark, marginTop: spacing.xl, marginBottom: spacing.md },
  tipCard: {
    flexDirection: 'row', gap: spacing.md, padding: spacing.md, marginBottom: spacing.sm, borderRadius: radius.lg,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder,
  },
  tipIcon: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(123,224,176,0.14)',
  },
  tipText: { fontSize: 14, color: colors.onDark, lineHeight: 20 },
  tipGain: { fontSize: 12, fontWeight: '700', color: colors.goldBright, marginTop: 4 },

  pillar: {
    padding: spacing.md, marginBottom: spacing.sm, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder,
  },
  pillarHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pillarIcon: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.goldBorder,
  },
  pillarName: { fontSize: 14.5, fontWeight: '700', color: colors.onDark },
  pillarDetail: { fontSize: 12, color: colors.onDarkMuted, marginTop: 2 },
  pillarScore: { fontSize: 18, fontWeight: '800', color: colors.goldBright },
  pillarWeight: { fontSize: 10.5, color: colors.onDarkMuted, marginTop: 1 },
  track: { height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginTop: spacing.sm },
  fill: { height: '100%', borderRadius: 4 },

  footer: { fontSize: 11.5, color: colors.onDarkMuted, textAlign: 'center', lineHeight: 17, marginTop: spacing.lg },

  method: { fontSize: 13.5, color: colors.onDarkMuted, lineHeight: 20 },
  methodHead: { fontSize: 15, fontWeight: '700', color: colors.goldBright, marginTop: spacing.sm },
  methodRow: { gap: 2 },
  methodName: { fontSize: 14, fontWeight: '700', color: colors.onDark },
});
