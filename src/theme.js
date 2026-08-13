export const colors = {
  background: '#090A0D',
  backgroundSoft: '#111719',
  surface: '#101D21',
  surfaceCard: '#16323A',
  surfaceRaised: '#1E3B43',
  surfaceSoft: '#4E5557',
  field: '#111719',
  overlay: 'rgba(237, 222, 208, 0.06)',
  line: 'rgba(237, 222, 208, 0.12)',
  lineStrong: 'rgba(166, 136, 100, 0.38)',
  lineSoft: 'rgba(237, 222, 208, 0.06)',
  gold: '#A68864',
  goldDark: '#A66A35',
  goldMuted: '#837267',
  text: '#EDDED0',
  textMuted: '#CFC1B6',
  textSubtle: '#837267',
  success: '#5FAF8B',
  successText: '#EDDED0',
  danger: '#C99798',
  dangerSurface: 'rgba(201, 151, 152, 0.15)',
  dangerLine: 'rgba(201, 151, 152, 0.42)',
  warning: '#A66A35',
  ink: '#090A0D',
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

