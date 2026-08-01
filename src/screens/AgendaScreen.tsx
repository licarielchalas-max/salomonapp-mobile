import React, { useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthProvider';
import { useHouseholdCollection } from '../hooks/useHouseholdCollection';
import { todayISO } from '../utils/date';

export function AgendaScreen() {
  const { householdId } = useAuth();
  const { rows: eventos, add, remove } = useHouseholdCollection('calendar_events', householdId, {
    column: 'event_date',
    ascending: true,
  });

  const [titulo, setTitulo] = useState('');
  const [fecha, setFecha] = useState(todayISO());
  const [showDatePicker, setShowDatePicker] = useState(false);

  async function handleAgregar() {
    if (!titulo.trim()) return;
    await add({ household_id: householdId!, titulo: titulo.trim(), event_date: fecha });
    setTitulo('');
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.formTitle}>Nueva cita</Text>
        <TextInput style={styles.input} placeholder="Ej: Cita con el banco" value={titulo} onChangeText={setTitulo} />
        <Pressable style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text>{fecha}</Text>
        </Pressable>
        {showDatePicker ? (
          <DateTimePicker
            value={new Date(fecha)}
            mode="date"
            onChange={(_event, date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (date) setFecha(date.toISOString().slice(0, 10));
            }}
          />
        ) : null}
        <Pressable style={styles.submitBtn} onPress={handleAgregar}>
          <Text style={styles.submitBtnText}>+ Agendar</Text>
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={{ padding: 16, gap: 8 }}
        data={eventos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitulo}>{item.titulo}</Text>
              <Text style={styles.rowFecha}>
                {item.event_date} {item.event_time ?? ''}
              </Text>
            </View>
            <Pressable onPress={() => remove(item.id)}>
              <Text style={{ color: '#6E6E68' }}>✕</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Sin eventos próximos.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF8EE' },
  form: { padding: 16, gap: 10, backgroundColor: '#fff', margin: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E1DCC8' },
  formTitle: { fontWeight: '700', fontSize: 13.5 },
  input: { borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 9, padding: 10, fontSize: 14, backgroundColor: '#FCFBF8' },
  submitBtn: { backgroundColor: '#0F5132', borderRadius: 10, padding: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 10, padding: 12 },
  rowTitulo: { fontWeight: '600', fontSize: 13.5 },
  rowFecha: { fontSize: 11.5, color: '#6E6E68', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#6E6E68', marginTop: 20 },
});
