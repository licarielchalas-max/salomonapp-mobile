import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, shadow, glass } from '../theme';

type Tab = 'cursos' | 'talleres' | 'progreso';

const COURSES = [
  {
    id: '1', icon: '💰', titulo: 'Fundamentos Financieros', desc: 'Conceptos esenciales que todo dominicano debe saber', lecciones: 6, duracion: '2h 30min', nivel: 'Básico', progress: 100, color: '#FFE4CC',
    url: null,
    temario: ['¿Qué son las finanzas personales?', 'Ingresos activos vs pasivos', 'El ciclo del dinero', 'Presupuesto familiar', 'Ahorro vs inversión', 'Metas financieras SMART'],
  },
  {
    id: '2', icon: '📈', titulo: 'Inversión 101', desc: 'Primeros pasos en inversiones en República Dominicana', lecciones: 8, duracion: '3h 15min', nivel: 'Intermedio', progress: 66, color: 'rgba(226,190,75,0.14)',
    url: null,
    temario: ['Perfil de riesgo inversor', 'Certificados de Depósito (CD)', 'Fondos de inversión locales', 'AFP y pensión voluntaria', 'Inversión en USD', 'Bolsa de valores NY', 'Criptomonedas con responsabilidad', 'Armando tu portafolio'],
  },
  {
    id: '3', icon: '🏦', titulo: 'Deudas Inteligentes', desc: 'Maneja créditos, tarjetas y préstamos sin estrés', lecciones: 5, duracion: '1h 45min', nivel: 'Básico', progress: 40, color: 'rgba(226,190,75,0.14)',
    url: null,
    temario: ['Deuda buena vs deuda mala', 'Cómo funciona el interés compuesto', 'Estrategia avalancha vs bola de nieve', 'Negociación con acreedores', 'Reparación de crédito'],
  },
  {
    id: '4', icon: '🎯', titulo: 'Metas Financieras', desc: 'Planifica y alcanza objetivos reales en RD', lecciones: 7, duracion: '2h', nivel: 'Básico', progress: 0, color: 'rgba(226,190,75,0.14)',
    url: null,
    temario: ['Fondo de emergencia (por qué 2x salario)', 'Comprar vs alquilar en RD', 'Planificación de viaje o vacaciones', 'Fondo para educación hijos', 'Retiro anticipado', 'Legado y herencia', 'Plan financiero de 5 años'],
  },
  {
    id: '5', icon: '🏠', titulo: 'Bienes Raíces en RD', desc: 'Compra tu primera propiedad con confianza', lecciones: 9, duracion: '4h', nivel: 'Avanzado', progress: 0, color: 'rgba(226,190,75,0.14)',
    url: null,
    temario: ['Tipos de propiedad en RD', 'Financiamiento hipotecario', 'Banco BHD, Popular e Inmobiliaria', 'Due diligence legal', 'Impuestos y DGII', 'Inversión en propiedades para alquiler', 'Fideicomiso inmobiliario', 'Constructores: cómo negociar', 'Escrituras y trámites'],
  },
];

const TALLERES = [
  {
    id: 't1', icon: '🤝', titulo: 'Negociación de Salario en RD', instructor: 'Ana Rodríguez', date: '15 Sep 2025', duracion: '2h en vivo', precio: 'RD$1,500', badge: '🔴 En vivo', color: 'rgba(226,190,75,0.14)',
    desc: 'Aprende las técnicas de negociación más efectivas para el mercado laboral dominicano.',
  },
  {
    id: 't2', icon: '📊', titulo: 'Excel para Finanzas Personales', instructor: 'Carlos Méndez', date: '20 Sep 2025', duracion: '3h grabado', precio: 'RD$2,000', badge: '🎬 Grabado', color: 'rgba(226,190,75,0.14)',
    desc: 'Crea tu propio sistema de control financiero en Excel desde cero.',
  },
  {
    id: 't3', icon: '🏦', titulo: 'Cómo invertir en la Bolsa desde RD', instructor: 'Miguel Santos', date: '28 Sep 2025', duracion: '4h en vivo', precio: 'RD$3,500', badge: '🔴 En vivo', color: 'rgba(226,190,75,0.14)',
    desc: 'Abre tu cuenta de broker y empieza a invertir en acciones internacionales.',
  },
  {
    id: 't4', icon: '🧾', titulo: 'Planificación Fiscal en RD', instructor: 'Dra. Laura Pimentel', date: 'Bajo demanda', duracion: '2h grabado', precio: 'RD$2,800', badge: '⏱️ Bajo demanda', color: 'rgba(226,190,75,0.14)',
    desc: 'Reduce legalmente tu carga tributaria con estrategias aprobadas por la DGII.',
  },
  {
    id: 't5', icon: '🌐', titulo: 'Ingresos Remotos y Freelance', instructor: 'René Castillo', date: 'Bajo demanda', duracion: '3h grabado', precio: 'RD$1,800', badge: '⏱️ Bajo demanda', color: 'rgba(226,190,75,0.14)',
    desc: 'Genera ingresos en USD trabajando remotamente desde República Dominicana.',
  },
];

const NIVEL_COLOR: Record<string, string> = {
  Básico: colors.greenSoft, Intermedio: 'rgba(226,190,75,0.14)', Avanzado: colors.rustSoft,
};
const NIVEL_TEXT: Record<string, string> = {
  Básico: colors.green, Intermedio: '#A07B00', Avanzado: colors.rust,
};

export function AcademiaScreen() {
  const [tab, setTab] = useState<Tab>('cursos');
  const [expanded, setExpanded] = useState<string | null>(null);

  const totalLecciones = COURSES.reduce((a, c) => a + c.lecciones, 0);
  const completedLecciones = COURSES.reduce((a, c) => a + Math.round(c.lecciones * c.progress / 100), 0);
  const overallProgress = Math.round((completedLecciones / totalLecciones) * 100);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[colors.bgDeep, colors.bg]} locations={[0, 0.4]} style={StyleSheet.absoluteFill} />
      {/* Tab bar */}
      <View style={styles.tabRow}>
        {([
          { key: 'cursos', label: '🎓 Cursos' },
          { key: 'talleres', label: '🏆 Talleres' },
          { key: 'progreso', label: '📊 Progreso' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <Pressable key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* CURSOS */}
        {tab === 'cursos' && (
          <>
            <View style={styles.progressCard}>
              <View style={styles.progressRow}>
                <Text style={styles.progressTitle}>Mi progreso académico</Text>
                <View style={styles.progressBadge}>
                  <Text style={styles.progressPct}>{overallProgress}%</Text>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${overallProgress}%` as any }]} />
              </View>
              <Text style={styles.progressSub}>{completedLecciones} de {totalLecciones} lecciones completadas</Text>
            </View>

            {COURSES.map((course) => (
              <View key={course.id} style={styles.courseCard}>
                <Pressable onPress={() => setExpanded(expanded === course.id ? null : course.id)}>
                  <View style={[styles.courseHeaderBg, { backgroundColor: course.color }]}>
                    <Text style={styles.courseIcon}>{course.icon}</Text>
                    <View style={[styles.nivelBadge, { backgroundColor: NIVEL_COLOR[course.nivel] }]}>
                      <Text style={[styles.nivelText, { color: NIVEL_TEXT[course.nivel] }]}>{course.nivel}</Text>
                    </View>
                    {course.progress === 100 && (
                      <View style={styles.completedBadge}><Text style={styles.completedText}>✓ Completado</Text></View>
                    )}
                  </View>
                  <View style={styles.courseBody}>
                    <Text style={styles.courseTitulo}>{course.titulo}</Text>
                    <Text style={styles.courseDesc}>{course.desc}</Text>
                    <View style={styles.courseMeta}>
                      <Text style={styles.coursePill}>{course.lecciones} lecciones</Text>
                      <Text style={styles.coursePill}>{course.duracion}</Text>
                      <Text style={styles.courseProgress}>{course.progress}%</Text>
                    </View>
                    <View style={styles.courseTrack}>
                      <View style={[styles.courseFill, { width: `${course.progress}%` as any, backgroundColor: course.progress === 100 ? colors.green : colors.navy }]} />
                    </View>
                  </View>
                </Pressable>

                {expanded === course.id && (
                  <View style={styles.temario}>
                    <Text style={styles.temarioTitle}>Temario del curso</Text>
                    {course.temario.map((t, i) => (
                      <View key={t} style={styles.temarioItem}>
                        <Text style={styles.temarioNum}>{i + 1}</Text>
                        <Text style={styles.temarioText}>{t}</Text>
                      </View>
                    ))}
                    <Pressable style={styles.startBtn} onPress={() => Alert.alert('Próximamente', 'El contenido interactivo de los cursos estará disponible en la siguiente versión.')}>
                      <Text style={styles.startBtnText}>{course.progress > 0 ? 'Continuar curso →' : 'Comenzar curso →'}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {/* TALLERES */}
        {tab === 'talleres' && (
          <>
            <View style={styles.talleresHeader}>
              <Text style={styles.talleresTitle}>Talleres en vivo y grabados</Text>
              <Text style={styles.talleresSub}>Impartidos por expertos financieros dominicanos</Text>
            </View>

            {TALLERES.map((t) => (
              <View key={t.id} style={styles.tallerCard}>
                <View style={[styles.tallerHeaderBg, { backgroundColor: t.color }]}>
                  <Text style={styles.tallerIcon}>{t.icon}</Text>
                  <View style={styles.tallerBadgeWrap}>
                    <Text style={styles.tallerBadge}>{t.badge}</Text>
                  </View>
                </View>
                <View style={styles.tallerBody}>
                  <Text style={styles.tallerTitulo}>{t.titulo}</Text>
                  <Text style={styles.tallerDesc}>{t.desc}</Text>
                  <View style={styles.tallerMeta}>
                    <Text style={styles.tallerInstructor}>👤 {t.instructor}</Text>
                    <Text style={styles.tallerDate}>📅 {t.date}</Text>
                    <Text style={styles.tallerDuracion}>⏱️ {t.duracion}</Text>
                  </View>
                  <View style={styles.tallerFooter}>
                    <Text style={styles.tallerPrecio}>{t.precio}</Text>
                    <Pressable style={styles.inscribeBtn} onPress={() => Alert.alert('Inscripción', `Te inscribirás al taller: ${t.titulo}\n\nPrecio: ${t.precio}\n\nEl pago se procesa a través de la app.`)}>
                      <Text style={styles.inscribeBtnText}>Inscribirme</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}

            <View style={styles.instructorNote}>
              <Text style={styles.instructorNoteTitle}>¿Eres instructor?</Text>
              <Text style={styles.instructorNoteText}>Imparte tu taller en Salomón y gana el 70% de cada inscripción. Nosotros gestionamos el pago y la plataforma.</Text>
              <Pressable style={styles.instructorBtn} onPress={() => Alert.alert('Próximamente', 'El registro de instructores estará disponible pronto.')}>
                <Text style={styles.instructorBtnText}>Quiero ser instructor →</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* PROGRESO */}
        {tab === 'progreso' && (
          <>
            <View style={styles.progressHero}>
              <Text style={styles.progressHeroLabel}>NIVEL ACADÉMICO</Text>
              <Text style={styles.progressHeroValue}>{overallProgress}%</Text>
              <Text style={styles.progressHeroSub}>
                {overallProgress === 100 ? '🏆 ¡Maestro Financiero!' : overallProgress >= 50 ? '⭐ Estudiante Avanzado' : '🌱 Comenzando tu camino'}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>PROGRESO POR CURSO</Text>
            {COURSES.map((c) => (
              <View key={c.id} style={styles.progressItem}>
                <View style={styles.progressItemLeft}>
                  <Text style={styles.progressItemIcon}>{c.icon}</Text>
                  <View style={styles.progressItemInfo}>
                    <Text style={styles.progressItemTitle}>{c.titulo}</Text>
                    <Text style={styles.progressItemSub}>{Math.round(c.lecciones * c.progress / 100)}/{c.lecciones} lecciones</Text>
                  </View>
                </View>
                <Text style={[styles.progressItemPct, { color: c.progress === 100 ? colors.green : colors.navy }]}>{c.progress}%</Text>
              </View>
            ))}

            <View style={styles.certificateCard}>
              <Text style={styles.certIcon}>🎓</Text>
              <Text style={styles.certTitle}>Certificado Salomón</Text>
              <Text style={styles.certDesc}>Completa todos los cursos para obtener tu Certificado de Educación Financiera Salomón. Compártelo en LinkedIn.</Text>
              <View style={[styles.certTrack]}>
                <View style={[styles.certFill, { width: `${overallProgress}%` as any }]} />
              </View>
              <Text style={styles.certPct}>{overallProgress}% completado</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  tabRow: { flexDirection: 'row', backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.navy },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.onDarkMuted },
  tabTextActive: { color: colors.gold },
  content: { padding: spacing.lg, paddingBottom: 130 },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2, marginBottom: spacing.md },
  progressCard: { backgroundColor: colors.greenSoft, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.greenBorder },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  progressTitle: { fontSize: 15, fontWeight: '700', color: colors.onDark },
  progressBadge: { backgroundColor: colors.bgDeep, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  progressPct: { fontSize: 13, fontWeight: '800', color: colors.onDark },
  progressTrack: { height: 8, backgroundColor: 'rgba(15,81,50,0.15)', borderRadius: 4, overflow: 'hidden', marginBottom: spacing.sm },
  progressFill: { height: '100%', backgroundColor: colors.bgDeep, borderRadius: 4 },
  progressSub: { fontSize: 12, color: colors.green },
  courseCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.md, borderWidth: 1, borderColor: colors.glassBorder, ...shadow.card },
  courseHeaderBg: { height: 90, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  courseIcon: { fontSize: 38 },
  nivelBadge: { position: 'absolute', top: spacing.sm, left: spacing.sm, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  nivelText: { fontSize: 10, fontWeight: '700' },
  completedBadge: { position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: colors.green, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  completedText: { fontSize: 10, fontWeight: '700', color: colors.onNavy },
  courseBody: { padding: spacing.md },
  courseTitulo: { fontSize: 15, fontWeight: '700', color: colors.onDark, marginBottom: 4 },
  courseDesc: { fontSize: 12, color: colors.onDarkMuted, marginBottom: spacing.sm },
  courseMeta: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginBottom: spacing.sm },
  coursePill: { fontSize: 11, fontWeight: '600', color: colors.gold, backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  courseProgress: { marginLeft: 'auto' as any, fontSize: 12, fontWeight: '700', color: colors.onDarkMuted },
  courseTrack: { height: 4, backgroundColor: colors.line, borderRadius: 2, overflow: 'hidden' },
  courseFill: { height: '100%', borderRadius: 2 },
  temario: { backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.glassBorder, padding: spacing.md },
  temarioTitle: { fontSize: 12, fontWeight: '700', color: colors.gold, marginBottom: spacing.md },
  temarioItem: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm, alignItems: 'flex-start' },
  temarioNum: { fontSize: 12, fontWeight: '700', color: colors.gold, width: 20, textAlign: 'center' },
  temarioText: { flex: 1, fontSize: 13, color: colors.onDark, lineHeight: 20 },
  startBtn: { backgroundColor: colors.bgDeep, borderRadius: radius.pill, paddingVertical: 12, alignItems: 'center', marginTop: spacing.md },
  startBtnText: { fontSize: 13, fontWeight: '700', color: colors.onDark },
  talleresHeader: { marginBottom: spacing.lg },
  talleresTitle: { fontSize: 18, fontWeight: '800', color: colors.gold, marginBottom: 4 },
  talleresSub: { fontSize: 13, color: colors.onDarkMuted },
  tallerCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.md, borderWidth: 1, borderColor: colors.glassBorder, ...shadow.card },
  tallerHeaderBg: { height: 80, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  tallerIcon: { fontSize: 34 },
  tallerBadgeWrap: { position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  tallerBadge: { fontSize: 10, fontWeight: '700', color: colors.onDark },
  tallerBody: { padding: spacing.md },
  tallerTitulo: { fontSize: 15, fontWeight: '700', color: colors.onDark, marginBottom: 4 },
  tallerDesc: { fontSize: 12, color: colors.onDarkMuted, lineHeight: 18, marginBottom: spacing.md },
  tallerMeta: { gap: spacing.sm, marginBottom: spacing.md },
  tallerInstructor: { fontSize: 12, color: colors.gold, fontWeight: '600' },
  tallerDate: { fontSize: 12, color: colors.onDarkMuted },
  tallerDuracion: { fontSize: 12, color: colors.onDarkMuted },
  tallerFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.glassBorder, paddingTop: spacing.md },
  tallerPrecio: { fontSize: 18, fontWeight: '800', color: colors.gold },
  inscribeBtn: { backgroundColor: colors.bgDeep, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 20 },
  inscribeBtnText: { fontSize: 13, fontWeight: '700', color: colors.onDark },
  instructorNote: { backgroundColor: colors.bgDeep, borderRadius: radius.md, padding: spacing.xl, gap: spacing.sm, ...shadow.hero },
  instructorNoteTitle: { fontSize: 16, fontWeight: '800', color: colors.onDark },
  instructorNoteText: { fontSize: 13, color: colors.onDarkMuted, lineHeight: 20 },
  instructorBtn: { backgroundColor: colors.gold, borderRadius: radius.pill, paddingVertical: 12, alignItems: 'center', marginTop: spacing.sm },
  instructorBtnText: { fontSize: 13, fontWeight: '700', color: colors.onNavy },
  progressHero: { backgroundColor: colors.bgDeep, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.lg, ...shadow.hero },
  progressHeroLabel: { fontSize: 10, fontWeight: '700', color: colors.gold, letterSpacing: 1.4, marginBottom: spacing.sm },
  progressHeroValue: { fontSize: 56, fontWeight: '900', color: colors.onDark, letterSpacing: -2, lineHeight: 64 },
  progressHeroSub: { fontSize: 14, color: colors.onDarkMuted, marginTop: 4 },
  progressItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.glassBorder },
  progressItemLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  progressItemIcon: { fontSize: 22 },
  progressItemInfo: { flex: 1 },
  progressItemTitle: { fontSize: 13, fontWeight: '600', color: colors.onDark, marginBottom: 2 },
  progressItemSub: { fontSize: 11, color: colors.onDarkMuted },
  progressItemPct: { fontSize: 16, fontWeight: '800' },
  certificateCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder, gap: spacing.md, marginTop: spacing.lg, ...shadow.card },
  certIcon: { fontSize: 48 },
  certTitle: { fontSize: 18, fontWeight: '800', color: colors.gold },
  certDesc: { fontSize: 13, color: colors.onDarkMuted, textAlign: 'center', lineHeight: 20 },
  certTrack: { width: '100%', height: 8, backgroundColor: colors.line, borderRadius: 4, overflow: 'hidden' },
  certFill: { height: '100%', backgroundColor: colors.gold, borderRadius: 4 },
  certPct: { fontSize: 13, fontWeight: '700', color: colors.gold },
});
