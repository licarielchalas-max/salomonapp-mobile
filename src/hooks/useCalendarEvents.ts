import { useCallback, useEffect, useMemo, useState } from 'react';
import { useReloadOnFocus } from './useReloadOnFocus';
import { supabase } from '../lib/supabase';
import { emitRemindersChanged } from '../lib/reminderBus';
import { addDays, toISODate } from '../lib/reminders';
import type { CalendarEventRow, CalendarEventInsert } from '../types/db';

type Result = { error: string | null };
type EventInput = Omit<CalendarEventInsert, 'household_id'>;

// Eventos de la agenda: desde hace 60 días hasta dentro de un año (alcanza para el calendario
// mensual y para expandir los recurrentes).
export function useCalendarEvents(householdId: string | null) {
  const [events, setEvents] = useState<CalendarEventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!householdId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    const today = toISODate(new Date());
    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('household_id', householdId)
      .gte('event_date', addDays(today, -60))
      .lte('event_date', addDays(today, 365))
      .order('event_date', { ascending: true })
      .order('event_time', { ascending: true, nullsFirst: true });
    setEvents((data ?? []) as CalendarEventRow[]);
    setLoading(false);
  }, [householdId]);

  useEffect(() => { reload(); }, [reload]);
  useReloadOnFocus(reload);

  const done = useCallback(async (res: Result): Promise<Result> => {
    if (!res.error) {
      await reload();
      emitRemindersChanged();
    }
    return res;
  }, [reload]);

  async function addEvent(input: EventInput): Promise<Result> {
    if (!householdId) return { error: 'No hay sesión activa.' };
    const { error } = await supabase.from('calendar_events').insert({ ...input, household_id: householdId });
    return done({ error: error?.message ?? null });
  }

  async function updateEvent(id: string, input: Partial<EventInput>): Promise<Result> {
    const { error } = await supabase.from('calendar_events').update(input as never).eq('id', id);
    return done({ error: error?.message ?? null });
  }

  async function deleteEvent(id: string): Promise<Result> {
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    return done({ error: error?.message ?? null });
  }

  const upcoming = useMemo(() => {
    const today = toISODate(new Date());
    return events.filter((e) => e.event_date >= today && !e.completado);
  }, [events]);

  return { events, upcoming, loading, addEvent, updateEvent, deleteEvent, reload };
}
