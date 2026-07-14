import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
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
    perfume.notas_salida,
    perfume.notas_corazon,
    perfume.notas_fondo,
  ].join(' '));
}

function getSuggestionDetail(perfume, searchText) {
  if (normalizeText(perfume.marca).includes(searchText)) {
    return `Marca: ${perfume.marca}`;
  }

  if (normalizeText(perfume.categoria_perfume).includes(searchText)) {
    return `Tipo: ${perfume.categoria_perfume}`;
  }

  return perfume.marca || perfume.categoria_perfume || 'Perfume';
}

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

  const searchText = normalizeText(search);
  const filteredPerfumes = useMemo(() => {
    if (!searchText) {
      return perfumes;
    }

    return perfumes.filter((perfume) => getPerfumeSearchText(perfume).includes(searchText));
  }, [perfumes, searchText]);
  const suggestions = useMemo(() => {
    if (!searchText) {
      return [];
    }

    return perfumes
      .filter((perfume) => getPerfumeSearchText(perfume).includes(searchText))
      .slice(0, 6);
  }, [perfumes, searchText]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Catálogo Interno</Text>
          <Text style={styles.title}>Perfumes</Text>
        </View>
        <AnimatedPressable
          onPress={() => navigation.navigate('PerfumeForm')}
          style={styles.addButton}
        >
          <Feather name="plus" size={16} color={colors.ink} style={styles.addIcon} />
          <Text style={styles.addButtonText}>Agregar</Text>
        </AnimatedPressable>
      </View>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar perfume..."
      />

      {suggestions.length > 0 && (
        <View style={styles.suggestionsWrap}>
          {suggestions.map((perfume) => (
            <Pressable
              key={perfume.id}
              onPress={() => setSearch(perfume.nombre)}
              style={styles.suggestionPill}
            >
              <Feather name="corner-down-right" size={12} color={colors.gold} />
              <View>
                <Text style={styles.suggestionText}>{perfume.nombre}</Text>
                <Text style={styles.suggestionDetail}>{getSuggestionDetail(perfume, searchText)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {loading && <ActivityIndicator color={colors.gold} style={styles.loader} size="large" />}

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
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="folder-open" size={24} color={colors.textSubtle} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>Todavía no hay perfumes registrados.</Text>
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
              onDelete={() => {
                Alert.alert(
                  'Desactivar perfume',
                  'El perfume no se borrará definitivamente, solo dejará de aparecer activo.',
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
  if (perfumes.length === 0) return null;

  return (
    <View style={styles.inactiveSection}>
      <View style={styles.inactiveHeader}>
        <Feather name="eye-off" size={15} color={colors.textSubtle} />
        <Text style={styles.inactiveTitle}>Perfumes Ocultados</Text>
      </View>
      <Text style={styles.inactiveSubtitle}>
        Sección de archivo para reactivar perfumes que no deseas mostrar temporalmente.
      </Text>
      {perfumes.map((perfume) => (
        <View key={perfume.id} style={styles.inactiveCard}>
          <View style={styles.inactiveInfo}>
            <Text style={styles.inactiveName}>{perfume.nombre}</Text>
            <Text style={styles.inactiveBrand}>{perfume.marca || 'Marca Exclusiva'}</Text>
          </View>
          <AnimatedPressable onPress={() => onRestore(perfume)} style={styles.restoreButton}>
            <Feather name="rotate-ccw" size={13} color={colors.successText} style={{ marginRight: 4 }} />
            <Text style={styles.restoreButtonText}>Reactivar</Text>
          </AnimatedPressable>
        </View>
      ))}
    </View>
  );
}

function PerfumeCard({ perfume, onPress, onEdit, onDelete }) {
  return (
    <AnimatedPressable
      onPress={onPress}
      style={styles.card}
      scaleTo={0.98}
    >
      <View style={styles.cardTop}>
        {perfume.imagen ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: perfume.imagen }} style={styles.cardImage} />
          </View>
        ) : (
          <View style={styles.bottleMark}>
            <Text style={styles.bottleText}>{perfume.nombre?.charAt(0) || 'P'}</Text>
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{perfume.nombre}</Text>
          <Text style={styles.cardBrand}>{perfume.marca || 'Marca Exclusiva'}</Text>
          {!!perfume.categoria_perfume && (
            <Text style={styles.cardCategory}>{perfume.categoria_perfume}</Text>
          )}
        </View>
        <Feather name="chevron-right" size={18} color={colors.textSubtle} />
      </View>

      {!!perfume.descripcion_olor && (
        <Text style={styles.description}>{perfume.descripcion_olor}</Text>
      )}

      <View style={styles.cardMetaRow}>
        <View style={styles.metaBadge}>
          <Feather name="droplet" size={12} color={colors.gold} style={{ marginRight: 4 }} />
          <Text style={styles.metaText}>{perfume.ml_botella_completa || 0} ml</Text>
        </View>
        <View style={styles.metaBadge}>
          <Feather name="shopping-bag" size={12} color={colors.gold} style={{ marginRight: 4 }} />
          <Text style={styles.metaText}>Liverpool: ${perfume.precio_liverpool || 0}</Text>
        </View>
      </View>
      
      <View style={styles.adminActions}>
        <Pressable onPress={onEdit} style={styles.actionButton}>
          <Feather name="edit-2" size={13} color={colors.ink} style={{ marginRight: 5 }} />
          <Text style={styles.actionButtonText}>Editar</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={styles.actionButtonDark}>
          <Feather name="eye-off" size={13} color={colors.textMuted} style={{ marginRight: 5 }} />
          <Text style={styles.actionButtonTextLight}>Ocultar</Text>
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
  addIcon: {
    marginRight: 4,
  },
  addButtonText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
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
  suggestionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  suggestionPill: {
    minHeight: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
  },
  suggestionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  suggestionDetail: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
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
    width: 52,
    height: 62,
    borderRadius: radius.sm - 2,
    backgroundColor: colors.background,
  },
  bottleMark: {
    width: 52,
    height: 62,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.glow,
  },
  bottleText: {
    color: colors.ink,
    fontSize: 22,
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
  cardBrand: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  cardCategory: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '900',
    marginTop: 3,
    textTransform: 'uppercase',
  },
  description: {
    color: colors.textSubtle,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.sm,
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
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  adminActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    paddingTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDark: {
    flex: 1,
    minHeight: 36,
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
    fontSize: 12,
    fontWeight: '900',
  },
  actionButtonTextLight: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  inactiveSection: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginTop: spacing.md,
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
    fontWeight: '800',
  },
  inactiveSubtitle: {
    color: colors.textSubtle,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  inactiveCard: {
    minHeight: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
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
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '800',
  },
  inactiveBrand: {
    color: colors.textSubtle,
    fontSize: 12,
    marginTop: 2,
  },
  restoreButton: {
    minHeight: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  restoreButtonText: {
    color: colors.successText,
    fontSize: 11,
    fontWeight: '900',
  },
});
