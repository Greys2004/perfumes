import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import SearchBar from '../components/SearchBar';
import { colors, radius, spacing, shadow } from '../theme';
import { listenActivePerfumes } from '../services/perfumesService';
import { listenAllPresentationPrices } from '../services/presentationPricesService';

const typeLabels = {
  decant_3ml: '3 ml',
  decant_5ml: '5 ml',
  decant_10ml: '10 ml',
  botella_completa: 'Botella completa',
};

export default function HomeScreen() {
  const [perfumes, setPerfumes] = useState([]);
  const [prices, setPrices] = useState([]);
  const [search, setSearch] = useState('');
  const [showPrices, setShowPrices] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedImage, setExpandedImage] = useState(null);

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
            <Text style={styles.kicker}>Catálogo AromaOrigen</Text>
            <Text style={styles.title}>Perfumes Disponibles</Text>
            <Text style={styles.subtitle}>
              Explora aromas, marcas y descripciones olfativas de manera clara.
            </Text>
          </View>
          <View style={styles.priceToggleContainer}>
            <Text style={styles.priceToggleLabel}>Ver Precios</Text>
            <Switch
              value={showPrices}
              onValueChange={setShowPrices}
              trackColor={{ false: '#24262E', true: colors.gold }}
              thumbColor={showPrices ? colors.text : colors.textSubtle}
            />
          </View>
        </View>
      </View>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar por aroma, marca o nombre..."
      />

      {loading && <ActivityIndicator color={colors.gold} style={styles.loader} size="large" />}

      {!!error && (
        <View style={styles.messageBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!loading && !error && filteredPerfumes.length === 0 && (
        <View style={styles.emptyPanel}>
          <Feather name="info" size={24} color={colors.textSubtle} style={styles.emptyIcon} />
          <Text style={styles.emptyText}>No encontramos perfumes que coincidan con tu búsqueda.</Text>
        </View>
      )}

      {!loading &&
        !error &&
        filteredPerfumes.map((perfume) => (
          <View key={perfume.id} style={styles.perfumeCard}>
            <View style={styles.cardTop}>
              {perfume.imagen ? (
                <Pressable
                  onPress={() => setExpandedImage(perfume)}
                  style={styles.imageContainer}
                >
                  <Image source={{ uri: perfume.imagen }} style={styles.cardImage} />
                </Pressable>
              ) : (
                <View style={styles.bottleMark}>
                  <Text style={styles.bottleText}>{perfume.nombre?.charAt(0) || 'P'}</Text>
                </View>
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{perfume.nombre}</Text>
                <Text style={styles.cardBrand}>{perfume.marca || 'Marca Exclusiva'}</Text>
                {!!perfume.duracion && (
                  <View style={styles.duracionRow}>
                    <Feather name="clock" size={12} color={colors.gold} />
                    <Text style={styles.duracionText}>{perfume.duracion}</Text>
                  </View>
                )}
              </View>
            </View>

            {!!perfume.descripcion_olor && (
              <Text style={styles.description}>{perfume.descripcion_olor}</Text>
            )}

            <View style={styles.infoGrid}>
              {!!perfume.notas_salida && (
                <InfoRow icon="wind" label="Notas de Salida" value={perfume.notas_salida} />
              )}
              {!!perfume.notas_corazon && (
                <InfoRow icon="heart" label="Notas de Corazón" value={perfume.notas_corazon} />
              )}
              {!!perfume.notas_fondo && (
                <InfoRow icon="arrow-down" label="Notas de Fondo" value={perfume.notas_fondo} />
              )}
            </View>

            {showPrices && prices.some((price) => price.perfume_id === perfume.id) && (
              <View style={styles.priceSection}>
                <Text style={styles.priceSectionTitle}>Presentaciones & Precios</Text>
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
              </View>
            )}
          </View>
        ))}
      <Modal
        visible={!!expandedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setExpandedImage(null)}
      >
        <View style={styles.imageModalOverlay}>
          <Pressable style={styles.imageModalBackdrop} onPress={() => setExpandedImage(null)} />
          <View style={styles.imageModalContent}>
            <View style={styles.imageModalHeader}>
              <View>
                <Text style={styles.imageModalTitle}>{expandedImage?.nombre}</Text>
                <Text style={styles.imageModalSubtitle}>{expandedImage?.marca || 'Marca Exclusiva'}</Text>
              </View>
              <Pressable onPress={() => setExpandedImage(null)} style={styles.imageModalClose}>
                <Feather name="x" size={18} color={colors.ink} />
              </Pressable>
            </View>
            {!!expandedImage?.imagen && (
              <Image source={{ uri: expandedImage.imagen }} style={styles.expandedImage} />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLabelBlock}>
        <Feather name={icon} size={13} color={colors.gold} style={styles.infoIcon} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
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
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  heroPanel: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  heroTextBlock: {
    flex: 1,
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
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textSubtle,
    fontSize: 13,
    lineHeight: 18,
  },
  priceToggleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  priceToggleLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
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
    fontSize: 14,
    fontWeight: '700',
  },
  emptyPanel: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  emptyIcon: {
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  perfumeCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  imageContainer: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.sm,
    padding: 2,
  },
  cardImage: {
    width: 62,
    height: 74,
    borderRadius: radius.sm - 2,
    backgroundColor: colors.background,
  },
  bottleMark: {
    width: 62,
    height: 74,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.glow,
  },
  bottleText: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '900',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  cardBrand: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  duracionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  duracionText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  infoGrid: {
    marginTop: spacing.md,
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
    paddingVertical: 5,
  },
  infoLabelBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120,
  },
  infoIcon: {
    marginRight: 6,
  },
  infoLabel: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '700',
  },
  infoValue: {
    color: colors.textMuted,
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
  },
  priceSection: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.md,
  },
  priceSectionTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  priceStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pricePill: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flex: 1,
    minWidth: 110,
  },
  priceLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  priceValue: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '900',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.82)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  imageModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  imageModalContent: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.md,
    ...shadow.card,
  },
  imageModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  imageModalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  imageModalSubtitle: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  imageModalClose: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.glow,
  },
  expandedImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
});
