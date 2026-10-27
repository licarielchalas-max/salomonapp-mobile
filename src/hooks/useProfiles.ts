import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthProvider';
import { useAccount } from '../context/AccountProvider';
import { isUnlimited, planInfo } from '../lib/plans';
import type { HouseholdMemberRow } from '../types/db';

// Perfiles del hogar. El límite lo define el plan y también lo hace cumplir la base de datos.
export function useProfiles() {
  const { householdId } = useAuth();
  const { plan } = useAccount();
  const [members, setMembers] = useState<HouseholdMemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!householdId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('household_members')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });
    setMembers((data ?? []) as HouseholdMemberRow[]);
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const limit = planInfo(plan).profiles;

  async function addProfile(displayName: string) {
    if (!householdId) return { error: 'Sin hogar activo.' };
    const name = displayName.trim();
    if (!name) return { error: 'Escribe un nombre para el perfil.' };
    if (!isUnlimited(limit) && members.length >= limit) return { error: `Tu plan permite ${limit} perfil${limit === 1 ? '' : 'es'}. Mejora tu plan para agregar más.` };
    const { error } = await supabase
      .from('household_members')
      .insert({ household_id: householdId, display_name: name, role: 'member' });
    if (!error) await reload();
    return { error: error?.message ?? null };
  }

  async function renameProfile(id: string, displayName: string) {
    const name = displayName.trim();
    if (!name) return { error: 'Escribe un nombre para el perfil.' };
    const { error } = await supabase.from('household_members').update({ display_name: name }).eq('id', id);
    if (!error) await reload();
    return { error: error?.message ?? null };
  }

  async function removeProfile(id: string) {
    const { error } = await supabase.from('household_members').delete().eq('id', id);
    if (!error) await reload();
    return { error: error?.message ?? null };
  }

  return { members, loading, limit, canAdd: members.length < limit, addProfile, renameProfile, removeProfile, reload };
}
