import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  user: User | null;
  householdId: string | null;
  memberId: string | null;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);

  async function loadMembership(userId: string) {
    const { data, error } = await supabase
      .from('household_members')
      .select('id, household_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (!error && data) {
      setHouseholdId(data.household_id);
      setMemberId(data.id);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadMembership(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        loadMembership(newSession.user.id);
      } else {
        setHouseholdId(null);
        setMemberId(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      householdId,
      memberId,
      async signUp(email, password, displayName) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        });
        return { error: error?.message ?? null };
      },
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    }),
    [loading, session, householdId, memberId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
