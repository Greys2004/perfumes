import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AppMenu from '../components/AppMenu';
import MenuButton from '../components/MenuButton';
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
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [navigationRef, setNavigationRef] = useState(null);
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

  if (!authReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={setNavigationRef}>
      {user ? (
        <>
          <Stack.Navigator
            screenOptions={({ navigation }) => ({
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              headerTitleStyle: { fontWeight: '900', fontSize: 16 },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.background },
              headerLeft: () => (
                <View style={styles.headerLeft}>
                  <MenuButton onPress={() => setMenuVisible(true)} />
                  {navigation.canGoBack() && (
                    <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                      <Text style={styles.backText}>{'<'}</Text>
                    </Pressable>
                  )}
                </View>
              ),
            })}
          >
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Inicio' }} />
            <Stack.Screen
              name="PerfumesList"
              component={PerfumesListScreen}
              options={{ title: 'Catalogo' }}
            />
            <Stack.Screen
              name="PerfumeForm"
              component={PerfumeFormScreen}
              options={{ title: 'Agregar perfume' }}
            />
            <Stack.Screen
              name="PerfumeDetail"
              component={PerfumeDetailScreen}
              options={{ title: 'Detalle' }}
            />
            <Stack.Screen
              name="ClientsList"
              component={ClientsListScreen}
              options={{ title: 'Clientes' }}
            />
            <Stack.Screen
              name="ClientForm"
              component={ClientFormScreen}
              options={{ title: 'Agregar cliente' }}
            />
            <Stack.Screen
              name="ClientDetail"
              component={ClientDetailScreen}
              options={{ title: 'Cliente' }}
            />
            <Stack.Screen
              name="SaleForm"
              component={SaleFormScreen}
              options={{ title: 'Nueva venta' }}
            />
            <Stack.Screen
              name="SaleDetail"
              component={SaleDetailScreen}
              options={{ title: 'Detalle venta' }}
            />
            <Stack.Screen name="Payments" component={PaymentsScreen} options={{ title: 'Pagos' }} />
            <Stack.Screen
              name="ReceivablesCalendar"
              component={ReceivablesCalendarScreen}
              options={{ title: 'Calendario de pagos' }}
            />
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{ title: 'Dashboard' }}
            />
          </Stack.Navigator>
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
    gap: 2,
  },
  backButton: {
    width: 36,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: colors.gold,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
  },
});
