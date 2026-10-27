// Salomon Design System - Colores profesionales para finanzas premium
export const colors = {
  // Brand primarios (confianza + lujo)
  primary: '#0F5132',        // Verde oscuro (solidez, finanzas)
  accent: '#C9A227',         // Oro (Ã©xito, prosperidad)

  // Estados
  success: '#28A745',        // Verde para positivos
  warning: '#FFC107',        // Amarillo para alertas
  error: '#DC3545',          // Rojo para errores
  info: '#17A2B8',           // Cian para info

  // Neutrales (limpieza visual)
  background: '#FBF8EE',     // Crema cÃ¡lida (base)
  surface: '#FFFFFF',        // Blanco (cards, modales)

  // Textos
  text: {
    primary: '#1A1A1A',      // Negro casi (principal)
    secondary: '#6E6E68',    // Gris (secundario)
    tertiary: '#9B9B91',     // Gris claro (tertiary)
    inverse: '#FFFFFF',      // Blanco (sobre oscuro)
  },

  // Bordes y divisores
  border: {
    light: '#E1DCC8',        // Beige suave
    medium: '#C9C4B0',       // Beige medio
    dark: '#999880',         // Gris oscuro
  },

  // Estados de fondo
  overlay: 'rgba(15, 81, 50, 0.1)',     // Verde transparente
  overlayDark: 'rgba(15, 81, 50, 0.2)', // Verde mÃ¡s oscuro
  overlayLight: 'rgba(201, 162, 39, 0.1)', // Oro transparente
};

// TipografÃ­a profesional
export const typography = {
  // TÃ­tulos (serif para confianza en finanzas)
  h1: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
  h2: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36 },
  h3: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
  h4: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },

  // Body (sans-serif para claridad)
  body1: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  body2: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  body3: { fontSize: 12, fontWeight: '400' as const, lineHeight: 18 },

  // Especializados
  label: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16 },
  caption: { fontSize: 11, fontWeight: '400' as const, lineHeight: 14 },
  button: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },

  // Monospace (para moneda)
  mono: { fontFamily: 'monospace', fontWeight: '500' as const },
};

// Espaciado (8px grid)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Sombras (elevaciÃ³n)
export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(15, 81, 50, 0.05)',
  md: '0 4px 8px rgba(15, 81, 50, 0.1)',
  lg: '0 12px 24px rgba(15, 81, 50, 0.15)',
  xl: '0 20px 40px rgba(15, 81, 50, 0.2)',
};

// Bordes redondeados (consistentes)
export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

