import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useReloadOnFocus } from './useReloadOnFocus';

export type MarketplaceKind = 'financiero' | 'inversion' | 'vivienda' | 'digital' | 'anuncio';
export type MarketplaceCategory = 'certificados' | 'fondos' | 'acciones' | 'credito' | 'seguros' | 'vivienda' | 'digital';

export interface MarketplaceItem {
  id: string;
  kind: MarketplaceKind;
  categoria: MarketplaceCategory;
  banco: string;
  nombre: string;
  tipo: string | null;
  tasa: string | null;
  plazo: string | null;
  minimo: string | null;
  comision: string | null;
  descripcion: string | null;
  badge: string | null;
  icono: string;
  url: string | null;
  paises: string[];
  ciudades: string[];
  partner_id: string | null;
  activo: boolean;
  orden: number;
  starts_at: string | null;
  ends_at: string | null;
}

// Productos, proyectos, productos digitales y anuncios que administra el panel. La base de datos solo
// entrega los activos y vigentes; aquí además se cuentan las vistas.
export function useMarketplace() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('marketplace_items').select('*').order('orden').order('created_at');
    if (error) setFailed(true);
    else {
      setFailed(false);
      setItems((data ?? []) as MarketplaceItem[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useReloadOnFocus(load);

  const track = useCallback(async (ids: string[], event: 'view' | 'click' | 'lead') => {
    if (ids.length === 0) return;
    await supabase.rpc('track_marketplace', { p_items: ids, p_event: event });
  }, []);

  return { items, loading, failed, track, reload: load };
}
