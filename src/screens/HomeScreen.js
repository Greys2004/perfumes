import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { listenActivePerfumes } from '../services/perfumesService';
import { listenAllPresentationPrices } from '../services/presentationPricesService';

const typeLabels = {
  decant_3ml: '3 ml',
  decant_5ml: '5 ml',
  decant_10ml: '10 ml',
  botella_completa: 'Botella',
};

export default function HomeScreen() {
  const [perfumes, setPerfumes] = useState([]);
  const [prices, setPrices] = useState([]);
  const [search, setSearch] = useState('');
  const [showPrices, setShowPrices] = useState(true);
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
    const unsubscribePrices = listenAllPresentationPrices(
      setPrices,
      (firebaseError) => setError(firebaseError.message)
    );

    return () => {
      unsubscribe();
      unsubscribePrices();
    };
  }, []);

  const searchText = search.toLowerCase();
  const filteredPerfumes = perfumes.filter((perfume) => {
    const searchableText = [
      perfume.nombre,
      perfume.marca,
      perfume.descripcion_olor,
      perfume.notas_salida,
      perfume.notas_corazon,
      perfume.notas_fondo,
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(searchText);
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroPanel}>
        <View style={styles.heroHeader}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.kicker}>Catalogo para cliente</Text>
            <Text style={styles.title}>Perfumes disponibles</Text>
            <Text style={styles.subtitle}>
              Vista limpia para mostrar aromas y notas sin datos internos.
            </Text>
          </View>
          <View style={styles.priceToggle}>
            <Text style={styles.priceToggleLabel}>Precios</Text>
            <Switch
              value={showPrices}
              onValueChange={setShowPrices}
              trackColor={{ false: '#494a4d', true: '#6db28f' }}
              thumbColor={showPrices ? '#f8f4ed' : '#b7b1a7'}
            />
          </View>
        </View>
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

      {!loading && !error && filteredPerfumes.length === 0 && (
        <View style={styles.emptyPanel}>
          <Text style={styles.emptyText}>Todavia no hay perfumes para mostrar.</Text>
        </View>
      )}

      {!loading &&
        !error &&
        filteredPerfumes.map((perfume) => (
          <View key={perfume.id} style={styles.perfumeCard}>
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

            <View style={styles.infoGrid}>
              {!!perfume.duracion && <InfoPill label="Duracion" value={perfume.duracion} />}
              {!!perfume.notas_salida && (
                <InfoPill label="Salida" value={perfume.notas_salida} />
              )}
              {!!perfume.notas_corazon && (
                <InfoPill label="Corazon" value={perfume.notas_corazon} />
              )}
              {!!perfume.notas_fondo && (
                <InfoPill label="Fondo" value={perfume.notas_fondo} />
              )}
            </View>

            {showPrices && prices.some((price) => price.perfume_id === perfume.id) && (
              <View style={styles.priceStrip}>
                {prices
                  .filter((price) => price.perfume_id === perfume.id)
                  .map((price) => (
                    <PricePill
                      key={price.id}
                      label={typeLabels[price.tipo] || price.tipo}
                      value={`$${price.precio_publico}`}
                    />
                  ))}
              </View>
            )}
          </View>
        ))}
    </ScrollView>
  );
}

function InfoPill({ label, value }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function PricePill({ label, value }) {
  return (
    <View style={styles.pricePill}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={styles.priceValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18191c',
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  heroPanel: {
    backgroundColor: '#25282d',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#5d4a2d',
    padding: 18,
    marginBottom: 16,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  heroTextBlock: {
    flex: 1,
  },
  kicker: {
    color: '#d8ad62',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  title: {
    color: '#f8f4ed',
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: '#ded4c5',
    fontSize: 15,
    lineHeight: 22,
  },
  priceToggle: {
    alignItems: 'center',
    gap: 6,
  },
  priceToggleLabel: {
    color: '#ded4c5',
    fontSize: 12,
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
  emptyPanel: {
    backgroundColor: '#303133',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444446',
    padding: 16,
  },
  emptyText: {
    color: '#c7c1b7',
    fontSize: 14,
    lineHeight: 20,
  },
  perfumeCard: {
    backgroundColor: '#232428',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3d3e42',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottleMark: {
    width: 52,
    height: 62,
    borderRadius: 8,
    backgroundColor: '#d8ad62',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottleText: {
    color: '#1f1f20',
    fontSize: 22,
    fontWeight: '900',
  },
  cardImage: {
    width: 74,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#1f1f20',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    color: '#f8f4ed',
    fontSize: 20,
    fontWeight: '900',
  },
  cardBrand: {
    color: '#c7c1b7',
    fontSize: 14,
    marginTop: 3,
  },
  description: {
    color: '#d7d2ca',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
  },
  infoGrid: {
    gap: 8,
    marginTop: 14,
  },
  pricePill: {
    backgroundColor: '#2b2c30',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#494236',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  priceStrip: {
    borderTopWidth: 1,
    borderTopColor: '#393a3f',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
  },
  priceLabel: {
    color: '#c7c1b7',
    fontSize: 12,
    fontWeight: '900',
  },
  priceValue: {
    color: '#f0d19a',
    fontSize: 13,
    fontWeight: '900',
  },
  infoPill: {
    backgroundColor: '#2f3035',
    borderRadius: 8,
    padding: 12,
  },
  infoLabel: {
    color: '#f0d19a',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
  },
  infoValue: {
    color: '#f8f4ed',
    fontSize: 14,
    lineHeight: 20,
  },
});
