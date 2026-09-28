import { Feather } from '@expo/vector-icons';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import AnimatedPressable from './AnimatedPressable';
import { colors, radius, spacing, shadow } from '../theme';

const adminTools = [
  {
    label: 'Gestión de Pagos & Abonos',
    sublabel: 'Registro de cobros y saldos',
    routeName: 'Payments',
    icon: 'credit-card',
    tone: 'amber',
  },
  {
    label: 'Calendario de Cobros',
    sublabel: 'Agenda de fechas prometidas',
    routeName: 'ReceivablesCalendar',
    icon: 'calendar',
    tone: 'gold',
  },
];

const quickActions = [
  {
    label: 'Nueva Fragancia',
    sublabel: 'Añadir fórmula al catálogo',
    routeName: 'PerfumeForm',
    icon: 'droplet',
  },
  {
    label: 'Nuevo Cliente',
    sublabel: 'Registrar contacto y gustos',
    routeName: 'ClientForm',
    icon: 'user-plus',
  },
];

export default function AppMenu({ visible, onClose, onNavigate, onLogout }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.drawer}>
          {/* Brand Card */}
          <View style={styles.brandBlock}>
            <View style={styles.brandHeader}>
              <Image source={require('../../assets/icon.png')} style={styles.logo} />
              <View style={styles.brandBadge}>
                <Text style={styles.kicker}>PANEL DE CONTROL</Text>
              </View>
            </View>
            <Text style={styles.title}>AromaOrigen</Text>
            <Text style={styles.subtitle}>Gestión de Alta Perfumería & Finanzas</Text>
          </View>

          {/* Tools not in Bottom Dock */}
          <Text style={styles.sectionHeader}>COBRANZA & CRÉDITO</Text>
          <View style={styles.group}>
            {adminTools.map((item) => (
              <AnimatedPressable
                key={item.routeName}
                onPress={() => {
                  onClose();
                  onNavigate(item.routeName);
                }}
                style={styles.menuItem}
              >
                <View style={styles.iconCircle}>
                  <Feather name={item.icon} size={16} color={colors.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuText}>{item.label}</Text>
                  <Text style={styles.menuSub}>{item.sublabel}</Text>
                </View>
                <Feather name="chevron-right" size={14} color={colors.amber} style={styles.arrow} />
              </AnimatedPressable>
            ))}
          </View>

          {/* Quick Creation Shortcuts */}
          <Text style={styles.sectionHeader}>ACCESOS RÁPIDOS</Text>
          <View style={styles.group}>
            {quickActions.map((item) => (
              <AnimatedPressable
                key={item.routeName}
                onPress={() => {
                  onClose();
                  onNavigate(item.routeName);
                }}
                style={styles.menuItem}
              >
                <View style={styles.iconCircle}>
                  <Feather name={item.icon} size={16} color={colors.goldLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuText}>{item.label}</Text>
                  <Text style={styles.menuSub}>{item.sublabel}</Text>
                </View>
                <Feather name="plus" size={14} color={colors.gold} style={styles.arrow} />
              </AnimatedPressable>
            ))}
          </View>

          {/* Footer & Session */}
          <View style={styles.footerNote}>
            <AnimatedPressable
              onPress={() => {
                onClose();
                onLogout();
              }}
              style={styles.logoutButton}
            >
              <View style={styles.logoutIcon}>
                <Feather name="log-out" size={16} color={colors.danger} />
              </View>
              <Text style={styles.logoutText}>Cerrar Sesión</Text>
            </AnimatedPressable>

            <View style={styles.dockNoteBox}>
              <Feather name="compass" size={12} color={colors.gold} style={{ marginRight: 6 }} />
              <Text style={styles.dockNoteText}>
                Boutique, Catálogo, Vender, Clientes y Finanzas están siempre disponibles en tu barra inferior.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(22, 50, 58, 0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    width: 310,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.3)',
    paddingTop: 54,
    paddingHorizontal: spacing.md,
    ...shadow.card,
  },
  brandBlock: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.28)',
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  brandBadge: {
    backgroundColor: 'rgba(166, 106, 53, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(166, 106, 53, 0.25)',
  },
  kicker: {
    color: colors.amber,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeader: {
    color: colors.amber,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: spacing.xs,
    paddingHorizontal: 4,
  },
  group: {
    gap: 8,
    marginBottom: spacing.md,
  },
  menuItem: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1.2,
    borderColor: 'rgba(166, 136, 100, 0.22)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    ...shadow.card,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.petroleum,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  menuText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  menuSub: {
    color: colors.textSubtle,
    fontSize: 10,
    marginTop: 1,
  },
  arrow: {
    opacity: 0.8,
    marginLeft: 6,
  },
  footerNote: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(166, 136, 100, 0.2)',
    paddingTop: spacing.md,
    marginTop: 'auto',
    marginBottom: 24,
  },
  logoutButton: {
    minHeight: 46,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.dangerLine,
    backgroundColor: colors.dangerSurface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  logoutIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '900',
    flex: 1,
  },
  dockNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(166, 136, 100, 0.08)',
    borderRadius: radius.sm,
    padding: 8,
  },
  dockNoteText: {
    color: colors.textSubtle,
    fontSize: 10,
    lineHeight: 14,
    flex: 1,
  },
});
