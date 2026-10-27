import { Linking } from 'react-native';
import { formatTime, parseLocal } from './reminders';
import type { CalendarEventRow, ScheduledExpenseRow } from '../types/db';
import { baseSymbol } from './currency';
import { dateLocale, tr } from './i18n';

// Compartir un recordatorio por WhatsApp: abre WhatsApp con el mensaje listo para elegir el contacto.
// (No envía nada solo: el envío automático requeriría la API de WhatsApp Business.)

function longDate(dateStr: string): string {
  return parseLocal(dateStr, '12:00').toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
}

function money(n: number): string {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function eventShareText(ev: Pick<CalendarEventRow, 'titulo' | 'event_date' | 'event_time' | 'lugar' | 'notas' | 'tipo'>): string {
  const lines = [`📅 ${ev.titulo}`, tr(`${longDate(ev.event_date)}${ev.event_time ? ` a las ${formatTime(ev.event_time)}` : ''}`)];
  if (ev.lugar) lines.push(`📍 ${ev.lugar}`);
  if (ev.notas) lines.push(ev.notas);
  lines.push(tr('— Enviado desde Salomón Finanzas'));
  return lines.join('\n');
}

export function paymentShareText(exp: Pick<ScheduledExpenseRow, 'descripcion' | 'monto' | 'fecha_pago'>): string {
  return [
    `💳 ${tr(`Pago pendiente: ${exp.descripcion}`)}`,
    tr(`${baseSymbol()} ${money(Number(exp.monto))} · vence el ${longDate(exp.fecha_pago)}`),
    tr('— Enviado desde Salomón Finanzas'),
  ].join('\n');
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export async function shareViaWhatsApp(text: string): Promise<boolean> {
  try {
    await Linking.openURL(whatsappUrl(text));
    return true;
  } catch {
    return false;
  }
}
