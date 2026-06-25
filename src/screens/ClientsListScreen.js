import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import SearchBar from '../components/SearchBar';
import AnimatedPressable from '../components/AnimatedPressable';
import { colors, radius, spacing, shadow } from '../theme';
import { deactivateClient, listenClients } from '../services/clientsService';

export default function ClientsListScreen({ navigation }) {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = listenClients(
      (clientsList) => {
        setClients(clientsList);
        setLoading(false);
      },
      (firebaseError) => {
        setError(firebaseError.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const searchText = search.toLowerCase();
  const filteredClients = clients.filter((client) => {
    const searchableText = [client.nombre, client.telefono, client.email]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(searchText);
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Directorio Comercial</Text>
          <Text style={styles.title}>Clientes</Text>
        </View>
        <AnimatedPressable
          onPress={() => navigation.navigate('ClientForm')}
          style={styles.addButton}
        >
          <Feather name="user-plus" size={15} color={colors.ink} style={{ marginRight: 4 }} />
          <Text style={styles.addButtonText}>Agregar</Text>
        </AnimatedPressable>
      </View>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar por nombre, teléfono o email..."
      />

      {loading && <ActivityIndicator color={colors.gold} style={styles.loader} size="large" />}

      {!!error && (
        <View style={styles.messageBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={filteredClients}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="users" size={24} color={colors.textSubtle} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>Todavía no hay clientes registrados.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <ClientCard
              client={item}
              onPress={() => navigation.navigate('ClientDetail', { client: item })}
              onEdit={() => navigation.navigate('ClientForm', { client: item })}
              onDelete={() => {
                Alert.alert(
                  'Desactivar cliente',
                  `¿Deseas quitar a "${item.nombre}"? No se eliminarán sus ventas asociadas.`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Desactivar',
                      style: 'destructive',
                      onPress: () => deactivateClient(item.id),
                    },
                  ]
                );
              }}
            />
          )}
        />
      )}
    </View>
  );
}

function ClientCard({ client, onPress, onEdit, onDelete }) {
  return (
    <AnimatedPressable
      onPress={onPress}
      style={styles.card}
      scaleTo={0.98}
    >
      <View style={styles.cardBody}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{client.nombre?.charAt(0).toUpperCase() || 'C'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{client.nombre}</Text>
          {!!client.telefono && (
            <View style={styles.contactRow}>
              <Feather name="phone" size={11} color={colors.gold} />
              <Text style={styles.cardText}>{client.telefono}</Text>
            </View>
          )}
          {!!client.email && (
            <View style={styles.contactRow}>
              <Feather name="mail" size={11} color={colors.textSubtle} />
              <Text style={styles.cardText}>{client.email}</Text>
            </View>
          )}
        </View>
        <Feather name="chevron-right" size={18} color={colors.textSubtle} />
      </View>

      <View style={styles.cardFooter}>
        <Pressable onPress={onEdit} style={styles.actionButton}>
          <Feather name="edit-2" size={12} color={colors.ink} style={{ marginRight: 4 }} />
          <Text style={styles.actionButtonText}>Editar</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={styles.actionButtonDark}>
          <Feather name="user-minus" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
          <Text style={styles.actionButtonTextLight}>Quitar</Text>
        </Pressable>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: spacing.md,
  },
  kicker: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    minHeight: 38,
    ...shadow.glow,
  },
  addButtonText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  loader: {
    marginTop: 36,
  },
  messageBox: {
    backgroundColor: colors.dangerSurface,
    borderColor: colors.dangerLine,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 32,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.glow,
  },
  avatarText: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  cardText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    paddingTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDark: {
    flex: 1,
    minHeight: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '900',
  },
  actionButtonTextLight: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
  },
});
