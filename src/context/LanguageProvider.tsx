import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { getLang, isLang, setLang, type Lang } from '../lib/i18n';
import '../i18n/dictionaries';

const STORAGE_KEY = 'salomon.lang';

/** Lee el idioma guardado en el teléfono antes de dibujar la app (así no parpadea en español). */
export async function loadStoredLanguage(): Promise<Lang> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    if (isLang(v)) setLang(v);
  } catch {
    // sin almacenamiento: se queda en español
  }
  return getLang();
}

interface LanguageContextValue {
  lang: Lang;
  changeLanguage: (lang: Lang) => Promise<{ error: string | null }>;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [lang, setLangState] = useState<Lang>(getLang());

  const apply = useCallback((next: Lang) => {
    setLang(next);
    setLangState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  // El idioma de la cuenta manda sobre el guardado en este teléfono.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from('user_preferences')
      .select('idioma')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data || !isLang(data.idioma) || data.idioma === getLang()) return;
        apply(data.idioma);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, apply]);

  const changeLanguage = useCallback(
    async (next: Lang) => {
      apply(next);
      if (!user) return { error: null };
      const { error } = await supabase.from('user_preferences').upsert({ user_id: user.id, idioma: next } as never, { onConflict: 'user_id' });
      return { error: error?.message ?? null };
    },
    [user, apply],
  );

  const value = useMemo(() => ({ lang, changeLanguage }), [lang, changeLanguage]);

  // Los textos se vuelven a dibujar solos al cambiar de idioma (ver AppText).
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage debe usarse dentro de LanguageProvider');
  return ctx;
}
