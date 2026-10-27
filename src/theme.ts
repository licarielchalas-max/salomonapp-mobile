export const fonts = {
  heading: 'PlayfairDisplay_700Bold',
  headingRegular: 'PlayfairDisplay_400Regular',
  body: 'DMSans_400Regular',
  bodyBold: 'DMSans_700Bold',
  bodySemiBold: 'DMSans_500Medium',
} as const;

export const colors = {
  // ── Fondos: esmeralda profundo (de más claro, arriba, a más oscuro) ──
  bg: '#06301A',
  bgDeep: '#0B5430',
  bgCard: 'rgba(255,255,255,0.07)',
  bgCardElevated: 'rgba(255,255,255,0.11)',

  // ── Acción principal: oro (el nombre "navy" viene del tema anterior) ──
  navy: '#E2BE4B',
  navyDark: '#B88A25',

  // ── Oro ──────────────────────────────────────────────────────────
  gold: '#E2BE4B',
  goldBright: '#F0D98A',
  goldDark: '#B88A25',
  goldLight: '#F6E3A1',
  goldSoft: 'rgba(226,190,75,0.14)',
  goldBorder: 'rgba(226,190,75,0.45)',

  // ── Acentos: menta (positivo/progreso) y ámbar (alerta) ───────────
  neonCyan: '#8FE9BD',
  neonCyanSoft: 'rgba(143,233,189,0.14)',
  neonCyanBorder: 'rgba(143,233,189,0.35)',
  neonAmber: '#F7B84B',
  neonAmberSoft: 'rgba(247,184,75,0.14)',
  neonAmberBorder: 'rgba(247,184,75,0.4)',

  // ── Bordes de cristal sobre fondo oscuro ──────────────────────────
  glassBorder: 'rgba(255,255,255,0.14)',
  glassBorderBright: 'rgba(255,255,255,0.28)',

  // ── Texto (marfil sobre esmeralda) ────────────────────────────────
  onDark: '#F4F0E2',
  onDarkMuted: 'rgba(244,240,226,0.74)',
  onDarkSubtle: 'rgba(244,240,226,0.66)',

  // ── Aliases de compatibilidad ────────────────────────────────────
  cream: '#F4F0E2',
  paper: 'rgba(255,255,255,0.09)',
  line: 'rgba(255,255,255,0.12)',
  ink: '#F4F0E2',
  muted: 'rgba(244,240,226,0.68)',
  onNavy: '#06301A',
  onNavyMuted: 'rgba(6,48,26,0.72)',

  // ── Semánticos ───────────────────────────────────────────────────
  green: '#7BE0B0',
  greenSoft: 'rgba(123,224,176,0.14)',
  greenBorder: 'rgba(123,224,176,0.38)',
  rust: '#FF8F7A',
  rustSoft: 'rgba(255,143,122,0.14)',
  rustBorder: 'rgba(255,143,122,0.42)',

  success: '#7BE0B0',
  error: '#FF8F7A',
  warning: '#F7B84B',
  info: '#8DBBFF',
  overlay: 'rgba(0,0,0,0.6)',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999, full: 9999 } as const;

export const typography = {
  screenTitle: { fontSize: 26, fontWeight: '700' as const, color: colors.onDark },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: colors.onDark },
  cardLabel: { fontSize: 12, fontWeight: '600' as const, color: colors.onDarkMuted },
  cardValue: { fontSize: 22, fontWeight: '700' as const, color: colors.onDark },
  heroValue: { fontSize: 34, fontWeight: '700' as const, color: colors.gold },
  body: { fontSize: 14, color: colors.onDark, lineHeight: 20 },
  bodySmall: { fontSize: 13, color: colors.onDarkMuted, lineHeight: 18 },
  caption: { fontSize: 11.5, color: colors.onDarkSubtle },
};

// Tarjeta reutilizable — cristal sobre esmeralda
export const glass = {
  base: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  elevated: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.glassBorderBright,
  },
  gold: {
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: colors.goldBorder,
  },
  cyan: {
    backgroundColor: colors.neonCyanSoft,
    borderWidth: 1,
    borderColor: colors.neonCyanBorder,
  },
  amber: {
    backgroundColor: colors.neonAmberSoft,
    borderWidth: 1,
    borderColor: colors.neonAmberBorder,
  },
} as const;

// boxShadow reemplaza a shadow* + elevation (en desuso en react-native-web y RN reciente).
export const shadow = {
  card: { boxShadow: '0 14px 26px -14px rgba(0,0,0,0.55)' },
  gold: { boxShadow: '0 8px 22px rgba(226,190,75,0.30)' },
  neon: { boxShadow: '0 2px 14px rgba(143,233,189,0.25)' },
  hero: { boxShadow: '0 20px 34px -16px rgba(0,0,0,0.6)' },
};
