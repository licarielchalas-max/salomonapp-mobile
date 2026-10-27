import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../AppText';
import { Icon } from '../brand/Icon';
import { colors, fonts, radius, spacing } from '../../theme';
import { toISODate } from '../../lib/reminders';
import { dateLocale } from '../../lib/i18n';

export interface DayMarks {
  events: number;
  payments: number;
  overdue: boolean;
}

interface Props {
  year: number;
  /** 0–11 */
  month: number;
  /** YYYY-MM-DD seleccionado */
  selected: string;
  marks: Record<string, DayMarks | undefined>;
  onSelect: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
}

const WEEK = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

// Calendario mensual: puntos dorados en los días con eventos y rojizos en los de pagos.
export function MonthCalendar({ year, month, selected, marks, onSelect, onMonthChange }: Props) {
  const today = toISODate(new Date());
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const days = new Date(year, month + 1, 0).getDate();
    const list: (string | null)[] = Array.from({ length: first.getDay() }, () => null);
    for (let d = 1; d <= days; d++) list.push(toISODate(new Date(year, month, d)));
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [year, month]);

  const rawTitle = new Date(year, month, 1).toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' });
  const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
  const prev = () => (month === 0 ? onMonthChange(year - 1, 11) : onMonthChange(year, month - 1));
  const next = () => (month === 11 ? onMonthChange(year + 1, 0) : onMonthChange(year, month + 1));

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Pressable onPress={prev} style={styles.nav} hitSlop={8} accessibilityLabel="Mes anterior">
          <Icon name="back" size={18} color={colors.onDark} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        <Pressable onPress={next} style={styles.nav} hitSlop={8} accessibilityLabel="Mes siguiente">
          <Icon name="chevron" size={18} color={colors.onDark} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEK.map((w, i) => (
          <Text key={i} style={styles.weekDay}>{w}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((date, i) => {
          if (!date) return <View key={`e${i}`} style={styles.cell} />;
          const m = marks[date];
          const isSel = date === selected;
          const isToday = date === today;
          return (
            <Pressable
              key={date}
              style={styles.cell}
              onPress={() => onSelect(date)}
              accessibilityRole="button"
              accessibilityLabel={`${Number(date.slice(8))} de ${title}${m ? `, con ${m.events + m.payments} pendiente${m.events + m.payments !== 1 ? 's' : ''}` : ''}`}
              accessibilityState={{ selected: isSel }}
            >
              <View style={[styles.day, isSel && styles.daySel, isToday && !isSel && styles.dayToday]}>
                <Text style={[styles.dayText, isSel && styles.dayTextSel, isToday && !isSel && { color: colors.goldBright }]}>
                  {Number(date.slice(8))}
                </Text>
              </View>
              <View style={styles.dots}>
                {!!m?.events && <View style={[styles.dot, { backgroundColor: colors.gold }]} />}
                {!!m?.payments && <View style={[styles.dot, { backgroundColor: m.overdue ? colors.rust : colors.neonCyan }]} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.gold }]} /><Text style={styles.legendText}>Eventos</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.neonCyan }]} /><Text style={styles.legendText}>Pagos</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.rust }]} /><Text style={styles.legendText}>Vencidos</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 18, fontFamily: fonts.heading, fontWeight: '700', color: colors.onDark },
  nav: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder,
  },
  weekRow: { flexDirection: 'row' },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.onDarkMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  daySel: { backgroundColor: colors.gold },
  dayToday: { borderWidth: 1.5, borderColor: colors.gold },
  dayText: { fontSize: 14, fontWeight: '600', color: colors.onDark },
  dayTextSel: { color: colors.onNavy, fontWeight: '800' },
  dots: { flexDirection: 'row', gap: 3, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  legend: { flexDirection: 'row', gap: spacing.lg, justifyContent: 'center', marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 11, color: colors.onDarkMuted },
});
