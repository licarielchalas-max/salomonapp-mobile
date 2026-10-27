import React, { useSyncExternalStore } from 'react';
import { StyleSheet, Text as RNText, View, type TextProps } from 'react-native';
import { colors } from '../theme';
import { Icon, type IconName } from './brand/Icon';
import { SalomonCrown } from './brand/SalomonEmblem';
import { applyBaseSymbol } from '../lib/currency';
import { getLang, subscribeLang, trPiece } from '../lib/i18n';

// Texto de la app. Mantiene la interfaz libre de emojis: un emoji suelto se dibuja como
// el ícono de línea equivalente y los que acompañan a un texto se quitan.

const EMOJI = /[☀-➿⬀-⯿⏩-⏺\u{1F300}-\u{1FAFF}️‍]/gu;
const CROWNS = new Set(['👑', '♛']);

const MAP: Record<string, IconName> = {
  '📅': 'calendar', '🗓': 'calendar', '⏰': 'bell', '🔔': 'bell',
  '🏦': 'bank', '🏛': 'bank', '💳': 'card', '💵': 'coin', '💰': 'coin', '💸': 'coin',
  '🪙': 'coin', '💹': 'trending', '💼': 'wallet', '📈': 'trending', '📉': 'trending',
  '📊': 'bars', '🎯': 'target', '🎓': 'book', '📚': 'book', '📜': 'list', '📋': 'list',
  '🏆': 'star', '⭐': 'star', '🌟': 'star', '🥇': 'star', '🥈': 'star', '🥉': 'star', '🎉': 'star',
  '🏠': 'home', '🛒': 'cart', '🚗': 'car', '💊': 'shield', '🏥': 'shield', '🛡': 'shield', '🆘': 'shield',
  '🎬': 'ticket', '🎮': 'ticket', '🎫': 'ticket', '🍽': 'cart', '🍔': 'cart',
  '👕': 'bag', '🧺': 'bag', '🛍': 'bag', '✈': 'send', '🚀': 'trending', '🏖': 'star',
  '🔍': 'search', '🔒': 'lock', '🔑': 'lock', '🔐': 'lock',
  '✓': 'check', '✅': 'check', '✔': 'check', '✕': 'close', '✖': 'close', '❌': 'close',
  '⚠': 'alert', '⚡': 'fire', '🔥': 'fire', '💡': 'info', '📌': 'info', 'ℹ': 'info',
  '🎁': 'gift', '🗑': 'trash', '🎙': 'mic', '📷': 'camera', '🖼': 'image', '📎': 'image',
  '📤': 'send', '✉': 'send', '🤝': 'users', '👥': 'users', '👤': 'user',
  '🔄': 'refresh', '⚙': 'settings', '🔧': 'settings', '🌱': 'star', '🌐': 'info',
  '💬': 'chat', '📝': 'edit', '✏': 'edit', '🧾': 'list', '💲': 'coin',
  '⏱': 'bell', '⏳': 'bell', '🔴': 'alert', '⏹': 'close', '💎': 'star', '👨': 'user', '👩': 'user',
  '👧': 'user', '👦': 'user', '📧': 'send', '🛑': 'close', '📞': 'chat', '📭': 'list',
  '🤖': 'chat', '📱': 'card', '🧭': 'target',
};

function norm(s: string) {
  return s.replace(/[️‍]/g, '');
}

function toText(children: React.ReactNode): string | null {
  const parts = React.Children.toArray(children);
  if (parts.length === 0) return null;
  if (!parts.every((c) => typeof c === 'string' || typeof c === 'number')) return null;
  return parts.join('');
}

// Quita los emojis de un texto junto con el espacio que los acompañaba, sin tocar los demás
// espacios (por ejemplo, el que separa un número interpolado del texto siguiente).
const LEADING_EMOJI = new RegExp(`^[\\s\\u00A0]*(?:${EMOJI.source})+[\\s\\u00A0]*`, 'u');
const INNER_EMOJI = new RegExp(`[\\s\\u00A0]*(?:${EMOJI.source})+`, 'gu');

function cleanChildren(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (c, index) => {
    if (typeof c !== 'string') return c;
    const noLead = index === 0 ? c.replace(LEADING_EMOJI, '') : c;
    // Cada pieza de texto sale en el idioma elegido; "¤" es la moneda base del hogar (RD$, US$ o €).
    return applyBaseSymbol(trPiece(noLead.replace(INNER_EMOJI, '')));
  });
}

const TEXT_ONLY_KEYS = [
  'color', 'fontSize', 'fontWeight', 'fontFamily', 'fontStyle', 'lineHeight',
  'letterSpacing', 'textAlign', 'textTransform', 'textDecorationLine', 'includeFontPadding',
];

export function Text(props: TextProps) {
  // Se vuelve a dibujar cuando cambia el idioma, sin reiniciar la pantalla en la que estás.
  useSyncExternalStore(subscribeLang, getLang);
  const { children, style, ...rest } = props;
  const raw = toText(children);

  if (raw !== null) {
    const trimmed = norm(raw).trim();
    const stripped = trimmed.replace(EMOJI, '').trim();
    const matches = trimmed.match(EMOJI);

    // Un solo emoji (o símbolo) y nada más: se dibuja como ícono.
    if (matches && stripped === '' && norm(trimmed).length <= 14) {
      const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, any>;
      const key = norm(trimmed);
      const size = Math.round((typeof flat.fontSize === 'number' ? flat.fontSize : 18) * 0.95);
      const color = typeof flat.color === 'string' ? flat.color : colors.gold;
      const boxStyle: Record<string, any> = {};
      Object.keys(flat).forEach((k) => {
        if (!TEXT_ONLY_KEYS.includes(k)) boxStyle[k] = flat[k];
      });
      const glyph = CROWNS.has(key) ? (
        <SalomonCrown size={size} />
      ) : (
        <Icon name={MAP[key] ?? (MAP[Array.from(key)[0]] ?? 'star')} size={size} color={color} strokeWidth={size > 26 ? 1.6 : 1.9} />
      );
      return (
        <View style={[{ alignItems: 'center', justifyContent: 'center' }, boxStyle]} accessible={false}>
          {glyph}
        </View>
      );
    }
  }

  return (
    <RNText style={style} {...rest}>
      {cleanChildren(children)}
    </RNText>
  );
}
