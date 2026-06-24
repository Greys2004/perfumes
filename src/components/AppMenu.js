import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

const menuItems = [
  { label: 'Inicio', routeName: 'Home' },
  { label: 'Catalogo', routeName: 'PerfumesList' },
  { label: 'Clientes', routeName: 'ClientsList' },
  { label: 'Ventas', routeName: 'SaleForm' },
  { label: 'Pagos', routeName: 'Payments' },
  { label: 'Dashboard', routeName: 'Dashboard' },
];

export default function AppMenu({ visible, onClose, onNavigate }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.drawer}>
          <Text style={styles.kicker}>Menu</Text>
          <Text style={styles.title}>Perfumes</Text>

          <View style={styles.group}>
            {menuItems.map((item) => (
              <Pressable
                key={item.routeName}
                onPress={() => onNavigate(item.routeName)}
                style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
              >
                <Text style={styles.menuText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Inicio es la vista para cliente.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    width: 286,
    backgroundColor: '#191a1d',
    borderRightWidth: 1,
    borderColor: '#5d5345',
    paddingTop: 58,
    paddingHorizontal: 18,
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
    marginBottom: 24,
  },
  group: {
    gap: 10,
    marginBottom: 24,
  },
  menuItem: {
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: '#25262a',
    borderWidth: 1,
    borderColor: '#3d3e42',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  pressed: {
    opacity: 0.82,
  },
  menuText: {
    color: '#f8f4ed',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionLabel: {
    color: '#b9b0a4',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
  },
});
