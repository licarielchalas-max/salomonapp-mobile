import React, { useState } from 'react';
import { FlatList, Linking, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../context/AuthProvider';
import { useHouseholdCollection } from '../hooks/useHouseholdCollection';
import { useHouseholdSettings } from '../hooks/useHouseholdSettings';
import { referralCodeFor } from '../utils/referral';

export function ReferidosScreen() {
  const { householdId } = useAuth();
  const { rows: referidos, add, update } = useHouseholdCollection('referrals', householdId, {
    column: 'created_at',
    ascending: false,
  });
  const { nombreUsuario } = useHouseholdSettings();
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [copiado, setCopiado] = useState(false);

  const code = referralCodeFor(nombreUsuario);
  const link = `https://salomon.app/r/${code}`;
  const activos = referidos.filter((r) => r.status === 'activo').length;
  const descuentoPct = Math.min(activos * 5, 50);

  async function handleAgregar() {
    if (!nombreNuevo.trim()) return;
    await add({ household_id: householdId!, referred_name: nombreNuevo.trim() });
    setNombreNuevo('');
  }

  async function handleCopiar() {
    await Clipboard.setStringAsync(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function handleWhatsapp() {
    const msg = `Únete a Salomon y organiza tus finanzas con sabiduría. Usa mi código ${code}: ${link}`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  }

  function handleCompartir() {
    Share.share({ message: `Únete a Salomon con mi código ${code}: ${link}` });
  }

  return (
    <View style={styles.container}>
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Tu código de referido</Text>
        <Text style={styles.codeValue}>{code}</Text>
        <Text style={styles.discountLabel}>Descuento actual: {descuentoPct}%</Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.actionBtn} onPress={handleCopiar}>
          <Text style={styles.actionBtnText}>{copiado ? '✓ Copiado' : 'Copiar enlace'}</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, { backgroundColor: '#25D366' }]} onPress={handleWhatsapp}>
          <Text style={[styles.actionBtnText, { color: '#fff' }]}>WhatsApp</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={handleCompartir}>
          <Text style={styles.actionBtnText}>Compartir</Text>
        </Pressable>
      </View>

      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Nombre del referido" value={nombreNuevo} onChangeText={setNombreNuevo} />
        <Pressable style={styles.submitBtn} onPress={handleAgregar}>
          <Text style={styles.submitBtnText}>+ Enviar invitación</Text>
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={{ padding: 16, gap: 8 }}
        data={referidos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowNombre}>{item.referred_name}</Text>
            {item.status === 'pendiente' ? (
              <Pressable style={styles.activarBtn} onPress={() => update(item.id, { status: 'activo' })}>
                <Text style={styles.activarBtnText}>Marcar activo</Text>
              </Pressable>
            ) : (
              <Text style={styles.activoLabel}>✓ Activo (-5%)</Text>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Sin referidos todavía.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF8EE' },
  codeCard: { backgroundColor: '#0F5132', borderRadius: 14, padding: 20, margin: 16, marginBottom: 12 },
  codeLabel: { color: '#B9D2C2', fontSize: 12, fontWeight: '600' },
  codeValue: { color: '#E8CD7A', fontSize: 24, fontWeight: '700', marginTop: 4 },
  discountLabel: { color: '#fff', fontSize: 12.5, marginTop: 8 },
  actionsRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginBottom: 12 },
  actionBtn: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 9, padding: 10, alignItems: 'center' },
  actionBtnText: { color: '#0F5132', fontWeight: '600', fontSize: 12.5 },
  form: { padding: 16, gap: 10, backgroundColor: '#fff', margin: 16, marginTop: 0, borderRadius: 14, borderWidth: 1, borderColor: '#E1DCC8' },
  input: { borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 9, padding: 10, fontSize: 14, backgroundColor: '#FCFBF8' },
  submitBtn: { backgroundColor: '#0F5132', borderRadius: 10, padding: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E1DCC8',
    borderRadius: 10,
    padding: 12,
  },
  rowNombre: { fontSize: 13.5, fontWeight: '600' },
  activarBtn: { borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 7, paddingVertical: 5, paddingHorizontal: 10 },
  activarBtnText: { fontSize: 11.5, fontWeight: '600' },
  activoLabel: { fontSize: 11.5, fontWeight: '600', color: '#2F6F52' },
  emptyText: { textAlign: 'center', color: '#6E6E68', marginTop: 20 },
});
