import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
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

const today = new Date().toISOString().slice(0, 10);

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
  botella_completa: 'Botella',
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
      Alert.alert('Falta el precio', 'Escribe el precio publico de esta presentacion.');
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
      'El precio se desactivara, no se borrara definitivamente.',
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
      Alert.alert('Faltan los mililitros', 'Escribe cuantos ml tiene la botella.');
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
      Alert.alert('Faltan mililitros', 'Escribe cuantos ml quedan disponibles.');
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
        <View style={styles.bottleMark}>
          <Text style={styles.bottleText}>{perfume.nombre?.charAt(0) || 'P'}</Text>
        </View>
        <View style={styles.heroInfo}>
          <Text style={styles.kicker}>{perfume.marca || 'Marca pendiente'}</Text>
          <Text style={styles.title}>{perfume.nombre}</Text>
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
        <Text style={styles.stockLabel}>Stock disponible</Text>
        <Text style={styles.stockValue}>{totalStock} ml</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Precios por presentacion</Text>
        {prices.length === 0 ? (
          <Text style={styles.emptyText}>Aun no hay precios guardados.</Text>
        ) : (
          prices.map((price) => (
            <View key={price.id} style={styles.rowItem}>
              <View style={styles.rowTextGroup}>
                <Text style={styles.rowTitle}>{typeLabels[price.tipo] || price.tipo}</Text>
                <Text style={styles.rowSubtext}>{price.ml} ml</Text>
              </View>
              <View style={styles.priceActions}>
                <Text style={styles.rowValue}>${price.precio_publico}</Text>
                <Pressable onPress={() => handleEditPrice(price)} style={styles.smallButton}>
                  <Text style={styles.smallButtonText}>Editar</Text>
                </Pressable>
                <Pressable onPress={() => handleDeletePrice(price)} style={styles.smallButtonDark}>
                  <Text style={styles.smallButtonTextLight}>Quitar</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Text style={styles.formTitle}>
          {priceForm.id ? 'Editar precio' : 'Agregar o actualizar precio'}
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
          label="Precio publico"
          value={priceForm.precio_publico}
          onChangeText={(value) => updatePriceField('precio_publico', value)}
          placeholder="Ej. 180"
          keyboardType="numeric"
        />
        <PrimaryButton
          title={savingPrice ? 'Guardando...' : priceForm.id ? 'Actualizar precio' : 'Guardar precio'}
          onPress={handleSavePrice}
          disabled={savingPrice}
        />
        {priceForm.id && (
          <View style={styles.cancelEdit}>
            <PrimaryButton
              title="Cancelar edicion"
              onPress={() => setPriceForm(initialPriceForm)}
              variant="secondary"
            />
          </View>
        )}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Registrar compra</Text>
        <Text style={styles.emptyText}>
          Las compras quedan separadas del precio publico. Aqui se guarda costo y mililitros disponibles.
        </Text>
        <FormInput
          label="Mililitros iniciales"
          value={purchaseForm.ml_iniciales}
          onChangeText={(value) => updatePurchaseField('ml_iniciales', value)}
          placeholder="Ej. 100"
          keyboardType="numeric"
        />
        <FormInput
          label="Costo de compra"
          value={purchaseForm.costo_compra}
          onChangeText={(value) => updatePurchaseField('costo_compra', value)}
          placeholder="Ej. 2100"
          keyboardType="numeric"
        />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Tuvo descuento</Text>
          <Switch
            value={purchaseForm.tuvo_descuento}
            onValueChange={(value) => updatePurchaseField('tuvo_descuento', value)}
            thumbColor={purchaseForm.tuvo_descuento ? '#d8ad62' : '#8f8f91'}
            trackColor={{ false: '#4b4b4d', true: '#80663a' }}
          />
        </View>
        {purchaseForm.tuvo_descuento && (
          <FormInput
            label="Costo con descuento"
            value={purchaseForm.costo_con_descuento}
            onChangeText={(value) => updatePurchaseField('costo_con_descuento', value)}
            placeholder="Ej. 1800"
            keyboardType="numeric"
          />
        )}
        <FormInput
          label="Fecha de compra"
          value={purchaseForm.fecha_compra}
          onChangeText={(value) => updatePurchaseField('fecha_compra', value)}
          placeholder="AAAA-MM-DD"
        />
        <FormInput
          label="Proveedor"
          value={purchaseForm.proveedor}
          onChangeText={(value) => updatePurchaseField('proveedor', value)}
          placeholder="Ej. Liverpool"
        />
        <FormInput
          label="Notas"
          value={purchaseForm.notas}
          onChangeText={(value) => updatePurchaseField('notas', value)}
          placeholder="Detalle opcional de la compra"
          multiline
        />
        <PrimaryButton
          title={savingPurchase ? 'Guardando...' : 'Guardar compra'}
          onPress={handleSavePurchase}
          disabled={savingPurchase}
        />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Inventario disponible</Text>
        {purchases.length === 0 ? (
          <Text style={styles.emptyText}>Aun no hay compras registradas.</Text>
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
          <Text style={styles.panelTitle}>Inventario agotado</Text>
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
  if (isEditing) {
    return (
      <View style={styles.inventoryEditBox}>
        <Text style={styles.formTitle}>Editar stock disponible</Text>
        <FormInput
          label="Ml restantes"
          value={editForm.ml_restantes}
          onChangeText={(value) => onChange('ml_restantes', value)}
          placeholder="Ej. 35"
          keyboardType="numeric"
        />
        <FormInput
          label="Nota del ajuste"
          value={editForm.notas_ajuste_stock}
          onChangeText={(value) => onChange('notas_ajuste_stock', value)}
          placeholder="Ej. Conteo manual"
        />
        <View style={styles.stockEditActions}>
          <PrimaryButton title="Cancelar" onPress={onCancel} variant="secondary" />
          <PrimaryButton title={saving ? 'Guardando...' : 'Guardar stock'} onPress={onSave} disabled={saving} />
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.rowTextGroup}>
        <Text style={styles.rowTitle}>
          {exhausted ? 'Agotado' : `${purchase.ml_restantes} ml de ${purchase.ml_iniciales} ml`}
        </Text>
        <Text style={styles.rowSubtext}>
          {purchase.proveedor || 'Proveedor pendiente'} - {formatDateValue(purchase.fecha_compra)}
        </Text>
        {!!purchase.notas_ajuste_stock && (
          <Text style={styles.rowSubtext}>Ajuste: {purchase.notas_ajuste_stock}</Text>
        )}
      </View>
      <View style={styles.inventoryActions}>
        <Text style={exhausted ? styles.exhaustedBadge : styles.rowValue}>
          {exhausted ? '0 ml' : `$${purchase.costo_compra}`}
        </Text>
        <Pressable onPress={onEdit} style={styles.smallButton}>
          <Text style={styles.smallButtonText}>Editar stock</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#242527',
  },
  content: {
    padding: 18,
    paddingBottom: 180,
  },
  hero: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
  },
  bottleMark: {
    width: 68,
    height: 82,
    borderRadius: 8,
    backgroundColor: '#d8ad62',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottleText: {
    color: '#1f1f20',
    fontSize: 28,
    fontWeight: '800',
  },
  heroInfo: {
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
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 8,
  },
  description: {
    color: '#c7c1b7',
    fontSize: 15,
    lineHeight: 22,
  },
  messageBox: {
    backgroundColor: '#3a2d2d',
    borderColor: '#7f4a4a',
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
  },
  errorText: {
    color: '#ffd7d7',
    fontSize: 14,
    lineHeight: 20,
  },
  stockPanel: {
    backgroundColor: '#d8ad62',
    borderRadius: 8,
    padding: 18,
    marginBottom: 14,
  },
  stockLabel: {
    color: '#3a2a14',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  stockValue: {
    color: '#1f1f20',
    fontSize: 34,
    fontWeight: '900',
  },
  panel: {
    backgroundColor: '#303133',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444446',
    padding: 16,
    marginBottom: 14,
  },
  panelTitle: {
    color: '#f8f4ed',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  emptyText: {
    color: '#c7c1b7',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  rowItem: {
    minHeight: 54,
    backgroundColor: '#3b3b3d',
    borderRadius: 8,
    padding: 12,
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
    backgroundColor: '#3b3b3d',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  inventoryActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  inventoryEditBox: {
    flex: 1,
  },
  stockEditActions: {
    gap: 10,
  },
  rowTitle: {
    color: '#f8f4ed',
    fontSize: 15,
    fontWeight: '700',
  },
  rowSubtext: {
    color: '#c7c1b7',
    fontSize: 13,
    marginTop: 4,
  },
  rowValue: {
    color: '#f0d19a',
    fontSize: 15,
    fontWeight: '800',
  },
  priceActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  smallButton: {
    backgroundColor: '#d8ad62',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  smallButtonDark: {
    backgroundColor: '#4a4a4c',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  smallButtonText: {
    color: '#1f1f20',
    fontSize: 12,
    fontWeight: '900',
  },
  smallButtonTextLight: {
    color: '#f8f4ed',
    fontSize: 12,
    fontWeight: '900',
  },
  cancelEdit: {
    marginTop: 10,
  },
  exhaustedItem: {
    backgroundColor: '#2b2b2d',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4a3b3b',
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    opacity: 0.72,
  },
  exhaustedBadge: {
    color: '#ffd7d7',
    backgroundColor: '#5a3333',
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: '900',
  },
  formTitle: {
    color: '#f0d19a',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 12,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  segment: {
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: '#3b3b3d',
    borderWidth: 1,
    borderColor: '#565658',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
  },
  segmentActive: {
    backgroundColor: '#d8ad62',
    borderColor: '#d8ad62',
  },
  segmentText: {
    color: '#f8f4ed',
    fontSize: 14,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#1f1f20',
  },
  switchRow: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#343436',
    borderWidth: 1,
    borderColor: '#4b4b4d',
    paddingHorizontal: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    color: '#f0d19a',
    fontSize: 14,
    fontWeight: '700',
  },
});
