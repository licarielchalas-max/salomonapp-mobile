import { createNavigationContainerRef } from '@react-navigation/native';
import type { TransactionKind } from '../types/db';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

export type RootStackParamList = {
  Dashboard: undefined;
  Movimientos: undefined;
  Salomon: undefined;
  Score: undefined;
  AddTransaction: {
    defaultKind?: TransactionKind;
    /** Presupuesto desde el cual se paga el gasto. */
    budgetId?: string;
    prefill?: { descripcion?: string; monto?: number };
    /** Movimiento a editar. */
    transactionId?: string;
  };
  Presupuesto: undefined;
  Cartera: undefined;
  Metas: undefined;
  Deudas: undefined;
  GastosProgramados: { payId?: string } | undefined;
  Agenda: undefined;
  Bancos: undefined;
  Conciliacion: undefined;
  Referidos: undefined;
  Planes: undefined;
  Academia: undefined;
  Talleres: undefined;
  Inversiones: undefined;
  Marketplace: undefined;
  Soporte: undefined;
  Preferencias: undefined;
};

export type TabParamList = Pick<RootStackParamList, 'Dashboard' | 'Movimientos' | 'Salomon'>;

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Solo en desarrollo web: permite abrir pantallas desde la consola del navegador al probar.
if (__DEV__ && typeof window !== "undefined") {
  (window as unknown as { __nav?: typeof navigationRef }).__nav = navigationRef;
}
