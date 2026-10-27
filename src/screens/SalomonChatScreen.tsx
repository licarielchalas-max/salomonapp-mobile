import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CURRENCIES, amountToBase, baseCurrency, baseSymbol } from '../lib/currency';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { TextInput } from '../components/AppTextInput';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthProvider';
import { useDebts } from '../hooks/useDebts';
import { useGoals } from '../hooks/useGoals';
import { useMonthlyTransactions } from '../hooks/useMonthlyTransactions';
import { useFinancialScore } from '../hooks/useFinancialScore';
import { useBudgets } from '../hooks/useBudgets';
import { useAccounts } from '../hooks/useAccounts';
import { useBankAccounts } from '../hooks/useBankAccounts';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { useScheduledExpenses } from '../hooks/useScheduledExpenses';
import { useDebtSchedule } from '../hooks/useDebtSchedule';
import { attentionItems } from '../lib/reminders';
import { debtAttention } from '../lib/debtDates';
import { accountMoney, debtCurrency } from '../lib/money';
import { buildAdvisorContext, recentHistory } from '../lib/advisorContext';
import { daySummary } from '../lib/dailySummary';
import { getLang } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius, fonts } from '../theme';
import { SalomonEmblem, SalomonCrown } from '../components/brand/SalomonEmblem';
import { Icon } from '../components/brand/Icon';
import { FOIL_COLORS, FOIL_LOCATIONS } from '../components/brand/Buttons';
import { LOCAL_CHIPS } from '../utils/localAdvisor';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { dateLocale } from '../lib/i18n';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: { type: string; descripcion: string; monto: number; fecha: string };
  ts: Date;
}

const DAY_CHIP = 'Resumen de mi día';
const QUICK_CHIPS = [DAY_CHIP, ...Object.keys(LOCAL_CHIPS)];

function TypingDots() {
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d % 3) + 1), 400);
    return () => clearInterval(t);
  }, []);
  return <Text style={ms.typingText}>{'•'.repeat(dots)}</Text>;
}

export function SalomonChatScreen() {
  const { householdId, memberId } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { totalDeuda, totalCuotaMensual, debts } = useDebts(householdId);
  const { user } = useAuth();
  const { budgets: budgetList } = useBudgets(householdId);
  const { accounts: balances } = useAccounts(householdId);
  const { accounts: bankAccounts } = useBankAccounts(householdId);
  const { events: agendaEvents } = useCalendarEvents(householdId);
  const { pending: pagosPendientes } = useScheduledExpenses(householdId);
  const { items: debtItems, payments: debtPays } = useDebtSchedule(householdId);
  const { goals } = useGoals(householdId);
  const { transactions, totalIngresos, totalGastos, balance, monthLabel, gastos } = useMonthlyTransactions(householdId);
  const { total: score, label: scoreLabel, pillars } = useFinancialScore(householdId);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: '¡Shalom! Soy el Rey Salomón, tu consejero financiero con sabiduría. ¿En qué puedo ayudarte hoy? Puedo analizar tus finanzas, darte consejos, registrar gastos o simplemente escucharte.',
      ts: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const attention = useMemo(
    () => [...attentionItems(agendaEvents, pagosPendientes), ...debtAttention(debtItems, debtPays)].sort((x, y) => x.date.localeCompare(y.date)),
    [agendaEvents, pagosPendientes, debtItems, debtPays],
  );

  const txBase = useMemo(
    () => transactions.map((tx) => ({ kind: tx.kind, amount: amountToBase(tx), occurred_on: tx.occurred_on, descripcion: tx.descripcion })),
    [transactions],
  );

  function buildContext() {
    const accountName = (b: { medio: string; bank_account_id: string | null }) => {
      const acc = b.bank_account_id ? bankAccounts.find((x) => x.id === b.bank_account_id) : undefined;
      return acc ? `${acc.banco}${acc.ultimos4 ? ` ···${acc.ultimos4}` : ''}` : b.medio === 'efectivo' ? 'Efectivo' : `${b.medio} (cuenta sin asignar)`;
    };
    const weakest = [...pillars].sort((x, y) => x.score - y.score)[0];
    return buildAdvisorContext({
      now: new Date(),
      symbol: baseSymbol(),
      currencyName: CURRENCIES[baseCurrency()].name,
      monthLabel,
      ingresos: totalIngresos,
      gastos: totalGastos,
      balance,
      transactions: txBase,
      accounts: balances.map((a) => ({ nombre: a.nombre, saldo: accountMoney(a) })),
      budgets: budgetList.map((b) => ({ nombre: b.nombre, monto: b.monto, gastado: b.gastado, disponible: b.disponible, cuenta: accountName(b) })),
      debts: debts
        .filter((d) => !d.status || d.status === 'pendiente')
        .map((d) => ({ nombre: d.nombre, tipo: d.tipo, saldo: Number(d.saldo), cuota: Number(d.cuota_mensual), tasaAnual: Number(d.tasa_anual), diaPago: d.dia_pago, moneda: debtCurrency(d) })),
      upcoming: attention.map((a) => ({ title: a.title, date: a.date, overdue: a.overdue, amount: a.amount })),
      goals: goals.map((g) => ({ nombre: g.nombre, actual: Number(g.current_amount), meta: Number(g.target_amount) })),
      score: { total: score, label: scoreLabel, weakest: weakest ? { label: weakest.label, score: weakest.score } : undefined },
    });
  }

  function dayReply(): string {
    const s = daySummary({
      now: new Date(),
      transactions: txBase,
      budgets: budgetList.map((b) => ({ nombre: b.nombre, monto: b.monto, gastado: b.gastado })),
      upcoming: attention.map((a) => ({ title: a.title, date: a.date, overdue: a.overdue, amount: a.amount })),
    });
    return `${s.title}\n${s.lines.map((l) => `• ${l}`).join('\n')}\n${s.closing}`;
  }

  function sendQuick(question: string) {
    if (question === DAY_CHIP) {
      const now = Date.now();
      setMessages((prev) => [
        ...prev,
        { id: now.toString(), role: 'user', content: question, ts: new Date() },
        { id: (now + 1).toString(), role: 'assistant', content: dayReply(), ts: new Date() },
      ]);
      return;
    }
    const answer = LOCAL_CHIPS[question];
    if (!answer || loading) return sendMessage(question);
    const topGastos = [...gastos]
      .sort((a, b) => amountToBase(b) - amountToBase(a))
      .slice(0, 3)
      .map((g) => ({ descripcion: g.descripcion, monto: amountToBase(g) }));
    const reply = answer({
      ingresos: totalIngresos,
      gastos: totalGastos,
      balance,
      deuda: totalDeuda,
      cuotaMensual: totalCuotaMensual,
      score,
      scoreLabel,
      pillars,
      topGastos,
    });
    const now = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: now.toString(), role: 'user', content: question, ts: new Date() },
      { id: (now + 1).toString(), role: 'assistant', content: reply, ts: new Date() },
    ]);
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim(), ts: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const ctx = buildContext();
      const fullMessage = `[Contexto financiero]\n${ctx}\n\nUsuario: ${text.trim()}`;
      const displayName = String((user as { user_metadata?: { display_name?: string } } | null)?.user_metadata?.display_name ?? '').split(' ')[0];

      const { data, error } = await supabase.functions.invoke('chat-rey-salomon', {
        body: {
          message: fullMessage,
          nombreUsuario: displayName || undefined,
          idioma: getLang(),
          // Lo conversado antes (sin el saludo inicial) para que recuerde de qué hablaban
          history: recentHistory(messages.filter((m) => m.id !== '0')),
        },
      });

      if (error) throw error;

      const reply = data?.reply ?? 'Lo siento, no pude procesar tu consulta en este momento.';
      const action = data?.action;

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        action: action?.type !== 'ninguna' ? action : undefined,
        ts: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Save to chat_messages table
      if (householdId) {
        await supabase.from('chat_messages').insert([
          { household_id: householdId, role: 'user', content: text.trim() },
          { household_id: householdId, role: 'assistant', content: reply },
        ]);
      }

      // Soporte: la solicitud queda como ticket para el panel de administración
      if (action?.type === 'soporte' && householdId && action.descripcion) {
        await supabase.from('support_tickets').insert({
          household_id: householdId,
          member_id: memberId,
          mensaje: action.descripcion,
        });
      }

      // Ingreso mencionado en la conversación: se abre el formulario para elegir en qué cuenta entra
      if (action?.type === 'registrar_ingreso' && action.monto > 0) {
        Alert.alert(
          'Registrar ingreso',
          `¿Registro "${action.descripcion}" por ${baseSymbol()}${action.monto}? Elegirás en qué cuenta entra el dinero.`,
          [
            { text: 'No', style: 'cancel' },
            {
              text: 'Sí, continuar',
              onPress: () =>
                navigation.navigate('AddTransaction', {
                  defaultKind: 'ingreso',
                  prefill: { descripcion: action.descripcion, monto: Number(action.monto) },
                }),
            },
          ]
        );
      }

      // If action is a gasto, offer to register it
      if (action?.type === 'registrar_gasto' && action.monto > 0) {
        // Todo gasto sale de una cuenta: se abre el formulario con los datos para elegirla.
        Alert.alert(
          'Registrar gasto',
          `¿Registro "${action.descripcion}" por ${baseSymbol()}${action.monto}? Elegirás de qué cuenta sale el dinero.`,
          [
            { text: 'No', style: 'cancel' },
            {
              text: 'Sí, continuar',
              onPress: () =>
                navigation.navigate('AddTransaction', {
                  defaultKind: 'gasto',
                  prefill: { descripcion: action.descripcion, monto: Number(action.monto) },
                }),
            },
          ]
        );
      }
    } catch (err: any) {
      const status = err?.context?.status;
      const rateLimited = status === 429;
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content:
            status === 402
              ? '🔒 Tu prueba gratis terminó. Elige un plan en el menú (Planes) para seguir hablando conmigo.'
              : status === 401
                ? '🔑 Tu sesión expiró. Cierra sesión y vuelve a entrar.'
                : rateLimited
                  ? '⏳ Estoy atendiendo muchas consultas. Espera un minuto e inténtalo de nuevo, o usa las preguntas rápidas.'
                  : '⚠️ No pude consultar al Rey Salomón ahora mismo. Revisa tu conexión e inténtalo de nuevo en unos minutos.',
          ts: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(d: Date) {
    return d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <SafeAreaView style={ms.safe} edges={['top', 'bottom']}>
      <LinearGradient colors={[colors.bgDeep, colors.bg, '#041F0F']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      {/* Encabezado */}
      <View style={ms.header}>
        <Pressable
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Dashboard' as never))}
          style={ms.iconBtn}
          hitSlop={8}
          accessibilityLabel="Volver"
        >
          <Icon name="back" size={20} color={colors.onDark} />
        </Pressable>
        <View style={ms.avatarWrap}>
          <SalomonEmblem size={34} ring={false} />
        </View>
        <View style={ms.headerCenter}>
          <Text style={ms.headerTitle}>Rey Salomón</Text>
          <View style={ms.onlineDot}>
            <View style={ms.dotInner} />
            <Text style={ms.onlineText}>Consejero financiero</Text>
          </View>
        </View>
        <View style={ms.headerScore}>
          <Text style={ms.scoreNum}>{score}</Text>
          <Text style={ms.scoreLabel}>SCORE</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={ms.messageList}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 8, gap: spacing.md }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[ms.msgRow, msg.role === 'user' ? ms.msgRowUser : ms.msgRowAI]}
            >
              {msg.role === 'assistant' && (
                <View style={ms.avatar}>
                  <SalomonCrown size={16} />
                </View>
              )}
              <View style={[ms.bubble, msg.role === 'user' ? ms.bubbleUser : ms.bubbleAI]}>
                {msg.role === 'assistant' && <View style={ms.goldBar} />}
                <Text style={[ms.bubbleText, msg.role === 'user' ? ms.bubbleTextUser : ms.bubbleTextAI]}>
                  {msg.content}
                </Text>
                {msg.action && (
                  <View style={ms.actionChip}>
                    <Icon
                      name={msg.action.type === 'registrar_gasto' ? 'coin' : msg.action.type === 'soporte' ? 'ticket' : 'info'}
                      size={13}
                      color={colors.goldBright}
                    />
                    <Text style={ms.actionChipText}>
                      {msg.action.descripcion}
                      {msg.action.monto > 0 ? ` · ¤${msg.action.monto}` : ''}
                    </Text>
                  </View>
                )}
                <Text style={[ms.timestamp, msg.role === 'user' ? { color: 'rgba(6,48,26,0.55)' } : null]}>
                  {formatTime(msg.ts)}
                </Text>
              </View>
            </View>
          ))}

          {loading && (
            <View style={[ms.msgRow, ms.msgRowAI]}>
              <View style={ms.avatar}>
                <SalomonCrown size={16} />
              </View>
              <View style={[ms.bubble, ms.bubbleAI, ms.typingBubble]}>
                <TypingDots />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Preguntas rápidas (solo al inicio) */}
        {messages.length <= 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={ms.chipsRow}
            style={{ maxHeight: 52, flexGrow: 0 }}
          >
            {QUICK_CHIPS.map((chip) => (
              <Pressable key={chip} style={ms.chip} onPress={() => sendQuick(chip)}>
                <Text style={ms.chipText}>{chip}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Barra de escritura */}
        <View style={ms.inputBar}>
          <TextInput
            style={ms.input}
            value={input}
            onChangeText={setInput}
            placeholder="Pregúntale al Rey Salomón..."
            placeholderTextColor={colors.onDarkMuted}
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage(input)}
            onKeyPress={(e: any) => {
              if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            returnKeyType="send"
          />
          <Pressable
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            accessibilityLabel="Enviar"
            style={[(!input.trim() || loading) && ms.sendBtnDisabled]}
          >
            <LinearGradient
              colors={FOIL_COLORS}
              locations={FOIL_LOCATIONS}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={ms.sendBtn}
            >
              {loading ? (
                <ActivityIndicator color={colors.onNavy} size="small" />
              ) : (
                <Icon name="send" size={20} color={colors.onNavy} strokeWidth={2.4} />
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const ms = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    gap: spacing.md,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder,
  },
  avatarWrap: {
    width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(6,48,26,0.9)', borderWidth: 1.5, borderColor: colors.gold,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontFamily: fonts.heading, fontWeight: '700', color: colors.onDark },
  onlineDot: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  dotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  onlineText: { fontSize: 11, color: colors.onDarkMuted, fontWeight: '500' },
  headerScore: {
    alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 6, borderWidth: 1, borderColor: colors.glassBorder,
  },
  scoreNum: { fontSize: 16, fontWeight: '800', color: colors.gold },
  scoreLabel: { fontSize: 8, color: colors.onDarkMuted, letterSpacing: 1.2 },

  messageList: { flex: 1 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAI: { justifyContent: 'flex-start' },

  avatar: {
    width: 30, height: 30, borderRadius: 15, flexShrink: 0, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(6,48,26,0.9)', borderWidth: 1, borderColor: colors.gold,
  },

  bubble: {
    maxWidth: '80%',
    borderRadius: 20,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
    gap: 4,
    overflow: 'hidden',
  },
  bubbleAI: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderBottomLeftRadius: 6,
    paddingLeft: spacing.md + 8,
  },
  bubbleUser: {
    backgroundColor: colors.gold,
    borderBottomRightRadius: 6,
  },
  goldBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.gold },
  bubbleText: { fontSize: 14.5, lineHeight: 21 },
  bubbleTextAI: { color: colors.onDark },
  bubbleTextUser: { color: colors.onNavy, fontWeight: '500' },
  timestamp: { fontSize: 10, color: colors.onDarkMuted, alignSelf: 'flex-end', marginTop: 2 },

  typingBubble: { minWidth: 60 },
  typingText: { fontSize: 22, color: colors.gold, letterSpacing: 3 },

  actionChip: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(226,190,75,0.14)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(226,190,75,0.4)',
  },
  actionChipText: { fontSize: 11.5, color: colors.goldBright, fontWeight: '600', flexShrink: 1 },

  chipsRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(226,190,75,0.45)',
  },
  chipText: { fontSize: 12.5, color: colors.goldBright, fontWeight: '600' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.onDark,
    maxHeight: 100,
    lineHeight: 20,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
});
