export const colors = {
  background: '#090A0D',
  backgroundSoft: '#0E0F13',
  surface: '#121317',
  surfaceCard: '#17181D',
  surfaceRaised: '#1E2026',
  surfaceSoft: '#24262E',
  field: '#1E2026',
  overlay: 'rgba(255, 255, 255, 0.05)',
  line: 'rgba(255, 255, 255, 0.07)',
  lineStrong: 'rgba(229, 192, 123, 0.28)',
  lineSoft: 'rgba(255, 255, 255, 0.04)',
  gold: '#E5C07B', // Luxury champagne gold
  goldDark: '#C8A25D',
  goldMuted: '#9B7C41',
  text: '#F5F6F9',
  textMuted: '#D1D4DC',
  textSubtle: '#969AA6',
  success: '#6CB28F',
  successText: '#0E2218',
  danger: '#E57B7B',
  dangerSurface: 'rgba(229, 123, 123, 0.12)',
  dangerLine: 'rgba(229, 123, 123, 0.28)',
  warning: '#E5C07B',
  ink: '#1D180F',
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  glow: {
    shadowColor: colors.gold,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
};

export const type = {
  kicker: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
};

