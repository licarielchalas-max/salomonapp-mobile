import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { TextInput } from '../components/AppTextInput';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '../context/AuthProvider';
import { useMonthlyTransactions } from '../hooks/useMonthlyTransactions';
import { useCategories } from '../hooks/useCategories';
import { useAccounts } from '../hooks/useAccounts';
import { useBudgets } from '../hooks/useBudgets';
import { AccountPicker } from '../components/AccountPicker';
import { INCOME_SOURCES, accountCurrency, accountMoney, baseCash, fmtMoney, fundsError, monedaFor, refFromDb, toDb, type AccountRef } from '../lib/money';
import { applyBaseSymbol, baseCurrency, formatCurrency } from '../lib/currency';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius, shadow, glass } from '../theme';
import * as ImagePicker from 'expo-image-picker';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useProfiles } from '../hooks/useProfiles';
import { uploadAttachment } from '../lib/attachments';
import type { TransactionKind, PaymentMethod, TransactionNaturaleza } from '../types/db';
import { dateLocale } from '../lib/i18n';


// DateTimePicker only available on native
let NativeDatePicker: React.ComponentType<any> | null = null;
if (Platform.OS !== 'web') {
  NativeDatePicker = require('@react-native-community/datetimepicker').default;
}

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddTransaction'>;
  route: RouteProp<RootStackParamList, 'AddTransaction'>;
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(d: Date) {
  return d.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
}

export function AddTransactionScreen({ navigation, route }: Props) {
  const { householdId, memberId } = useAuth();
  const { addTransaction, updateTransaction } = useMonthlyTransactions(householdId);
  const editingId = route.params?.transactionId ?? null;
  const [editBudget, setEditBudget] = useState(false);
  const { categories } = useCategories();
  const { accounts: balances, find: findAccount, reload: reloadAccounts } = useAccounts(householdId);
  const { budgets } = useBudgets(householdId);

  const [kind, setKind] = useState<TransactionKind>(route.params?.defaultKind ?? 'gasto');
  const [amount, setAmount] = useState(route.params?.prefill?.monto ? String(route.params.prefill.monto) : '');
  const [description, setDescription] = useState(route.params?.prefill?.descripcion ?? '');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountRef | null>(baseCash());
  const [bankMedio, setBankMedio] = useState<PaymentMethod>('transferencia');
  const [incomeSource, setIncomeSource] = useState<string | null>(null);
  const [budgetId, setBudgetId] = useState<string | null>(route.params?.budgetId ?? null);
  const [naturaleza, setNaturaleza] = useState<TransactionNaturaleza>('variable');
  const [saving, setSaving] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(memberId);
  const { members } = useProfiles();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const isRecording = recorderState.isRecording;

  async function pickReceipt() {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para adjuntar fotos de recibos.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: Platform.OS !== 'web',
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  }

  async function takeReceiptPhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara para fotografiar recibos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  }

  async function startRecording() {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso al micrófono para grabar notas de voz.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setVoiceUri(null);
    } catch {
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      Alert.alert('Error', 'No se pudo iniciar la grabación.');
    }
  }

  async function stopRecording() {
    try {
      await recorder.stop();
      setVoiceSeconds(Math.round((recorderState.durationMillis ?? 0) / 1000));
      setVoiceUri(recorder.uri);
    } catch {
      Alert.alert('Error', 'No se pudo guardar la grabación. Inténtalo de nuevo.');
    } finally {
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    }
  }

  // Editar un movimiento existente: se cargan sus datos y se guardan los cambios.
  useEffect(() => {
    if (!editingId) return;
    navigation.setOptions({ title: 'Editar movimiento' });
    let cancelled = false;
    supabase
      .from('transactions')
      .select('*')
      .eq('id', editingId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const tx = data as unknown as import('../types/db').TransactionRow;
        setKind(tx.kind);
        setAmount(String(tx.monto));
        setDescription(tx.descripcion);
        setDate(new Date(`${tx.occurred_on}T12:00:00`));
        setCategoryId(tx.category_id);
        if (tx.naturaleza) setNaturaleza(tx.naturaleza);
        setIncomeSource(tx.income_source);
        setEditBudget(!!tx.budget_id);
        const ref = refFromDb(tx.medio, tx.bank_account_id, tx.moneda);
        if (ref) setAccount(ref);
        if (tx.medio === 'tarjeta') setBankMedio('tarjeta');
      });
    return () => { cancelled = true; };
  }, [editingId]);

  const isGasto = kind === 'gasto';
  // Moneda del monto: la de la cuenta elegida; pagando desde un presupuesto, la moneda base.
  const paysFromBudget = (isGasto && !!budgetId) || editBudget;
  const entryCurrency = paysFromBudget || !account ? baseCurrency() : account.kind === 'efectivo' ? account.moneda : accountCurrency(findAccount(account));
  const accentColor = isGasto ? colors.rust : colors.green;

  const dateStr = todayStr().slice(0, 8) + String(date.getDate()).padStart(2, '0');
  const occurred = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  async function handleSave() {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!parsed || parsed <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto mayor a 0.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Descripción requerida', 'Agrega una descripción breve.');
      return;
    }
    if (!householdId) {
      Alert.alert('Sin sesión', 'Inicia sesión para registrar transacciones.');
      return;
    }
    if (!isGasto && !incomeSource) {
      Alert.alert('¿De dónde viene el ingreso?', 'Elige el origen: nómina, servicio prestado, negocio, etc.');
      return;
    }
    if (editingId) {
      setSaving(true);
      const { error: updError } = await updateTransaction(editingId, {
        monto: parsed,
        descripcion: description.trim(),
        occurred_on: occurred,
        category_id: categoryId,
        naturaleza: isGasto ? naturaleza : null,
        income_source: isGasto ? null : incomeSource,
        ...(editBudget ? {} : { ...toDb(account ?? baseCash(), bankMedio), ...monedaFor(account ?? baseCash()) }),
      });
      setSaving(false);
      if (updError) {
        Alert.alert('No se pudo guardar', updError);
      } else {
        await reloadAccounts();
        navigation.goBack();
      }
      return;
    }
    const chosenBudget = isGasto && budgetId ? budgets.find((b) => b.id === budgetId) : undefined;
    if (isGasto) {
      if (chosenBudget) {
        if (parsed > chosenBudget.disponible + 0.0001) {
          Alert.alert(
            'Sin fondos en el presupuesto',
            applyBaseSymbol(`El presupuesto "${chosenBudget.nombre}" tiene ¤ ${fmtMoney(Math.max(chosenBudget.disponible, 0))} disponibles. Abona más dinero o paga desde una cuenta.`),
          );
          return;
        }
      } else {
        if (!account) {
          Alert.alert('Elige una cuenta', 'Indica de qué cuenta sale el dinero.');
          return;
        }
        const noFunds = fundsError(findAccount(account), parsed);
        if (noFunds) {
          Alert.alert('Sin fondos', noFunds);
          return;
        }
      }
    } else if (!account) {
      Alert.alert('Elige una cuenta', 'Indica en qué cuenta entra el dinero.');
      return;
    }
    setSaving(true);

    let receiptPath: string | null = null;
    let voicePath: string | null = null;
    if (receiptUri) {
      const up = await uploadAttachment(householdId, receiptUri, 'receipt');
      if (up.error) {
        setSaving(false);
        Alert.alert('No se pudo subir la foto del recibo', `${up.error}\nNo se guardó el registro; inténtalo de nuevo o quita la foto.`);
        return;
      }
      receiptPath = up.path;
    }
    if (voiceUri) {
      const up = await uploadAttachment(householdId, voiceUri, 'voice');
      if (up.error) {
        setSaving(false);
        Alert.alert('No se pudo subir la nota de voz', `${up.error}\nNo se guardó el registro; inténtalo de nuevo o quítala.`);
        return;
      }
      voicePath = up.path;
    }

    const { error } = await addTransaction({
      kind,
      monto: parsed,
      descripcion: description.trim(),
      occurred_on: occurred,
      ...(chosenBudget ? { budget_id: chosenBudget.id } : { ...toDb(account ?? baseCash(), bankMedio), ...monedaFor(account ?? baseCash()) }),
      income_source: isGasto ? null : incomeSource,
      category_id: categoryId,
      naturaleza,
      member_id: selectedMemberId ?? memberId,
      receipt_path: receiptPath,
      voice_path: voicePath,
    });
    setSaving(false);
    if (error) {
      Alert.alert('No se pudo guardar', error);
    } else {
      await reloadAccounts();
      navigation.goBack();
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Kind toggle */}
        <View style={[styles.kindRow, !!editingId && { display: 'none' }]}>
          {(['gasto', 'ingreso'] as TransactionKind[]).map((k) => {
            const active = kind === k;
            const bg = active ? (k === 'gasto' ? colors.rust : colors.green) : colors.paper;
            return (
              <Pressable
                key={k}
                style={[styles.kindBtn, { backgroundColor: bg, borderColor: k === 'gasto' ? colors.rust : colors.green }]}
                onPress={() => setKind(k)}
              >
                <Text style={[styles.kindText, { color: active ? colors.onNavy : k === 'gasto' ? colors.rust : colors.green }]}>
                  {k === 'gasto' ? '↑ Gasto' : '↓ Ingreso'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Amount display */}
        <View style={[styles.amountCard, { borderColor: accentColor }]}>
          <Text style={[styles.amountSign, { color: accentColor }]}>{isGasto ? '-' : '+'}</Text>
          <TextInput
            style={[styles.amountInput, { color: accentColor }]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            autoFocus
            selectTextOnFocus
          />
          <Text style={styles.amountCurrency}>{entryCurrency}</Text>
        </View>

        {/* Description */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>DESCRIPCIÓN</Text>
          <TextInput
            style={styles.textInput}
            value={description}
            onChangeText={setDescription}
            placeholder={isGasto ? 'Ej: Supermercado, gasolina, médico…' : 'Ej: Salario, freelance, venta…'}
            placeholderTextColor={colors.muted}
            returnKeyType="next"
          />
        </View>

        {/* Date */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>FECHA</Text>
          {Platform.OS === 'web' ? (
            <TextInput
              style={styles.textInput}
              value={occurred}
              onChangeText={(v) => {
                const d = new Date(v + 'T12:00:00');
                if (!isNaN(d.getTime())) setDate(d);
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
            />
          ) : (
            <Pressable style={styles.dateButton} onPress={() => setShowPicker(true)}>
              <Text style={styles.dateButtonText}>{formatDateDisplay(date)}</Text>
              <Text style={styles.dateIcon}>📅</Text>
            </Pressable>
          )}
          {showPicker && NativeDatePicker && (
            <NativeDatePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(_: any, selected?: Date) => {
                setShowPicker(Platform.OS === 'ios');
                if (selected) setDate(selected);
              }}
            />
          )}
        </View>

        {/* Category */}
        {categories.length > 0 && (
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>CATEGORÍA</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContainer}
            >
              {categories.map((cat) => {
                const active = categoryId === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    style={[styles.chip, active && { backgroundColor: colors.bgDeep, borderColor: colors.navy }]}
                    onPress={() => {
                      setCategoryId(active ? null : cat.id);
                      if (!active && isGasto && !budgetId) {
                        const linked = budgets.find((b) => b.category_id === cat.id && b.disponible > 0);
                        if (linked) setBudgetId(linked.id);
                      }
                    }}
                  >
                    <Text style={[styles.chipText, active && { color: colors.onDark }]}>{cat.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Origen del ingreso */}
        {!isGasto && (
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>ORIGEN DEL INGRESO</Text>
            <View style={styles.sourceWrap}>
              {INCOME_SOURCES.map((src) => {
                const active = incomeSource === src.key;
                return (
                  <Pressable
                    key={src.key}
                    accessibilityRole="button"
                    accessibilityLabel={src.label}
                    accessibilityState={{ selected: active }}
                    style={[styles.chip, active && { backgroundColor: colors.green, borderColor: colors.green }]}
                    onPress={() => setIncomeSource(src.key)}
                  >
                    <Text style={[styles.chipText, active && { color: colors.onNavy, fontWeight: '800' }]}>{src.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Pagar desde un presupuesto */}
        {isGasto && budgets.length > 0 && !editingId && (
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>¿PAGAR DESDE UN PRESUPUESTO?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
              <Pressable
                style={[styles.chip, budgetId === null && { backgroundColor: colors.bgDeep, borderColor: colors.navy }]}
                onPress={() => setBudgetId(null)}
              >
                <Text style={[styles.chipText, budgetId === null && { color: colors.onDark }]}>No, de una cuenta</Text>
              </Pressable>
              {budgets.map((b) => {
                const active = budgetId === b.id;
                return (
                  <Pressable
                    key={b.id}
                    accessibilityLabel={`Presupuesto ${b.nombre}`}
                    style={[styles.chip, active && { backgroundColor: colors.bgDeep, borderColor: colors.navy }]}
                    onPress={() => setBudgetId(b.id)}
                  >
                    <Text style={[styles.chipText, active && { color: colors.onDark }]}>
                      {b.nombre} · ¤{fmtMoney(Math.max(b.disponible, 0))}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Cuenta */}
        {!(isGasto && budgetId) && !editBudget && (
          <View style={styles.fieldBlock}>
            <AccountPicker
              accounts={balances}
              value={account}
              onChange={setAccount}
              mode={isGasto ? 'salida' : 'entrada'}
              amount={isGasto ? parseFloat(amount.replace(',', '.')) || 0 : 0}
            />
            {account?.kind === 'banco' && (
              <View style={styles.bankMedioRow}>
                {([['transferencia', 'Transferencia'], ['tarjeta', 'Tarjeta de débito']] as [PaymentMethod, string][]).map(([key, label]) => {
                  const active = bankMedio === key;
                  return (
                    <Pressable
                      key={key}
                      style={[styles.chip, active && { backgroundColor: colors.bgDeep, borderColor: colors.navy }]}
                      onPress={() => setBankMedio(key)}
                    >
                      <Text style={[styles.chipText, active && { color: colors.onDark }]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {!editingId && account && (parseFloat(amount.replace(',', '.')) || 0) > 0 && findAccount(account) && (
              <Text style={styles.afterBalance}>
                {isGasto ? 'Quedará' : 'Tendrá'} en {findAccount(account)!.nombre}: {accountMoney(findAccount(account)!, findAccount(account)!.saldo + (isGasto ? -1 : 1) * (parseFloat(amount.replace(',', '.')) || 0))}
              </Text>
            )}
          </View>
        )}

        {/* Naturaleza */}
        {isGasto && (
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>TIPO DE GASTO</Text>
            <View style={styles.naturalezaRow}>
              {(['fijo', 'variable'] as TransactionNaturaleza[]).map((n) => {
                const active = naturaleza === n;
                return (
                  <Pressable
                    key={n}
                    style={[styles.naturalezaBtn, active && styles.naturalezaBtnActive]}
                    onPress={() => setNaturaleza(n)}
                  >
                    <Text style={[styles.naturalezaText, active && styles.naturalezaTextActive]}>
                      {n === 'fijo' ? '🔒 Fijo' : '🔄 Variable'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Who registers (only when the plan has several profiles) */}
        {members.length > 1 && (
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>¿QUIÉN LO REGISTRA?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
              {members.map((m) => {
                const active = (selectedMemberId ?? memberId) === m.id;
                return (
                  <Pressable
                    key={m.id}
                    style={[styles.chip, active && { backgroundColor: colors.bgDeep, borderColor: colors.navy }]}
                    onPress={() => setSelectedMemberId(m.id)}
                  >
                    <Text style={[styles.chipText, active && { color: colors.onDark }]}>{m.display_name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Receipt photo */}
        <View style={[styles.fieldBlock, !!editingId && { display: 'none' }]}>
          <Text style={styles.fieldLabel}>FOTO DEL RECIBO (OPCIONAL)</Text>
          {receiptUri ? (
            <View style={styles.receiptPreviewWrap}>
              <Image source={{ uri: receiptUri }} style={styles.receiptPreview} resizeMode="cover" />
              <Pressable style={styles.receiptRemove} onPress={() => setReceiptUri(null)}>
                <Text style={styles.receiptRemoveText}>✕ Quitar</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.receiptBtns}>
              {Platform.OS !== 'web' && (
                <Pressable style={styles.mediaBtn} onPress={takeReceiptPhoto}>
                  <Text style={styles.mediaBtnIcon}>📷</Text>
                  <Text style={styles.mediaBtnText}>Cámara</Text>
                </Pressable>
              )}
              <Pressable style={styles.mediaBtn} onPress={pickReceipt}>
                <Text style={styles.mediaBtnIcon}>🖼️</Text>
                <Text style={styles.mediaBtnText}>Galería</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Voice note */}
        <View style={[styles.fieldBlock, !!editingId && { display: 'none' }]}>
          <Text style={styles.fieldLabel}>NOTA DE VOZ (OPCIONAL)</Text>
          {voiceUri && !isRecording ? (
            <View style={styles.voiceReady}>
              <Text style={styles.voiceReadyText}>🎙️ Nota de voz lista ({voiceSeconds}s)</Text>
              <Pressable onPress={() => setVoiceUri(null)}>
                <Text style={styles.receiptRemoveText}>✕ Quitar</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.voiceBtn, isRecording && styles.voiceBtnActive]}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <Text style={styles.voiceBtnIcon}>{isRecording ? '⏹' : '🎙️'}</Text>
              <Text style={[styles.voiceBtnText, isRecording && { color: colors.rust }]}>
                {isRecording
                  ? `Grabando… ${Math.round((recorderState.durationMillis ?? 0) / 1000)}s — Toca para detener`
                  : 'Grabar nota de voz'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Save */}
        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: accentColor },
            pressed && { opacity: 0.88 },
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>
              {editingId ? 'Guardar cambios' : isGasto ? 'Registrar Gasto' : 'Registrar Ingreso'}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  voiceReady: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.greenSoft, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.greenBorder, paddingHorizontal: spacing.md, paddingVertical: 12,
  },
  voiceReadyText: { fontSize: 14, fontWeight: '600', color: colors.green },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

  kindRow: { flexDirection: 'row', gap: spacing.md },
  kindBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.pill,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  kindText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },

  amountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 2,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    ...shadow.card,
  },
  amountSign: { fontSize: 28, fontWeight: '300', marginRight: 4 },
  amountInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
    paddingVertical: 0,
  },
  amountCurrency: { fontSize: 14, fontWeight: '600', color: colors.onDarkMuted, marginLeft: spacing.sm },

  fieldBlock: { gap: spacing.sm },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2 },

  textInput: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.onDark,
  },

  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  dateButtonText: { fontSize: 15, color: colors.onDark, fontWeight: '500' },
  dateIcon: { fontSize: 18 },

  chipsContainer: { gap: spacing.sm, paddingBottom: 2 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.bgCard,
  },
  chipText: { fontSize: 13, fontWeight: '500', color: colors.onDark },

  metodosRow: { flexDirection: 'row', gap: spacing.md },
  metodoBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    backgroundColor: colors.bgCard,
  },
  metodoBtnActive: { backgroundColor: colors.bgDeep, borderColor: colors.navy },
  metodoIcon: { fontSize: 22 },
  metodoText: { fontSize: 11, fontWeight: '600', color: colors.onDarkMuted },
  metodoTextActive: { color: colors.onDark },

  naturalezaRow: { flexDirection: 'row', gap: spacing.md },
  naturalezaBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    backgroundColor: colors.bgCard,
  },
  naturalezaBtnActive: { backgroundColor: colors.bgDeep, borderColor: colors.navy },
  naturalezaText: { fontSize: 13, fontWeight: '600', color: colors.onDarkMuted },
  naturalezaTextActive: { color: colors.onDark },

  receiptBtns: { flexDirection: 'row', gap: spacing.md },
  mediaBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: 14, paddingHorizontal: spacing.md,
    borderRadius: radius.md, borderWidth: 1.5,
    borderColor: colors.glassBorderBright,
    backgroundColor: colors.bgCard,
    justifyContent: 'center',
  },
  mediaBtnIcon: { fontSize: 22 },
  mediaBtnText: { fontSize: 13, fontWeight: '600', color: colors.onDark },
  receiptPreviewWrap: { borderRadius: radius.md, overflow: 'hidden', position: 'relative' },
  receiptPreview: { width: '100%', height: 160, borderRadius: radius.md },
  receiptRemove: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  receiptRemoveText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  voiceBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: 14, paddingHorizontal: spacing.md,
    borderRadius: radius.md, borderWidth: 1.5,
    borderColor: colors.glassBorderBright,
    backgroundColor: colors.bgCard,
  },
  voiceBtnActive: {
    borderColor: colors.rust,
    backgroundColor: 'rgba(192,57,43,0.06)',
  },
  voiceBtnIcon: { fontSize: 24 },
  voiceBtnText: { fontSize: 13, fontWeight: '600', color: colors.onDark, flex: 1 },

  saveBtn: {
    paddingVertical: 18,
    borderRadius: radius.pill,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadow.hero,
  },
  sourceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  bankMedioRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  afterBalance: { fontSize: 12, color: colors.onDarkMuted, marginTop: spacing.sm },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: colors.onNavy, letterSpacing: 0.3 },
});
