import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { TextInput } from './AppTextInput';
import { Text } from './AppText';
import { colors, radius, spacing } from '../theme';
import { dateLocale } from '../lib/i18n';

let NativeDatePicker: React.ComponentType<any> | null = null;
if (Platform.OS !== 'web') {
  NativeDatePicker = require('@react-native-community/datetimepicker').default;
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDisplay(d: Date) {
  return d.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Props {
  value: Date;
  onChange: (d: Date) => void;
  maximumDate?: Date;
  minimumDate?: Date;
}

export function DatePickerField({ value, onChange, maximumDate, minimumDate }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <TextInput
        style={styles.input}
        value={toDateStr(value)}
        onChangeText={(v) => {
          const d = new Date(v + 'T12:00:00');
          if (!isNaN(d.getTime())) onChange(d);
        }}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.muted}
      />
    );
  }

  return (
    <>
      <Pressable style={styles.btn} onPress={() => setShowPicker(true)}>
        <Text style={styles.btnText}>📅  {formatDisplay(value)}</Text>
      </Pressable>
      {showPicker && NativeDatePicker && (
        <NativeDatePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onChange={(_: any, selected?: Date) => {
            setShowPicker(Platform.OS === 'ios');
            if (selected) onChange(selected);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  btnText: { fontSize: 14, color: colors.ink, fontWeight: '500' },
  input: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    fontSize: 14,
    color: colors.ink,
  },
});
