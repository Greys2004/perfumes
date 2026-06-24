import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import PrimaryButton from '../components/PrimaryButton';
import {
  deactivatePerfume,
  listenActivePerfumes,
  listenInactivePerfumes,
  restorePerfume,
} from '../services/perfumesService';

export default function PerfumesListScreen({ navigation }) {
  const [perfumes, setPerfumes] = useState([]);
  const [inactivePerfumes, setInactivePerfumes] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = listenActivePerfumes(
      (perfumesList) => {
        setPerfumes(perfumesList);
        setLoading(false);
      },
      (firebaseError) => {
        setError(firebaseError.message);
        setLoading(false);
      }
    );
    const unsubscribeInactive = listenInactivePerfumes(
      setInactivePerfumes,
      (firebaseError) => setError(firebaseError.message)
    );

    return () => {
      unsubscribe();
      unsubscribeInactive();
    };
  }, []);

  const searchText = search.toLowerCase();
  const filteredPerfumes = perfumes.filter((perfume) => {
    const searchableText = [
      perfume.nombre,
      perfume.marca,
      perfume.descripcion_olor,
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(searchText);
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Catalogo</Text>
          <Text style={styles.title}>Perfumes</Text>
        </View>
        <PrimaryButton
          title="Agregar"
          onPress={() => navigation.navigate('PerfumeForm')}
        />
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar por nombre, marca u olor"
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
          data={filteredPerfumes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Todavia no hay perfumes registrados.
            </Text>
          }
          ListFooterComponent={
            <InactivePerfumesSection
              perfumes={inactivePerfumes}
              onRestore={(perfume) => {
                Alert.alert(
                  'Activar perfume',
                  `${perfume.nombre} volvera a aparecer en el catalogo y en ventas.`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Activar',
                      onPress: () => restorePerfume(perfume.id),
                    },
                  ]
                );
              }}
            />
          }
          renderItem={({ item }) => (
            <PerfumeCard
              perfume={item}
              onPress={() => navigation.navigate('PerfumeDetail', { perfume: item })}
              onEdit={() => navigation.navigate('PerfumeForm', { perfume: item })}
              onDelete={() => {
                Alert.alert(
                  'Desactivar perfume',
                  'No se borrara definitivamente, solo dejara de aparecer activo.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Desactivar',
                      style: 'destructive',
                      onPress: () => deactivatePerfume(item.id),
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

function InactivePerfumesSection({ perfumes, onRestore }) {
  return (
    <View style={styles.inactiveSection}>
      <Text style={styles.inactiveTitle}>Desactivados</Text>
      <Text style={styles.inactiveSubtitle}>
        Aqui quedan los perfumes que ocultaste para poder recuperarlos despues.
      </Text>
      {perfumes.length === 0 ? (
        <Text style={styles.inactiveEmpty}>No hay perfumes desactivados.</Text>
      ) : (
        perfumes.map((perfume) => (
          <View key={perfume.id} style={styles.inactiveCard}>
            <View style={styles.inactiveInfo}>
              <Text style={styles.inactiveName}>{perfume.nombre}</Text>
              <Text style={styles.inactiveBrand}>{perfume.marca || 'Marca pendiente'}</Text>
            </View>
            <Pressable onPress={() => onRestore(perfume)} style={styles.restoreButton}>
              <Text style={styles.restoreButtonText}>Activar</Text>
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
}

function PerfumeCard({ perfume, onPress, onEdit, onDelete }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardTop}>
        {perfume.imagen ? (
          <Image source={{ uri: perfume.imagen }} style={styles.cardImage} />
        ) : (
          <View style={styles.bottleMark}>
            <Text style={styles.bottleText}>{perfume.nombre?.charAt(0) || 'P'}</Text>
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{perfume.nombre}</Text>
          <Text style={styles.cardBrand}>{perfume.marca || 'Marca pendiente'}</Text>
        </View>
      </View>

      {!!perfume.descripcion_olor && (
        <Text style={styles.description}>{perfume.descripcion_olor}</Text>
      )}

      <View style={styles.cardMetaRow}>
        <Text style={styles.metaText}>{perfume.ml_botella_completa || 0} ml</Text>
        <Text style={styles.metaText}>Liverpool ${perfume.precio_liverpool || 0}</Text>
        <Text style={styles.openText}>Ver detalle</Text>
      </View>
      <View style={styles.adminActions}>
        <Pressable onPress={onEdit} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Editar</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={styles.actionButtonDark}>
          <Text style={styles.actionButtonTextLight}>Desactivar</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18191c',
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
    backgroundColor: '#222327',
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
    backgroundColor: '#232428',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3d3e42',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.84,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottleMark: {
    width: 46,
    height: 54,
    borderRadius: 8,
    backgroundColor: '#d8ad62',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottleText: {
    color: '#1f1f20',
    fontSize: 20,
    fontWeight: '800',
  },
  cardImage: {
    width: 56,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#1f1f20',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    color: '#f8f4ed',
    fontSize: 18,
    fontWeight: '800',
  },
  cardBrand: {
    color: '#c7c1b7',
    fontSize: 14,
    marginTop: 2,
  },
  description: {
    color: '#d7d2ca',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  cardMetaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  metaText: {
    color: '#f0d19a',
    backgroundColor: '#2f3035',
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    fontWeight: '700',
  },
  openText: {
    color: '#f8f4ed',
    backgroundColor: '#4a3d2e',
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    fontWeight: '700',
  },
  adminActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: '#d8ad62',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDark: {
    flex: 1,
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: '#4a4a4c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#1f1f20',
    fontSize: 13,
    fontWeight: '900',
  },
  actionButtonTextLight: {
    color: '#f8f4ed',
    fontSize: 13,
    fontWeight: '900',
  },
  inactiveSection: {
    backgroundColor: '#202124',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#35363a',
    padding: 14,
    marginTop: 10,
  },
  inactiveTitle: {
    color: '#f8f4ed',
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 4,
  },
  inactiveSubtitle: {
    color: '#a9a59f',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  inactiveEmpty: {
    color: '#8f8f91',
    fontSize: 14,
  },
  inactiveCard: {
    minHeight: 58,
    borderRadius: 8,
    backgroundColor: '#2b2c30',
    borderWidth: 1,
    borderColor: '#3d3e42',
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  inactiveInfo: {
    flex: 1,
  },
  inactiveName: {
    color: '#f8f4ed',
    fontSize: 15,
    fontWeight: '800',
  },
  inactiveBrand: {
    color: '#a9a59f',
    fontSize: 13,
    marginTop: 2,
  },
  restoreButton: {
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: '#6db28f',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  restoreButtonText: {
    color: '#14241d',
    fontSize: 13,
    fontWeight: '900',
  },
});
