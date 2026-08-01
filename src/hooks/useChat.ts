import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthProvider';
import { todayISO } from '../utils/date';
import type { ChatMessageRow } from '../types/db';

const SALUDO = 'La paz sea contigo. Soy el Rey Salomón, tu asesor financiero virtual. Puedo registrar un gasto, agendar una cita, ponerte un recordatorio, darte consejo o compartir el versículo del día. ¿En qué te sirvo?';

export function useChat(nombreUsuario: string) {
  const { householdId, memberId } = useAuth();
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!householdId) return;
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });
    setMessages(data ?? []);
  }, [householdId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function applyAction(action: { type: string; descripcion: string; monto: number; fecha: string }) {
    if (!householdId) return;
    const fecha = action.fecha || todayISO();
    if (action.type === 'registrar_gasto' && action.descripcion) {
      await supabase.from('transactions').insert({
        household_id: householdId,
        member_id: memberId,
        kind: 'gasto',
        monto: Number(action.monto) || 0,
        descripcion: action.descripcion,
        occurred_on: fecha,
        category_id: 'otros',
        subcategoria: 'Varios',
        medio: 'efectivo',
        naturaleza: 'variable',
        esencial: true,
      });
    } else if (action.type === 'recordatorio' && action.descripcion) {
      await supabase.from('scheduled_expenses').insert({
        household_id: householdId,
        descripcion: action.descripcion,
        monto: Number(action.monto) || 0,
        fecha_pago: fecha,
        fecha_recordatorio: fecha,
        metodo_pago: 'efectivo',
      });
    } else if (action.type === 'cita' && action.descripcion) {
      await supabase.from('calendar_events').insert({ household_id: householdId, titulo: action.descripcion, event_date: fecha });
    } else if (action.type === 'soporte' && action.descripcion) {
      await supabase.from('support_tickets').insert({ household_id: householdId, member_id: memberId, mensaje: action.descripcion });
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || !householdId || loading) return;
    setLoading(true);
    setError(null);
    await supabase.from('chat_messages').insert({ household_id: householdId, member_id: memberId, role: 'user', content: text });
    await reload();

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('chat-rey-salomon', {
        body: { message: text, nombreUsuario },
      });
      if (invokeError) throw invokeError;

      const reply: string = data?.reply || 'Perdona, no pude responder en este momento.';
      if (data?.action) await applyAction(data.action);
      await supabase.from('chat_messages').insert({ household_id: householdId, member_id: memberId, role: 'assistant', content: reply });
    } catch (e) {
      await supabase.from('chat_messages').insert({
        household_id: householdId,
        member_id: memberId,
        role: 'assistant',
        content: 'Perdona, no pude responder en este momento. Intenta de nuevo.',
      });
      setError('No se pudo contactar al Rey Salomón.');
    } finally {
      await reload();
      setLoading(false);
    }
  }

  return { messages, loading, error, sendMessage, saludo: SALUDO };
}
