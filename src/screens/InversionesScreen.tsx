import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { TextInput } from '../components/AppTextInput';
import { Text } from '../components/AppText';
import { Sheet } from '../components/budget/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthProvider';
import { useInvestments } from '../hooks/useInvestments';
import { useAccounts } from '../hooks/useAccounts';
import { AccountPicker } from '../components/AccountPicker';
import { fmtMoney, fundingFor, fundsErrorBase, type AccountRef } from '../lib/money';
import { colors, spacing, radius, shadow, glass } from '../theme';
import type { InvestmentType } from '../types/db';

function fmt(n: number) {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

const TIPOS: { key: InvestmentType; label: string; icon: string }[] = [
  { key: 'acciones', label: 'Acciones', icon: '📈' },
  { key: 'bonos', label: 'Bonos', icon: '📜' },
  { key: 'certificado', label: 'CD / Certificado', icon: '🏦' },
  { key: 'fondo', label: 'Fondo Mutuo', icon: '🧺' },
  { key: 'cripto', label: 'Cripto', icon: '🪙' },
  { key: 'inmueble', label: 'Inmueble', icon: '🏠' },
  { key: 'otro', label: 'Otro', icon: '💼' },
];

function tipoColor(tipo: InvestmentType) {
  const map: Record<InvestmentType, string> = {
    acciones: 'rgba(226,190,75,0.14)', bonos: 'rgba(226,190,75,0.14)', certificado: 'rgba(226,190,75,0.14)',
    fondo: 'rgba(226,190,75,0.14)', cripto: 'rgba(226,190,75,0.14)', inmueble: 'rgba(226,190,75,0.14)', otro: colors.cream,
  };
  return map[tipo];
}

export function InversionesScreen() {
  const { householdId } = useAuth();
  const { investments, loading, totalInvertido, totalActual, ganancia, rendimiento, addInvestment, updateInvestment, updatePrice, deleteInvestment } = useInvestments(householdId);

  const { accounts, find: findAccount, reload: reloadAccounts } = useAccounts(householdId);
  const [account, setAccount] = useState<AccountRef | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState('');

  const [tipo, setTipo] = useState<InvestmentType>('acciones');
  const [nombre, setNombre] = useState('');
  const [simbolo, setSimbolo] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [precioCompra, setPrecioCompra] = useState('');
  const [fechaCompra, setFechaCompra] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [institucion, setInstitucion] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingInvId, setEditingInvId] = useState<string | null>(null);

  function openNewInv() {
    setEditingInvId(null);
    setAccount(null);
    setNombre(''); setSimbolo(''); setCantidad(''); setPrecioCompra(''); setInstitucion(''); setTipo('acciones');
    setShowModal(true);
  }

  function openEditInv(inv: (typeof investments)[number]) {
    setEditingInvId(inv.id);
    setTipo(inv.tipo);
    setNombre(inv.nombre);
    setSimbolo(inv.simbolo ?? '');
    setCantidad(String(inv.cantidad));
    setPrecioCompra(String(inv.precio_compra));
    setFechaCompra(inv.fecha_compra);
    setInstitucion(inv.institucion ?? '');
    setShowModal(true);
  }

  async function handleAdd() {
    const cantidadVal = parseFloat(cantidad.replace(',', '.'));
    const precioVal = parseFloat(precioCompra.replace(',', '.'));
    if (!nombre.trim() || !cantidadVal || !precioVal) {
      return Alert.alert('Datos incompletos', 'Ingresa nombre, cantidad y precio de compra.');
    }
    if (editingInvId) {
      setSaving(true);
      const { error } = await updateInvestment(editingInvId, {
        tipo, nombre: nombre.trim(), simbolo: simbolo || null, cantidad: cantidadVal, precio_compra: precioVal, fecha_compra: fechaCompra, institucion: institucion || null,
      });
      setSaving(false);
      if (error) return Alert.alert('No se pudo guardar', error);
      reloadAccounts();
      setShowModal(false);
      setEditingInvId(null);
      return;
    }
    if (!account) return Alert.alert('Elige una cuenta', 'Indica de qué cuenta sale el dinero de la compra.');
    const noFunds = fundsErrorBase(findAccount(account), cantidadVal * precioVal);
    if (noFunds) return Alert.alert('Sin fondos', noFunds);
    setSaving(true);
    const { error } = await addInvestment({ tipo, nombre: nombre.trim(), simbolo: simbolo || null, cantidad: cantidadVal, precio_compra: precioVal, fecha_compra: fechaCompra, institucion: institucion || null }, account, fundingFor(findAccount(account), cantidadVal * precioVal));
    setSaving(false);
    if (error) Alert.alert('No se pudo registrar', error);
    else { reloadAccounts(); setAccount(null); setShowModal(false); setNombre(''); setSimbolo(''); setCantidad(''); setPrecioCompra(''); setInstitucion(''); setTipo('acciones'); }
  }

  async function handleUpdatePrice() {
    if (!editingId) return;
    const val = parseFloat(newPrice.replace(',', '.'));
    if (!val) return Alert.alert('Precio inválido', 'Ingresa un precio mayor a 0.');
    await updatePrice(editingId, val);
    setShowPriceModal(false);
    setNewPrice('');
    setEditingId(null);
  }

  function confirmDelete(id: string, nombre: string) {
    Alert.alert('Eliminar inversión', `¿Eliminar "${nombre}"? Si la pagaste desde una cuenta, el dinero de la compra vuelve a esa cuenta.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteInvestment(id); reloadAccounts(); } },
    ]);
  }

  const tipoInfo = (t: InvestmentType) => TIPOS.find((x) => x.key === t) ?? TIPOS[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[colors.bgDeep, colors.bg]} locations={[0, 0.4]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Hero summary */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>PORTAFOLIO TOTAL</Text>
          {loading ? <ActivityIndicator color={colors.gold} /> : (
            <>
              <Text style={styles.heroValue}>¤{fmt(totalActual)}</Text>
              <View style={styles.heroRow}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Invertido</Text>
                  <Text style={styles.heroStatValue}>¤{fmt(totalInvertido)}</Text>
                </View>
                <View style={styles.heroSep} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Ganancia</Text>
                  <Text style={[styles.heroStatValue, { color: ganancia >= 0 ? colors.gold : colors.rust }]}>
                    {ganancia >= 0 ? '+' : ''}¤{fmt(Math.abs(ganancia))}
                  </Text>
                </View>
                <View style={styles.heroSep} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Rendimiento</Text>
                  <Text style={[styles.heroStatValue, { color: rendimiento >= 0 ? colors.gold : colors.rust }]}>
                    {pct(rendimiento)}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* By type summary */}
        {investments.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>POR TIPO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {TIPOS.filter((t) => investments.some((i) => i.tipo === t.key)).map((t) => {
                  const group = investments.filter((i) => i.tipo === t.key);
                  const val = group.reduce((a, i) => a + Number(i.cantidad) * Number(i.precio_actual), 0);
                  return (
                    <View key={t.key} style={[styles.typePill, { backgroundColor: tipoColor(t.key) }]}>
                      <Text style={styles.typePillIcon}>{t.icon}</Text>
                      <Text style={styles.typePillLabel}>{t.label}</Text>
                      <Text style={styles.typePillValue}>¤{fmt(val)}</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </>
        )}

        <Text style={styles.sectionTitle}>MIS INVERSIONES</Text>

        {loading ? (
          <ActivityIndicator color={colors.navy} style={{ marginTop: 24 }} />
        ) : investments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>Sin inversiones registradas</Text>
            <Text style={styles.emptyDesc}>Registra acciones, bonos, certificados, fondos, cripto o inmuebles para hacer seguimiento de tu portafolio</Text>
          </View>
        ) : (
          investments.map((inv) => {
            const ti = tipoInfo(inv.tipo);
            const valorCompra = Number(inv.cantidad) * Number(inv.precio_compra);
            const valorActual = Number(inv.cantidad) * Number(inv.precio_actual);
            const gana = valorActual - valorCompra;
            const rend = valorCompra > 0 ? (gana / valorCompra) * 100 : 0;
            return (
              <View key={inv.id} style={[styles.invCard, { borderLeftColor: rend >= 0 ? colors.green : colors.rust }]}>
                <View style={styles.invHeader}>
                  <View style={[styles.invIconWrap, { backgroundColor: tipoColor(inv.tipo) }]}>
                    <Text style={styles.invIcon}>{ti.icon}</Text>
                  </View>
                  <View style={styles.invInfo}>
                    <Text style={styles.invNombre}>{inv.nombre}</Text>
                    {inv.simbolo && <Text style={styles.invSimbolo}>{inv.simbolo}</Text>}
                    <Text style={styles.invMeta}>{ti.label}{inv.institucion ? ` · ${inv.institucion}` : ''}</Text>
                  </View>
                  <View style={styles.invValueWrap}>
                    <Text style={styles.invValorActual}>¤{fmt(valorActual)}</Text>
                    <Text style={[styles.invRend, { color: rend >= 0 ? colors.green : colors.rust }]}>{pct(rend)}</Text>
                  </View>
                </View>
                <View style={styles.invStats}>
                  <View style={styles.invStat}>
                    <Text style={styles.invStatLabel}>Cantidad</Text>
                    <Text style={styles.invStatValue}>{Number(inv.cantidad).toLocaleString('es-DO')}</Text>
                  </View>
                  <View style={styles.invStat}>
                    <Text style={styles.invStatLabel}>P. Compra</Text>
                    <Text style={styles.invStatValue}>¤{fmt(Number(inv.precio_compra))}</Text>
                  </View>
                  <View style={styles.invStat}>
                    <Text style={styles.invStatLabel}>P. Actual</Text>
                    <Text style={styles.invStatValue}>¤{fmt(Number(inv.precio_actual))}</Text>
                  </View>
                  <View style={styles.invStat}>
                    <Text style={styles.invStatLabel}>Ganancia</Text>
                    <Text style={[styles.invStatValue, { color: gana >= 0 ? colors.green : colors.rust }]}>
                      {gana >= 0 ? '+' : ''}¤{fmt(Math.abs(gana))}
                    </Text>
                  </View>
                </View>
                <View style={styles.invActions}>
                  <Pressable style={styles.updateBtn} onPress={() => { setEditingId(inv.id); setNewPrice(String(inv.precio_actual)); setShowPriceModal(true); }}>
                    <Text style={styles.updateBtnText}>Actualizar precio</Text>
                  </Pressable>
                  <Pressable onPress={() => openEditInv(inv)} accessibilityLabel={`Editar ${inv.nombre}`}>
                    <Text style={styles.editText}>Editar</Text>
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(inv.id, inv.nombre)}>
                    <Text style={styles.deleteText}>Eliminar</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        <Pressable style={styles.addBtn} onPress={openNewInv}>
          <Text style={styles.addBtnText}>+ Nueva Inversión</Text>
        </Pressable>
      </ScrollView>

      {/* Add Investment Modal */}
      <Sheet visible={showModal} onClose={() => setShowModal(false)} title={editingInvId ? 'Editar inversión' : 'Nueva inversión'}>
<Text style={styles.modalLabel}>TIPO DE INSTRUMENTO</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {TIPOS.map((t) => (
                    <Pressable key={t.key} style={[styles.tipoChip, tipo === t.key && styles.tipoChipActive]} onPress={() => setTipo(t.key)}>
                      <Text style={styles.tipoChipIcon}>{t.icon}</Text>
                      <Text style={[styles.tipoChipText, tipo === t.key && styles.tipoChipTextActive]}>{t.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.modalLabel}>NOMBRE</Text>
              <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Ej: Apple Inc, BPD CD, Bitcoin..." placeholderTextColor={colors.muted} />

              <Text style={styles.modalLabel}>SÍMBOLO (opcional)</Text>
              <TextInput style={styles.input} value={simbolo} onChangeText={setSimbolo} placeholder="Ej: AAPL, BTC, SPY..." placeholderTextColor={colors.muted} autoCapitalize="characters" />

              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>CANTIDAD / UNIDADES</Text>
                  <TextInput style={styles.input} value={cantidad} onChangeText={setCantidad} placeholder="0" placeholderTextColor={colors.muted} keyboardType="decimal-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>PRECIO COMPRA (¤)</Text>
                  <TextInput style={styles.input} value={precioCompra} onChangeText={setPrecioCompra} placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" />
                </View>
              </View>

              <Text style={styles.modalLabel}>FECHA DE COMPRA</Text>
              <TextInput style={styles.input} value={fechaCompra} onChangeText={setFechaCompra} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} />

              <Text style={styles.modalLabel}>INSTITUCIÓN (opcional)</Text>
              <TextInput style={styles.input} value={institucion} onChangeText={setInstitucion} placeholder="Ej: E*TRADE, Banco Popular, Binance..." placeholderTextColor={colors.muted} />

              {editingInvId ? (
                <Text style={styles.modalLabel}>La cuenta con la que pagaste no se cambia al editar. Si cambias cantidad o precio, el pago se recalcula en esa cuenta.</Text>
              ) : (
              <View style={{ marginTop: spacing.md }}>
                <AccountPicker
                  accounts={accounts}
                  value={account}
                  onChange={setAccount}
                  amount={(parseFloat(cantidad.replace(',', '.')) || 0) * (parseFloat(precioCompra.replace(',', '.')) || 0)}
                  amountBase
                  label="¿De qué cuenta sale el dinero de la compra?"
                />
              </View>
              )}

              <Pressable style={styles.saveBtn} onPress={handleAdd} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{editingInvId ? 'Guardar cambios' : 'Registrar Inversión'}</Text>}
              </Pressable>
      </Sheet>

      {/* Update Price Modal */}
      <Sheet visible={showPriceModal} onClose={() => setShowPriceModal(false)} title="Actualizar Precio">
<Text style={styles.modalLabel}>PRECIO ACTUAL (¤)</Text>
            <TextInput style={styles.input} value={newPrice} onChangeText={setNewPrice} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.muted} autoFocus />
            <Pressable style={styles.saveBtn} onPress={handleUpdatePrice}>
              <Text style={styles.saveBtnText}>Guardar</Text>
            </Pressable>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 130 },
  heroCard: { backgroundColor: colors.bgDeep, borderRadius: radius.lg, padding: spacing.xl, marginBottom: spacing.lg, ...shadow.hero },
  heroLabel: { fontSize: 10, fontWeight: '700', color: colors.gold, letterSpacing: 1.4, marginBottom: spacing.sm },
  heroValue: { fontSize: 30, fontWeight: '800', color: colors.onDark, letterSpacing: -1, marginBottom: spacing.md },
  heroRow: { flexDirection: 'row' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroSep: { width: 1, backgroundColor: 'rgba(0,0,0,0.10)' },
  heroStatLabel: { fontSize: 10, color: colors.onDarkMuted, marginBottom: 4 },
  heroStatValue: { fontSize: 13, fontWeight: '700', color: colors.onDark },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2, marginBottom: spacing.md },
  typePill: { borderRadius: radius.md, padding: spacing.md, alignItems: 'center', minWidth: 90, gap: 4 },
  typePillIcon: { fontSize: 20 },
  typePillLabel: { fontSize: 10, fontWeight: '600', color: colors.onDarkMuted },
  typePillValue: { fontSize: 12, fontWeight: '700', color: colors.gold },
  emptyCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.xxl, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder, gap: spacing.sm, marginBottom: spacing.lg },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.gold },
  emptyDesc: { fontSize: 13, color: colors.onDarkMuted, textAlign: 'center', lineHeight: 20 },
  invCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.glassBorder, borderLeftWidth: 4, ...shadow.card },
  invHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  invIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  invIcon: { fontSize: 22 },
  invInfo: { flex: 1 },
  invNombre: { fontSize: 14, fontWeight: '700', color: colors.onDark, marginBottom: 2 },
  invSimbolo: { fontSize: 12, fontWeight: '600', color: colors.gold, marginBottom: 2 },
  invMeta: { fontSize: 11, color: colors.onDarkMuted },
  invValueWrap: { alignItems: 'flex-end' },
  invValorActual: { fontSize: 16, fontWeight: '700', color: colors.gold },
  invRend: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  invStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.glassBorder, paddingTop: spacing.md, marginBottom: spacing.sm },
  invStat: { flex: 1, alignItems: 'center' },
  invStatLabel: { fontSize: 10, color: colors.onDarkMuted, marginBottom: 3 },
  invStatValue: { fontSize: 12, fontWeight: '700', color: colors.onDark },
  invActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.glassBorder, paddingTop: spacing.sm },
  updateBtn: { backgroundColor: colors.greenSoft, borderRadius: radius.sm, paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.greenBorder },
  editText: { fontSize: 12.5, fontWeight: '700', color: colors.gold },
  updateBtnText: { fontSize: 12, fontWeight: '700', color: colors.green },
  deleteText: { fontSize: 12, color: colors.onDarkMuted },
  addBtn: { backgroundColor: colors.bgDeep, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', marginTop: spacing.sm },
  addBtnText: { fontSize: 15, fontWeight: '700', color: colors.onDark },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xxl, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.gold, marginBottom: spacing.md },
  modalLabel: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2, marginBottom: 6 },
  input: { backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: spacing.md, paddingVertical: 13, fontSize: 14, color: colors.onDark, marginBottom: spacing.md },
  inputRow: { flexDirection: 'row', gap: spacing.sm },
  tipoChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.bg, alignItems: 'center', gap: 4 },
  tipoChipActive: { backgroundColor: colors.bgDeep, borderColor: colors.navy },
  tipoChipIcon: { fontSize: 16 },
  tipoChipText: { fontSize: 11, fontWeight: '600', color: colors.onDarkMuted },
  tipoChipTextActive: { color: colors.onDark },
  saveBtn: { backgroundColor: colors.bgDeep, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', marginTop: spacing.sm },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.onDark },
});
