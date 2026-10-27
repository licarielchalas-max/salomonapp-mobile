import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components/AppText';
import { TextInput } from '../components/AppTextInput';
import { Sheet, FieldLabel } from '../components/budget/ui';
import { GoldButton } from '../components/brand/Buttons';
import { Icon } from '../components/brand/Icon';
import { TicketThread, type TicketMessage } from '../components/TicketThread';
import { useAuth } from '../context/AuthProvider';
import { useReloadOnFocus } from '../hooks/useReloadOnFocus';
import { supabase } from '../lib/supabase';
import { dateLocale } from '../lib/i18n';
import { colors, radius, spacing } from '../theme';

interface Ticket {
  id: string;
  asunto: string | null;
  mensaje: string;
  status: 'abierto' | 'resuelto';
  created_at: string;
  updated_at: string;
}

// Soporte: abre un ticket y conversa con el equipo de Salomón.
export function SoporteScreen() {
  const { householdId } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Ticket | null>(null);

  const [newOpen, setNewOpen] = useState(false);
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!householdId) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('support_tickets')
      .select('id, asunto, mensaje, status, created_at, updated_at')
      .eq('household_id', householdId)
      .order('updated_at', { ascending: false });
    setTickets((data ?? []) as Ticket[]);
    setLoading(false);
  }, [householdId]);

  useEffect(() => { load(); }, [load]);
  useReloadOnFocus(load);

  async function createTicket() {
    if (!asunto.trim()) return Alert.alert('Falta el asunto', 'Escribe en pocas palabras de qué se trata.');
    if (!mensaje.trim()) return Alert.alert('Cuéntanos qué pasa', 'Escribe tu consulta para que podamos ayudarte.');
    setSaving(true);
    const { data, error } = await supabase.rpc('create_support_ticket', { p_asunto: asunto, p_mensaje: mensaje });
    setSaving(false);
    if (error) return Alert.alert('No se pudo enviar', error.message);
    setNewOpen(false);
    setAsunto('');
    setMensaje('');
    await load();
    const created = (await supabase.from('support_tickets').select('id, asunto, mensaje, status, created_at, updated_at').eq('id', data as string).maybeSingle()).data as Ticket | null;
    if (created) setOpen(created);
  }

  const loadMessages = useCallback(async (): Promise<TicketMessage[]> => {
    if (!open) return [];
    const { data } = await supabase.from('ticket_messages').select('id, is_admin, body, created_at').eq('ticket_id', open.id).order('created_at');
    return (data ?? []) as TicketMessage[];
  }, [open?.id]);

  const send = useCallback(
    async (body: string) => {
      if (!open) return { error: 'Sin ticket' };
      const { error } = await supabase.rpc('reply_support_ticket', { p_ticket: open.id, p_body: body, p_as_user: true });
      if (!error) load();
      return { error: error?.message ?? null };
    },
    [open?.id, load],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[colors.bgDeep, colors.bg]} locations={[0, 0.4]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Icon name="chat" size={22} color={colors.gold} />
          <Text style={styles.introText}>¿Algo no funciona o tienes una duda? Escríbenos y te respondemos aquí mismo.</Text>
        </View>

        <GoldButton label="Nuevo ticket" onPress={() => setNewOpen(true)} />

        <Text style={styles.section}>MIS TICKETS</Text>
        {loading ? (
          <ActivityIndicator color={colors.gold} />
        ) : tickets.length === 0 ? (
          <Text style={styles.empty}>Aún no has abierto ningún ticket.</Text>
        ) : (
          tickets.map((t) => (
            <Pressable key={t.id} style={styles.card} onPress={() => setOpen(t)} accessibilityLabel={`Abrir el ticket ${t.asunto ?? ''}`}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>{t.asunto || t.mensaje}</Text>
                <Text style={styles.cardSub} numberOfLines={1}>
                  {new Date(t.updated_at).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <View style={[styles.pill, t.status === 'resuelto' ? styles.pillOk : styles.pillOpen]}>
                <Text style={[styles.pillText, { color: t.status === 'resuelto' ? colors.green : colors.rust }]}>
                  {t.status === 'resuelto' ? 'Resuelto' : 'Abierto'}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <Sheet visible={newOpen} onClose={() => setNewOpen(false)} title="Nuevo ticket">
        <FieldLabel>Asunto</FieldLabel>
        <TextInput
          style={styles.input}
          value={asunto}
          onChangeText={setAsunto}
          placeholder="Ej. No puedo registrar una tarjeta"
          placeholderTextColor={colors.onDarkMuted}
          maxLength={120}
          accessibilityLabel="Asunto"
        />
        <FieldLabel>¿Qué pasa?</FieldLabel>
        <TextInput
          style={[styles.input, { minHeight: 110, textAlignVertical: 'top' }]}
          value={mensaje}
          onChangeText={setMensaje}
          placeholder="Cuéntanos con detalle"
          placeholderTextColor={colors.onDarkMuted}
          multiline
          maxLength={2000}
          accessibilityLabel="Mensaje"
        />
        <GoldButton label="Enviar" onPress={createTicket} loading={saving} />
      </Sheet>

      <TicketThread
        visible={!!open}
        onClose={() => setOpen(null)}
        title={open?.asunto || 'Ticket'}
        resolved={open?.status === 'resuelto'}
        loadMessages={loadMessages}
        send={send}
        mineIsAdmin={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 130, gap: spacing.md, maxWidth: 640, width: '100%', alignSelf: 'center' },
  intro: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.goldBorder,
  },
  introText: { flex: 1, fontSize: 13, color: colors.onDark, lineHeight: 19 },
  section: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2, marginTop: spacing.sm },
  empty: { fontSize: 13, color: colors.onDarkMuted },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder,
  },
  cardTitle: { fontSize: 14.5, fontWeight: '700', color: colors.onDark },
  cardSub: { fontSize: 11.5, color: colors.onDarkMuted, marginTop: 2 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, borderWidth: 1 },
  pillOpen: { backgroundColor: 'rgba(255,143,122,0.12)', borderColor: 'rgba(255,143,122,0.5)' },
  pillOk: { backgroundColor: 'rgba(123,224,176,0.12)', borderColor: 'rgba(123,224,176,0.5)' },
  pillText: { fontSize: 11, fontWeight: '700' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md, paddingVertical: 13, fontSize: 15, color: colors.onDark,
  },
});
