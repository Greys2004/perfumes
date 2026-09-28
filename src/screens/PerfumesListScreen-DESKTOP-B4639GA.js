import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import SearchBar from '../components/SearchBar';
import AnimatedPressable from '../components/AnimatedPressable';
import { colors, radius, spacing, shadow } from '../theme';
import {
  deactivatePerfume,
  listenActivePerfumes,
  listenInactivePerfumes,
  restorePerfume,
} from '../services/perfumesService';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getPerfumeSearchText(perfume) {
  return normalizeText([
    perfume.nombre,
    perfume.marca,
    perfume.descripcion_olor,
    perfume.categoria_perfume,
    perfume.genero_perfume,
    perfume.notas_salida,
    perfume.notas_corazon,
    perfume.notas_fondo,
  ].join(' '));
}

const typeFilters = [
  { label: 'Todos', value: 'all' },
  { label: 'Nicho', value: 'nicho' },
  { label: 'Diseñador', value: 'diseñador' },
  { label: 'Árabe', value: 'arabe' },
];

const genderFilters = [
  { label: 'Todos', value: 'all' },
  { label: 'Unisex', value: 'unisex' },
  { label: 'Hombre', value: 'hombre' },
  { label: 'Mujer', value: 'mujer' },
];

export default function PerfumesListScreen({ navigation }) {
  const [perfumes, setPerfumes] = useState([]);
  const [inactivePerfumes, setInactivePerfumes] = useState([]);
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [brandSearch, setBrandSearch] = useState('');
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

  const searchText = normalizeText(search);
  const filteredPerfumes = useMemo(() => {
    return perfumes.filter((perfume) => {
      const matchesSearch = !searchText || getPerfumeSearchText(perfume).includes(searchText);
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
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View>
          <View style={styles.headerKickerRow}>
            <Text style={styles.kicker}>Gestión de Fragancias</Text>
            <View style={styles.countBadgeChip}>
              <Text style={styles.countBadgeChipText}>{filteredPerfumes.length} Fragancias</Text>
            </View>
          </View>
          <Text style={styles.title}>Catálogo de Stock</Text>
        </View>
        <AnimatedPressable
          onPress={() => navigation.navigate('PerfumeForm')}
          style={styles.addButton}
          scaleTo={0.94}
        >
          <Feather name="plus" size={16} color={colors.white} style={{ marginRight: 6 }} />
          <Text style={styles.addButtonText}>Agregar</Text>
        </AnimatedPressable>
      </View>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar perfume, marca, familia olfativa..."
      />

      {/* Filter Trigger */}
      <Pressable onPress={() => setFiltersOpen((open) => !open)} style={styles.filterBarButton}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="sliders" size={14} color={colors.gold} />
          <Text style={styles.filterBarButtonText}>Filtrar Inventario</Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterCountBadge}>
              <Text style={styles.filterCountBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </View>
        <Feather name={filtersOpen ? 'chevron-up' : 'chevron-down'} size={15} color={colors.gold} />
      </Pressable>

      {/* Filter Drawer */}
      {filtersOpen && (
        <View style={styles.filtersDrawer}>
          <Text style={styles.filterSectionTitle}>Familia / Tipo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
            {typeFilters.map((filter) => {
              const active = selectedType === filter.value;
              return (
                <Pressable
                  key={filter.value}
                  onPress={() => setSelectedType(filter.value)}
                  style={[styles.luxuryChip, active && styles.luxuryChipActive]}
                >
                  <Text style={[styles.luxuryChipText, active && styles.luxuryChipTextActive]}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.filterSectionTitle}>Género</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
            {genderFilters.map((filter) => {
              const active = selectedGender === filter.value;
              return (
                <Pressable
                  key={filter.value}
                  onPress={() => setSelectedGender(filter.value)}
                  style={[styles.luxuryChip, active && styles.luxuryChipActive]}
                >
                  <Text style={[styles.luxuryChipText, active && styles.luxuryChipTextActive]}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.filterSectionTitle}>Casa / Marca</Text>
          <SearchBar
            value={brandSearch}
            onChangeText={setBrandSearch}
            placeholder="Buscar marca..."
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
            <Pressable
              onPress={() => setSelectedBrand('all')}
              style={[styles.luxuryChip, selectedBrand === 'all' && styles.luxuryChipActive]}
            >
              <Text style={[styles.luxuryChipText, selectedBrand === 'all' && styles.luxuryChipTextActive]}>
                Todas
              </Text>
            </Pressable>
            {availableBrands.map((brand) => {
              const active = selectedBrand === brand;
              return (
                <Pressable
                  key={brand}
                  onPress={() => setSelectedBrand(brand)}
                  style={[styles.luxuryChip, active && styles.luxuryChipActive]}
                >
                  <Text style={[styles.luxuryChipText, active && styles.luxuryChipTextActive]}>
                    {brand}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {activeFiltersCount > 0 && (
            <Pressable
              onPress={() => {
                setSelectedType('all');
                setSelectedGender('all');
                setSelectedBrand('all');
                setBrandSearch('');
              }}
              style={styles.resetFiltersBtn}
            >
              <Feather name="rotate-ccw" size={12} color={colors.ink} style={{ marginRight: 6 }} />
              <Text style={styles.resetFiltersBtnText}>Restablecer</Text>
            </Pressable>
          )}
        </View>
      )}

      {loading && <ActivityIndicator color={colors.gold} style={styles.loader} size="large" />}

      {!!error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={filteredPerfumes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Feather name="box" size={32} color={colors.gold} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyCardTitle}>No hay perfumes registrados</Text>
              <Text style={styles.emptyCardSub}>Toca en "Agregar" para registrar una nueva fragancia.</Text>
            </View>
          }
          ListFooterComponent={
            <InactivePerfumesSection
              perfumes={inactivePerfumes}
              onRestore={(perfume) => {
                Alert.alert(
                  'Activar perfume',
                  `"${perfume.nombre}" volverá a aparecer en el catálogo público y ventas.`,
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
              onSell={() => navigation.navigate('SaleForm', { perfumeId: item.id })}
              onDelete={() => {
                Alert.alert(
                  'Ocultar perfume',
                  'El perfume no se borrará definitivamente, solo se ocultará temporalmente.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Ocultar',
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
  if (perfumes.length === 0) return null;

  return (
    <View style={styles.inactiveSection}>
      <View style={styles.inactiveHeader}>
        <Feather name="eye-off" size={16} color={colors.rose} />
        <Text style={styles.inactiveTitle}>Fragancias Archivadas</Text>
      </View>
      <Text style={styles.inactiveSubtitle}>
        Perfumes temporalmente ocultos de la venta y catálogo público.
      </Text>
      {perfumes.map((perfume) => (
        <View key={perfume.id} style={styles.inactiveCard}>
          <View style={styles.inactiveInfo}>
            <Text style={styles.inactiveName}>{perfume.nombre}</Text>
            <Text style={styles.inactiveBrand}>{perfume.marca?.toUpperCase() || 'ALTA GAMA'}</Text>
          </View>
          <AnimatedPressable onPress={() => onRestore(perfume)} style={styles.restoreButton} scaleTo={0.94}>
            <Feather name="rotate-ccw" size={13} color={colors.ink} style={{ marginRight: 4 }} />
            <Text style={styles.restoreButtonText}>Restaurar</Text>
          </AnimatedPressable>
        </View>
      ))}
    </View>
  );
}

function PerfumeCard({ perfume, onPress, onEdit, onDelete, onSell }) {
  return (
    <AnimatedPressable
      onPress={onPress}
      style={styles.card}
      scaleTo={0.98}
    >
      <View style={styles.cardTop}>
        {perfume.imagen ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: perfume.imagen }} style={styles.cardImage} resizeMode="contain" />
          </View>
        ) : (
          <View style={styles.bottleMark}>
            <Text style={styles.bottleText}>{perfume.nombre?.charAt(0) || 'P'}</Text>
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardBrand}>{perfume.marca?.toUpperCase() || 'MARCA EXCLUSIVA'}</Text>
          <Text style={styles.cardTitle}>{perfume.nombre}</Text>

          <View style={styles.pillRow}>
            {!!perfume.categoria_perfume && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>{perfume.categoria_perfume?.toUpperCase()}</Text>
              </View>
            )}
            {!!perfume.genero_perfume && (
              <View style={styles.metaChipWarm}>
                <Text style={styles.metaChipTextWarm}>{perfume.genero_perfume?.toUpperCase()}</Text>
              </View>
            )}
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={colors.gold} />
      </View>

      {!!perfume.descripcion_olor && (
        <Text style={styles.description} numberOfLines={2}>"{perfume.descripcion_olor}"</Text>
      )}

      <View style={styles.cardMetaRow}>
        <View style={styles.metaBadge}>
          <Feather name="droplet" size={12} color={colors.gold} style={{ marginRight: 5 }} />
          <Text style={styles.metaText}>{perfume.ml_botella_completa || 0} ml</Text>
        </View>
        <View style={styles.metaBadge}>
          <Feather name="shopping-bag" size={12} color={colors.gold} style={{ marginRight: 5 }} />
          <Text style={styles.metaText}>Ref: ${perfume.precio_liverpool || 0}</Text>
        </View>
      </View>

      <View style={styles.adminActions}>
        <Pressable onPress={onSell} style={styles.actionButtonSell}>
          <Feather name="plus-circle" size={13} color={colors.gold} style={{ marginRight: 5 }} />
          <Text style={styles.actionButtonSellText}>Vender</Text>
        </Pressable>
        <Pressable onPress={onEdit} style={styles.actionButton}>
          <Feather name="edit-2" size={13} color={colors.ink} style={{ marginRight: 5 }} />
          <Text style={styles.actionButtonText}>Editar</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={styles.actionButtonDark}>
          <Feather name="eye-off" size={13} color={colors.rose} />
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
    color: colors.amber,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.petroleum,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    minHeight: 40,
    ...shadow.card,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  loader: {
    marginTop: 40,
  },
  errorBanner: {
    backgroundColor: colors.dangerSurface,
    borderColor: colors.dangerLine,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
  },
  listContent: {
    paddingBottom: 110,
  },
  filterBarButton: {
    minHeight: 46,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: spacing.md,
    marginTop: -4,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow.card,
  },
  filterBarButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  filterCountBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  filterCountBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '900',
  },
  filtersDrawer: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  filterSectionTitle: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  filterChipsScroll: {
    gap: 8,
    paddingBottom: spacing.md,
  },
  luxuryChip: {
    minHeight: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  luxuryChipActive: {
    backgroundColor: colors.petroleum,
    borderColor: colors.petroleum,
  },
  luxuryChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  luxuryChipTextActive: {
    color: colors.white,
    fontWeight: '900',
  },
  resetFiltersBtn: {
    alignSelf: 'flex-start',
    minHeight: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  resetFiltersBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    ...shadow.card,
  },
  emptyCardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  emptyCardSub: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing.lg,
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
    borderRadius: radius.md,
    padding: 3,
    backgroundColor: colors.field,
    width: 68,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: radius.sm,
  },
  bottleMark: {
    width: 68,
    height: 80,
    borderRadius: radius.md,
    backgroundColor: colors.petroleum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottleText: {
    color: colors.gold,
    fontSize: 26,
    fontWeight: '900',
  },
  cardInfo: {
    flex: 1,
  },
  cardBrand: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  metaChip: {
    backgroundColor: 'rgba(166, 106, 53, 0.12)',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(166, 106, 53, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  metaChipText: {
    color: colors.amber,
    fontSize: 9,
    fontWeight: '900',
  },
  metaChipWarm: {
    backgroundColor: 'rgba(22, 50, 58, 0.08)',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(22, 50, 58, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  metaChipTextWarm: {
    color: colors.petroleum,
    fontSize: 9,
    fontWeight: '900',
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  cardMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.field,
    borderColor: colors.lineStrong,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  adminActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    paddingTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius.md,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDark: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSurface,
    borderWidth: 1,
    borderColor: colors.dangerLine,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  actionButtonTextLight: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
  },
  headerKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  countBadgeChip: {
    backgroundColor: 'rgba(166, 106, 53, 0.12)',
    borderColor: 'rgba(166, 106, 53, 0.3)',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeChipText: {
    color: colors.amber,
    fontSize: 10,
    fontWeight: '800',
  },
  actionButtonSell: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius.md,
    backgroundColor: colors.petroleum,
    borderWidth: 1,
    borderColor: colors.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  actionButtonSellText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '800',
  },
  inactiveSection: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: spacing.lg,
    marginTop: spacing.lg,
    ...shadow.card,
  },
  inactiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  inactiveTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  inactiveSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  inactiveCard: {
    minHeight: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.md,
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
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  inactiveBrand: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  restoreButton: {
    minHeight: 34,
    borderRadius: radius.md,
    backgroundColor: colors.petroleum,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  restoreButtonText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '900',
  },
});
