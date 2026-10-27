import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { TextInput } from './AppTextInput';
import { Sheet } from './budget/ui';
import { GoldButton } from './brand/Buttons';
import { dateLocale } from '../lib/i18n';
import { colors, radius, spacing } from '../theme';

export interface TicketMessage {
  id: string;
  is_admin: boolean;
  body: string;
  created_at: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Quién escribió el ticket (solo lo ve el administrador). */
  subtitle?: string;
  resolved: boolean;
  loadMessages: () => Promise<TicketMessage[]>;
  send: (body: string) => Promise<{ error: string | null }>;
  /** Acción extra, por ejemplo "Marcar resuelto" para el administrador. */
  onResolve?: () => Promise<void>;
  /** Cómo se nombra a quien escribe a la derecha (la persona o el administrador). */
  mineIsAdmin: boolean;
}

// Conversación de un ticket de soporte: mensajes en burbujas y una caja para responder.
export function TicketThread({ visible, onClose, title, subtitle, resolved, loadMessages, send, onResolve, mineIsAdmin }: Props) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scroller = useRef<ScrollView>(null);

  const reload = useCallback(async () => {
    setMessages(await loadMessages());
    setLoading(false);
    setTimeout(() => scroller.current?.scrollToEnd({ animated: false }), 50);
  }, [loadMessages]);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setText('');
    reload();
  }, [visible, reload]);

  async function submit() {
    if (!text.trim()) return;
    setSending(true);
    const { error } = await send(text.trim());
    setSending(false);
    if (error) return Alert.alert('No se pudo enviar', error);
    setText('');
    await reload();
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      <View style={[styles.badge, resolved ? styles.badgeOk : styles.badgeOpen]}>
        <Text style={[styles.badgeText, { color: resolved ? colors.green : colors.rust }]}>{resolved ? 'Resuelto' : 'Abierto'}</Text>
      </View>

      <ScrollView ref={scroller} style={styles.list} contentContainerStyle={{ gap: spacing.sm }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={colors.gold} />
        ) : (
          messages.map((m) => {
            const mine = m.is_admin === mineIsAdmin;
            return (
              <View key={m.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text style={styles.who}>{m.is_admin ? 'Soporte Salomón' : 'Usuario'}</Text>
                <Text style={styles.body}>{m.body}</Text>
                <Text style={styles.time}>
                  {new Date(m.created_at).toLocaleString(dateLocale(), { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Escribe tu mensaje…"
        placeholderTextColor={colors.onDarkMuted}
        multiline
        maxLength={2000}
        accessibilityLabel="Mensaje"
      />
      <GoldButton label="Enviar" onPress={submit} loading={sending} disabled={!text.trim()} />
      {onResolve && !resolved && (
        <Pressable onPress={onResolve} style={styles.resolve} accessibilityLabel="Marcar el ticket como resuelto">
          <Text style={styles.resolveText}>Marcar como resuelto</Text>
        </Pressable>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 12.5, color: colors.onDarkMuted },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, borderWidth: 1 },
  badgeOpen: { backgroundColor: 'rgba(255,143,122,0.12)', borderColor: 'rgba(255,143,122,0.5)' },
  badgeOk: { backgroundColor: 'rgba(123,224,176,0.12)', borderColor: 'rgba(123,224,176,0.5)' },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  list: { maxHeight: 320 },
  bubble: { padding: spacing.md, borderRadius: radius.md, maxWidth: '88%', gap: 3 },
  mine: { alignSelf: 'flex-end', backgroundColor: 'rgba(226,190,75,0.18)', borderWidth: 1, borderColor: colors.goldBorder },
  theirs: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: colors.glassBorder },
  who: { fontSize: 10.5, fontWeight: '700', color: colors.gold, letterSpacing: 0.5 },
  body: { fontSize: 14, color: colors.onDark, lineHeight: 20 },
  time: { fontSize: 10.5, color: colors.onDarkMuted },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, color: colors.onDark, minHeight: 64, textAlignVertical: 'top',
  },
  resolve: { alignItems: 'center', paddingVertical: 8 },
  resolveText: { fontSize: 13, fontWeight: '700', color: colors.green },
});
