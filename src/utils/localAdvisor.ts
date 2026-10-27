import { baseSymbol } from '../lib/currency';

export interface AdvisorData {
  ingresos: number;
  gastos: number;
  balance: number;
  deuda: number;
  cuotaMensual: number;
  score: number;
  scoreLabel: string;
  pillars: { label: string; score: number; tip: string }[];
  topGastos: { descripcion: string | null; monto: number }[];
}

const VERSES = [
  'El que guarda con diligencia, su riqueza aumentará; mas el que la dispersa, la verá menguar. (Proverbios 13:11)',
  'Los pensamientos del diligente ciertamente tienden a la abundancia. (Proverbios 21:5)',
  'El rico se enseñorea de los pobres, y el que toma prestado es siervo del que presta. (Proverbios 22:7)',
  'Tesoro precioso y aceite hay en la casa del sabio; mas el hombre insensato todo lo disipa. (Proverbios 21:20)',
  'Ten cuidado de tus ganados y mira con diligencia por tus rebaños. (Proverbios 27:23)',
  'La bendición de Jehová es la que enriquece, y no añade tristeza con ella. (Proverbios 10:22)',
  'Mejor es lo poco con justicia que la muchedumbre de frutos sin derecho. (Proverbios 16:8)',
];

const money = (n: number) => `${baseSymbol()}${Math.round(n).toLocaleString('es-DO')}`;

export const LOCAL_CHIPS: Record<string, (d: AdvisorData) => string> = {
  '¿Cómo mejorar mi score?': (d) => {
    if (!d.pillars.length) return `Tu Score Salomón es ${d.score} (${d.scoreLabel}). Registra ingresos, gastos y metas para que pueda analizarlo.`;
    const weakest = [...d.pillars].sort((a, b) => a.score - b.score)[0];
    return `Tu Score Salomón es ${d.score} (${d.scoreLabel}). Tu punto más débil es "${weakest.label}" (${Math.round(weakest.score)}/100). ${weakest.tip}`;
  },

  '¿En qué estoy gastando más?': (d) => {
    if (!d.topGastos.length) return 'Aún no has registrado gastos este mes. Anota el primero y te mostraré en qué se va tu dinero.';
    const lines = d.topGastos.map((g, i) => `${i + 1}. ${g.descripcion || 'Sin descripción'}: ${money(g.monto)}`).join('\n');
    const share = d.ingresos > 0 ? ` Tus gastos del mes son ${money(d.gastos)}, el ${Math.round((d.gastos / d.ingresos) * 100)}% de tus ingresos.` : '';
    return `Tus mayores gastos este mes:\n${lines}\n${share}`.trim();
  },

  'Dame un consejo de ahorro': (d) => {
    if (d.ingresos <= 0) return 'Registra tus ingresos del mes y te diré cuánto puedes apartar. Regla de oro: págate primero a ti mismo.';
    const rate = d.balance / d.ingresos;
    const diez = money(d.ingresos * 0.1);
    if (rate >= 0.2) return `Estás ahorrando el ${Math.round(rate * 100)}% de tus ingresos, ¡muy bien! Aparta ${diez} (10%) apenas cobres y déjalo en un fondo de emergencia que cubra 3 meses de gastos.`;
    return `Hoy te queda el ${Math.max(0, Math.round(rate * 100))}% de tus ingresos. Prueba separar ${diez} (10%) el mismo día que cobras, antes de gastar. "El que guarda con diligencia verá aumentar su riqueza."`;
  },

  '¿Cómo pagar mis deudas más rápido?': (d) => {
    if (d.deuda <= 0) return 'No tienes deudas registradas. ¡Mantén ese buen camino!';
    const peso = d.ingresos > 0 ? ` Tus cuotas (${money(d.cuotaMensual)}/mes) son el ${Math.round((d.cuotaMensual / d.ingresos) * 100)}% de tus ingresos.` : '';
    return `Debes ${money(d.deuda)} en total.${peso} Paga el mínimo de todas y destina todo el extra a la de mayor interés (método avalancha). Cuando la liquides, suma esa cuota a la siguiente.`;
  },

  'Versículo financiero del día': () => VERSES[new Date().getDate() % VERSES.length],

  'Revisa mi presupuesto': (d) => {
    if (d.ingresos <= 0) return 'Aún no hay ingresos registrados este mes. Agrégalos para poder revisar tu presupuesto.';
    const uso = Math.round((d.gastos / d.ingresos) * 100);
    const estado = uso <= 50 ? 'excelente control' : uso <= 80 ? 'dentro de lo razonable, pero vigila los gastos variables' : uso <= 100 ? 'ajustado: estás gastando casi todo lo que ingresa' : 'en déficit: gastas más de lo que ganas';
    return `Has usado el ${uso}% de tus ingresos (${money(d.gastos)} de ${money(d.ingresos)}). Estado: ${estado}. Balance del mes: ${money(d.balance)}.`;
  },
};
