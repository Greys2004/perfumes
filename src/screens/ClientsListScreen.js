import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import PrimaryButton from '../components/PrimaryButton';
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
          <Text style={styles.kicker}>Clientes</Text>
          <Text style={styles.title}>Directorio</Text>
        </View>
        <PrimaryButton
          title="Agregar"
          onPress={() => navigation.navigate('ClientForm')}
        />
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar por nombre, telefono o email"
        placeholderTextColor="#8f8f91"
        style={styles.searchInput}
      />

      {loading && <ActivityIndicator color="#d8ad62" style={styles.loader} />}

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
          ListEmptyComponent={
            <Text style={styles.emptyText}>Todavia no hay clientes registrados.</Text>
          }
          renderItem={({ item }) => (
            <ClientCard
              client={item}
              onPress={() => navigation.navigate('ClientDetail', { client: item })}
              onEdit={() => navigation.navigate('ClientForm', { client: item })}
              onDelete={() => {
                Alert.alert(
                  'Desactivar cliente',
                  'El cliente dejara de aparecer en la lista, pero sus ventas se conservan.',
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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{client.nombre?.charAt(0) || 'C'}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{client.nombre}</Text>
        <Text style={styles.cardText}>{client.telefono || 'Telefono pendiente'}</Text>
        {!!client.email && <Text style={styles.cardText}>{client.email}</Text>}
      </View>
      <Text style={styles.openText}>Ver</Text>
      <View style={styles.actions}>
        <Pressable onPress={onEdit} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Editar</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={styles.actionButtonDark}>
          <Text style={styles.actionButtonTextLight}>Quitar</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151518',
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  kicker: {
    color: '#d8ad62',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  title: {
    color: '#f8f4ed',
    fontSize: 32,
    fontWeight: '800',
  },
  searchInput: {
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: '#202126',
    borderWidth: 1,
    borderColor: '#514638',
    color: '#f8f4ed',
    fontSize: 15,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  loader: {
    marginTop: 28,
  },
  messageBox: {
    backgroundColor: '#3a2d2d',
    borderColor: '#7f4a4a',
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  errorText: {
    color: '#ffd7d7',
    fontSize: 14,
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyText: {
    color: '#c7c1b7',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 32,
  },
  card: {
    backgroundColor: '#222329',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#34353a',
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.84,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#d9ad69',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#1f1f20',
    fontSize: 20,
    fontWeight: '800',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    color: '#f8f4ed',
    fontSize: 17,
    fontWeight: '800',
  },
  cardText: {
    color: '#c7c1b7',
    fontSize: 14,
    marginTop: 3,
  },
  openText: {
    color: '#f0d19a',
    fontSize: 14,
    fontWeight: '800',
  },
  actions: {
    gap: 6,
  },
  actionButton: {
    borderRadius: 8,
    backgroundColor: '#d8ad62',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  actionButtonDark: {
    borderRadius: 8,
    backgroundColor: '#4a4a4c',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  actionButtonText: {
    color: '#1f1f20',
    fontSize: 12,
    fontWeight: '900',
  },
  actionButtonTextLight: {
    color: '#f8f4ed',
    fontSize: 12,
    fontWeight: '900',
  },
});
