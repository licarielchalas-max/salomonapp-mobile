import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { CategoryRow } from '../types/db';

export function useCategories() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) {
          setCategories(data ?? []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, loading };
}
