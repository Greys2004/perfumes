import { Feather } from '@expo/vector-icons';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import AnimatedPressable from './AnimatedPressable';
import { colors, radius, spacing } from '../theme';

const menuItems = [
  { label: 'Inicio', routeName: 'Home', icon: 'home' },
  { label: 'Catalogo', routeName: 'PerfumesList', icon: 'tag' },
  { label: 'Clientes', routeName: 'ClientsList', icon: 'users' },
  { label: 'Nueva Venta', routeName: 'SaleForm', icon: 'shopping-cart' },
  { label: 'Pagos', routeName: 'Payments', icon: 'credit-card' },
  { label: 'Calendario Pagos', routeName: 'ReceivablesCalendar', icon: 'calendar' },
  { label: 'Dashboard', routeName: 'Dashboard', icon: 'pie-chart' },
];

export default function AppMenu({ visible, onClose, onNavigate, onLogout }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.drawer}>
          <View style={styles.brandBlock}>
            <View style={styles.brandHeader}>
              <Image source={require('../../assets/icon.png')} style={styles.logo} />
              <Text style={styles.kicker}>Admin Panel</Text>
            </View>
            <Text style={styles.title}>AromaOrigen</Text>
            <Text style={styles.subtitle}>Gestion de Perfumes & Clientes</Text>
          </View>

          <View style={styles.group}>
            {menuItems.map((item) => (
              <AnimatedPressable
                key={item.routeName}
                onPress={() => onNavigate(item.routeName)}
                style={styles.menuItem}
              >
                <View style={styles.iconCircle}>
                  <Feather name={item.icon} size={16} color={colors.ink} />
                </View>
                <Text style={styles.menuText}>{item.label}</Text>
                <Feather name="chevron-right" size={14} color={colors.textSubtle} style={styles.arrow} />
              </AnimatedPressable>
            ))}
          </View>

          <View style={styles.footerNote}>
            <AnimatedPressable onPress={onLogout} style={styles.logoutButton}>
              <View style={styles.logoutIcon}>
                <Feather name="log-out" size={16} color={colors.danger} />
              </View>
              <Text style={styles.logoutText}>Cerrar sesion</Text>
            </AnimatedPressable>

            <Text style={styles.sectionLabel}>Nota de navegacion</Text>
            <Text style={styles.footerText}>
              "Inicio" es la vista publica del catalogo de perfumes. Las demas opciones son administrativas internas.
            </Text>
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
    backgroundColor: 'rgba(5, 5, 8, 0.75)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    width: 290,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderColor: colors.line,
    paddingTop: 54,
    paddingHorizontal: spacing.md,
  },
  brandBlock: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  kicker: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 2,
  },
  subtitle: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '700',
  },
  group: {
    gap: 10,
    marginBottom: spacing.xl,
  },
  menuItem: {
    minHeight: 50,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  menuText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  arrow: {
    opacity: 0.6,
  },
  footerNote: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.md,
    marginTop: 'auto',
    marginBottom: 24,
  },
  logoutButton: {
    minHeight: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.dangerLine,
    backgroundColor: colors.dangerSurface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  logoutIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '900',
    flex: 1,
  },
  sectionLabel: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  footerText: {
    color: colors.textSubtle,
    fontSize: 12,
    lineHeight: 18,
  },
});
