import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';

import AnimatedPressable from './AnimatedPressable';
import { colors, radius, shadow } from '../theme';

const tabs = [
  {
    name: 'Home',
    label: 'Boutique',
    icon: 'compass',
  },
  {
    name: 'PerfumesList',
    label: 'Catálogo',
    icon: 'droplet',
  },
  {
    name: 'SaleForm',
    label: 'Vender',
    icon: 'plus',
    isHero: true,
  },
  {
    name: 'ClientsList',
    label: 'Clientes',
    icon: 'users',
  },
  {
    name: 'Dashboard',
    label: 'Finanzas',
    icon: 'bar-chart-2',
  },
];

export default function BottomLuxuryDock({ currentRoute, onNavigate }) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets?.bottom || 0, 10);

  function handleTabPress(tabName) {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
    onNavigate(tabName);
  }

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      <LinearGradient
        colors={['#17323A', '#0D1E23']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.dockBar}
      >
        {tabs.map((tab) => {
          const isActive = currentRoute === tab.name;

          if (tab.isHero) {
            return (
              <AnimatedPressable
                key={tab.name}
                onPress={() => handleTabPress(tab.name)}
                style={styles.heroTabButton}
                scaleTo={0.92}
                accessibilityRole="button"
                accessibilityLabel="Nueva Venta"
              >
                <LinearGradient
                  colors={isActive ? ['#D4B38C', '#A66A35'] : ['#C4A987', '#A68864', '#704332']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.heroCircle, isActive && styles.heroCircleActive]}
                >
                  <Feather name={tab.icon} size={22} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.heroLabel, isActive && styles.heroLabelActive]}>
                  {tab.label}
                </Text>
              </AnimatedPressable>
            );
          }

          return (
            <AnimatedPressable
              key={tab.name}
              onPress={() => handleTabPress(tab.name)}
              style={styles.tabButton}
              scaleTo={0.94}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
            >
              {isActive && (
                <LinearGradient
                  colors={['#C4A987', '#A66A35']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.activeIndicator}
                />
              )}
              <Feather
                name={tab.icon}
                size={18}
                color={isActive ? colors.goldLight : colors.goldMuted}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
  },
  dockBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(166, 136, 100, 0.40)', // Borde oro champaña fino
    paddingVertical: 8,
    paddingHorizontal: 6,
    ...shadow.card,
    shadowColor: '#000',
    shadowOpacity: 0.65,
    shadowRadius: 20,
    elevation: 16,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: -4,
    width: 20,
    height: 3,
    borderRadius: radius.pill,
  },
  tabLabel: {
    color: 'rgba(166, 136, 100, 0.7)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: '#F4F1EA',
    fontWeight: '900',
  },
  heroTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    top: -14,
  },
  heroCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: '#F4F1EA',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.glow,
  },
  heroCircleActive: {
    borderColor: colors.amber,
  },
  heroLabel: {
    color: colors.goldLight,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 3,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroLabelActive: {
    color: '#FFFFFF',
  },
});
