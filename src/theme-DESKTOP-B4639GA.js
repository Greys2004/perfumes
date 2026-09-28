export const palette = {
  // Colores Principales
  petroleum: '#16323A',  // Azul petróleo
  mineral: '#4E5557',    // Gris mineral
  amber: '#A66A35',      // Ámbar miel
  copper: '#704332',     // Cobre brasa
  taupe: '#837267',      // Topo cálido
  rose: '#C99798',       // Cuarzo rosa

  // Colores Secundarios
  charcoal: '#0E1214',   // Carbón profundo
  ivory: '#F4F1EA',      // Marfil piedra
  gold: '#A68864',       // Oro champaña
  white: '#FFFFFF',
};

export const colors = {
  // Fondos y Superficies Luminosas (Marfil Piedra & Blanco Puro Satinado)
  background: '#F4F1EA',               // #F4F1EA - Marfil piedra cálido, limpio y espacioso
  backgroundSoft: '#EAE5DB',           // Fondo marfil suave
  surface: '#FFFFFF',                  // Blanco puro para tarjetas
  surfaceCard: '#FFFFFF',              // Tarjetas principales limpias
  surfaceRaised: '#FAF7F2',            // Superficies secundarias marfil suave
  surfaceSoft: '#EDE7DC',              // Fondos de chips inactivos
  field: '#FFFFFF',                    // Fondo de inputs
  fieldBorder: 'rgba(166, 136, 100, 0.35)',
  white: '#FFFFFF',

  // Acentos y Metálicos Nobles
  gold: palette.gold,                  // #A68864 - Oro champaña
  goldLight: '#C4A987',                // Oro champaña claro
  goldDark: '#8B6F4C',                 // Oro bronceado
  goldMuted: palette.taupe,            // #837267 - Topo cálido
  amber: palette.amber,                // #A66A35 - Ámbar miel
  copper: palette.copper,              // #704332 - Cobre brasa
  rose: palette.rose,                  // #C99798 - Cuarzo rosa
  ivory: palette.ivory,                // #F4F1EA - Marfil piedra
  petroleum: palette.petroleum,        // #16323A - Azul petróleo

  // Tipografía Elegante de Alta Gama (Azul Petróleo sobre Marfil)
  text: palette.petroleum,             // #16323A - Azul petróleo profundo (máxima legibilidad)
  textMuted: palette.mineral,          // #4E5557 - Gris mineral
  textSubtle: palette.taupe,           // #837267 - Topo cálido
  ink: '#FFFFFF',                      // Blanco para texto sobre botones oscuros/ámbar/oro

  // Líneas y Biseles Finos
  line: 'rgba(166, 136, 100, 0.22)',   // Borde Oro champaña suave
  lineStrong: palette.gold,            // #A68864 - Borde Oro champaña firme
  lineSoft: 'rgba(78, 85, 87, 0.12)',  // Borde Gris mineral sutil
  overlay: 'rgba(22, 50, 58, 0.04)',

  // Estados
  success: '#2E7D5B',                  // Verde jade noble
  successText: '#FFFFFF',
  danger: '#BD5358',                   // Cuarzo terracota
  dangerSurface: 'rgba(201, 151, 152, 0.2)',
  dangerLine: 'rgba(201, 151, 152, 0.6)',
  warning: palette.amber,              // #A66A35 - Ámbar miel
};

export const radius = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const shadow = {
  card: {
    shadowColor: '#16323A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  glow: {
    shadowColor: palette.gold,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  amberGlow: {
    shadowColor: palette.amber,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  copperGlow: {
    shadowColor: palette.copper,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
};

export const shadows = shadow;

export const type = {
  kicker: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
};

const theme = {
  palette,
  colors,
  radius,
  spacing,
  shadow,
  shadows,
  type,
};

export default theme;

