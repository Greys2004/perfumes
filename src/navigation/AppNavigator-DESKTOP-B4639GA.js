import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import AppMenu from '../components/AppMenu';
import MenuButton from '../components/MenuButton';
import AnimatedPressable from '../components/AnimatedPressable';
import BottomLuxuryDock from '../components/BottomLuxuryDock';
import ClientDetailScreen from '../screens/ClientDetailScreen';
import ClientFormScreen from '../screens/ClientFormScreen';
import ClientsListScreen from '../screens/ClientsListScreen';
import DashboardScreen from '../screens/DashboardScreen';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import PerfumeDetailScreen from '../screens/PerfumeDetailScreen';
import PerfumeFormScreen from '../screens/PerfumeFormScreen';
import PerfumesListScreen from '../screens/PerfumesListScreen';
import ReceivablesCalendarScreen from '../screens/ReceivablesCalendarScreen';
import SaleDetailScreen from '../screens/SaleDetailScreen';
import SaleFormScreen from '../screens/SaleFormScreen';
import { listenAuthState, logout } from '../services/authService';
import { colors, radius, shadow } from '../theme';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [navigationRef, setNavigationRef] = useState(null);
  const [currentRoute, setCurrentRoute] = useState('Home');
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    return listenAuthState((currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
  }, []);

  function navigateFromMenu(routeName) {
    setMenuVisible(false);
    navigationRef?.navigate(routeName);
  }

  async function handleLogout() {
    setMenuVisible(false);
    await logout();
  }

  function handleNavigationStateChange() {
    const route = navigationRef?.getCurrentRoute();
    if (route?.name) {
      setCurrentRoute(route.name);
    }
  }

  if (!authReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={setNavigationRef}
      onReady={handleNavigationStateChange}
      onStateChange={handleNavigationStateChange}
    >
      {user ? (
        <>
          <Stack.Navigator
            screenOptions={({ navigation }) => ({
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              headerTitleStyle: {
                fontWeight: '900',
                fontSize: 15,
                letterSpacing: 1.5,
                color: colors.text,
                textTransform: 'uppercase',
              },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.background },
              headerLeft: () => (
                <View style={styles.headerLeft}>
                  <MenuButton onPress={() => setMenuVisible(true)} />
                  {navigation.canGoBack() && (
                    <AnimatedPressable
                      onPress={() => navigation.goBack()}
                      style={styles.backButton}
                      scaleTo={0.92}
                    >
                      <Feather name="chevron-left" size={20} color={colors.gold} />
                    </AnimatedPressable>
                  )}
                </View>
              ),
            })}
          >
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Boutique' }} />
            <Stack.Screen
              name="PerfumesList"
              component={PerfumesListScreen}
              options={{ title: 'Catálogo' }}
            />
            <Stack.Screen
              name="PerfumeForm"
              component={PerfumeFormScreen}
              options={{ title: 'Nueva Fragancia' }}
            />
            <Stack.Screen
              name="PerfumeDetail"
              component={PerfumeDetailScreen}
              options={{ title: 'Detalle Fragancia' }}
            />
            <Stack.Screen
              name="ClientsList"
              component={ClientsListScreen}
              options={{ title: 'Clientes' }}
            />
            <Stack.Screen
              name="ClientForm"
              component={ClientFormScreen}
              options={{ title: 'Nuevo Cliente' }}
            />
            <Stack.Screen
              name="ClientDetail"
              component={ClientDetailScreen}
              options={{ title: 'Ficha Cliente' }}
            />
            <Stack.Screen
              name="SaleForm"
              component={SaleFormScreen}
              options={{ title: 'Nueva Venta' }}
            />
            <Stack.Screen
              name="SaleDetail"
              component={SaleDetailScreen}
              options={{ title: 'Detalle Venta' }}
            />
            <Stack.Screen name="Payments" component={PaymentsScreen} options={{ title: 'Cobros & Pagos' }} />
            <Stack.Screen
              name="ReceivablesCalendar"
              component={ReceivablesCalendarScreen}
              options={{ title: 'Calendario Pagos' }}
            />
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{ title: 'Dashboard Ejecutivo' }}
            />
          </Stack.Navigator>
          <BottomLuxuryDock
            currentRoute={currentRoute}
            onNavigate={(routeName) => navigationRef?.navigate(routeName)}
          />
          <AppMenu
            visible={menuVisible}
            onClose={() => setMenuVisible(false)}
            onNavigate={navigateFromMenu}
            onLogout={handleLogout}
          />
        </>
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
