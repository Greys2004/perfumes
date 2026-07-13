import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import AnimatedPressable from '../components/AnimatedPressable';
import CalendarDatePicker, { getLocalDateString } from '../components/CalendarDatePicker';
import { colors, radius, spacing, shadow } from '../theme';
import { listenClients } from '../services/clientsService';
import { listenActivePerfumes } from '../services/perfumesService';
import {
  listenPresentationPrices,
  presentationTypes,
} from '../services/presentationPricesService';
import { listenPurchasesByPerfume } from '../services/purchasesService';
import { createSale } from '../services/salesService';

function getInitialForm() {
  const today = getLocalDateString();

  return {
    cliente_id: '',
    perfume_id: '',
    compra_ids: [],
    tipo_producto: 'decant_3ml',
    ml_vendidos: '3',
    cantidad: '1',
    precio_unitario: '',
    pago_inicial: '',
    estado_pago_inicial: 'pendiente',
    metodo_pago: '',
    fecha_venta: today,
    fecha_pago_promesa: today,
    monto_pago_programado: '',
    dividir_en_dias: '',
    pago_programado_activo_id: '',
    fechas_pago_promesa: [],
    notas: '',
  };
}

function getSuggestedPurchaseIds(purchases, mlNeeded) {
  let remainingMl = Number(mlNeeded) || 0;
  const selectedIds = [];

  purchases.forEach((purchase) => {
    if (remainingMl <= 0) {
      return;
    }

    const availableMl = Number(purchase.ml_restantes) || 0;

    if (availableMl <= 0) {
      return;
    }

    selectedIds.push(purchase.id);
    remainingMl -= availableMl;
  });

  return selectedIds;
}

function haveSameIds(firstIds, secondIds) {
  return firstIds.length === secondIds.length && firstIds.every((id, index) => id === secondIds[index]);
}

function getPresentationMl(type, selectedPerfume, quantity) {
  const unitMl = type?.ml || selectedPerfume?.ml_botella_completa || 0;

  return unitMl * quantity;
}

export default function SaleFormScreen({ navigation }) {
  const [clients, setClients] = useState([]);
  const [perfumes, setPerfumes] = useState([]);
  const [prices, setPrices] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [form, setForm] = useState(() => getInitialForm());
  const [saleItems, setSaleItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [inventoryLoaded, setInventoryLoaded] = useState(true);
  const [paymentPlanEditor, setPaymentPlanEditor] = useState(null);
  const [manualStockSelection, setManualStockSelection] = useState(false);

  useEffect(() => {
    const unsubscribeClients = listenClients(setClients, (firebaseError) =>
      setError(firebaseError.message)
    );
    const unsubscribePerfumes = listenActivePerfumes(setPerfumes, (firebaseError) =>
      setError(firebaseError.message)
    );

    return () => {
      unsubscribeClients();
      unsubscribePerfumes();
    };
  }, []);

  useEffect(() => {
    if (!form.perfume_id) {
      setPrices([]);
      setPurchases([]);
      setInventoryLoaded(true);
      return undefined;
    }

    setInventoryLoaded(false);
    const unsubscribePrices = listenPresentationPrices(
      form.perfume_id,
      setPrices,
      (firebaseError) => setError(firebaseError.message)
    );
    const unsubscribePurchases = listenPurchasesByPerfume(
      form.perfume_id,
      (purchasesList) => {
        setPurchases(purchasesList);
        setInventoryLoaded(true);
      },
      (firebaseError) => {
        setError(firebaseError.message);
        setInventoryLoaded(true);
      }
    );

    return () => {
      unsubscribePrices();
      unsubscribePurchases();
    };
  }, [form.perfume_id]);

  const selectedPerfume = perfumes.find((perfume) => perfume.id === form.perfume_id);
  const availablePurchases = useMemo(
    () =>
      purchases
        .filter((purchase) => Number(purchase.ml_restantes) > 0)
        .sort((a, b) => (Number(a.ml_restantes) || 0) - (Number(b.ml_restantes) || 0)),
    [purchases]
  );
  const selectedType = presentationTypes.find((type) => type.value === form.tipo_producto);
  const selectedPrice = prices.find((price) => price.tipo === form.tipo_producto);
  const selectedStockMl = useMemo(() => {
    return availablePurchases
      .filter((purchase) => form.compra_ids.includes(purchase.id))
      .reduce((sum, purchase) => sum + (Number(purchase.ml_restantes) || 0), 0);
  }, [availablePurchases, form.compra_ids]);
  const totalAvailableStockMl = useMemo(() => {
    return availablePurchases.reduce((sum, purchase) => sum + (Number(purchase.ml_restantes) || 0), 0);
  }, [availablePurchases]);
  const requestedMl = Number(form.ml_vendidos) || 0;
  const stockValidationMessage = useMemo(() => {
    if (!form.perfume_id || !inventoryLoaded || requestedMl <= 0) {
      return '';
    }

    if (totalAvailableStockMl <= 0) {
      return 'No hay inventario disponible para esta fragancia.';
    }

    if (requestedMl > totalAvailableStockMl) {
      return `No puedes vender ${requestedMl} ml: solo hay ${totalAvailableStockMl} ml disponibles en inventario.`;
    }

    return '';
  }, [form.perfume_id, inventoryLoaded, requestedMl, totalAvailableStockMl]);
  const currentItemTotal = useMemo(() => {
    return (Number(form.precio_unitario) || 0) * (Number(form.cantidad) || 1);
  }, [form.precio_unitario, form.cantidad]);
  const cartTotal = useMemo(() => {
    return saleItems.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
  }, [saleItems]);
  const total = saleItems.length > 0 ? cartTotal : currentItemTotal;
  const shouldShowInitialPaymentInput = form.estado_pago_inicial === 'parcial';
  const shouldShowPromiseDate = form.estado_pago_inicial !== 'completa';
  const remainingAfterInitialPayment = Math.max(total - (Number(form.pago_inicial) || 0), 0);
  const scheduledPaymentTotal = useMemo(() => {
    return form.fechas_pago_promesa.reduce(
      (sum, paymentPromise) => sum + (Number(paymentPromise.monto) || 0),
      0
    );
  }, [form.fechas_pago_promesa]);
  const scheduledPaymentDifference = Number(
    (remainingAfterInitialPayment - scheduledPaymentTotal).toFixed(2)
  );
  const paymentPlanStatus = useMemo(() => {
    if (!shouldShowPromiseDate) {
      return {
        tone: 'success',
        message: 'Venta liquidada al momento del registro.',
      };
    }

    if (scheduledPaymentTotal <= 0) {
      return {
        tone: 'warning',
        message: `No hay fechas programadas. Falta programar $${remainingAfterInitialPayment}.`,
      };
    }

    if (scheduledPaymentDifference > 0) {
      return {
        tone: 'warning',
        message: `Faltan $${scheduledPaymentDifference} por programar.`,
      };
    }

    if (scheduledPaymentDifference < 0) {
      return {
        tone: 'danger',
        message: `Te pasaste por $${Math.abs(scheduledPaymentDifference)} del saldo pendiente.`,
      };
    }

    return {
      tone: 'success',
      message: 'El plan cubre exactamente el saldo pendiente.',
    };
  }, [remainingAfterInitialPayment, scheduledPaymentDifference, scheduledPaymentTotal, shouldShowPromiseDate]);

  useEffect(() => {
    if (!form.perfume_id || availablePurchases.length === 0 || manualStockSelection) {
      return;
    }

    const suggestedIds = getSuggestedPurchaseIds(availablePurchases, form.ml_vendidos);

    setForm((currentForm) => {
      if (haveSameIds(currentForm.compra_ids, suggestedIds)) {
        return currentForm;
      }

      return {
        ...currentForm,
        compra_ids: suggestedIds,
      };
    });
  }, [availablePurchases, form.ml_vendidos, form.perfume_id, manualStockSelection]);

  useEffect(() => {
    if (form.estado_pago_inicial === 'completa') {
      updateField('pago_inicial', total ? String(total) : '');
      return;
    }

    if (form.estado_pago_inicial === 'pendiente') {
      updateField('pago_inicial', '0');
    }
  }, [form.estado_pago_inicial, total]);

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function selectPerfume(perfume) {
    setManualStockSelection(false);
    setForm((currentForm) => ({
      ...currentForm,
      perfume_id: perfume.id,
      compra_ids: [],
      precio_unitario: '',
    }));
  }

  function selectPresentation(typeValue) {
    const type = presentationTypes.find((presentation) => presentation.value === typeValue);
    const price = prices.find((presentationPrice) => presentationPrice.tipo === typeValue);
    const quantity = Number(form.cantidad) || 1;
    const ml = type?.ml || selectedPerfume?.ml_botella_completa || 0;

    setForm((currentForm) => ({
      ...currentForm,
      tipo_producto: typeValue,
      ml_vendidos: String(ml * quantity),
      precio_unitario: price ? String(price.precio_publico) : currentForm.precio_unitario,
    }));
  }

  function togglePurchaseSelection(purchase) {
    setManualStockSelection(true);
    setForm((currentForm) => {
      const isSelected = currentForm.compra_ids.includes(purchase.id);

      return {
        ...currentForm,
        compra_ids: isSelected
          ? currentForm.compra_ids.filter((purchaseId) => purchaseId !== purchase.id)
          : [...currentForm.compra_ids, purchase.id],
      };
    });
  }

  function resetAutomaticStockSelection() {
    const suggestedIds = getSuggestedPurchaseIds(availablePurchases, form.ml_vendidos);

    setManualStockSelection(false);
    setForm((currentForm) => ({
      ...currentForm,
      compra_ids: suggestedIds,
    }));
  }

  function updateQuantity(value) {
    const quantity = Number(value) || 1;
    const ml = selectedType?.ml || selectedPerfume?.ml_botella_completa || 0;

    setForm((currentForm) => ({
      ...currentForm,
      cantidad: value,
      ml_vendidos: String(ml * quantity),
    }));
  }

  function selectInitialPaymentStatus(status) {
    setForm((currentForm) => ({
      ...currentForm,
      estado_pago_inicial: status,
      pago_inicial:
        status === 'completa'
          ? String(total)
          : status === 'pendiente'
            ? '0'
            : currentForm.pago_inicial === '0'
              ? ''
              : currentForm.pago_inicial,
      fechas_pago_promesa: status === 'completa' ? [] : currentForm.fechas_pago_promesa,
    }));
  }

  function getCurrentSaleItem() {
    return {
      id: `${Date.now()}`,
      perfume_id: form.perfume_id,
      perfume_nombre: selectedPerfume?.nombre || 'Perfume sin nombre',
      tipo_producto: form.tipo_producto,
      tipo_label: selectedType?.label || form.tipo_producto,
      ml_vendidos: Number(form.ml_vendidos) || 0,
      cantidad: Number(form.cantidad) || 1,
      precio_unitario: Number(form.precio_unitario) || 0,
      subtotal: currentItemTotal,
      compra_ids: form.compra_ids,
      stock_seleccionado: selectedStockMl,
    };
  }

  function resetCurrentProductForm() {
    setManualStockSelection(false);
    setForm((currentForm) => ({
      ...currentForm,
      perfume_id: '',
      compra_ids: [],
      tipo_producto: 'decant_3ml',
      ml_vendidos: '3',
      cantidad: '1',
      precio_unitario: '',
    }));
  }

  function addCurrentItemToSale() {
    if (!form.perfume_id || form.compra_ids.length === 0) {
      Alert.alert('Faltan datos', 'Selecciona perfume y al menos una compra de inventario.');
      return false;
    }

    if (!form.precio_unitario.trim() || !form.ml_vendidos.trim()) {
      Alert.alert('Faltan importes', 'Escribe precio unitario y ml vendidos.');
      return false;
    }

    if (stockValidationMessage) {
      Alert.alert('Stock insuficiente', stockValidationMessage);
      return false;
    }

    if (requestedMl > selectedStockMl) {
      Alert.alert(
        'Stock insuficiente',
        `Seleccionaste ${selectedStockMl} ml disponibles. Agrega otra compra de inventario para completar la venta.`
      );
      return false;
    }

    const nextItem = getCurrentSaleItem();
    setSaleItems((currentItems) => [...currentItems, nextItem]);
    resetCurrentProductForm();
    return true;
  }

  function removeSaleItem(itemId) {
    setSaleItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
  }

  function updatePaymentPromise(promiseId, field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      fechas_pago_promesa: currentForm.fechas_pago_promesa.map((paymentPromise) =>
        paymentPromise.id === promiseId
          ? { ...paymentPromise, [field]: value }
          : paymentPromise
      ),
    }));
  }

  function addScheduledPaymentFromSelectedDate() {
    const selectedDate = form.fecha_pago_promesa || getLocalDateString();
    const amount = form.monto_pago_programado || String(remainingAfterInitialPayment || '');

    setForm((currentForm) => {
      const existingPromise = currentForm.fechas_pago_promesa.find(
        (paymentPromise) => paymentPromise.fecha === selectedDate
      );
      const nextPromises = existingPromise
        ? currentForm.fechas_pago_promesa.map((paymentPromise) =>
            paymentPromise.fecha === selectedDate
              ? { ...paymentPromise, monto: amount }
              : paymentPromise
          )
        : [
            ...currentForm.fechas_pago_promesa,
            {
              id: `${Date.now()}`,
              fecha: selectedDate,
              monto: amount,
            },
          ];

      return {
        ...currentForm,
        monto_pago_programado: '',
        fechas_pago_promesa: nextPromises.filter((paymentPromise) => paymentPromise.fecha),
      };
    });
  }

  function splitScheduledPayments() {
    const days = Number(form.dividir_en_dias) || 0;

    if (days <= 0) {
      Alert.alert('Falta dividir', 'Escribe en cuantos dias quieres dividir el saldo.');
      return;
    }

    const baseAmount = remainingAfterInitialPayment / days;
    const nextPromises = Array.from({ length: days }, (_, index) => {
      const amount = index === days - 1
        ? remainingAfterInitialPayment - Number((baseAmount * (days - 1)).toFixed(2))
        : baseAmount;

      return {
        id: `${Date.now()}-${index}`,
        fecha: '',
        monto: String(Number(amount.toFixed(2))),
      };
    });

    setForm((currentForm) => ({
      ...currentForm,
      fechas_pago_promesa: nextPromises,
      pago_programado_activo_id: nextPromises[0]?.id || '',
      fecha_pago_promesa: currentForm.fecha_pago_promesa || getLocalDateString(),
      monto_pago_programado: '',
    }));
  }

  function openPaymentPlanEditor(paymentPromise) {
    const unprogrammedAmount = Math.max(remainingAfterInitialPayment - scheduledPaymentTotal, 0);
    const fallbackAmount = paymentPromise?.monto || form.monto_pago_programado || String(unprogrammedAmount || remainingAfterInitialPayment || '');

    setPaymentPlanEditor({
      id: paymentPromise?.id || `${Date.now()}`,
      fecha: paymentPromise?.fecha || form.fecha_pago_promesa || getLocalDateString(),
      monto: String(fallbackAmount || ''),
      isNew: !paymentPromise,
    });
  }

  function updatePaymentPlanEditor(field, value) {
    setPaymentPlanEditor((currentEditor) => ({
      ...currentEditor,
      [field]: value,
    }));
  }

  function savePaymentPlanEditor() {
    if (!paymentPlanEditor?.fecha) {
      Alert.alert('Falta fecha', 'Selecciona la fecha programada.');
      return;
    }

    if (!paymentPlanEditor?.monto) {
      Alert.alert('Falta monto', 'Escribe el monto esperado para esa fecha.');
      return;
    }

    setForm((currentForm) => {
      const exists = currentForm.fechas_pago_promesa.some(
        (paymentPromise) => paymentPromise.id === paymentPlanEditor.id
      );
      const nextPromise = {
        id: paymentPlanEditor.id,
        fecha: paymentPlanEditor.fecha,
        monto: paymentPlanEditor.monto,
      };

      return {
        ...currentForm,
        fecha_pago_promesa: nextPromise.fecha,
        pago_programado_activo_id: nextPromise.id,
        monto_pago_programado: '',
        fechas_pago_promesa: exists
          ? currentForm.fechas_pago_promesa.map((paymentPromise) =>
              paymentPromise.id === nextPromise.id ? nextPromise : paymentPromise
            )
          : [...currentForm.fechas_pago_promesa, nextPromise],
      };
    });
    setPaymentPlanEditor(null);
  }

  function selectScheduledPayment(paymentPromise) {
    setForm((currentForm) => ({
      ...currentForm,
      pago_programado_activo_id: paymentPromise.id,
      fecha_pago_promesa: paymentPromise.fecha,
      monto_pago_programado: String(paymentPromise.monto || ''),
    }));
  }

  function updateSelectedScheduledDate(value) {
    setForm((currentForm) => {
      if (!currentForm.pago_programado_activo_id) {
        return {
          ...currentForm,
          fecha_pago_promesa: value,
        };
      }

      return {
        ...currentForm,
        fecha_pago_promesa: value,
        fechas_pago_promesa: currentForm.fechas_pago_promesa.map((paymentPromise) =>
          paymentPromise.id === currentForm.pago_programado_activo_id
            ? { ...paymentPromise, fecha: value }
            : paymentPromise
        ),
      };
    });
  }

  function updateScheduledAmount(value) {
    setForm((currentForm) => ({
      ...currentForm,
      monto_pago_programado: value,
      fechas_pago_promesa: currentForm.pago_programado_activo_id
        ? currentForm.fechas_pago_promesa.map((paymentPromise) =>
            paymentPromise.id === currentForm.pago_programado_activo_id
              ? { ...paymentPromise, monto: value }
              : paymentPromise
          )
        : currentForm.fechas_pago_promesa,
    }));
  }

  function addPaymentPromise() {
    setForm((currentForm) => ({
      ...currentForm,
      fechas_pago_promesa: [
        ...currentForm.fechas_pago_promesa,
        {
          id: `${Date.now()}`,
          fecha: currentForm.fecha_pago_promesa || getLocalDateString(),
          monto: '',
        },
      ],
    }));
  }

  function removePaymentPromise(promiseId) {
    setForm((currentForm) => {
      const nextPromises = currentForm.fechas_pago_promesa.filter(
        (paymentPromise) => paymentPromise.id !== promiseId
      );

      return {
        ...currentForm,
        fechas_pago_promesa: nextPromises.length
          ? nextPromises
          : [{ id: `${Date.now()}`, fecha: getLocalDateString(), monto: '' }],
      };
    });
  }

  async function handleSave() {
    if (!form.cliente_id) {
      Alert.alert('Faltan datos', 'Selecciona cliente.');
      return;
    }

    let itemsToSave = saleItems;

    if (itemsToSave.length === 0) {
      if (!addCurrentItemToSale()) {
        return;
      }

      itemsToSave = [getCurrentSaleItem()];
    }

    if (shouldShowPromiseDate && form.fechas_pago_promesa.length > 0) {
      const scheduledPayments = form.fechas_pago_promesa.filter(
        (paymentPromise) => paymentPromise.fecha && Number(paymentPromise.monto) > 0
      );

      if (scheduledPayments.length !== form.fechas_pago_promesa.length) {
        Alert.alert('Plan de pago incompleto', 'Completa fecha y monto en las fechas programadas, o elimina las que no uses.');
        return;
      }

      if (scheduledPaymentDifference !== 0) {
        Alert.alert('Plan de pago incompleto', paymentPlanStatus.message);
        return;
      }
    }

    try {
      setSaving(true);
      await createSale({
        ...form,
        items: itemsToSave,
        total,
      });
      setForm(getInitialForm());
      setSaleItems([]);
      navigation.navigate('Payments');
    } catch (firebaseError) {
      Alert.alert('No se pudo guardar la venta', firebaseError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.kicker}>Transacciones</Text>
        <Text style={styles.title}>Nueva Venta</Text>
        <Text style={styles.subtitle}>
          Registra una venta descontando los mililitros directamente de tus lotes de compras activos.
        </Text>

        {!!error && (
          <View style={styles.messageBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Feather name="user" size={16} color={colors.gold} />
            <Text style={styles.panelTitle}>Seleccionar Cliente</Text>
          </View>
          <OptionGrid
            items={clients}
            selectedId={form.cliente_id}
            getLabel={(client) => client.nombre}
            emptyText="Primero registra un cliente en el directorio."
            onSelect={(client) => updateField('cliente_id', client.id)}
          />
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Feather name="tag" size={16} color={colors.gold} />
            <Text style={styles.panelTitle}>Seleccionar Perfume</Text>
          </View>
          <OptionGrid
            items={perfumes}
            selectedId={form.perfume_id}
            getLabel={(perfume) => `${perfume.nombre} (de ${perfume.marca || 'Marca Exclusiva'})`}
            emptyText="Primero registra un perfume en el catálogo."
            onSelect={selectPerfume}
          />
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Feather name="box" size={16} color={colors.gold} />
            <Text style={styles.panelTitle}>Presentación & Cantidad</Text>
          </View>
          
          <Text style={[styles.sectionHeading, { marginBottom: 8 }]}>Tipo de decant / botella</Text>
          <View style={styles.segmentRow}>
            {presentationTypes.map((type) => {
              const quantity = Number(form.cantidad) || 1;
              const presentationMl = getPresentationMl(type, selectedPerfume, quantity);
              const isSelected = form.tipo_producto === type.value;
              const isDisabled =
                !!form.perfume_id &&
                inventoryLoaded &&
                presentationMl > totalAvailableStockMl;

              return (
                <Pressable
                  key={type.value}
                  onPress={() => selectPresentation(type.value)}
                  disabled={isDisabled}
                  style={[
                    styles.segment,
                    isSelected && styles.segmentActive,
                    isDisabled && styles.segmentDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      isSelected && styles.segmentTextActive,
                      isDisabled && styles.segmentTextDisabled,
                    ]}
                  >
                    {type.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>
            Sugerencia pública: {selectedPrice ? `$${selectedPrice.precio_publico}` : 'Sin precio configurado'}
          </Text>

          <FormInput
            label="Cantidad"
            value={form.cantidad}
            onChangeText={updateQuantity}
            placeholder="Ej. 1"
            keyboardType="numeric"
          />
          <FormInput
            label="Ml Vendidos"
            value={form.ml_vendidos}
            onChangeText={(value) => updateField('ml_vendidos', value)}
            placeholder="Ej. 3"
            keyboardType="numeric"
          />
          {!!stockValidationMessage && (
            <View style={styles.inlineErrorBox}>
              <Feather name="alert-triangle" size={14} color={colors.danger} style={{ marginRight: 6 }} />
              <Text style={styles.inlineErrorText}>{stockValidationMessage}</Text>
            </View>
          )}
          <FormInput
            label="Precio Unitario"
            value={form.precio_unitario}
            onChangeText={(value) => updateField('precio_unitario', value)}
            placeholder="Ej. 180"
            keyboardType="numeric"
          />

          <View style={styles.totalBlock}>
            <Text style={styles.totalLabel}>SUBTOTAL PRODUCTO</Text>
            <Text style={styles.totalText}>${currentItemTotal}</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Feather name="database" size={16} color={colors.gold} />
            <Text style={styles.panelTitle}>Inventario Utilizado</Text>
          </View>
          <Text style={styles.hint}>
            Por default se selecciona el lote con menos stock activo, pero puedes tocar una botella para cambiarla.
          </Text>
          <OptionGrid
            items={availablePurchases}
            selectedIds={form.compra_ids}
            multi
            getLabel={(purchase) =>
              `${purchase.ml_restantes} ml disponibles  ·  Lote: ${purchase.proveedor || 'Sin proveedor'}`
            }
            emptyText="No hay compras de lotes con stock para esta fragancia."
            onSelect={togglePurchaseSelection}
          />
          {manualStockSelection && availablePurchases.length > 0 && (
            <Pressable onPress={resetAutomaticStockSelection} style={styles.resetStockButton}>
              <Feather name="refresh-cw" size={13} color={colors.ink} style={{ marginRight: 6 }} />
              <Text style={styles.resetStockButtonText}>Usar seleccion automatica</Text>
            </Pressable>
          )}
          {form.compra_ids.length > 0 && (
            <View style={styles.selectedStockWrapper}>
              <Feather name="check" size={14} color={colors.success} style={{ marginRight: 4 }} />
              <Text style={styles.selectedStockText}>Stock disponible seleccionado: {selectedStockMl} ml</Text>
            </View>
          )}
          {!!form.perfume_id && inventoryLoaded && (
            <Text style={[styles.selectedStockText, styles.totalStockText]}>
              Stock total disponible: {totalAvailableStockMl} ml
            </Text>
          )}
          <View style={{ marginTop: spacing.md }}>
            <PrimaryButton
              title="Agregar producto a venta"
              onPress={addCurrentItemToSale}
              variant="secondary"
            />
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Feather name="shopping-bag" size={16} color={colors.gold} />
            <Text style={styles.panelTitle}>Productos en la Venta</Text>
          </View>
          {saleItems.length === 0 ? (
            <Text style={styles.emptyText}>
              Agrega uno o varios perfumes antes de registrar la venta. Si guardas sin agregar, se usara el producto actual.
            </Text>
          ) : (
            <>
              {saleItems.map((item, index) => (
                <View key={item.id} style={styles.cartItem}>
                  <View style={styles.rowTextGroup}>
                    <Text style={styles.rowTitle}>
                      {index + 1}. {item.perfume_nombre}
                    </Text>
                    <Text style={styles.rowSubtext}>
                      {item.tipo_label}  ·  {item.ml_vendidos} ml  ·  {item.cantidad} pza
                    </Text>
                    <Text style={styles.rowSubtext}>
                      Stock seleccionado: {item.stock_seleccionado} ml
                    </Text>
                  </View>
                  <View style={styles.cartItemActions}>
                    <Text style={styles.rowValue}>${item.subtotal}</Text>
                    <Pressable onPress={() => removeSaleItem(item.id)} style={styles.removeCartButton}>
                      <Feather name="trash-2" size={12} color={colors.textMuted} />
                    </Pressable>
                  </View>
                </View>
              ))}
              <View style={styles.totalBlock}>
                <Text style={styles.totalLabel}>TOTAL A PAGAR</Text>
                <Text style={styles.totalText}>${total}</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Feather name="credit-card" size={16} color={colors.gold} />
            <Text style={styles.panelTitle}>Pago Inicial & Fecha</Text>
          </View>

          <Text style={[styles.sectionHeading, { marginBottom: 8 }]}>Estado inicial de pago</Text>
          <View style={styles.segmentRow}>
            {[
              { label: 'Completa', value: 'completa' },
              { label: 'Parcial', value: 'parcial' },
              { label: 'Pendiente', value: 'pendiente' },
            ].map((status) => {
              const isSelected = form.estado_pago_inicial === status.value;

              return (
                <Pressable
                  key={status.value}
                  onPress={() => selectInitialPaymentStatus(status.value)}
                  style={[styles.segment, isSelected && styles.segmentActive]}
                >
                  <Text style={[styles.segmentText, isSelected && styles.segmentTextActive]}>
                    {status.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <FormInput
            label="Pago Inicial"
            value={form.pago_inicial}
            onChangeText={(value) => updateField('pago_inicial', value)}
            placeholder="Ej. 100"
            keyboardType="numeric"
            editable={shouldShowInitialPaymentInput}
          />
          <FormInput
            label="Método de Pago inicial"
            value={form.metodo_pago}
            onChangeText={(value) => updateField('metodo_pago', value)}
            placeholder="Efectivo, transferencia, tarjeta..."
          />
          
          <CalendarDatePicker
            label="Fecha de venta"
            value={form.fecha_venta}
            onChange={(value) => updateField('fecha_venta', value)}
          />
          {shouldShowPromiseDate && (
            <View style={styles.promiseSection}>
              <View style={styles.promiseHeader}>
                <View>
                  <Text style={styles.sectionHeading}>Fechas prometidas de pago</Text>
                  <Text style={styles.promiseHint}>Saldo por cobrar: ${remainingAfterInitialPayment}</Text>
                </View>
              </View>

              <View style={styles.promiseSplitBox}>
                <FormInput
                  label="Dividir saldo en pagos"
                  value={form.dividir_en_dias}
                  onChangeText={(value) => updateField('dividir_en_dias', value)}
                  placeholder="Ej. 3"
                  keyboardType="numeric"
                />
                <PrimaryButton
                  title="Crear division"
                  onPress={splitScheduledPayments}
                  variant="secondary"
                />
              </View>

              <View style={styles.promiseList}>
                <View style={styles.promiseListHeader}>
                  <Text style={styles.promiseListHint}>Plan de pagos</Text>
                  <Pressable onPress={() => openPaymentPlanEditor()} style={styles.promiseAddButton}>
                    <Feather name="plus" size={14} color={colors.ink} />
                  </Pressable>
                </View>
                <View
                  style={[
                    styles.planStatusBox,
                    paymentPlanStatus.tone === 'success' && styles.planStatusSuccess,
                    paymentPlanStatus.tone === 'danger' && styles.planStatusDanger,
                  ]}
                >
                  <Text
                    style={[
                      styles.planStatusText,
                      paymentPlanStatus.tone === 'success' && styles.planStatusTextSuccess,
                      paymentPlanStatus.tone === 'danger' && styles.planStatusTextDanger,
                    ]}
                  >
                    {paymentPlanStatus.message}
                  </Text>
                  <Text style={styles.planStatusSubtext}>
                    Programado: ${scheduledPaymentTotal} de ${remainingAfterInitialPayment}
                  </Text>
                </View>
                {form.fechas_pago_promesa
                  .map((paymentPromise) => (
                    <Pressable
                      key={paymentPromise.id}
                      onPress={() => openPaymentPlanEditor(paymentPromise)}
                      style={[
                        styles.promisePill,
                        form.pago_programado_activo_id === paymentPromise.id && styles.promisePillActive,
                      ]}
                    >
                      <View>
                        <Text style={styles.promisePillDate}>{paymentPromise.fecha || 'Elegir fecha'}</Text>
                        <Text style={styles.promisePillAmount}>
                          ${Number(paymentPromise.monto) || remainingAfterInitialPayment}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => removePaymentPromise(paymentPromise.id)}
                        style={styles.promiseRemoveButton}
                      >
                        <Feather name="x" size={13} color={colors.textMuted} />
                      </Pressable>
                    </Pressable>
                  ))}
                {form.fechas_pago_promesa.length === 0 && (
                  <Text style={styles.emptyText}>Agrega una fecha o crea una division del saldo.</Text>
                )}
              </View>
            </View>
          )}
          
          <FormInput
            label="Notas Internas"
            value={form.notas}
            onChangeText={(value) => updateField('notas', value)}
            placeholder="Comentarios o indicaciones de la venta"
            multiline
          />
          
          <View style={{ marginTop: spacing.md }}>
            <PrimaryButton
              title={saving ? 'Guardando Venta...' : 'Registrar Venta'}
              onPress={handleSave}
              disabled={saving || (saleItems.length === 0 && !!stockValidationMessage)}
            />
          </View>
        </View>
      </ScrollView>
      <Modal
        visible={!!paymentPlanEditor}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentPlanEditor(null)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setPaymentPlanEditor(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetKicker}>Plan de pago</Text>
                <Text style={styles.sheetTitle}>Fecha y monto</Text>
              </View>
              <Pressable onPress={() => setPaymentPlanEditor(null)} style={styles.sheetCloseButton}>
                <Feather name="x" size={16} color={colors.ink} />
              </Pressable>
            </View>
            {!!paymentPlanEditor && (
              <>
                <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                  <FormInput
                    label="Monto esperado"
                    value={paymentPlanEditor.monto}
                    onChangeText={(value) => updatePaymentPlanEditor('monto', value)}
                    placeholder={String(remainingAfterInitialPayment || '')}
                    keyboardType="numeric"
                  />
                  <CalendarDatePicker
                    label="Fecha programada"
                    value={paymentPlanEditor.fecha}
                    onChange={(value) => updatePaymentPlanEditor('fecha', value)}
                  />
                </ScrollView>
                <View style={styles.sheetFooter}>
                  <PrimaryButton title="Guardar pago programado" onPress={savePaymentPlanEditor} />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function DateSelector({ value, onChange }) {
  const weekDays = getWeekDays(value);

  return (
    <View style={styles.dateBox}>
      <View style={styles.dateHeader}>
        <View>
          <Text style={styles.dateLabel}>Fecha de Venta</Text>
          <Text style={styles.dateValue}>{value}</Text>
        </View>
        <Pressable onPress={() => onChange(getLocalDateString())} style={styles.todayButton}>
          <Text style={styles.todayButtonText}>Hoy</Text>
        </Pressable>
      </View>

      <View style={styles.dateControls}>
        <Pressable onPress={() => onChange(addDays(value, -1))} style={styles.dateStepButton}>
          <Feather name="chevron-left" size={14} color={colors.text} style={{ marginRight: 4 }} />
          <Text style={styles.dateStepText}>Ayer</Text>
        </Pressable>
        <Pressable onPress={() => onChange(addDays(value, 1))} style={styles.dateStepButton}>
          <Text style={styles.dateStepText}>Mañana</Text>
          <Feather name="chevron-right" size={14} color={colors.text} style={{ marginLeft: 4 }} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {weekDays.map((date, index) => {
          const isSelected = date === value;

          return (
            <Pressable
              key={date}
              onPress={() => onChange(date)}
              style={[styles.dayButton, isSelected && styles.dayButtonActive]}
            >
              <Text style={[styles.dayLabel, isSelected && styles.dayLabelActive]}>
                {dayLabels[index]}
              </Text>
              <Text style={[styles.dayNumber, isSelected && styles.dayNumberActive]}>
                {Number(date.slice(-2))}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function OptionGrid({ items, selectedId, selectedIds = [], multi = false, getLabel, onSelect, emptyText }) {
  if (items.length === 0) {
    return <Text style={styles.emptyText}>{emptyText}</Text>;
  }

  return (
    <View style={styles.optionGrid}>
      {items.map((item) => {
        const isSelected = multi ? selectedIds.includes(item.id) : selectedId === item.id;

        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item)}
            style={[styles.option, isSelected && styles.optionActive]}
          >
            <View style={styles.optionContent}>
              <View style={[styles.optionDot, isSelected && styles.optionDotActive]} />
              <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                {getLabel(item)}
              </Text>
            </View>
          </Pressable>
        );
      })}
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
    paddingBottom: 80,
  },
  kicker: {
    color: colors.gold,
    fontSize: 11,
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
    marginBottom: 6,
  },
  subtitle: {
    color: colors.textSubtle,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.lg,
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
  optionGrid: {
    gap: 8,
  },
  option: {
    minHeight: 46,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  optionActive: {
    backgroundColor: 'rgba(229, 192, 123, 0.08)',
    borderColor: colors.gold,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lineStrong,
  },
  optionDotActive: {
    backgroundColor: colors.gold,
    ...shadow.glow,
  },
  optionText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  optionTextActive: {
    color: colors.gold,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
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
  segmentDisabled: {
    opacity: 0.45,
    borderColor: colors.dangerLine,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  segmentText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: colors.ink,
  },
  segmentTextDisabled: {
    color: colors.danger,
  },
  sectionHeading: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '850',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  hint: {
    color: colors.textSubtle,
    fontSize: 12,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  totalBlock: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    ...shadow.glow,
  },
  totalLabel: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  totalText: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  cartItem: {
    minHeight: 68,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowTextGroup: {
    flex: 1,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  rowSubtext: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  rowValue: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '900',
  },
  cartItemActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  removeCartButton: {
    width: 28,
    height: 28,
    borderRadius: radius.sm - 4,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedStockWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  selectedStockText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '800',
  },
  totalStockText: {
    color: colors.textSubtle,
    marginTop: spacing.xs,
  },
  resetStockButton: {
    alignSelf: 'flex-start',
    minHeight: 34,
    borderRadius: radius.sm - 2,
    backgroundColor: colors.gold,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
  },
  resetStockButtonText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  inlineErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerSurface,
    borderColor: colors.dangerLine,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  inlineErrorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  promiseSection: {
    marginBottom: spacing.md,
  },
  promiseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  promiseHint: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  promiseAddButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.glow,
  },
  promiseCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  promiseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  promiseTitle: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  promiseRemoveButton: {
    width: 28,
    height: 28,
    borderRadius: radius.sm - 4,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promiseComposer: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  promiseSplitBox: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  promiseList: {
    gap: 8,
  },
  promiseListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  promiseListHint: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  planStatusBox: {
    backgroundColor: 'rgba(229, 192, 123, 0.1)',
    borderColor: colors.lineStrong,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  planStatusSuccess: {
    backgroundColor: 'rgba(108, 178, 143, 0.12)',
    borderColor: 'rgba(108, 178, 143, 0.35)',
  },
  planStatusDanger: {
    backgroundColor: colors.dangerSurface,
    borderColor: colors.dangerLine,
  },
  planStatusText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 3,
  },
  planStatusTextSuccess: {
    color: colors.success,
  },
  planStatusTextDanger: {
    color: colors.danger,
  },
  planStatusSubtext: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '700',
  },
  promisePill: {
    minHeight: 50,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  promisePillActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(229, 192, 123, 0.08)',
  },
  promisePillDate: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  promisePillAmount: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(5, 5, 8, 0.68)',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.md,
    ...shadow.card,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  sheetKicker: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  sheetCloseButton: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.glow,
  },
  sheetScroll: {
    maxHeight: 470,
  },
  sheetFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  dateBox: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: spacing.md,
  },
  dateLabel: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dateValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  todayButton: {
    minHeight: 32,
    borderRadius: radius.sm - 4,
    backgroundColor: colors.gold,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  todayButtonText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  dateControls: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  dateStepButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: radius.sm - 4,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  dateStepText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dayButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.sm - 2,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    ...shadow.glow,
  },
  dayLabel: {
    color: colors.textSubtle,
    fontSize: 9,
    fontWeight: '900',
    marginBottom: 2,
  },
  dayLabelActive: {
    color: colors.ink,
  },
  dayNumber: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '850',
  },
  dayNumberActive: {
    color: colors.ink,
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: 13,
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
});
