import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  user: User | null;
  householdId: string | null;
  memberId: string | null;
  signUp: (email: string, password: string, displayName: string, referralCode?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Envía el correo para crear una contraseña nueva. */
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  /** true mientras la persona llegó desde el enlace de recuperación y debe elegir su contraseña nueva. */
  recovering: boolean;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  cancelRecovery: () => Promise<void>;
  /** Vuelve a enviar el correo de confirmación de una cuenta nueva. */
  resendConfirmation: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);

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

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
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

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setRecovering(false);
    return { error: error?.message ?? null };
  }, []);

  const cancelRecovery = useCallback(async () => {
    setRecovering(false);
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      householdId,
      memberId,
      async signUp(email, password, displayName, referralCode) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName, ...(referralCode?.trim() ? { referral_code: referralCode.trim().toUpperCase() } : {}) } },
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
      async requestPasswordReset(email) {
        const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;
        const { error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
        return { error: error?.message ?? null };
      },
      recovering,
      updatePassword,
      cancelRecovery,
      async resendConfirmation(email) {
        const { error } = await supabase.auth.resend({ type: 'signup', email });
        return { error: error?.message ?? null };
      },
    }),
    [loading, session, householdId, memberId, recovering, updatePassword, cancelRecovery]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

