import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthProvider';
import { baseSymbol } from '../lib/currency';

export function useHouseholdSettings() {
  const { householdId, user } = useAuth();
  const [monthlyBudgetTotal, setMonthlyBudgetTotal] = useState(0);
  const [walletInitialBalance, setWalletInitialBalance] = useState(0);
  const [monthlySalary, setMonthlySalary] = useState(0);
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!householdId || !user) return;
      const [{ data: household }, { data: prefs }] = await Promise.all([
        supabase.from('households').select('monthly_budget_total, wallet_initial_balance, monthly_salary').eq('id', householdId).maybeSingle(),
        supabase.from('user_preferences').select('nombre_usuario').eq('user_id', user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      if (household) {
        setMonthlyBudgetTotal(Number(household.monthly_budget_total));
        setWalletInitialBalance(Number(household.wallet_initial_balance));
        setMonthlySalary(Number(household.monthly_salary));
      }
      if (prefs) {
        setNombreUsuario(prefs.nombre_usuario ?? '');
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [householdId, user]);

  async function updateMonthlyBudget(amount: number) {
    if (!householdId) return;
    setMonthlyBudgetTotal(amount);
    await supabase.from('households').update({ monthly_budget_total: amount }).eq('id', householdId);
  }

  async function updateMonthlySalary(amount: number) {
    if (!householdId) return;
    setMonthlySalary(amount);
    await supabase.from('households').update({ monthly_salary: amount }).eq('id', householdId);
  }

  async function updateWalletInitialBalance(amount: number) {
    if (!householdId) return;
    setWalletInitialBalance(amount);
    await supabase.from('households').update({ wallet_initial_balance: amount }).eq('id', householdId);
  }

  async function updatePreferences(next: { nombreUsuario?: string }) {
    if (!user) return;
    if (next.nombreUsuario !== undefined) setNombreUsuario(next.nombreUsuario);
    await supabase
      .from('user_preferences')
      .update({
        ...(next.nombreUsuario !== undefined ? { nombre_usuario: next.nombreUsuario } : {}),
      })
      .eq('user_id', user.id);
  }

  return {
    monthlyBudgetTotal,
    walletInitialBalance,
    monthlySalary,
    /** Símbolo de la moneda base (RD$, US$ o €). */
    moneda: baseSymbol(),
    nombreUsuario,
    loading,
    updateMonthlyBudget,
    updateWalletInitialBalance,
    updateMonthlySalary,
    updatePreferences,
  };
}

