import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

const menuItems = [
  { label: 'Inicio', routeName: 'Home', mark: '01' },
  { label: 'Catalogo', routeName: 'PerfumesList', mark: '02' },
  { label: 'Clientes', routeName: 'ClientsList', mark: '03' },
  { label: 'Ventas', routeName: 'SaleForm', mark: '04' },
  { label: 'Pagos', routeName: 'Payments', mark: '05' },
  { label: 'Dashboard', routeName: 'Dashboard', mark: '06' },
];

export default function AppMenu({ visible, onClose, onNavigate }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.drawer}>
          <View style={styles.brandBlock}>
            <Text style={styles.kicker}>Admin</Text>
            <Text style={styles.title}>Perfumes</Text>
            <Text style={styles.subtitle}>Inventario, clientes y ventas</Text>
          </View>

          <View style={styles.group}>
            {menuItems.map((item) => (
              <Pressable
                key={item.routeName}
                onPress={() => onNavigate(item.routeName)}
                style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
              >
                <Text style={styles.menuMark}>{item.mark}</Text>
                <Text style={styles.menuText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.footerNote}>
            <Text style={styles.sectionLabel}>Inicio es la vista para cliente.</Text>
            <Text style={styles.footerText}>Los datos internos viven en catalogo, pagos y dashboard.</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    width: 304,
    backgroundColor: '#18191c',
    borderRightWidth: 1,
    borderColor: '#5d4a2d',
    paddingTop: 58,
    paddingHorizontal: 16,
  },
  brandBlock: {
    backgroundColor: '#24201c',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4c3d2a',
    padding: 16,
    marginBottom: 18,
  },
  kicker: {
    color: '#d8ad62',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  title: {
    color: '#f8f4ed',
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 5,
  },
  subtitle: {
    color: '#b9b0a4',
    fontSize: 13,
    fontWeight: '700',
  },
  group: {
    gap: 8,
    marginBottom: 24,
  },
  menuItem: {
    minHeight: 54,
    borderRadius: 8,
    backgroundColor: '#222329',
    borderWidth: 1,
    borderColor: '#34353a',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  pressed: {
    opacity: 0.82,
  },
  menuMark: {
    width: 34,
    height: 34,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#d9ad69',
    color: '#1d1710',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 12,
    fontWeight: '900',
  },
  menuText: {
    color: '#f8f4ed',
    fontSize: 16,
    fontWeight: '800',
  },
  footerNote: {
    borderTopWidth: 1,
    borderTopColor: '#34353a',
    paddingTop: 16,
  },
  sectionLabel: {
    color: '#b9b0a4',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  footerText: {
    color: '#7f7a73',
    fontSize: 12,
    lineHeight: 18,
  },
});
