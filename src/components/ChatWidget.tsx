import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useChat } from '../hooks/useChat';
import { useHouseholdSettings } from '../hooks/useHouseholdSettings';

export function ChatWidget() {
  const { nombreUsuario } = useHouseholdSettings();
  const { messages, loading, sendMessage, saludo } = useChat(nombreUsuario);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await sendMessage(text);
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {open ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Rey Salomón</Text>
            <Pressable onPress={() => setOpen(false)}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.messages} contentContainerStyle={{ gap: 8, padding: 12 }}>
            <View style={[styles.bubble, styles.bubbleAssistant]}>
              <Text style={styles.bubbleTextAssistant}>{saludo}</Text>
            </View>
            {messages.map((m) => (
              <View key={m.id} style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
                <Text style={m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant}>{m.content}</Text>
              </View>
            ))}
            {loading ? (
              <View style={[styles.bubble, styles.bubbleAssistant]}>
                <Text style={styles.bubbleTextAssistant}>Reflexionando…</Text>
              </View>
            ) : null}
          </ScrollView>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Escríbele al Rey Salomón..."
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
            />
            <Pressable style={styles.sendBtn} onPress={handleSend} disabled={loading}>
              <Text style={styles.sendBtnText}>{loading ? '…' : 'Enviar'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      ) : null}
      <Pressable style={styles.fab} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.fabIcon}>♛</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', right: 16, bottom: 16, alignItems: 'flex-end' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0F5132',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    elevation: 4,
  },
  fabIcon: { color: '#E8CD7A', fontSize: 22 },
  panel: {
    width: 320,
    height: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E1DCC8',
    overflow: 'hidden',
  },
  header: { backgroundColor: '#0F5132', padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerText: { color: '#fff', fontWeight: '700' },
  closeText: { color: '#E8CD7A', fontSize: 16 },
  messages: { flex: 1 },
  bubble: { maxWidth: '80%', padding: 10, borderRadius: 12 },
  bubbleUser: { backgroundColor: '#0F5132', alignSelf: 'flex-end' },
  bubbleAssistant: { backgroundColor: '#FCFBF8', borderWidth: 1, borderColor: '#E1DCC8', alignSelf: 'flex-start' },
  bubbleTextUser: { color: '#fff', fontSize: 13 },
  bubbleTextAssistant: { color: '#2C2C2C', fontSize: 13 },
  inputRow: { flexDirection: 'row', gap: 6, padding: 10, borderTopWidth: 1, borderTopColor: '#E1DCC8' },
  input: { flex: 1, borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 9, padding: 9, fontSize: 13.5, backgroundColor: '#FCFBF8' },
  sendBtn: { backgroundColor: '#0F5132', borderRadius: 9, paddingHorizontal: 14, justifyContent: 'center' },
  sendBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
