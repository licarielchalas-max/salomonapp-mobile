import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { TextInput } from '../components/AppTextInput';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthProvider';
import { useAccount } from '../context/AccountProvider';
import Constants from 'expo-constants';
import { PLANS, isUnlimited, profilesLabel } from '../lib/plans';
import type { AdminStats } from '../types/db';
import { TicketThread, type TicketMessage } from '../components/TicketThread';
import { AdminReferrals } from '../components/admin/AdminReferrals';
import { AdminMarketplace } from '../components/admin/AdminMarketplace';
import { AdminPayments } from '../components/admin/AdminPayments';
import { colors, spacing, radius, shadow, glass } from '../theme';
import { dateLocale } from '../lib/i18n';

function fmt(n: number) {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface Ticket {
  id: string;
  asunto?: string | null;
  updated_at?: string;
  mensaje: string;
  status: string;
  created_at: string;
  household_id: string;
}

type AdminTab = 'stats' | 'tickets' | 'referidos' | 'marketplace' | 'pagos' | 'planes' | 'config';

export function AdminScreen() {
  const { user } = useAuth();
  const { isAdmin, loading: accountLoading } = useAccount();
  const [tab, setTab] = useState<AdminTab>('stats');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [thread, setThread] = useState<Ticket | null>(null);
  const [threadAuthor, setThreadAuthor] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    loadStats();
    loadTickets();
  }, [isAdmin]);

  async function loadStats() {
    const { data, error: rpcError } = await supabase.rpc('admin_stats');
    if (rpcError) setError(rpcError.message);
    else setStats(data as AdminStats);
    setLoading(false);
  }

  async function loadTickets() {
    const { data } = await supabase.rpc('admin_list_tickets');
    setTickets((data ?? []) as Ticket[]);
  }

  async function resolveTicket(id: string) {
    setResolving(id);
    const { error: rpcError } = await supabase.rpc('admin_resolve_ticket', { p_id: id });
    if (!rpcError) setTickets((p) => p.map((t) => t.id === id ? { ...t, status: 'resuelto' } : t));
    setResolving(null);
  }

  async function openThread(t: Ticket) {
    setThread(t);
    setThreadAuthor('');
    const { data } = await supabase.rpc('admin_ticket_author', { p_ticket: t.id });
    const a = (data as { email: string | null; nombre: string | null }[] | null)?.[0];
    if (a) setThreadAuthor([a.nombre, a.email].filter(Boolean).join(' · '));
  }

  const threadMessages = async (): Promise<TicketMessage[]> => {
    if (!thread) return [];
    const { data } = await supabase.rpc('admin_ticket_messages', { p_ticket: thread.id });
    return (data ?? []) as TicketMessage[];
  };

  const threadSend = async (body: string) => {
    if (!thread) return { error: 'Sin ticket' };
    const { error: rpcError } = await supabase.rpc('reply_support_ticket', { p_ticket: thread.id, p_body: body });
    return { error: rpcError?.message ?? null };
  };

  const openTickets = tickets.filter((t) => t.status === 'abierto');
  const resolvedTickets = tickets.filter((t) => t.status === 'resuelto');

  const TABS: { key: AdminTab; label: string; icon: string }[] = [
    { key: 'stats', label: 'Estadísticas', icon: '📊' },
    { key: 'tickets', label: 'Soporte', icon: '🎫' },
    { key: 'referidos', label: 'Referidos', icon: '🎁' },
    { key: 'marketplace', label: 'Marketplace', icon: '🛍️' },
    { key: 'pagos', label: 'Pagos', icon: '💳' },
    { key: 'planes', label: 'Planes', icon: '💎' },
    { key: 'config', label: 'Config', icon: '⚙️' },
  ];

  if (accountLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ActivityIndicator color={colors.navy} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🔒</Text>
          <Text style={styles.emptyTitle}>Acceso restringido</Text>
          <Text style={styles.ticketMeta}>Esta sección es solo para administradores de Salomón.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Admin header */}
      <View style={styles.adminHeader}>
        <Text style={styles.adminTitle}>⚡ Panel de Administrador</Text>
        <Text style={styles.adminSub}>{user?.email}</Text>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]} onPress={() => setTab(t.key)}>
            <Text style={styles.tabBtnIcon}>{t.icon}</Text>
            <Text style={[styles.tabBtnText, tab === t.key && styles.tabBtnTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* STATS */}
        {tab === 'stats' && (
          <>
            <Text style={styles.sectionTitle}>MÉTRICAS GLOBALES DE LA APP</Text>
            {error && <Text style={styles.ticketMeta}>No se pudieron cargar las métricas: {error}</Text>}
            {loading ? <ActivityIndicator color={colors.navy} style={{ marginTop: 32 }} /> : stats && (
              <>
                <View style={styles.statsGrid}>
                  {[
                    { label: 'Usuarios', value: fmt(stats.users), icon: '👤', color: 'rgba(226,190,75,0.14)' },
                    { label: 'Hogares', value: fmt(stats.households), icon: '🏠', color: colors.greenSoft },
                    { label: 'Transacciones', value: fmt(stats.transactions), icon: '💸', color: 'rgba(226,190,75,0.14)' },
                    { label: 'En prueba gratis', value: fmt(stats.trialing), icon: '🎁', color: 'rgba(226,190,75,0.14)' },
                    { label: 'Suscripciones activas', value: fmt(stats.active), icon: '⭐', color: 'rgba(226,190,75,0.14)' },
                    { label: 'Tickets abiertos', value: fmt(stats.open_tickets), icon: '🎫', color: stats.open_tickets > 0 ? colors.rustSoft : colors.greenSoft },
                  ].map((s) => (
                    <View key={s.label} style={[styles.statCard, { backgroundColor: s.color }]}>
                      <Text style={styles.statIcon}>{s.icon}</Text>
                      <Text style={styles.statValue}>{s.value}</Text>
                      <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.revenueCard}>
                  <Text style={styles.revenueTitle}>💰 Ingresos mensuales recurrentes</Text>
                  <Text style={styles.revenueValue}>US${fmt(stats.mrr_usd)}/mes</Text>
                  <Text style={styles.revenueSub}>
                    {stats.active} suscripciones activas · {PLANS.map((p) => `${stats.by_plan[p.id] ?? 0} ${p.name.replace('Salomón ', '')}`).join(' · ')}
                  </Text>
                </View>
              </>
            )}
          </>
        )}

        {/* TICKETS */}
        {tab === 'tickets' && (
          <>
            <View style={styles.ticketSummary}>
              <View style={[styles.ticketStat, { backgroundColor: colors.rustSoft }]}>
                <Text style={[styles.ticketStatNum, { color: colors.rust }]}>{openTickets.length}</Text>
                <Text style={styles.ticketStatLabel}>Abiertos</Text>
              </View>
              <View style={[styles.ticketStat, { backgroundColor: colors.greenSoft }]}>
                <Text style={[styles.ticketStatNum, { color: colors.green }]}>{resolvedTickets.length}</Text>
                <Text style={styles.ticketStatLabel}>Resueltos</Text>
              </View>
            </View>

            {openTickets.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>ABIERTOS</Text>
                {openTickets.map((t) => (
                  <Pressable key={t.id} style={[styles.ticketCard, { borderLeftColor: colors.rust }]} onPress={() => openThread(t)} accessibilityLabel={`Abrir el ticket ${t.asunto ?? ''}`}>
                    {!!t.asunto && <Text style={[styles.ticketMsg, { fontWeight: '800' }]}>{t.asunto}</Text>}
                    <Text style={styles.ticketMsg} numberOfLines={2}>{t.mensaje}</Text>
                    <Text style={styles.ticketMeta}>{new Date(t.updated_at ?? t.created_at).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' })} · Responder</Text>
                  </Pressable>
                ))}
              </>
            )}

            {openTickets.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🎉</Text>
                <Text style={styles.emptyTitle}>Sin tickets pendientes</Text>
              </View>
            )}

            {resolvedTickets.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>RESUELTOS</Text>
                {resolvedTickets.map((t) => (
                  <Pressable key={t.id} onPress={() => openThread(t)} style={[styles.ticketCard, { borderLeftColor: colors.green, opacity: 0.7 }]}>
                    <Text style={styles.ticketMsg}>{t.asunto || t.mensaje}</Text>
                    <Text style={styles.ticketMeta}>{new Date(t.created_at).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' })}</Text>
                  </Pressable>
                ))}
              </>
            )}
          </>
        )}

        {tab === 'referidos' && <AdminReferrals />}
        {tab === 'marketplace' && <AdminMarketplace />}
        {tab === 'pagos' && <AdminPayments />}

        {/* PLANES */}
        {tab === 'planes' && (
          <>
            <Text style={styles.sectionTitle}>ESTRUCTURA DE PLANES</Text>
            {PLANS.map((p, i) => (
              <View key={p.id} style={[styles.planCard, { backgroundColor: ['rgba(226,190,75,0.14)', 'rgba(226,190,75,0.14)', 'rgba(226,190,75,0.14)'][i] }]}>
                <View style={styles.planHeader}>
                  <Text style={styles.planIcon}>{['🌱', '⭐', '👨‍👩‍👧‍👦'][i]}</Text>
                  <Text style={styles.planNombre}>{p.name}</Text>
                  <Text style={styles.planPrecio}>US${p.priceUsd}/mes</Text>
                </View>
                <Text style={styles.planFeature}>✓ {isUnlimited(p.profiles) || p.profiles === 1 ? profilesLabel(p.profiles) : `Hasta ${p.profiles} perfiles`}</Text>
                <Text style={styles.planFeature}>✓ Todas las funciones incluidas</Text>
                <Text style={styles.planFeature}>✓ {stats?.by_plan[p.id] ?? 0} suscripción(es) activa(s)</Text>
              </View>
            ))}
            <View style={styles.commissionNote}>
              <Text style={styles.commissionNoteTitle}>💰 Modelo de comisiones</Text>
              <Text style={styles.commissionNoteText}>Marketplace: 1–2.5% por producto vendido{'\n'}Talleres: 30% comisión a instructor{'\n'}Referidos: RD$200 por nuevo usuario activo</Text>
            </View>
          </>
        )}

        {/* CONFIG */}
        {tab === 'config' && (
          <>
            <Text style={styles.sectionTitle}>CONFIGURACIÓN GLOBAL</Text>
            {[
              { label: 'Versión de la app', value: Constants.expoConfig?.version ?? '1.0.0' },
              { label: 'Supabase proyecto', value: 'rdwbkjjtuxhiuweikrcs' },
              { label: 'Ambiente', value: __DEV__ ? 'Desarrollo' : 'Producción' },
              { label: 'Admin email', value: user?.email ?? '—' },
            ].map((c) => (
              <View key={c.label} style={styles.configRow}>
                <Text style={styles.configLabel}>{c.label}</Text>
                <Text style={styles.configValue}>{c.value}</Text>
              </View>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>ACCIONES RÁPIDAS</Text>
            {[
              { label: '📊 Ver logs de errores', desc: 'Revisar errores en Supabase' },
              { label: '📧 Enviar boletín', desc: 'Email a todos los usuarios activos' },
              { label: '🔄 Forzar sincronización', desc: 'Reiniciar caché de categorías' },
              { label: '🛑 Modo mantenimiento', desc: 'Desactivar app temporalmente' },
            ].map((a) => (
              <Pressable key={a.label} style={styles.actionRow} onPress={() => Alert.alert(a.label, 'Esta función estará disponible en la próxima versión.')}>
                <View>
                  <Text style={styles.actionLabel}>{a.label}</Text>
                  <Text style={styles.actionDesc}>{a.desc}</Text>
                </View>
                <Text style={styles.actionArrow}>›</Text>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
      <TicketThread
        visible={!!thread}
        onClose={() => { setThread(null); loadTickets(); loadStats(); }}
        title={thread?.asunto || 'Ticket'}
        subtitle={threadAuthor}
        resolved={thread?.status === 'resuelto'}
        loadMessages={threadMessages}
        send={threadSend}
        mineIsAdmin
        onResolve={async () => {
          if (!thread) return;
          await resolveTicket(thread.id);
          setThread({ ...thread, status: 'resuelto' });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  adminHeader: { backgroundColor: colors.navy, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  adminTitle: { fontSize: 20, fontWeight: '800', color: colors.onNavy, marginBottom: 4 },
  adminSub: { fontSize: 11, color: 'rgba(28,28,30,0.55)' },
  tabScroll: { backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  tabContent: { paddingHorizontal: spacing.md, paddingVertical: 8, gap: spacing.sm },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.bg },
  tabBtnActive: { backgroundColor: colors.bgDeep, borderColor: colors.navy },
  tabBtnIcon: { fontSize: 14 },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: colors.onDarkMuted },
  tabBtnTextActive: { color: colors.onDark },
  content: { padding: spacing.lg, paddingBottom: 130 },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2, marginBottom: spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  statCard: { width: '47%', borderRadius: radius.md, padding: spacing.md, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.glassBorder },
  statIcon: { fontSize: 28 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.gold },
  statLabel: { fontSize: 11, color: colors.onDarkMuted, textAlign: 'center' },
  revenueCard: { backgroundColor: colors.bgDeep, borderRadius: radius.md, padding: spacing.lg, ...shadow.hero },
  revenueTitle: { fontSize: 12, fontWeight: '700', color: colors.gold, marginBottom: spacing.sm },
  revenueValue: { fontSize: 28, fontWeight: '800', color: colors.onDark, letterSpacing: -1 },
  revenueSub: { fontSize: 11, color: colors.onDarkMuted, marginTop: 4 },
  ticketSummary: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  ticketStat: { flex: 1, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', gap: 4 },
  ticketStatNum: { fontSize: 28, fontWeight: '800' },
  ticketStatLabel: { fontSize: 11, color: colors.onDarkMuted },
  ticketCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.glassBorder, borderLeftWidth: 4, gap: spacing.sm },
  ticketMsg: { fontSize: 13, color: colors.onDark, lineHeight: 20 },
  ticketMeta: { fontSize: 11, color: colors.onDarkMuted },
  resolveBtn: { backgroundColor: colors.green, borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start' },
  resolveBtnText: { fontSize: 12, fontWeight: '700', color: colors.onNavy },
  emptyCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.xxl, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder, gap: spacing.sm },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.gold },
  planCard: { borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.glassBorder },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  planIcon: { fontSize: 28 },
  planNombre: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.gold },
  planPrecio: { fontSize: 14, fontWeight: '700', color: colors.green },
  planFeature: { fontSize: 13, color: colors.onDark, paddingVertical: 3 },
  commissionNote: { backgroundColor: colors.greenSoft, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.greenBorder },
  commissionNoteTitle: { fontSize: 14, fontWeight: '700', color: colors.green, marginBottom: spacing.sm },
  commissionNoteText: { fontSize: 13, color: colors.green, lineHeight: 22 },
  configRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.glassBorder },
  configLabel: { fontSize: 13, color: colors.onDarkMuted },
  configValue: { fontSize: 13, fontWeight: '700', color: colors.onDark, maxWidth: '55%', textAlign: 'right' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.glassBorder },
  actionLabel: { fontSize: 13, fontWeight: '600', color: colors.onDark, marginBottom: 2 },
  actionDesc: { fontSize: 11, color: colors.onDarkMuted },
  actionArrow: { fontSize: 22, color: colors.onDarkMuted },
});
