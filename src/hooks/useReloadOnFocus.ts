import { useContext, useEffect } from 'react';
import { NavigationContext } from '@react-navigation/native';

// Vuelve a pedir los datos cuando la pantalla recupera el foco (p. ej. al volver
// de "Nuevo registro"), porque cada pantalla del stack permanece montada.
export function useReloadOnFocus(reload: () => void | Promise<unknown>) {
  const navigation = useContext(NavigationContext);
  useEffect(() => {
    if (!navigation) return;
    let first = true;
    return navigation.addListener('focus', () => {
      if (first) {
        first = false;
        return;
      }
      reload();
    });
  }, [navigation, reload]);
}
