import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { SalomonEmblem } from './brand/SalomonEmblem';
import { colors, fonts, radius, spacing } from '../theme';

interface State {
  failed: boolean;
}

// Red de seguridad: si una pantalla falla, la persona ve un mensaje y puede reintentar
// en lugar de quedarse con la app en blanco.
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Error en la app:', error);
  }

  private retry = () => this.setState({ failed: false });

  private reload = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.reload();
    else this.retry();
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={styles.wrap}>
        <SalomonEmblem size={84} />
        <Text style={styles.title}>Algo salió mal</Text>
        <Text style={styles.sub}>No te preocupes: tus datos están a salvo. Intenta de nuevo; si sigue pasando, reinicia la app.</Text>
        <Pressable style={styles.btn} onPress={this.retry} accessibilityRole="button">
          <Text style={styles.btnText}>Reintentar</Text>
        </Pressable>
        <Pressable onPress={this.reload} accessibilityRole="button" style={styles.link}>
          <Text style={styles.linkText}>Reiniciar la app</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  title: { fontFamily: fonts.heading, fontSize: 24, color: colors.gold, marginTop: spacing.md, textAlign: 'center' },
  sub: { fontSize: 14, color: colors.onDarkMuted, textAlign: 'center', lineHeight: 21, maxWidth: 340, marginBottom: spacing.md },
  btn: { alignSelf: 'stretch', maxWidth: 340, width: '100%', alignItems: 'center', paddingVertical: 14, borderRadius: radius.md, backgroundColor: colors.gold },
  btnText: { color: colors.bg, fontWeight: '800', fontSize: 15 },
  link: { paddingVertical: spacing.md },
  linkText: { color: colors.onDarkMuted, fontWeight: '700', fontSize: 13 },
});
