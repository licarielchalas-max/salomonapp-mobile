import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';
import { navigationRef } from './navigationRef';
import { SalomonEmblem } from '../components/brand/SalomonEmblem';
import { Icon } from '../components/brand/Icon';
import { useDrawer } from './DrawerContext';

// Izquierda: "volver" si hay historial; si no, el emblema que abre el menú.
export function HeaderLeft() {
  const navigation = useNavigation();
  const { open } = useDrawer();
  const canGoBack = navigation.canGoBack();
  return (
    <Pressable
      onPress={() => (canGoBack ? navigation.goBack() : open())}
      style={styles.btn}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={canGoBack ? 'Volver' : 'Abrir menú'}
    >
      {canGoBack ? <Icon name="back" size={22} color={colors.onDark} /> : <SalomonEmblem size={20} ring={false} />}
    </Pressable>
  );
}

export function HeaderRight() {
  return (
    <View style={styles.row}>
      <Pressable
        style={styles.btn}
        hitSlop={8}
        onPress={() => navigationRef.current?.navigate('Preferencias')}
        accessibilityRole="button"
        accessibilityLabel="Preferencias"
      >
        <Icon name="settings" size={21} color={colors.onDark} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginHorizontal: 4,
  },
});
