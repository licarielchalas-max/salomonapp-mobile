import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthProvider';
import { useReloadOnFocus } from './useReloadOnFocus';
import { DEFAULT_COUNTRY } from '../lib/zones';

// País y ciudad de la persona (user_preferences). Los usa el Marketplace para mostrar lo que
// está disponible donde vive.
export function useUserZone() {
  const { user } = useAuth();
  const [pais, setPais] = useState<string>(DEFAULT_COUNTRY);
  const [ciudad, setCiudad] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase.from('user_preferences').select('pais, ciudad').eq('user_id', user.id).maybeSingle();
    if (data) {
      setPais(data.pais || DEFAULT_COUNTRY);
      setCiudad(data.ciudad ?? '');
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    reload();
  }, [reload]);
  useReloadOnFocus(reload);

  const saveZone = useCallback(
    async (nextPais: string, nextCiudad: string) => {
      if (!user) return { error: 'Sin sesión' };
      const pais2 = nextPais.trim() || DEFAULT_COUNTRY;
      const ciudad2 = nextCiudad.trim();
      setPais(pais2);
      setCiudad(ciudad2);
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ user_id: user.id, pais: pais2, ciudad: ciudad2 || null } as never, { onConflict: 'user_id' });
      return { error: error?.message ?? null };
    },
    [user],
  );

  return { pais, ciudad, loading, saveZone, reload };
}
