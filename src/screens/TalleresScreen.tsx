import React from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, shadow, glass } from '../theme';

const WORKSHOPS = [
  { id: 1, icon: '💳', title: 'Tarjetas de Crédito Inteligentes', instructor: 'Carlos Mendez', rating: '4.9', participants: 234, color: '#FFE4CC' },
  { id: 2, icon: '🏠', title: 'Tu Primera Casa', instructor: 'Andrea López', rating: '4.8', participants: 189, color: 'rgba(226,190,75,0.14)' },
  { id: 3, icon: '📊', title: 'Analiza tu Dinero', instructor: 'Juan Pérez', rating: '4.7', participants: 156, color: 'rgba(226,190,75,0.14)' },
  { id: 4, icon: '🚀', title: 'Negocio Paralelo', instructor: 'María García', rating: '4.9', participants: 201, color: 'rgba(226,190,75,0.14)' },
];

export function TalleresScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Talleres Interactivos</Text>

        {/* Próximo Taller */}
        <View style={styles.nextWorkshopCard}>
          <Text style={styles.nextBadgeText}>⏰ Próximo taller</Text>
          <Text style={styles.nextTitle}>Cómo Ahorrar $10K en 12 Meses</Text>
          <View style={styles.nextDetails}>
            <View>
              <Text style={styles.nextLabel}>Fecha</Text>
              <Text style={styles.nextValue}>Sábado, 10 Feb</Text>
            </View>
            <View>
              <Text style={styles.nextLabel}>Hora</Text>
              <Text style={styles.nextValue}>4:00 PM</Text>
            </View>
            <View>
              <Text style={styles.nextLabel}>Duración</Text>
              <Text style={styles.nextValue}>90 min</Text>
            </View>
          </View>
          <View style={styles.nextButtons}>
            <Pressable style={styles.buttonPrimary}>
              <Text style={styles.buttonTextPrimary}>Registrarme</Text>
            </Pressable>
            <Pressable style={styles.buttonSecondary}>
              <Text style={styles.buttonTextSecondary}>Recordarme</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>TALLERES DISPONIBLES</Text>
        {WORKSHOPS.map((workshop) => (
          <Pressable key={workshop.id} style={styles.workshopCard}>
            <View style={[styles.workshopIcon, { backgroundColor: workshop.color }]}>
              <Text style={styles.workshopIconText}>{workshop.icon}</Text>
            </View>
            <View style={styles.workshopInfo}>
              <Text style={styles.workshopTitle}>{workshop.title}</Text>
              <Text style={styles.workshopInstructor}>{workshop.instructor}</Text>
              <View style={styles.workshopMeta}>
                <View style={styles.ratingBadge}>
                  <Text style={styles.workshopRating}>{workshop.rating} ⭐</Text>
                </View>
                <Text style={styles.workshopParticipants}>{workshop.participants} asistentes</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 130 },
  title: { fontSize: 20, fontWeight: '700', color: colors.gold, marginBottom: spacing.lg },
  nextWorkshopCard: { backgroundColor: colors.bgDeep, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  nextBadgeText: { fontSize: 11, fontWeight: '700', color: colors.gold, letterSpacing: 0.5, marginBottom: spacing.sm },
  nextTitle: { fontSize: 18, fontWeight: '700', color: colors.onDark, marginBottom: spacing.md },
  nextDetails: { flexDirection: 'row', gap: spacing.xl, marginBottom: spacing.md },
  nextLabel: { fontSize: 11, color: colors.onDarkMuted, marginBottom: 2 },
  nextValue: { fontSize: 13, fontWeight: '600', color: colors.onDark },
  nextButtons: { flexDirection: 'row', gap: spacing.md },
  buttonPrimary: { flex: 1, backgroundColor: colors.gold, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center' },
  buttonSecondary: { flex: 1, backgroundColor: 'rgba(0,0,0,0.06)', paddingVertical: 12, borderRadius: radius.md, alignItems: 'center' },
  buttonTextPrimary: { fontSize: 12, fontWeight: '700', color: colors.gold },
  buttonTextSecondary: { fontSize: 12, fontWeight: '700', color: colors.onDark },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1, marginBottom: spacing.md },
  workshopCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.glassBorder },
  workshopIcon: { width: 50, height: 50, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  workshopIconText: { fontSize: 24 },
  workshopInfo: { flex: 1 },
  workshopTitle: { fontSize: 14, fontWeight: '600', color: colors.onDark, marginBottom: 2 },
  workshopInstructor: { fontSize: 12, color: colors.onDarkMuted, marginBottom: 6 },
  workshopMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ratingBadge: { backgroundColor: 'rgba(226,190,75,0.14)', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  workshopRating: { fontSize: 11, color: colors.gold, fontWeight: '600' },
  workshopParticipants: { fontSize: 11, color: colors.onDarkMuted },
});
