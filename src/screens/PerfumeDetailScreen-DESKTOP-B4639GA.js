import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import AnimatedPressable from '../components/AnimatedPressable';
import CalendarDatePicker from '../components/CalendarDatePicker';
import { colors, radius, spacing, shadow } from '../theme';
import {
  cleanupDuplicatePresentationPrices,
  deactivatePresentationPrice,
  listenPresentationPrices,
  presentationTypes,
  savePresentationPrice,
} from '../services/presentationPricesService';
import {
  calculateTotalStock,
  createPurchase,
  formatDateValue,
  listenPurchasesByPerfume,
  updatePurchaseStock,
} from '../services/purchasesService';

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

const today = getLocalDateString();

const initialPriceForm = {
  id: '',
  tipo: 'decant_3ml',
  precio_publico: '',
};

const initialPurchaseForm = {
  ml_iniciales: '',
  costo_compra: '',
  tuvo_descuento: false,
  costo_con_descuento: '',
  fecha_compra: today,
  proveedor: '',
  notas: '',
};

function getInitialPurchaseForm(perfume) {
  return {
    ...initialPurchaseForm,
    ml_iniciales: String(perfume.ml_botella_completa || ''),
  };
}

const typeLabels = {
  decant_3ml: '3 ml',
  decant_5ml: '5 ml',
  decant_10ml: '10 ml',
  botella_completa: 'Botella completa',
};

export default function PerfumeDetailScreen({ route }) {
  const { perfume } = route.params;

  const [prices, setPrices] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [priceForm, setPriceForm] = useState(initialPriceForm);
  const [purchaseForm, setPurchaseForm] = useState(getInitialPurchaseForm(perfume));
  const [stockEditForm, setStockEditForm] = useState({
    id: '',
    ml_restantes: '',
    notas_ajuste_stock: '',
  });
  const [showPurchaseDrawer, setShowPurchaseDrawer] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);
  const [savingPurchase, setSavingPurchase] = useState(false);
  const [savingStock, setSavingStock] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    cleanupDuplicatePresentationPrices(perfume.id).catch((firebaseError) =>
      setError(firebaseError.message)
    );

    const unsubscribePrices = listenPresentationPrices(
      perfume.id,
      setPrices,
      (firebaseError) => setError(firebaseError.message)
    );

    const unsubscribePurchases = listenPurchasesByPerfume(
      perfume.id,
      setPurchases,
      (firebaseError) => setError(firebaseError.message)
    );

    return () => {
      unsubscribePrices();
      unsubscribePurchases();
    };
  }, [perfume.id]);

  const totalStock = useMemo(() => calculateTotalStock(purchases), [purchases]);
  const availablePurchases = purchases.filter((purchase) => Number(purchase.ml_restantes) > 0);
  const exhaustedPurchases = purchases.filter((purchase) => Number(purchase.ml_restantes) <= 0);

  function updatePriceField(field, value) {
    setPriceForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function updatePurchaseField(field, value) {
    setPurchaseForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function handleSavePrice() {
    if (!priceForm.precio_publico.trim()) {
      Alert.alert('Falta el precio', 'Escribe el precio público de esta presentación.');
      return;
    }

    try {
      setSavingPrice(true);
      await savePresentationPrice(perfume, priceForm);
      setPriceForm(initialPriceForm);
    } catch (firebaseError) {
      Alert.alert('No se pudo guardar el precio', firebaseError.message);
    } finally {
      setSavingPrice(false);
    }
  }

  function handleEditPrice(price) {
    setPriceForm({
      id: price.id,
      tipo: price.tipo,
      precio_publico: String(price.precio_publico || ''),
    });
  }

  function handleDeletePrice(price) {
    Alert.alert(
      'Quitar precio',
      'El precio se desactivará, no se borrará definitivamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deactivatePresentationPrice(price.id);
              if (priceForm.id === price.id) {
                setPriceForm(initialPriceForm);
              }
            } catch (firebaseError) {
              Alert.alert('No se pudo desactivar', firebaseError.message);
            }
          },
        },
      ]
    );
  }

  async function handleSavePurchase() {
    if (!purchaseForm.ml_iniciales.trim()) {
      Alert.alert('Faltan los mililitros', 'Escribe cuántos ml tiene la botella.');
      return;
    }

    try {
      setSavingPurchase(true);
      await createPurchase(perfume.id, purchaseForm);
      setPurchaseForm(getInitialPurchaseForm(perfume));
      setShowPurchaseDrawer(false);
    } catch (firebaseError) {
      Alert.alert('No se pudo guardar la compra', firebaseError.message);
    } finally {
      setSavingPurchase(false);
    }
  }

  function handleEditStock(purchase) {
    setStockEditForm({
      id: purchase.id,
      ml_restantes: String(purchase.ml_restantes || 0),
      notas_ajuste_stock: purchase.notas_ajuste_stock || '',
    });
  }

  async function handleSaveStock() {
    if (!stockEditForm.id) {
      return;
    }

    if (!stockEditForm.ml_restantes.trim()) {
      Alert.alert('Faltan mililitros', 'Escribe cuántos ml quedan disponibles.');
      return;
    }

    try {
      setSavingStock(true);
      await updatePurchaseStock(stockEditForm.id, stockEditForm);
      setStockEditForm({
        id: '',
        ml_restantes: '',
        notas_ajuste_stock: '',
      });
    } catch (firebaseError) {
      Alert.alert('No se pudo ajustar el stock', firebaseError.message);
    } finally {
      setSavingStock(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      {/* Haute Parfumerie Hero Banner */}
      <View style={styles.heroCard}>
        <View style={styles.heroImageContainer}>
          {perfume.imagen ? (
            <Image source={{ uri: perfume.imagen }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.crestPlaceholder}>
              <Feather name="droplet" size={38} color={colors.gold} />
              <Text style={styles.crestPlaceholderLetter}>
                {perfume.nombre?.charAt(0) || 'A'}
              </Text>
            </View>
          )}
          <View style={styles.imageOverlayGradient} />
        </View>

        <View style={styles.heroDetails}>
          <View style={styles.brandRow}>
            <Text style={styles.brandBadge}>{perfume.marca?.toUpperCase() || 'MARCA EXCLUSIVA'}</Text>
            {!!perfume.categoria_perfume && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {perfume.categoria_perfume.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.perfumeTitle}>{perfume.nombre}</Text>

          {!!perfume.descripcion_olor && (
            <Text style={styles.fragranceDescription}>{perfume.descripcion_olor}</Text>
          )}

          <View style={styles.heroSpecsRow}>
            {!!perfume.genero_perfume && (
              <View style={styles.specItem}>
                <Feather name="user" size={12} color={colors.gold} />
                <Text style={styles.specText}>{perfume.genero_perfume}</Text>
              </View>
            )}
            {!!perfume.duracion && (
              <View style={styles.specItem}>
                <Feather name="clock" size={12} color={colors.gold} />
                <Text style={styles.specText}>{perfume.duracion}</Text>
              </View>
            )}
            {!!perfume.ml_botella_completa && (
              <View style={styles.specItem}>
                <Feather name="disc" size={12} color={colors.gold} />
                <Text style={styles.specText}>{perfume.ml_botella_completa} ml Frasco</Text>
              </View>
            )}
            {!!perfume.precio_liverpool && (
              <View style={styles.specItem}>
                <Feather name="tag" size={12} color={colors.copper} />
                <Text style={[styles.specText, { color: colors.goldLight }]}>
                  Ref: ${perfume.precio_liverpool}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {!!error && (
        <View style={styles.errorAlert}>
          <Feather name="alert-circle" size={16} color={colors.rose} />
          <Text style={styles.errorAlertText}>{error}</Text>
        </View>
      )}

      {/* Olfactory Pyramid (Pirámide Olfativa) */}
      {(!!perfume.notas_salida || !!perfume.notas_corazon || !!perfume.notas_fondo) && (
        <View style={styles.pyramidPanel}>
          <View style={styles.sectionHeader}>
            <Feather name="layers" size={16} color={colors.gold} />
            <Text style={styles.sectionTitle}>Pirámide Olfativa</Text>
          </View>

          {!!perfume.notas_salida && (
            <View style={styles.noteLevel}>
              <View style={styles.noteHeader}>
                <View style={[styles.noteBullet, { backgroundColor: colors.gold }]} />
                <Text style={styles.noteLevelTitle}>NOTAS DE SALIDA (Apertura)</Text>
              </View>
              <Text style={styles.noteText}>{perfume.notas_salida}</Text>
            </View>
          )}

          {!!perfume.notas_corazon && (
            <View style={styles.noteLevel}>
              <View style={styles.noteHeader}>
                <View style={[styles.noteBullet, { backgroundColor: colors.amber }]} />
                <Text style={styles.noteLevelTitle}>NOTAS DE CORAZÓN (Cuerpo)</Text>
              </View>
              <Text style={styles.noteText}>{perfume.notas_corazon}</Text>
            </View>
          )}

          {!!perfume.notas_fondo && (
            <View style={styles.noteLevel}>
              <View style={styles.noteHeader}>
                <View style={[styles.noteBullet, { backgroundColor: colors.copper }]} />
                <Text style={styles.noteLevelTitle}>NOTAS DE FONDO (Base duradera)</Text>
              </View>
              <Text style={styles.noteText}>{perfume.notas_fondo}</Text>
            </View>
          )}
        </View>
      )}

      {/* Stock Total Disponible Gauge */}
      <View style={styles.stockGaugeCard}>
        <View style={styles.stockInfoBlock}>
          <Text style={styles.stockLabel}>RESERVA DISPONIBLE EN VAULT</Text>
          <View style={styles.stockNumberRow}>
            <Text style={styles.stockValue}>{totalStock}</Text>
            <Text style={styles.stockUnit}>ml</Text>
            <View
              style={[
                styles.stockBadge,
                {
                  backgroundColor:
                    totalStock > 30
                      ? 'rgba(95, 175, 139, 0.2)'
                      : totalStock > 0
                        ? 'rgba(166, 106, 53, 0.25)'
                        : 'rgba(201, 151, 152, 0.25)',
                },
              ]}
            >
              <Text
                style={[
                  styles.stockBadgeText,
                  {
                    color:
                      totalStock > 30
                        ? colors.success
                        : totalStock > 0
                          ? colors.amber
                          : colors.danger,
                  },
                ]}
              >
                {totalStock > 30
                  ? 'DISPONIBILIDAD ÓPTIMA'
                  : totalStock > 0
                    ? 'ÚLTIMOS DECANTES'
                    : 'AGOTADO'}
              </Text>
            </View>
          </View>
          <Text style={styles.stockSub}>
            Basado en {availablePurchases.length} frasco(s) activos registrados
          </Text>
        </View>
        <View style={styles.stockIconCircle}>
          <Feather name="droplet" size={26} color={colors.gold} />
        </View>
      </View>

      {/* Presentations & Pricing Section */}
      <View style={styles.luxuryPanel}>
        <View style={styles.sectionHeader}>
          <Feather name="tag" size={16} color={colors.gold} />
          <Text style={styles.sectionTitle}>Precios por Presentación</Text>
        </View>

        {prices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Aún no hay presentaciones configuradas para esta fragancia.
            </Text>
          </View>
        ) : (
          <View style={styles.pricesGrid}>
            {prices.map((price) => (
              <View key={price.id} style={styles.priceCard}>
                <View style={styles.priceCardTop}>
                  <View style={styles.presentationIcon}>
                    <Feather name="disc" size={14} color={colors.gold} />
                  </View>
                  <View style={styles.presentationTextGroup}>
                    <Text style={styles.presentationTitle}>
                      {typeLabels[price.tipo] || price.tipo}
                    </Text>
                    <Text style={styles.presentationSub}>{price.ml} ml de extracto</Text>
                  </View>
                </View>
                <View style={styles.priceCardBottom}>
                  <Text style={styles.presentationPrice}>${price.precio_publico}</Text>
                  <View style={styles.priceButtonRow}>
                    <AnimatedPressable
                      onPress={() => handleEditPrice(price)}
                      style={styles.priceMiniBtn}
                      scaleTo={0.9}
                    >
                      <Feather name="edit-2" size={12} color={colors.ink} />
                    </AnimatedPressable>
                    <AnimatedPressable
                      onPress={() => handleDeletePrice(price)}
                      style={styles.priceMiniBtnDark}
                      scaleTo={0.9}
                    >
                      <Feather name="eye-off" size={12} color={colors.textSubtle} />
                    </AnimatedPressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Price Editor Form */}
        <View style={styles.priceFormBox}>
          <Text style={styles.formBoxTitle}>
            {priceForm.id ? 'Modificar Presentación' : 'Añadir Nueva Presentación'}
          </Text>

          <View style={styles.segmentRow}>
            {presentationTypes.map((type) => {
              const active = priceForm.tipo === type.value;
              return (
                <Pressable
                  key={type.value}
                  onPress={() => updatePriceField('tipo', type.value)}
                  style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                >
                  <Text style={[styles.segmentBtnText, active && styles.segmentBtnTextActive]}>
                    {type.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <FormInput
            label="Precio Público ($ MXN)"
            value={priceForm.precio_publico}
            onChangeText={(value) => updatePriceField('precio_publico', value)}
            placeholder="Ej. 180"
            keyboardType="numeric"
          />

          <View style={styles.formActionsRow}>
            <PrimaryButton
              title={
                savingPrice
                  ? 'Guardando...'
                  : priceForm.id
                    ? 'Actualizar Precio'
                    : 'Guardar Presentación'
              }
              onPress={handleSavePrice}
              disabled={savingPrice}
              variant="amber"
            />
            {priceForm.id && (
              <View style={{ marginTop: 8 }}>
                <PrimaryButton
                  title="Cancelar Edición"
                  onPress={() => setPriceForm(initialPriceForm)}
                  variant="outline"
                />
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Purchases / Stock Lots Management */}
      <View style={styles.luxuryPanel}>
        <View style={styles.sectionHeaderBetween}>
          <View style={styles.sectionHeaderLeft}>
            <Feather name="database" size={16} color={colors.gold} />
            <Text style={styles.sectionTitle}>Lotes & Frascos en Vault</Text>
          </View>
          <AnimatedPressable
            onPress={() => setShowPurchaseDrawer((open) => !open)}
            style={styles.toggleDrawerBtn}
            scaleTo={0.92}
          >
            <Feather
              name={showPurchaseDrawer ? 'minus' : 'plus'}
              size={13}
              color={colors.gold}
            />
            <Text style={styles.toggleDrawerBtnText}>
              {showPurchaseDrawer ? 'Cerrar Registro' : 'Nueva Botella'}
            </Text>
          </AnimatedPressable>
        </View>

        {showPurchaseDrawer && (
          <View style={styles.purchaseDrawer}>
            <Text style={styles.drawerHeading}>Registrar Nueva Entrada de Frasco</Text>
            <Text style={styles.drawerSub}>
              Ingresa los mililitros y el costo para calcular rentabilidad y existencias.
            </Text>

            <FormInput
              label="Mililitros Iniciales de la Botella"
              value={purchaseForm.ml_iniciales}
              onChangeText={(value) => updatePurchaseField('ml_iniciales', value)}
              placeholder="Ej. 100"
              keyboardType="numeric"
            />
            <FormInput
              label="Costo de Adquisición ($ MXN)"
              value={purchaseForm.costo_compra}
              onChangeText={(value) => updatePurchaseField('costo_compra', value)}
              placeholder="Ej. 2100"
              keyboardType="numeric"
            />

            <View style={styles.switchWrapper}>
              <Text style={styles.switchTitle}>¿Adquirido con Descuento Especial?</Text>
              <Switch
                value={purchaseForm.tuvo_descuento}
                onValueChange={(val) => updatePurchaseField('tuvo_descuento', val)}
                trackColor={{ false: colors.surfaceRaised, true: colors.gold }}
                thumbColor={purchaseForm.tuvo_descuento ? colors.ink : colors.textMuted}
              />
            </View>

            {purchaseForm.tuvo_descuento && (
              <FormInput
                label="Costo Final con Descuento ($ MXN)"
                value={purchaseForm.costo_con_descuento}
                onChangeText={(value) => updatePurchaseField('costo_con_descuento', value)}
                placeholder="Ej. 1800"
                keyboardType="numeric"
              />
            )}

            <CalendarDatePicker
              label="Fecha de Adquisición"
              value={purchaseForm.fecha_compra}
              onChange={(value) => updatePurchaseField('fecha_compra', value)}
            />

            <FormInput
              label="Proveedor / Tienda"
              value={purchaseForm.proveedor}
              onChangeText={(value) => updatePurchaseField('proveedor', value)}
              placeholder="Ej. Palacio de Hierro, Boutique Oficial..."
            />

            <FormInput
              label="Notas Internas de Lote"
              value={purchaseForm.notas}
              onChangeText={(value) => updatePurchaseField('notas', value)}
              placeholder="Número de batch, estado de caja, etc."
              multiline
            />

            <PrimaryButton
              title={savingPurchase ? 'Registrando...' : 'Confirmar Registro de Frasco'}
              onPress={handleSavePurchase}
              disabled={savingPurchase}
              variant="copper"
            />
          </View>
        )}

        {/* Active Bottles List */}
        {availablePurchases.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No hay botellas con stock activo en este momento.</Text>
          </View>
        ) : (
          availablePurchases.map((purchase) => (
            <View key={purchase.id} style={styles.lotCard}>
              <InventoryPurchaseItem
                purchase={purchase}
                isEditing={stockEditForm.id === purchase.id}
                editForm={stockEditForm}
                saving={savingStock}
                onEdit={() => handleEditStock(purchase)}
                onChange={(field, value) =>
                  setStockEditForm((currentForm) => ({
                    ...currentForm,
                    [field]: value,
                  }))
                }
                onCancel={() =>
                  setStockEditForm({ id: '', ml_restantes: '', notas_ajuste_stock: '' })
                }
                onSave={handleSaveStock}
              />
            </View>
          ))
        )}

        {/* Exhausted Batches */}
        {exhaustedPurchases.length > 0 && (
          <View style={styles.exhaustedSection}>
            <View style={styles.exhaustedHeader}>
              <Feather name="archive" size={13} color={colors.textSubtle} />
              <Text style={styles.exhaustedTitle}>
                HISTORIAL DE FRASCOS AGOTADOS ({exhaustedPurchases.length})
              </Text>
            </View>

            {exhaustedPurchases.map((purchase) => (
              <View key={purchase.id} style={styles.exhaustedLotCard}>
                <InventoryPurchaseItem
                  purchase={purchase}
                  isEditing={stockEditForm.id === purchase.id}
                  editForm={stockEditForm}
                  saving={savingStock}
                  exhausted
                  onEdit={() => handleEditStock(purchase)}
                  onChange={(field, value) =>
                    setStockEditForm((currentForm) => ({
                      ...currentForm,
                      [field]: value,
                    }))
                  }
                  onCancel={() =>
                    setStockEditForm({ id: '', ml_restantes: '', notas_ajuste_stock: '' })
                  }
                  onSave={handleSaveStock}
                />
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function InventoryPurchaseItem({
  purchase,
  isEditing,
  editForm,
  saving,
  exhausted = false,
  onEdit,
  onChange,
  onCancel,
  onSave,
}) {
  const normalCost = Number(purchase.costo_compra) || 0;
  const discountedCost = Number(purchase.costo_con_descuento) || 0;
  const hasDiscount = !!purchase.tuvo_descuento && discountedCost > 0;
  const remainingPercent = Math.min(
    Math.max(
      Math.round(((Number(purchase.ml_restantes) || 0) / (Number(purchase.ml_iniciales) || 1)) * 100),
      0
    ),
    100
  );

  if (isEditing) {
    return (
      <View style={styles.stockEditWrapper}>
        <View style={styles.stockEditHeader}>
          <Feather name="sliders" size={14} color={colors.gold} />
          <Text style={styles.stockEditTitle}>Ajuste Manual de Inventario</Text>
        </View>

        <FormInput
          label="Mililitros Restantes Reales"
          value={editForm.ml_restantes}
          onChangeText={(val) => onChange('ml_restantes', val)}
          placeholder="Ej. 45"
          keyboardType="numeric"
        />

        <FormInput
          label="Motivo del Ajuste"
          value={editForm.notas_ajuste_stock}
          onChangeText={(val) => onChange('notas_ajuste_stock', val)}
          placeholder="Ej. Conteo físico, decantación de prueba..."
        />

        <View style={styles.stockEditBtnRow}>
          <PrimaryButton
            title="Guardar Ajuste"
            onPress={onSave}
            disabled={saving}
            variant="amber"
          />
          <View style={{ marginTop: 6 }}>
            <PrimaryButton title="Cancelar" onPress={onCancel} variant="outline" />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.lotRow}>
      <View style={styles.lotInfoLeft}>
        <View style={styles.lotTitleRow}>
          <Text style={[styles.lotMlText, exhausted && styles.lotMlTextExhausted]}>
            {exhausted ? '0 ml' : `${purchase.ml_restantes} ml`}
          </Text>
          <Text style={styles.lotTotalMl}>de {purchase.ml_iniciales} ml</Text>
          {!exhausted && (
            <View style={styles.percentBadge}>
              <Text style={styles.percentBadgeText}>{remainingPercent}%</Text>
            </View>
          )}
        </View>

        {/* Progress Bar */}
        {!exhausted && (
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${remainingPercent}%` }]} />
          </View>
        )}

        <View style={styles.lotMetaRow}>
          <Feather name="shield" size={10} color={colors.gold} />
          <Text style={styles.lotMetaText}>
            {purchase.proveedor || 'Proveedor Particular'} · {formatDateValue(purchase.fecha_compra)}
          </Text>
        </View>

        {!!purchase.notas_ajuste_stock && (
          <Text style={styles.adjustmentNote}>Ajuste: {purchase.notas_ajuste_stock}</Text>
        )}
      </View>

      <View style={styles.lotActionsRight}>
        <View style={styles.costBadge}>
          <Text style={styles.costAmount}>
            ${hasDiscount ? discountedCost : normalCost}
          </Text>
          {hasDiscount && <Text style={styles.costOriginal}>Desc. ${normalCost}</Text>}
        </View>

        <AnimatedPressable onPress={onEdit} style={styles.lotEditBtn} scaleTo={0.92}>
          <Feather name="sliders" size={11} color={colors.ink} />
          <Text style={styles.lotEditBtnText}>Ajustar</Text>
        </AnimatedPressable>
      </View>
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
    paddingBottom: 110, // Safe padding for bottom luxury dock
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.25)',
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadow.card,
  },
  heroImageContainer: {
    width: '100%',
    height: 240,
    backgroundColor: '#FAF7F2',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'transparent',
  },
  crestPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
    height: 90,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(166, 136, 100, 0.35)',
    backgroundColor: '#FAF7F2',
  },
  crestPlaceholderLetter: {
    color: colors.gold,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 2,
  },
  heroDetails: {
    padding: spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  brandBadge: {
    color: colors.goldDark,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(166, 106, 53, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(166, 106, 53, 0.3)',
  },
  categoryBadgeText: {
    color: colors.amber,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  perfumeTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  fragranceDescription: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  heroSpecsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(166, 136, 100, 0.15)',
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '600',
  },
  errorAlert: {
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
  errorAlertText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  pyramidPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.25)',
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  noteLevel: {
    marginBottom: 10,
    backgroundColor: '#FAF7F2',
    padding: 10,
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.12)',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  noteBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  noteLevelTitle: {
    color: colors.goldDark,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  noteText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  stockGaugeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.25)',
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  stockInfoBlock: {
    flex: 1,
  },
  stockLabel: {
    color: colors.goldDark,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  stockNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  },
  stockValue: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
  },
  stockUnit: {
    color: colors.goldDark,
    fontSize: 16,
    fontWeight: '700',
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginLeft: 6,
  },
  stockBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  stockSub: {
    color: colors.textSubtle,
    fontSize: 11,
  },
  stockIconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: '#FAF7F2',
    borderWidth: 1.5,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  luxuryPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.25)',
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleDrawerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.35)',
  },
  toggleDrawerBtnText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  emptyState: {
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontStyle: 'italic',
  },
  pricesGrid: {
    gap: 8,
    marginBottom: spacing.md,
  },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF7F2',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.2)',
    padding: 12,
  },
  priceCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  presentationIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presentationTextGroup: {},
  presentationTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  presentationSub: {
    color: colors.textSubtle,
    fontSize: 11,
  },
  priceCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  presentationPrice: {
    color: colors.amber,
    fontSize: 17,
    fontWeight: '900',
  },
  priceButtonRow: {
    flexDirection: 'row',
    gap: 6,
  },
  priceMiniBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.xs,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceMiniBtnDark: {
    width: 28,
    height: 28,
    borderRadius: radius.xs,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceFormBox: {
    backgroundColor: '#FAF7F2',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.25)',
    padding: spacing.md,
    marginTop: 6,
  },
  formBoxTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  segmentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.3)',
    backgroundColor: '#FFFFFF',
  },
  segmentBtnActive: {
    backgroundColor: colors.petroleum,
    borderColor: colors.petroleum,
  },
  segmentBtnText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  formActionsRow: {
    marginTop: 6,
  },
  purchaseDrawer: {
    backgroundColor: '#FAF7F2',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.3)',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  drawerHeading: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  drawerSub: {
    color: colors.textSubtle,
    fontSize: 11,
    marginBottom: 12,
  },
  switchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  switchTitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  lotCard: {
    backgroundColor: '#FAF7F2',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.2)',
    padding: 12,
    marginBottom: 10,
  },
  lotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lotInfoLeft: {
    flex: 1,
    marginRight: 10,
  },
  lotTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  },
  lotMlText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  lotMlTextExhausted: {
    color: colors.textSubtle,
  },
  lotTotalMl: {
    color: colors.textSubtle,
    fontSize: 11,
  },
  percentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.xs,
    backgroundColor: 'rgba(46, 125, 91, 0.12)',
  },
  percentBadgeText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(22, 50, 58, 0.1)',
    overflow: 'hidden',
    marginVertical: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.amber,
  },
  lotMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  lotMetaText: {
    color: colors.textSubtle,
    fontSize: 11,
  },
  adjustmentNote: {
    color: colors.amber,
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 4,
  },
  lotActionsRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  costBadge: {
    alignItems: 'flex-end',
  },
  costAmount: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  costOriginal: {
    color: colors.textSubtle,
    fontSize: 9,
    textDecorationLine: 'line-through',
  },
  lotEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
    marginTop: 6,
  },
  lotEditBtnText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '800',
  },
  stockEditWrapper: {
    padding: 6,
  },
  stockEditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  stockEditTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  stockEditBtnRow: {
    marginTop: 6,
  },
  exhaustedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(166, 136, 100, 0.15)',
  },
  exhaustedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  exhaustedTitle: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  exhaustedLotCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.sm,
    padding: 10,
    marginBottom: 6,
    opacity: 0.7,
  },
});
