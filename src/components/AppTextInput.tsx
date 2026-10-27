import React, { useSyncExternalStore } from 'react';
import { TextInput as RNTextInput, type TextInputProps } from 'react-native';
import { getLang, subscribeLang, tr } from '../lib/i18n';

// Campo de texto de la app: el texto de ayuda (placeholder) se muestra en el idioma elegido.
export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(function TextInput(props, ref) {
  useSyncExternalStore(subscribeLang, getLang);
  const { placeholder, ...rest } = props;
  return <RNTextInput ref={ref} {...rest} placeholder={placeholder ? tr(placeholder) : placeholder} />;
});
