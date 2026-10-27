// Idiomas de la app: español (predeterminado), inglés y francés.
//
// Los textos de la interfaz están escritos en español y ese texto es la llave del diccionario.
// Al dibujar, cada texto se busca en el diccionario del idioma elegido; si no está, se muestra
// en español. Las llaves pueden llevar huecos {0}, {1}… para los textos con datos (nombres,
// montos, días): "{0} día{1} antes" → "{0} day{1} before".

export type Lang = 'es' | 'en' | 'fr';

export const LANGUAGES: { code: Lang; label: string; native: string }[] = [
  { code: 'es', label: 'Español', native: 'Español' },
  { code: 'en', label: 'English', native: 'English' },
  { code: 'fr', label: 'Français', native: 'Français' },
];

export type Dict = Record<string, string>;

export function isLang(v: unknown): v is Lang {
  return v === 'es' || v === 'en' || v === 'fr';
}

// ── Normalización de llaves ──────────────────────────────────────────────────

const EMOJI = /[☀-➿⬀-⯿⏩-⏺\u{1F300}-\u{1FAFF}️‍]/gu;

/** Misma forma que el texto que llega a la pantalla: sin emojis, espacios simples. */
export function normKey(s: string): string {
  return s.replace(EMOJI, '').replace(/\s+/g, ' ').trim();
}

// ── Diccionarios compilados ──────────────────────────────────────────────────

interface Compiled {
  exact: Map<string, string>;
  patterns: { re: RegExp; out: string }[];
  cache: Map<string, string>;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function compile(dict: Dict): Compiled {
  const exact = new Map<string, string>();
  const patterns: { re: RegExp; out: string }[] = [];
  for (const [rawKey, value] of Object.entries(dict)) {
    const key = normKey(rawKey);
    if (!key) continue;
    if (/\{#?\d+\}/.test(key)) {
      // {0} = cualquier texto; {#0} = solo una cifra (así un nombre escrito por la persona nunca coincide).
      const src = key
        .split(/(\{#?\d+\})/)
        .map((part) => {
          if (/^\{#\d+\}$/.test(part)) return '(\\d+(?:[.,]\\d+)?)';
          if (/^\{\d+\}$/.test(part)) return '([\\s\\S]*?)';
          return escapeRe(part);
        })
        .join('');
      patterns.push({ re: new RegExp(`^${src}$`), out: value });
    } else {
      exact.set(key, value);
    }
  }
  // Las llaves con más texto fijo se prueban primero.
  patterns.sort((a, b) => b.re.source.length - a.re.source.length);
  return { exact, patterns, cache: new Map() };
}

const registry: Partial<Record<Lang, Dict[]>> = {};
const compiled: Partial<Record<Lang, Compiled>> = {};

/** Registra textos de un idioma (se pueden agregar varios bloques). */
export function registerDictionary(lang: Lang, dict: Dict): void {
  if (lang === 'es') return;
  (registry[lang] ??= []).push(dict);
  delete compiled[lang];
}

function dictFor(lang: Lang): Compiled | null {
  if (lang === 'es') return null;
  if (!compiled[lang]) compiled[lang] = compile(Object.assign({}, ...(registry[lang] ?? [])));
  return compiled[lang]!;
}

// ── Idioma actual ────────────────────────────────────────────────────────────

let current: Lang = 'es';

export function getLang(): Lang {
  return current;
}

const listeners = new Set<() => void>();

export function setLang(lang: Lang): void {
  if (current === lang) return;
  current = lang;
  listeners.forEach((l) => l());
}

/** Para que los componentes se vuelvan a dibujar al cambiar de idioma (useSyncExternalStore). */
export function subscribeLang(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Código para formatear fechas y horas en el idioma de la app. */
export function dateLocale(): string {
  return current === 'en' ? 'en-US' : current === 'fr' ? 'fr-FR' : 'es';
}

// ── Traducción ───────────────────────────────────────────────────────────────

function translateWith(c: Compiled, s: string, depth = 0): string {
  const hit = c.exact.get(s);
  if (hit !== undefined) return hit;
  const cached = c.cache.get(s);
  if (cached !== undefined) return cached;
  let result = s;
  for (const p of c.patterns) {
    const m = p.re.exec(s);
    if (!m) continue;
    result = p.out.replace(/\{(\d+)\}/g, (_, i) => {
      const part = m[Number(i) + 1] ?? '';
      // Un dato que es, a su vez, un texto conocido ("Hoy", "mañana") también se traduce.
      if (depth >= 2 || !part) return part;
      const sp = /^(\s*)([\s\S]*?)(\s*)$/.exec(part);
      return sp && sp[2] ? sp[1] + translateWith(c, sp[2], depth + 1) + sp[3] : part;
    });
    break;
  }
  if (c.cache.size > 2000) c.cache.clear();
  c.cache.set(s, result);
  return result;
}

/** Traduce un texto completo al idioma actual (si no hay traducción, lo devuelve igual). */
export function tr(text: string, lang: Lang = current): string {
  if (!text || lang === 'es') return text;
  const c = dictFor(lang);
  if (!c) return text;
  const key = normKey(text);
  if (!key) return text;
  const out = translateWith(c, key);
  return out === key ? text : out;
}

/** Igual que tr, pero conserva los espacios del principio y del final (piezas sueltas de un texto). */
export function trPiece(piece: string, lang: Lang = current): string {
  if (!piece || lang === 'es') return piece;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(piece);
  if (!m || !m[2]) return piece;
  return m[1] + tr(m[2], lang) + m[3];
}
