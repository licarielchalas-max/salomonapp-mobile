import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList } from '../navigation/RootNavigator';

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Más'>, NativeStackScreenProps<RootStackParamList>>;

const GROUPS: { label: string; items: { route: keyof RootStackParamList; label: string }[] }[] = [
  {
    label: 'Finanzas',
    items: [
      { route: 'Presupuesto', label: 'Presupuesto' },
      { route: 'Cartera', label: 'Cartera' },
      { route: 'Metas', label: 'Metas' },
      { route: 'Deudas', label: 'Deudas' },
      { route: 'GastosProgramados', label: 'Gastos programados' },
    ],
  },
  {
    label: 'Herramientas',
    items: [
      { route: 'Agenda', label: 'Agenda' },
      { route: 'Bancos', label: 'Cuentas bancarias' },
      { route: 'Conciliacion', label: 'Conciliación' },
    ],
  },
  {
    label: 'Cuenta',
    items: [
      { route: 'Referidos', label: 'Referidos' },
      { route: 'Planes', label: 'Planes y suscripción' },
    ],
  },
];

export function MoreScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      {GROUPS.map((group) => (
        <View key={group.label} style={{ marginBottom: 20 }}>
          <Text style={styles.groupLabel}>{group.label}</Text>
          {group.items.map((item) => (
            <Pressable key={item.route} style={styles.item} onPress={() => navigation.navigate(item.route as never)}>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF8EE' },
  groupLabel: { fontSize: 11, fontWeight: '700', color: '#6E6E68', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E1DCC8',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  itemLabel: { fontSize: 14, fontWeight: '600', color: '#2C2C2C' },
  chevron: { color: '#6E6E68', fontSize: 16 },
});
