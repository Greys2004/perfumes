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
    >
      <View style={styles.hero}>
        {perfume.imagen ? (
          <View style={styles.heroImageFrame}>
            <Image source={{ uri: perfume.imagen }} style={styles.heroImage} />
          </View>
        ) : (
          <View style={styles.bottleMark}>
            <Text style={styles.bottleText}>{perfume.nombre?.charAt(0) || 'P'}</Text>
          </View>
        )}
        <View style={styles.heroInfo}>
          <Text style={styles.kicker}>{perfume.marca || 'Marca Exclusiva'}</Text>
          <Text style={styles.title}>{perfume.nombre}</Text>
          {!!perfume.categoria_perfume && (
            <Text style={styles.categoryText}>{perfume.categoria_perfume}</Text>
          )}
          {!!perfume.genero_perfume && (
            <Text style={styles.categoryText}>{perfume.genero_perfume}</Text>
          )}
          {!!perfume.descripcion_olor && (
            <Text style={styles.description}>{perfume.descripcion_olor}</Text>
          )}
        </View>
      </View>

      {!!error && (
        <View style={styles.messageBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.stockPanel}>
        <View>
          <Text style={styles.stockLabel}>Stock Total Disponible</Text>
          <Text style={styles.stockValue}>{totalStock} ml</Text>
        </View>
        <Feather name="droplet" size={32} color={colors.gold} style={styles.stockIcon} />
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Feather name="tag" size={16} color={colors.gold} />
          <Text style={styles.panelTitle}>Precios por Presentación</Text>
        </View>
        {prices.length === 0 ? (
          <Text style={styles.emptyText}>Aún no hay precios guardados para este perfume.</Text>
        ) : (
          prices.map((price) => (
            <View key={price.id} style={styles.rowItem}>
              <View style={styles.rowTextGroup}>
                <Text style={styles.rowTitle}>{typeLabels[price.tipo] || price.tipo}</Text>
                <Text style={styles.rowSubtext}>{price.ml} ml</Text>
              </View>
              <View style={styles.priceActions}>
                <Text style={styles.rowValue}>${price.precio_publico}</Text>
                <View style={styles.actionButtonsInline}>
                  <Pressable onPress={() => handleEditPrice(price)} style={styles.smallButton}>
                    <Feather name="edit-2" size={11} color={colors.ink} />
                  </Pressable>
                  <Pressable onPress={() => handleDeletePrice(price)} style={styles.smallButtonDark}>
                    <Feather name="eye-off" size={11} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>
            </View>
          ))
        )}

        <Text style={styles.formTitle}>
          {priceForm.id ? 'Editar presentación' : 'Agregar presentación'}
        </Text>
        <View style={styles.segmentRow}>
          {presentationTypes.map((type) => (
            <Pressable
              key={type.value}
              onPress={() => updatePriceField('tipo', type.value)}
              style={[
                styles.segment,
                priceForm.tipo === type.value && styles.segmentActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  priceForm.tipo === type.value && styles.segmentTextActive,
                ]}
              >
                {type.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <FormInput
          label="Precio Público"
          value={priceForm.precio_publico}
          onChangeText={(value) => updatePriceField('precio_publico', value)}
          placeholder="Ej. 180"
          keyboardType="numeric"
        />
        <PrimaryButton
          title={savingPrice ? 'Guardando...' : priceForm.id ? 'Actualizar Precio' : 'Guardar Precio'}
          onPress={handleSavePrice}
          disabled={savingPrice}
        />
        {priceForm.id && (
          <View style={styles.cancelEdit}>
            <PrimaryButton
              title="Cancelar Edición"
              onPress={() => setPriceForm(initialPriceForm)}
              variant="secondary"
            />
          </View>
        )}
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Feather name="plus-circle" size={16} color={colors.gold} />
          <Text style={styles.panelTitle}>Registrar Lote / Compra</Text>
        </View>
        <Text style={styles.emptyText}>
          Las compras son independientes del precio público. Permiten registrar el costo del lote y medir los mililitros disponibles.
        </Text>
        <FormInput
          label="Mililitros Iniciales"
          value={purchaseForm.ml_iniciales}
          onChangeText={(value) => updatePurchaseField('ml_iniciales', value)}
          placeholder="Ej. 100"
          keyboardType="numeric"
        />
        <FormInput
          label="Costo de Compra"
          value={purchaseForm.costo_compra}
          onChangeText={(value) => updatePurchaseField('costo_compra', value)}
          placeholder="Ej. 2100"
          keyboardType="numeric"
        />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>¿Tuvo Descuento?</Text>
          <Switch
            value={purchaseForm.tuvo_descuento}
            onValueChange={(value) => updatePurchaseField('tuvo_descuento', value)}
            thumbColor={purchaseForm.tuvo_descuento ? colors.text : colors.textSubtle}
            trackColor={{ false: '#24262E', true: colors.gold }}
          />
        </View>
        {purchaseForm.tuvo_descuento && (
          <FormInput
            label="Costo con Descuento"
            value={purchaseForm.costo_con_descuento}
            onChangeText={(value) => updatePurchaseField('costo_con_descuento', value)}
            placeholder="Ej. 1800"
            keyboardType="numeric"
          />
        )}
        <CalendarDatePicker
          label="Fecha de Compra"
          value={purchaseForm.fecha_compra}
          onChange={(value) => updatePurchaseField('fecha_compra', value)}
        />
        <FormInput
          label="Proveedor"
          value={purchaseForm.proveedor}
          onChangeText={(value) => updatePurchaseField('proveedor', value)}
          placeholder="Ej. Liverpool"
        />
        <FormInput
          label="Notas del lote"
          value={purchaseForm.notas}
          onChangeText={(value) => updatePurchaseField('notas', value)}
          placeholder="Comentarios adicionales"
          multiline
        />
        <PrimaryButton
          title={savingPurchase ? 'Registrando...' : 'Registrar Compra'}
          onPress={handleSavePurchase}
          disabled={savingPurchase}
        />
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Feather name="database" size={16} color={colors.gold} />
          <Text style={styles.panelTitle}>Lotes con Stock Activo</Text>
        </View>
        {purchases.length === 0 ? (
          <Text style={styles.emptyText}>No hay compras registradas para este perfume.</Text>
        ) : (
          availablePurchases.map((purchase) => (
            <View key={purchase.id} style={styles.purchaseItem}>
              <InventoryPurchase
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
        {purchases.length > 0 && availablePurchases.length === 0 && (
          <Text style={styles.emptyText}>No hay botellas con stock disponible.</Text>
        )}
      </View>

      {exhaustedPurchases.length > 0 && (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Feather name="archive" size={16} color={colors.textSubtle} />
            <Text style={styles.panelTitle}>Lotes Agotados</Text>
          </View>
          {exhaustedPurchases.map((purchase) => (
            <View key={purchase.id} style={styles.exhaustedItem}>
              <InventoryPurchase
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
    </ScrollView>
  );
}

function InventoryPurchase({
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

  if (isEditing) {
    return (
      <View style={styles.inventoryEditBox}>
        <Text style={styles.formTitle}>Ajustar Stock Disponible</Text>
        <FormInput
          label="Mililitros Restantes"
          value={editForm.ml_restantes}
          onChangeText={(value) => onChange('ml_restantes', value)}
          placeholder="Ej. 35"
          keyboardType="numeric"
        />
        <FormInput
          label="Motivo del Ajuste"
          value={editForm.notas_ajuste_stock}
          onChangeText={(value) => onChange('notas_ajuste_stock', value)}
          placeholder="Ej. Conteo manual, evaporación..."
        />
        <View style={styles.stockEditActions}>
          <PrimaryButton title="Guardar Cambios" onPress={onSave} disabled={saving} />
          <View style={{ marginTop: 4 }}>
            <PrimaryButton title="Cancelar" onPress={onCancel} variant="secondary" />
          </View>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.rowTextGroup}>
        <Text style={[styles.rowTitle, exhausted && { color: colors.textSubtle }]}>
          {exhausted ? 'Agotado' : `${purchase.ml_restantes} ml / ${purchase.ml_iniciales} ml`}
        </Text>
        <Text style={styles.rowSubtext}>
          Lote: {purchase.proveedor || 'Proveedor pendiente'}  ·  {formatDateValue(purchase.fecha_compra)}
        </Text>
        {!!purchase.notas_ajuste_stock && (
          <Text style={[styles.rowSubtext, { fontStyle: 'italic', color: colors.gold }]}>
            Nota de ajuste: {purchase.notas_ajuste_stock}
          </Text>
        )}
      </View>
      <View style={styles.inventoryActions}>
        {exhausted ? (
          <Text style={styles.exhaustedBadge}>0 ml</Text>
        ) : (
          <View style={styles.costStack}>
            <Text style={styles.costLabel}>Real: ${normalCost}</Text>
            {hasDiscount && (
              <Text style={styles.discountCostLabel}>Desc: ${discountedCost}</Text>
            )}
          </View>
        )}
        <Pressable onPress={onEdit} style={styles.adjustStockButton}>
          <Feather name="edit" size={11} color={colors.ink} style={{ marginRight: 4 }} />
          <Text style={styles.adjustStockButtonText}>Ajustar</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 80,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  bottleMark: {
    width: 64,
    height: 76,
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
  heroImageFrame: {
    width: 72,
    height: 86,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: 2,
    backgroundColor: colors.surfaceRaised,
    ...shadow.glow,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    borderRadius: radius.sm - 2,
    backgroundColor: colors.background,
  },
  heroInfo: {
    flex: 1,
  },
  kicker: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  categoryText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: 3,
  },
  description: {
    color: colors.textSubtle,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    fontStyle: 'italic',
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
  stockPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.glow,
  },
  stockLabel: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  stockValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  panel: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: 13,
    lineHeight: 18,
  },
  rowItem: {
    minHeight: 52,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowTextGroup: {
    flex: 1,
  },
  purchaseItem: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  inventoryActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  costStack: {
    alignItems: 'flex-end',
    gap: 2,
  },
  costLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  discountCostLabel: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
  },
  inventoryEditBox: {
    flex: 1,
  },
  stockEditActions: {
    marginTop: 6,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  rowSubtext: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  rowValue: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '800',
  },
  priceActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  actionButtonsInline: {
    flexDirection: 'row',
    gap: 4,
  },
  smallButton: {
    width: 26,
    height: 26,
    backgroundColor: colors.gold,
    borderRadius: radius.sm - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonDark: {
    width: 26,
    height: 26,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustStockButton: {
    backgroundColor: colors.gold,
    borderRadius: radius.sm - 2,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustStockButtonText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '900',
  },
  cancelEdit: {
    marginTop: 8,
  },
  exhaustedItem: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    opacity: 0.6,
  },
  exhaustedBadge: {
    color: colors.textSubtle,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '800',
  },
  formTitle: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.md,
  },
  segment: {
    minHeight: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  segmentActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    ...shadow.glow,
  },
  segmentText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: colors.ink,
  },
  switchRow: {
    minHeight: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
});
