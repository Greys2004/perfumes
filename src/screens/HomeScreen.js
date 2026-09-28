import { useEffect, useMemo, useState } from 'react';
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
import AnimatedPressable from '../components/AnimatedPressable';
import { colors, radius, spacing, shadow } from '../theme';
import { listenActivePerfumes } from '../services/perfumesService';
import { listenAllPresentationPrices } from '../services/presentationPricesService';

const typeLabels = {
  decant_3ml: '3 ml',
  decant_5ml: '5 ml',
  decant_10ml: '10 ml',
  botella_completa: 'Frasco',
};

const perfumeTypeFilters = [
  { label: 'Todos', value: 'all' },
  { label: 'Nicho', value: 'nicho' },
  { label: 'Diseñador', value: 'diseñador' },
  { label: 'Árabe', value: 'arabe' },
];

const perfumeGenderFilters = [
  { label: 'Todos', value: 'all' },
  { label: 'Unisex', value: 'unisex' },
  { label: 'Hombre', value: 'hombre' },
  { label: 'Mujer', value: 'mujer' },
];

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function HomeScreen({ navigation }) {
  const [perfumes, setPerfumes] = useState([]);
  const [prices, setPrices] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [brandSearch, setBrandSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const searchText = normalizeText(search);
  const filteredPerfumes = useMemo(() => {
    return perfumes.filter((perfume) => {
      const searchableText = normalizeText([
        perfume.nombre,
        perfume.marca,
        perfume.descripcion_olor,
        perfume.categoria_perfume,
        perfume.genero_perfume,
        perfume.notas_salida,
        perfume.notas_corazon,
        perfume.notas_fondo,
      ].join(' '));
      const matchesSearch = !searchText || searchableText.includes(searchText);
      const matchesType = selectedType === 'all' || perfume.categoria_perfume === selectedType;
      const matchesGender = selectedGender === 'all' || perfume.genero_perfume === selectedGender;
      const matchesBrand = selectedBrand === 'all' || perfume.marca === selectedBrand;

      return matchesSearch && matchesType && matchesGender && matchesBrand;
    });
  }, [perfumes, searchText, selectedBrand, selectedGender, selectedType]);

  const availableBrands = useMemo(() => {
    const brands = [...new Set(perfumes.map((perfume) => perfume.marca).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
    const normalizedBrandSearch = normalizeText(brandSearch);

    if (!normalizedBrandSearch) {
      return brands.slice(0, 10);
    }

    return brands.filter((brand) => normalizeText(brand).includes(normalizedBrandSearch)).slice(0, 10);
  }, [brandSearch, perfumes]);

  const activeFiltersCount = [
    selectedType !== 'all',
    selectedGender !== 'all',
    selectedBrand !== 'all',
  ].filter(Boolean).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Refined Luxury Header */}
      <View style={styles.headerBlock}>
        <View style={styles.headerTopRow}>
          <View style={styles.brandTitleBlock}>
            <Text style={styles.kicker}>HAUTE PARFUMERIE</Text>
            <Text style={styles.mainTitle}>AromaOrigen</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{filteredPerfumes.length} Fragancias</Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          Colección privada de extractos, decants y fórmulas exclusivas.
        </Text>
      </View>

      {/* Modern Search Bar */}
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar por nombre, casa, notas olfativas..."
      />

      {/* Quick Category Chips Strip (Always visible and intuitive!) */}
      <View style={styles.categoriesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryChipsScroll}
        >
          {perfumeTypeFilters.map((filter) => {
            const active = selectedType === filter.value;
            return (
              <AnimatedPressable
                key={filter.value}
                onPress={() => setSelectedType(filter.value)}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                scaleTo={0.94}
              >
                <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                  {filter.label}
                </Text>
              </AnimatedPressable>
            );
          })}

          <View style={styles.filterDivider} />

          {perfumeGenderFilters.map((filter) => {
            const active = selectedGender === filter.value;
            return (
              <AnimatedPressable
                key={filter.value}
                onPress={() => setSelectedGender(filter.value)}
                style={[styles.genderChip, active && styles.genderChipActive]}
                scaleTo={0.94}
              >
                <Text style={[styles.genderChipText, active && styles.genderChipTextActive]}>
                  {filter.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Brand Filter Drawer Toggle */}
      <View style={styles.brandFilterRow}>
        <AnimatedPressable
          onPress={() => setFiltersOpen((o) => !o)}
          style={styles.brandFilterToggle}
          scaleTo={0.95}
        >
          <Feather name="sliders" size={13} color={colors.gold} />
          <Text style={styles.brandFilterToggleText}>
            {selectedBrand === 'all' ? 'Filtrar por Casa de Perfume' : `Marca: ${selectedBrand}`}
          </Text>
          {selectedBrand !== 'all' && (
            <View style={styles.activeDot} />
          )}
          <Feather name={filtersOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
        </AnimatedPressable>

        {activeFiltersCount > 0 && (
          <AnimatedPressable
            onPress={() => {
              setSelectedType('all');
              setSelectedGender('all');
              setSelectedBrand('all');
              setSearch('');
            }}
            style={styles.clearBtn}
            scaleTo={0.92}
          >
            <Feather name="rotate-ccw" size={11} color={colors.danger} />
            <Text style={styles.clearBtnText}>Limpiar</Text>
          </AnimatedPressable>
        )}
      </View>

      {/* Collapsible Brands Drawer */}
      {filtersOpen && (
        <View style={styles.brandsDrawer}>
          <SearchBar
            value={brandSearch}
            onChangeText={setBrandSearch}
            placeholder="Buscar marca..."
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandChipsScroll}>
            <Pressable
              onPress={() => setSelectedBrand('all')}
              style={[styles.brandChip, selectedBrand === 'all' && styles.brandChipActive]}
            >
              <Text style={[styles.brandChipText, selectedBrand === 'all' && styles.brandChipTextActive]}>
                Todas
              </Text>
            </Pressable>
            {availableBrands.map((brand) => {
              const active = selectedBrand === brand;
              return (
                <Pressable
                  key={brand}
                  onPress={() => setSelectedBrand(brand)}
                  style={[styles.brandChip, active && styles.brandChipActive]}
                >
                  <Text style={[styles.brandChipText, active && styles.brandChipTextActive]}>
                    {brand}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {loading && <ActivityIndicator color={colors.amber} style={styles.loader} size="large" />}

      {!!error && (
        <View style={styles.errorBanner}>
          <Feather name="alert-circle" size={16} color={colors.danger} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {!loading && !error && filteredPerfumes.length === 0 && (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Feather name="compass" size={26} color={colors.gold} />
          </View>
          <Text style={styles.emptyCardTitle}>Sin coincidencias</Text>
          <Text style={styles.emptyCardSub}>
            No encontramos fragancias con esos filtros. Prueba a limpiar los criterios.
          </Text>
        </View>
      )}

      {/* Beautiful Fragrance Cards Stack */}
      {!loading && !error && (
        <View style={styles.cardsStack}>
          {filteredPerfumes.map((perfume) => {
            const perfumePrices = prices.filter((p) => p.perfume_id === perfume.id);

            return (
              <View key={perfume.id} style={styles.fragranceCard}>
                {/* Visual Area */}
                <View style={styles.cardHeaderArea}>
                  <Pressable
                    onPress={() => perfume.imagen && setExpandedImage(perfume)}
                    style={styles.imageWrapper}
                  >
                    {perfume.imagen ? (
                      <Image source={{ uri: perfume.imagen }} style={styles.bottleImage} resizeMode="contain" />
                    ) : (
                      <View style={styles.imageFallback}>
                        <Feather name="droplet" size={28} color={colors.gold} />
                        <Text style={styles.imageFallbackLetter}>
                          {perfume.nombre?.charAt(0) || 'A'}
                        </Text>
                      </View>
                    )}
                  </Pressable>

                  <View style={styles.headerInfo}>
                    <Text style={styles.cardBrand}>{perfume.marca?.toUpperCase() || 'ALTA GAMA'}</Text>
                    <Text style={styles.cardPerfumeTitle}>{perfume.nombre}</Text>

                    <View style={styles.badgesRow}>
                      {!!perfume.categoria_perfume && (
                        <View style={styles.tagBadge}>
                          <Text style={styles.tagBadgeText}>{perfume.categoria_perfume.toUpperCase()}</Text>
                        </View>
                      )}
                      {!!perfume.genero_perfume && (
                        <View style={styles.genderTag}>
                          <Text style={styles.genderTagText}>{perfume.genero_perfume}</Text>
                        </View>
                      )}
                      {!!perfume.duracion && (
                        <View style={styles.durationTag}>
                          <Feather name="clock" size={10} color={colors.textSubtle} />
                          <Text style={styles.durationTagText}>{perfume.duracion}</Text>
                        </View>
                      )}
                    </View>

                    {!!perfume.descripcion_olor && (
                      <Text style={styles.scentDescription} numberOfLines={2}>
                        {perfume.descripcion_olor}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Olfactory Notes Preview */}
                {(!!perfume.notas_salida || !!perfume.notas_corazon || !!perfume.notas_fondo) && (
                  <View style={styles.notesSummaryBox}>
                    {!!perfume.notas_salida && (
                      <View style={styles.noteItem}>
                        <Text style={styles.noteLabel}>Salida:</Text>
                        <Text style={styles.noteValue} numberOfLines={1}>{perfume.notas_salida}</Text>
                      </View>
                    )}
                    {!!perfume.notas_corazon && (
                      <View style={styles.noteItem}>
                        <Text style={styles.noteLabel}>Cuerpo:</Text>
                        <Text style={styles.noteValue} numberOfLines={1}>{perfume.notas_corazon}</Text>
                      </View>
                    )}
                    {!!perfume.notas_fondo && (
                      <View style={styles.noteItem}>
                        <Text style={styles.noteLabel}>Fondo:</Text>
                        <Text style={styles.noteValue} numberOfLines={1}>{perfume.notas_fondo}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Decant Presentation Prices Pills */}
                {perfumePrices.length > 0 && (
                  <View style={styles.pricesSection}>
                    <Text style={styles.pricesSectionLabel}>PRESENTACIONES DISPONIBLES</Text>
                    <View style={styles.pricePillsRow}>
                      {perfumePrices.map((price) => (
                        <View key={price.id} style={styles.pricePill}>
                          <Text style={styles.pricePillSize}>
                            {typeLabels[price.tipo] || `${price.ml}ml`}
                          </Text>
                          <Text style={styles.pricePillAmount}>
                            ${price.precio_publico}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Card Actions */}
                <View style={styles.cardActionsRow}>
                  <AnimatedPressable
                    onPress={() => navigation.navigate('PerfumeDetail', { perfume })}
                    style={styles.cardDetailBtn}
                    scaleTo={0.95}
                  >
                    <Feather name="layers" size={13} color={colors.text} />
                    <Text style={styles.cardDetailBtnText}>Ver Ficha Completa & Stock</Text>
                  </AnimatedPressable>

                  <AnimatedPressable
                    onPress={() => navigation.navigate('SaleForm', { perfumeId: perfume.id })}
                    style={styles.cardQuickSaleBtn}
                    scaleTo={0.95}
                  >
                    <Feather name="plus-circle" size={14} color="#FFFFFF" />
                    <Text style={styles.cardQuickSaleBtnText}>Vender</Text>
                  </AnimatedPressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Expanded Image Modal */}
      <Modal visible={!!expandedImage} transparent animationType="fade" onRequestClose={() => setExpandedImage(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setExpandedImage(null)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalBrand}>{expandedImage?.marca?.toUpperCase()}</Text>
                <Text style={styles.modalTitle}>{expandedImage?.nombre}</Text>
              </View>
              <Pressable onPress={() => setExpandedImage(null)} style={styles.modalCloseBtn}>
                <Feather name="x" size={16} color={colors.ink} />
              </Pressable>
            </View>
            {!!expandedImage?.imagen && (
              <Image source={{ uri: expandedImage.imagen }} style={styles.modalImage} resizeMode="contain" />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 110, // Safe padding for bottom luxury dock
  },

  // Refined Header Block
  headerBlock: {
    marginBottom: spacing.md,
    paddingTop: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandTitleBlock: {
    flex: 1,
  },
  kicker: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 2,
  },
  mainTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.3)',
    ...shadow.card,
  },
  countBadgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },

  // Categories Strip
  categoriesSection: {
    marginBottom: 10,
  },
  categoryChipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.25)',
    ...shadow.card,
  },
  categoryChipActive: {
    backgroundColor: colors.petroleum,
    borderColor: colors.petroleum,
  },
  categoryChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  filterDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(166, 136, 100, 0.3)',
    marginHorizontal: 4,
  },
  genderChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.2)',
  },
  genderChipActive: {
    backgroundColor: colors.amber,
    borderColor: colors.amber,
  },
  genderChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  genderChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  // Brand Filter Toggle Row
  brandFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  brandFilterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.25)',
  },
  brandFilterToggleText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.amber,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  clearBtnText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  brandsDrawer: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.25)',
    marginBottom: spacing.md,
    ...shadow.card,
  },
  brandChipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  brandChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.2)',
  },
  brandChipActive: {
    backgroundColor: colors.petroleum,
    borderColor: colors.petroleum,
  },
  brandChipText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  brandChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  // Fragrance Cards Stack
  cardsStack: {
    gap: 14,
  },
  fragranceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.22)',
    ...shadow.card,
  },
  cardHeaderArea: {
    flexDirection: 'row',
    gap: 12,
  },
  imageWrapper: {
    width: 90,
    height: 105,
    borderRadius: radius.md,
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bottleImage: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallbackLetter: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cardBrand: {
    color: colors.goldDark,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  cardPerfumeTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginTop: 2,
    marginBottom: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    backgroundColor: 'rgba(166, 106, 53, 0.12)',
  },
  tagBadgeText: {
    color: colors.amber,
    fontSize: 9,
    fontWeight: '800',
  },
  genderTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    backgroundColor: colors.surfaceSoft,
  },
  genderTagText: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  durationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    backgroundColor: colors.surfaceSoft,
  },
  durationTagText: {
    color: colors.textSubtle,
    fontSize: 9,
    fontWeight: '600',
  },
  scentDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },

  // Notes Summary Box
  notesSummaryBox: {
    backgroundColor: '#FAF7F2',
    borderRadius: radius.md,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.15)',
    gap: 4,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noteLabel: {
    color: colors.goldDark,
    fontSize: 10,
    fontWeight: '800',
    width: 44,
  },
  noteValue: {
    color: colors.text,
    fontSize: 11,
    flex: 1,
  },

  // Presentations / Prices Section
  pricesSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(166, 136, 100, 0.15)',
  },
  pricesSectionLabel: {
    color: colors.textSubtle,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },
  pricePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF7F2',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.25)',
  },
  pricePillSize: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  pricePillAmount: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '900',
  },

  // Card Actions
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  cardDetailBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FAF7F2',
    borderRadius: radius.pill,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.3)',
  },
  cardDetailBtnText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  cardQuickSaleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.amber,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 9,
    ...shadow.amberGlow,
  },
  cardQuickSaleBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  // States
  loader: {
    marginTop: 36,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(189, 83, 88, 0.1)',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.2)',
    ...shadow.card,
  },
  emptyIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FAF7F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.25)',
  },
  emptyCardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },
  emptyCardSub: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },

  // Image Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 50, 58, 0.85)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gold,
    ...shadow.card,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalBrand: {
    color: colors.goldDark,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: '100%',
    height: 300,
    borderRadius: radius.md,
  },
});
