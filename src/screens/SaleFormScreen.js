import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';

import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import CalendarDatePicker, { getLocalDateString, parseDateString } from '../components/CalendarDatePicker';
import SearchBar from '../components/SearchBar';
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
    estado_pago_inicial: 'completa',
    metodo_pago: 'Efectivo',
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
    if (remainingMl <= 0) return;
    const availableMl = Number(purchase.ml_restantes) || 0;
    if (availableMl <= 0) return;

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

function getReservedStockByPurchase(items) {
  const reservedByPurchaseId = {};
  const remainingByPurchaseId = {};

  items.forEach((item) => {
    item.compra_ids.forEach((purchaseId) => {
      if (remainingByPurchaseId[purchaseId] === undefined) {
        remainingByPurchaseId[purchaseId] = Number(item.stock_por_compra?.[purchaseId]) || 0;
      }
    });
  });

  items.forEach((item) => {
    let remainingMl = Number(item.ml_vendidos) || 0;

    item.compra_ids
      .map((purchaseId) => ({
        id: purchaseId,
        currentMl: remainingByPurchaseId[purchaseId] || 0,
      }))
      .filter((source) => source.currentMl > 0)
      .sort((a, b) => a.currentMl - b.currentMl)
      .forEach((source) => {
        if (remainingMl <= 0) return;
        const mlFromPurchase = Math.min(source.currentMl, remainingMl);
        reservedByPurchaseId[source.id] = (reservedByPurchaseId[source.id] || 0) + mlFromPurchase;
        remainingByPurchaseId[source.id] -= mlFromPurchase;
        remainingMl -= mlFromPurchase;
      });
  });

  return reservedByPurchaseId;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function SaleFormScreen({ navigation }) {
  const [clients, setClients] = useState([]);
  const [perfumes, setPerfumes] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [perfumeSearch, setPerfumeSearch] = useState('');
  const [prices, setPrices] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [form, setForm] = useState(() => getInitialForm());
  const [saleItems, setSaleItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [inventoryLoaded, setInventoryLoaded] = useState(true);
  const [paymentPlanEditor, setPaymentPlanEditor] = useState(null);
  const [manualStockSelection, setManualStockSelection] = useState(false);

  // Modals for fast zero-scroll entity selection
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [perfumeModalOpen, setPerfumeModalOpen] = useState(false);
  const [manualStockOpen, setManualStockOpen] = useState(false);

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

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === form.cliente_id),
    [clients, form.cliente_id]
  );

  const selectedPerfume = useMemo(
    () => perfumes.find((perfume) => perfume.id === form.perfume_id),
    [perfumes, form.perfume_id]
  );

  // Fast search for 500+ clients with full filtering
  const filteredClients = useMemo(() => {
    const searchText = normalizeText(clientSearch);
    if (!searchText) return clients;

    return clients.filter((client) =>
      normalizeText([client.nombre, client.telefono, client.email].join(' ')).includes(searchText)
    );
  }, [clients, clientSearch]);

  // Fast search for perfumes
  const filteredPerfumes = useMemo(() => {
    const searchText = normalizeText(perfumeSearch);
    if (!searchText) return perfumes;

    return perfumes.filter((perfume) =>
      normalizeText([
        perfume.nombre,
        perfume.marca,
        perfume.descripcion_olor,
        perfume.categoria_perfume,
        perfume.genero_perfume,
      ].join(' ')).includes(searchText)
    );
  }, [perfumes, perfumeSearch]);

  const reservedStockByPurchase = useMemo(() => getReservedStockByPurchase(saleItems), [saleItems]);
  const availablePurchases = useMemo(
    () =>
      purchases
        .map((purchase) => {
          const originalMl = Number(purchase.ml_restantes) || 0;
          const reservedMl = Number(reservedStockByPurchase[purchase.id]) || 0;
          const adjustedMl = Math.max(originalMl - reservedMl, 0);

          return {
            ...purchase,
            ml_originales_disponibles: originalMl,
            ml_reservados_en_venta: reservedMl,
            ml_restantes: adjustedMl,
          };
        })
        .filter((purchase) => Number(purchase.ml_restantes) > 0)
        .sort((a, b) => (Number(a.ml_restantes) || 0) - (Number(b.ml_restantes) || 0)),
    [purchases, reservedStockByPurchase]
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
    if (!form.perfume_id || !inventoryLoaded || requestedMl <= 0) return '';
    if (totalAvailableStockMl <= 0) return 'No hay inventario disponible para esta fragancia.';
    if (requestedMl > totalAvailableStockMl) {
      return `Se solicitan ${requestedMl} ml pero solo hay ${totalAvailableStockMl} ml disponibles en lotes.`;
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
        message: 'Venta liquidada de contado.',
      };
    }
    if (scheduledPaymentTotal <= 0) {
      return {
        tone: 'warning',
        message: `Falta programar fechas de cobro por $${remainingAfterInitialPayment}.`,
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
        message: `Excedido por $${Math.abs(scheduledPaymentDifference)} del saldo pendiente.`,
      };
    }
    return {
      tone: 'success',
      message: 'Plan cubre exactamente el saldo pendiente.',
    };
  }, [remainingAfterInitialPayment, scheduledPaymentDifference, scheduledPaymentTotal, shouldShowPromiseDate]);

  // Auto-select purchase batch based on required ml
  useEffect(() => {
    if (!form.perfume_id || availablePurchases.length === 0 || manualStockSelection) return;

    const suggestedIds = getSuggestedPurchaseIds(availablePurchases, form.ml_vendidos);
    setForm((currentForm) => {
      if (haveSameIds(currentForm.compra_ids, suggestedIds)) return currentForm;
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

  function handleSelectClient(client) {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
    updateField('cliente_id', client.id);
    setClientModalOpen(false);
  }

  function handleSelectPerfume(perfume) {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
    setManualStockSelection(false);
    setForm((currentForm) => ({
      ...currentForm,
      perfume_id: perfume.id,
      compra_ids: [],
      precio_unitario: '',
    }));
    setPerfumeModalOpen(false);
  }

  function selectPresentation(typeValue) {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
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
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
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
      stock_por_compra: availablePurchases.reduce((summary, purchase) => ({
        ...summary,
        [purchase.id]: Number(purchase.ml_restantes) || 0,
      }), {}),
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

  function splitScheduledPayments() {
    const installments = Math.max(Number(form.dividir_en_dias) || 0, 1);
    if (installments <= 1) return;

    const baseAmount = Math.floor((remainingAfterInitialPayment / installments) * 100) / 100;
    const baseDate = parseDateString(form.fecha_pago_promesa || getLocalDateString());
    const nextPromises = Array.from({ length: installments }, (_, index) => {
      const paymentDate = new Date(baseDate);
      paymentDate.setDate(baseDate.getDate() + index * 7);
      const isLast = index === installments - 1;
      const amount = isLast
        ? Number((remainingAfterInitialPayment - baseAmount * (installments - 1)).toFixed(2))
        : baseAmount;

      return {
        id: `${Date.now()}-${index}`,
        fecha: getLocalDateString(paymentDate),
        monto: String(amount),
      };
    });

    setForm((currentForm) => ({
      ...currentForm,
      fechas_pago_promesa: nextPromises,
      pago_programado_activo_id: nextPromises[0]?.id || '',
    }));
  }

  function openPaymentPlanEditor(paymentPromise) {
    setPaymentPlanEditor(
      paymentPromise
        ? { ...paymentPromise, monto: String(paymentPromise.monto || '') }
        : {
            id: `${Date.now()}`,
            fecha: form.fecha_pago_promesa || getLocalDateString(),
            monto: String(remainingAfterInitialPayment || ''),
          }
    );
  }

  function updatePaymentPlanEditor(field, value) {
    setPaymentPlanEditor((current) => ({
      ...current,
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
      Alert.alert('Falta cliente', 'Por favor selecciona el cliente para esta venta.');
      setClientModalOpen(true);
      return;
    }

    let itemsToSave = saleItems;
    if (itemsToSave.length === 0) {
      if (!addCurrentItemToSale()) return;
      itemsToSave = [getCurrentSaleItem()];
    }

    if (shouldShowPromiseDate && form.fechas_pago_promesa.length > 0) {
      const scheduledPayments = form.fechas_pago_promesa.filter(
        (paymentPromise) => paymentPromise.fecha && Number(paymentPromise.monto) > 0
      );

      if (scheduledPayments.length !== form.fechas_pago_promesa.length) {
        Alert.alert('Plan de pago incompleto', 'Completa fecha y monto en las fechas programadas.');
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Block */}
        <View style={styles.headerBlock}>
          <Text style={styles.kicker}>REGISTRO DE VENTA</Text>
          <Text style={styles.title}>Nueva Venta</Text>
          <Text style={styles.subtitle}>
            Selección ágil y descuento automático de inventario por rotación de lotes.
          </Text>
        </View>

        {!!error && (
          <View style={styles.messageBox}>
            <Feather name="alert-triangle" size={16} color={colors.danger} style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* STEP 1: CLIENTE (Compact Card with Modal Selector) */}
        <View style={styles.cardPanel}>
          <View style={styles.panelHeaderRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={styles.panelTitle}>Cliente</Text>
            {!!selectedClient && (
              <Pressable
                onPress={() => setClientModalOpen(true)}
                style={styles.changeActionBtn}
              >
                <Feather name="refresh-cw" size={12} color={colors.amber} style={{ marginRight: 4 }} />
                <Text style={styles.changeActionText}>Cambiar</Text>
              </Pressable>
            )}
          </View>

          {selectedClient ? (
            <Pressable
              onPress={() => setClientModalOpen(true)}
              style={styles.selectedEntityCard}
            >
              <View style={styles.clientAvatar}>
                <Text style={styles.clientAvatarText}>
                  {selectedClient.nombre.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.entityName}>{selectedClient.nombre}</Text>
                {!!selectedClient.telefono && (
                  <View style={styles.contactMiniRow}>
                    <Feather name="phone" size={11} color={colors.gold} style={{ marginRight: 4 }} />
                    <Text style={styles.entitySub}>{selectedClient.telefono}</Text>
                  </View>
                )}
              </View>
              <Feather name="chevron-right" size={16} color={colors.gold} />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setClientModalOpen(true)}
              style={styles.selectorTrigger}
            >
              <View style={styles.selectorIconRing}>
                <Feather name="user-plus" size={18} color={colors.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectorPrompt}>Seleccionar Cliente...</Text>
                <Text style={styles.selectorHint}>{clients.length} clientes registrados</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.gold} />
            </Pressable>
          )}
        </View>

        {/* STEP 2: FRAGANCIA & PRESENTACIÓN (Compact Card with Modal Selector) */}
        <View style={styles.cardPanel}>
          <View style={styles.panelHeaderRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <Text style={styles.panelTitle}>Fragancia & Presentación</Text>
            {!!selectedPerfume && (
              <Pressable
                onPress={() => setPerfumeModalOpen(true)}
                style={styles.changeActionBtn}
              >
                <Feather name="refresh-cw" size={12} color={colors.amber} style={{ marginRight: 4 }} />
                <Text style={styles.changeActionText}>Cambiar</Text>
              </Pressable>
            )}
          </View>

          {selectedPerfume ? (
            <>
              <Pressable
                onPress={() => setPerfumeModalOpen(true)}
                style={styles.selectedEntityCard}
              >
                {selectedPerfume.imagen ? (
                  <Image
                    source={{ uri: selectedPerfume.imagen }}
                    style={styles.perfumeThumb}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.perfumeThumbFallback}>
                    <Feather name="droplet" size={18} color={colors.gold} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.entityKicker}>
                    {selectedPerfume.marca?.toUpperCase() || 'ALTA GAMA'}
                  </Text>
                  <Text style={styles.entityName}>{selectedPerfume.nombre}</Text>
                  <Text style={styles.stockAvailabilityBadge}>
                    Stock disponible: {totalAvailableStockMl} ml
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.gold} />
              </Pressable>

              {/* Presentation Capsules */}
              <Text style={styles.innerSectionTitle}>TIPO DE PRESENTACIÓN</Text>
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
                Sugerencia pública:{' '}
                {selectedPrice ? `$${selectedPrice.precio_publico} MXN` : 'Sin precio configurado'}
              </Text>

              {/* Quantity and Price Inputs */}
              <View style={styles.twoColumnRow}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <FormInput
                    label="Cantidad"
                    value={form.cantidad}
                    onChangeText={updateQuantity}
                    placeholder="1"
                    keyboardType="numeric"
                    leftIcon="hash"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormInput
                    label="Ml a descontar"
                    value={form.ml_vendidos}
                    onChangeText={(value) => updateField('ml_vendidos', value)}
                    placeholder="3"
                    keyboardType="numeric"
                    prefix="ml"
                  />
                </View>
              </View>

              {!!stockValidationMessage && (
                <View style={styles.inlineErrorBox}>
                  <Feather name="alert-triangle" size={14} color={colors.danger} style={{ marginRight: 6 }} />
                  <Text style={styles.inlineErrorText}>{stockValidationMessage}</Text>
                </View>
              )}

              <FormInput
                label="Precio Unitario ($ MXN)"
                value={form.precio_unitario}
                onChangeText={(value) => updateField('precio_unitario', value)}
                placeholder="Ej. 180"
                keyboardType="numeric"
                prefix="$"
              />

              {/* Subtotal Banner */}
              <View style={styles.subtotalBanner}>
                <Text style={styles.subtotalLabel}>SUBTOTAL ESTE PRODUCTO</Text>
                <Text style={styles.subtotalAmount}>${currentItemTotal} MXN</Text>
              </View>

              {/* Collapsible Stock Drawer */}
              <View style={styles.autoStockBanner}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Feather name="check-circle" size={15} color={colors.success} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.autoStockTitle}>Lote asignado automáticamente</Text>
                    <Text style={styles.autoStockSub}>
                      {selectedStockMl} ml seleccionados de compras activas
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setManualStockOpen(!manualStockOpen)}
                  style={styles.accordionToggleBtn}
                >
                  <Feather
                    name={manualStockOpen ? 'chevron-up' : 'sliders'}
                    size={13}
                    color={colors.amber}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.accordionToggleText}>
                    {manualStockOpen ? 'Ocultar' : 'Ajustar'}
                  </Text>
                </Pressable>
              </View>

              {manualStockOpen && (
                <View style={styles.manualStockDrawer}>
                  <Text style={styles.drawerHint}>
                    Puedes seleccionar o desmarcar compras específicas para esta venta:
                  </Text>
                  {availablePurchases.map((purchase) => {
                    const isSelected = form.compra_ids.includes(purchase.id);
                    return (
                      <Pressable
                        key={purchase.id}
                        onPress={() => togglePurchaseSelection(purchase)}
                        style={[styles.stockOptionItem, isSelected && styles.stockOptionItemActive]}
                      >
                        <Feather
                          name={isSelected ? 'check-square' : 'square'}
                          size={16}
                          color={isSelected ? colors.amber : colors.textSubtle}
                          style={{ marginRight: 8 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.stockOptionTitle, isSelected && styles.stockOptionTitleActive]}>
                            {purchase.proveedor || 'Lote sin proveedor'}
                          </Text>
                          <Text style={styles.stockOptionSub}>
                            {purchase.ml_restantes} ml disponibles
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                  {manualStockSelection && (
                    <Pressable
                      onPress={resetAutomaticStockSelection}
                      style={styles.resetAutoStockBtn}
                    >
                      <Feather name="refresh-cw" size={12} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.resetAutoStockText}>Volver a selección automática</Text>
                    </Pressable>
                  )}
                </View>
              )}

              {/* Option to add to cart for multi-product sale */}
              <View style={{ marginTop: spacing.sm }}>
                <PrimaryButton
                  title="+ Agregar a lista y sumar otra fragancia"
                  onPress={addCurrentItemToSale}
                  variant="outline"
                  icon="plus"
                />
              </View>
            </>
          ) : (
            <Pressable
              onPress={() => setPerfumeModalOpen(true)}
              style={styles.selectorTrigger}
            >
              <View style={styles.selectorIconRing}>
                <Feather name="droplet" size={18} color={colors.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectorPrompt}>Seleccionar Fragancia...</Text>
                <Text style={styles.selectorHint}>{perfumes.length} perfumes en catálogo activo</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.gold} />
            </Pressable>
          )}
        </View>

        {/* CART SUMMARY (Only appears if items were added to multi-product sale) */}
        {saleItems.length > 0 && (
          <View style={styles.cardPanel}>
            <View style={styles.panelHeaderRow}>
              <Feather name="shopping-bag" size={16} color={colors.gold} style={{ marginRight: 6 }} />
              <Text style={styles.panelTitle}>Productos en la Venta ({saleItems.length})</Text>
            </View>
            {saleItems.map((item, index) => (
              <View key={item.id} style={styles.cartItem}>
                <View style={styles.rowTextGroup}>
                  <Text style={styles.rowTitle}>
                    {index + 1}. {item.perfume_nombre}
                  </Text>
                  <Text style={styles.rowSubtext}>
                    {item.tipo_label} · {item.ml_vendidos} ml · {item.cantidad} pza
                  </Text>
                </View>
                <View style={styles.cartItemActions}>
                  <Text style={styles.rowValue}>${item.subtotal}</Text>
                  <Pressable onPress={() => removeSaleItem(item.id)} style={styles.removeCartButton}>
                    <Feather name="trash-2" size={13} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* STEP 3: RESUMEN DE COBRO & PLAN DE PAGOS */}
        <View style={styles.cardPanel}>
          <View style={styles.panelHeaderRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>3</Text>
            </View>
            <Text style={styles.panelTitle}>Cobro & Liquidación</Text>
          </View>

          {/* Grand Total Banner */}
          <LinearGradient
            colors={['#173841', '#0E2329']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.totalGrandCard}
          >
            <Text style={styles.totalGrandLabel}>TOTAL A COBRAR</Text>
            <Text style={styles.totalGrandAmount}>${total} MXN</Text>
          </LinearGradient>

          {/* Quick Payment Mode Selector */}
          <Text style={styles.innerSectionTitle}>MODALIDAD DE PAGO</Text>
          <View style={styles.segmentRow}>
            {[
              { label: '✓ Contado Completo', value: 'completa' },
              { label: 'Anticipo Parcial', value: 'parcial' },
              { label: 'A Crédito / Pendiente', value: 'pendiente' },
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

          {shouldShowInitialPaymentInput && (
            <FormInput
              label="Monto del Anticipo Inicial ($ MXN) *"
              value={form.pago_inicial}
              onChangeText={(value) => updateField('pago_inicial', value)}
              placeholder="Ej. 100"
              keyboardType="numeric"
              prefix="$"
            />
          )}

          <FormInput
            label="Método de Pago"
            value={form.metodo_pago}
            onChangeText={(value) => updateField('metodo_pago', value)}
            placeholder="Efectivo, Transferencia SPEI, Tarjeta..."
            leftIcon="credit-card"
          />

          <CalendarDatePicker
            label="Fecha de Venta"
            value={form.fecha_venta}
            onChange={(value) => updateField('fecha_venta', value)}
          />

          {/* Promise schedule only shown if not paid in full */}
          {shouldShowPromiseDate && (
            <View style={styles.promiseSection}>
              <View style={styles.promiseHeader}>
                <View>
                  <Text style={styles.sectionHeading}>Plan de Pagos / Fechas Prometidas</Text>
                  <Text style={styles.promiseHint}>
                    Saldo pendiente: ${remainingAfterInitialPayment} MXN
                  </Text>
                </View>
              </View>

              <View style={styles.promiseSplitBox}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <FormInput
                    label="Dividir en pagos"
                    value={form.dividir_en_dias}
                    onChangeText={(value) => updateField('dividir_en_dias', value)}
                    placeholder="Ej. 2 o 3"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ justifyContent: 'center', marginTop: 12 }}>
                  <PrimaryButton
                    title="Calcular"
                    onPress={splitScheduledPayments}
                    variant="secondary"
                  />
                </View>
              </View>

              <View style={styles.promiseList}>
                <View style={styles.promiseListHeader}>
                  <Text style={styles.promiseListHint}>Fechas de cobro pactadas</Text>
                  <Pressable onPress={() => openPaymentPlanEditor()} style={styles.promiseAddButton}>
                    <Feather name="plus" size={14} color="#FFFFFF" />
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
                </View>

                {form.fechas_pago_promesa.map((paymentPromise) => (
                  <Pressable
                    key={paymentPromise.id}
                    onPress={() => openPaymentPlanEditor(paymentPromise)}
                    style={styles.promisePill}
                  >
                    <View>
                      <Text style={styles.promisePillDate}>{paymentPromise.fecha || 'Fecha'}</Text>
                      <Text style={styles.promisePillAmount}>
                        ${Number(paymentPromise.monto) || remainingAfterInitialPayment} MXN
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
              </View>
            </View>
          )}

          <FormInput
            label="Notas Internas de la Venta"
            value={form.notas}
            onChangeText={(value) => updateField('notas', value)}
            placeholder="Comentarios especiales o indicaciones de entrega..."
            multiline
          />

          <View style={{ marginTop: spacing.md }}>
            <PrimaryButton
              title={saving ? 'Procesando Venta...' : 'Registrar Venta'}
              onPress={handleSave}
              disabled={saving || (saleItems.length === 0 && !form.perfume_id)}
              loading={saving}
              variant="primary"
              icon="check-circle"
            />
          </View>
        </View>
      </ScrollView>

      {/* ========================================================= */}
      {/* FAST MODAL FOR CLIENTS (VIRTUALIZED FLATLIST FOR 500+ CLIENTS) */}
      {/* ========================================================= */}
      <Modal
        visible={clientModalOpen}
        animationType="slide"
        onRequestClose={() => setClientModalOpen(false)}
      >
        <View style={styles.modalScreen}>
          <View style={styles.modalTopBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTopKicker}>DIRECTORIO DE CLIENTES</Text>
              <Text style={styles.modalTopTitle}>Seleccionar Cliente</Text>
            </View>
            <Pressable onPress={() => setClientModalOpen(false)} style={styles.modalCloseCircle}>
              <Feather name="x" size={18} color={colors.text} />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.xs }}>
            <SearchBar
              value={clientSearch}
              onChangeText={setClientSearch}
              placeholder="Buscar por nombre, WhatsApp o correo..."
            />
          </View>

          <FlatList
            data={filteredClients}
            keyExtractor={(item) => item.id}
            initialNumToRender={15}
            maxToRenderPerBatch={20}
            windowSize={10}
            contentContainerStyle={styles.modalListContent}
            ListEmptyComponent={
              <View style={styles.modalEmptyBox}>
                <Feather name="user-x" size={28} color={colors.gold} style={{ marginBottom: 8 }} />
                <Text style={styles.modalEmptyTitle}>No se encontró ningún cliente</Text>
                <Text style={styles.modalEmptySub}>Prueba con otro término de búsqueda.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isSelected = form.cliente_id === item.id;
              return (
                <Pressable
                  onPress={() => handleSelectClient(item)}
                  style={[styles.modalItemRow, isSelected && styles.modalItemRowSelected]}
                >
                  <View style={[styles.clientAvatar, isSelected && styles.clientAvatarSelected]}>
                    <Text style={[styles.clientAvatarText, isSelected && styles.clientAvatarTextSelected]}>
                      {item.nombre.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalItemTitle, isSelected && styles.modalItemTitleSelected]}>
                      {item.nombre}
                    </Text>
                    {!!item.telefono && (
                      <View style={styles.contactMiniRow}>
                        <Feather name="phone" size={11} color={colors.gold} style={{ marginRight: 4 }} />
                        <Text style={styles.modalItemSub}>{item.telefono}</Text>
                      </View>
                    )}
                  </View>
                  {isSelected ? (
                    <View style={styles.selectedPillBadge}>
                      <Feather name="check" size={12} color={colors.amber} style={{ marginRight: 3 }} />
                      <Text style={styles.selectedPillBadgeText}>Elegido</Text>
                    </View>
                  ) : (
                    <Feather name="chevron-right" size={16} color={colors.lineStrong} />
                  )}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* FAST MODAL FOR PERFUMES (VIRTUALIZED FLATLIST FOR CATALOGUE) */}
      {/* ========================================================= */}
      <Modal
        visible={perfumeModalOpen}
        animationType="slide"
        onRequestClose={() => setPerfumeModalOpen(false)}
      >
        <View style={styles.modalScreen}>
          <View style={styles.modalTopBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTopKicker}>CATÁLOGO DE FRAGANCIAS</Text>
              <Text style={styles.modalTopTitle}>Seleccionar Perfume</Text>
            </View>
            <Pressable onPress={() => setPerfumeModalOpen(false)} style={styles.modalCloseCircle}>
              <Feather name="x" size={18} color={colors.text} />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.xs }}>
            <SearchBar
              value={perfumeSearch}
              onChangeText={setPerfumeSearch}
              placeholder="Buscar perfume, casa perfumista o notas..."
            />
          </View>

          <FlatList
            data={filteredPerfumes}
            keyExtractor={(item) => item.id}
            initialNumToRender={12}
            maxToRenderPerBatch={15}
            windowSize={10}
            contentContainerStyle={styles.modalListContent}
            ListEmptyComponent={
              <View style={styles.modalEmptyBox}>
                <Feather name="droplet" size={28} color={colors.gold} style={{ marginBottom: 8 }} />
                <Text style={styles.modalEmptyTitle}>No se encontró el perfume</Text>
                <Text style={styles.modalEmptySub}>Prueba con otra palabra clave.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isSelected = form.perfume_id === item.id;
              return (
                <Pressable
                  onPress={() => handleSelectPerfume(item)}
                  style={[styles.modalItemRow, isSelected && styles.modalItemRowSelected]}
                >
                  {item.imagen ? (
                    <Image source={{ uri: item.imagen }} style={styles.perfumeThumb} resizeMode="contain" />
                  ) : (
                    <View style={styles.perfumeThumbFallback}>
                      <Feather name="droplet" size={18} color={colors.gold} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entityKicker}>{item.marca?.toUpperCase() || 'ALTA GAMA'}</Text>
                    <Text style={[styles.modalItemTitle, isSelected && styles.modalItemTitleSelected]}>
                      {item.nombre}
                    </Text>
                    {!!item.categoria_perfume && (
                      <Text style={styles.modalItemSub}>
                        {item.categoria_perfume} · {item.genero_perfume || 'Unisex'}
                      </Text>
                    )}
                  </View>
                  {isSelected ? (
                    <View style={styles.selectedPillBadge}>
                      <Feather name="check" size={12} color={colors.amber} style={{ marginRight: 3 }} />
                      <Text style={styles.selectedPillBadgeText}>Elegido</Text>
                    </View>
                  ) : (
                    <Feather name="chevron-right" size={16} color={colors.lineStrong} />
                  )}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* PAYMENT PLAN EDITOR MODAL */}
      {/* ========================================================= */}
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
                <Text style={styles.sheetKicker}>FECHA PROGRAMADA</Text>
                <Text style={styles.sheetTitle}>Fecha y Monto</Text>
              </View>
              <Pressable onPress={() => setPaymentPlanEditor(null)} style={styles.sheetCloseButton}>
                <Feather name="x" size={16} color={colors.text} />
              </Pressable>
            </View>
            {!!paymentPlanEditor && (
              <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                <FormInput
                  label="Monto esperado ($ MXN)"
                  value={paymentPlanEditor.monto}
                  onChangeText={(value) => updatePaymentPlanEditor('monto', value)}
                  placeholder="Ej. 100"
                  keyboardType="numeric"
                  prefix="$"
                />
                <CalendarDatePicker
                  label="Fecha de cobro pactada"
                  value={paymentPlanEditor.fecha}
                  onChange={(value) => updatePaymentPlanEditor('fecha', value)}
                />
                <View style={{ marginTop: spacing.md, marginBottom: spacing.xl }}>
                  <PrimaryButton
                    title="Confirmar Fecha"
                    onPress={savePaymentPlanEditor}
                    variant="primary"
                  />
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 160,
  },
  headerBlock: {
    marginBottom: spacing.md,
    paddingTop: 4,
  },
  kicker: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textSubtle,
    fontSize: 13,
    lineHeight: 18,
  },
  cardPanel: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.28)',
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.petroleum,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  panelTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    flex: 1,
  },
  changeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(166, 106, 53, 0.1)',
  },
  changeActionText: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '800',
  },

  // Selector Triggers (When entity NOT selected)
  selectorTrigger: {
    minHeight: 64,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(166, 136, 100, 0.35)',
    borderStyle: 'dashed',
    backgroundColor: '#FAF8F4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  selectorIconRing: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(166, 106, 53, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectorPrompt: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  selectorHint: {
    color: colors.textSubtle,
    fontSize: 12,
    marginTop: 2,
  },

  // Selected Entity Card (Compact Luxury View)
  selectedEntityCard: {
    minHeight: 64,
    borderRadius: radius.md,
    borderWidth: 1.2,
    borderColor: 'rgba(166, 136, 100, 0.35)',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.xs,
    ...shadow.card,
  },
  clientAvatar: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.petroleum,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  clientAvatarSelected: {
    backgroundColor: colors.amber,
  },
  clientAvatarText: {
    color: colors.goldLight,
    fontSize: 17,
    fontWeight: '900',
  },
  clientAvatarTextSelected: {
    color: '#FFFFFF',
  },
  contactMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  perfumeThumb: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    marginRight: 12,
  },
  perfumeThumbFallback: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(166, 136, 100, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  entityKicker: {
    color: colors.amber,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  entityName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  entitySub: {
    color: colors.textSubtle,
    fontSize: 12,
  },
  stockAvailabilityBadge: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },

  // Presentation Segments
  innerSectionTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: spacing.sm,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  segment: {
    minHeight: 38,
    borderRadius: radius.pill,
    backgroundColor: '#FAF8F4',
    borderWidth: 1.2,
    borderColor: 'rgba(166, 136, 100, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  segmentActive: {
    backgroundColor: colors.petroleum,
    borderColor: colors.gold,
  },
  segmentDisabled: {
    opacity: 0.45,
    borderColor: colors.dangerLine,
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  segmentTextDisabled: {
    color: colors.danger,
  },
  hint: {
    color: colors.textSubtle,
    fontSize: 12,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  twoColumnRow: {
    flexDirection: 'row',
  },
  inlineErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerSurface,
    borderColor: colors.dangerLine,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  inlineErrorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
  },
  subtotalBanner: {
    backgroundColor: '#FAF7F2',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.35)',
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  subtotalLabel: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtotalAmount: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },

  // Stock Drawer
  autoStockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF8F4',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.22)',
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  autoStockTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  autoStockSub: {
    color: colors.textSubtle,
    fontSize: 11,
  },
  accordionToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(166, 106, 53, 0.12)',
  },
  accordionToggleText: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '800',
  },
  manualStockDrawer: {
    backgroundColor: '#FAF8F4',
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.25)',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  drawerHint: {
    color: colors.textSubtle,
    fontSize: 11,
    marginBottom: spacing.xs,
  },
  stockOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.2)',
    marginBottom: 4,
  },
  stockOptionItemActive: {
    borderColor: colors.amber,
    backgroundColor: '#FAF5EE',
  },
  stockOptionTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  stockOptionTitleActive: {
    fontWeight: '800',
  },
  stockOptionSub: {
    color: colors.textSubtle,
    fontSize: 11,
  },
  resetAutoStockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.petroleum,
    borderRadius: radius.pill,
    paddingVertical: 6,
    marginTop: 6,
  },
  resetAutoStockText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  // Cart Items
  cartItem: {
    minHeight: 56,
    backgroundColor: '#FAF8F4',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.25)',
    padding: spacing.sm,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTextGroup: {
    flex: 1,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  rowSubtext: {
    color: colors.textSubtle,
    fontSize: 11,
    marginTop: 2,
  },
  rowValue: {
    color: colors.amber,
    fontSize: 14,
    fontWeight: '900',
    marginRight: 8,
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeCartButton: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Grand Total Card
  totalGrandCard: {
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.45)',
    ...shadow.glow,
  },
  totalGrandLabel: {
    color: colors.goldLight,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  totalGrandAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 4,
  },

  // Promise Section
  promiseSection: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  promiseHeader: {
    marginBottom: spacing.xs,
  },
  sectionHeading: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  promiseHint: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  promiseSplitBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  promiseList: {
    marginTop: spacing.xs,
  },
  promiseListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  promiseListHint: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '700',
  },
  promiseAddButton: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.petroleum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planStatusBox: {
    backgroundColor: '#FAF8F4',
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.25)',
    borderRadius: radius.sm,
    padding: 8,
    marginBottom: 8,
  },
  planStatusSuccess: {
    backgroundColor: 'rgba(95, 175, 139, 0.12)',
    borderColor: colors.success,
  },
  planStatusDanger: {
    backgroundColor: colors.dangerSurface,
    borderColor: colors.danger,
  },
  planStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
  },
  planStatusTextSuccess: {
    color: colors.success,
  },
  planStatusTextDanger: {
    color: colors.danger,
  },
  promisePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.28)',
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
  },
  promisePillDate: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  promisePillAmount: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
  },
  promiseRemoveButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal Screen (FullScreen for 500+ Virtualized FlatLists)
  modalScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(166, 136, 100, 0.2)',
  },
  modalTopKicker: {
    color: colors.amber,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  modalTopTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  modalCloseCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: '#FAF8F4',
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalListContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 40,
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1.2,
    borderColor: 'rgba(166, 136, 100, 0.22)',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: 8,
    ...shadow.card,
  },
  modalItemRowSelected: {
    borderColor: colors.amber,
    backgroundColor: '#FAF5EE',
  },
  modalItemTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  modalItemTitleSelected: {
    color: colors.amber,
  },
  modalItemSub: {
    color: colors.textSubtle,
    fontSize: 12,
    marginTop: 2,
  },
  selectedPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(166, 106, 53, 0.15)',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(166, 106, 53, 0.35)',
  },
  selectedPillBadgeText: {
    color: colors.amber,
    fontSize: 10,
    fontWeight: '900',
  },
  modalEmptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  modalEmptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalEmptySub: {
    color: colors.textSubtle,
    fontSize: 13,
  },

  // Sheet for Payment Plan
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
    padding: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetKicker: {
    color: colors.amber,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  sheetCloseButton: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    marginBottom: spacing.md,
  },

  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerSurface,
    borderColor: colors.dangerLine,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
});
