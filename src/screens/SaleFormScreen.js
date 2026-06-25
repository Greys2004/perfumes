import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [inventoryLoaded, setInventoryLoaded] = useState(true);

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
  const total = useMemo(() => {
    return (Number(form.precio_unitario) || 0) * (Number(form.cantidad) || 1);
  }, [form.precio_unitario, form.cantidad]);
  const shouldShowInitialPaymentInput = form.estado_pago_inicial === 'parcial';
  const shouldShowPromiseDate = form.estado_pago_inicial !== 'completa';

  useEffect(() => {
    if (!form.perfume_id || availablePurchases.length === 0) {
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
  }, [availablePurchases, form.ml_vendidos, form.perfume_id]);

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
    }));
  }

  async function handleSave() {
    if (!form.cliente_id || !form.perfume_id || form.compra_ids.length === 0) {
      Alert.alert('Faltan datos', 'Selecciona cliente, perfume y al menos una compra de inventario.');
      return;
    }

    if (!form.precio_unitario.trim() || !form.ml_vendidos.trim()) {
      Alert.alert('Faltan importes', 'Escribe precio unitario y ml vendidos.');
      return;
    }

    if (stockValidationMessage) {
      Alert.alert('Stock insuficiente', stockValidationMessage);
      return;
    }

    if (requestedMl > selectedStockMl) {
      Alert.alert(
        'Stock insuficiente',
        `Seleccionaste ${selectedStockMl} ml disponibles. Agrega otra compra de inventario para completar la venta.`
      );
      return;
    }

    try {
      setSaving(true);
      await createSale({
        ...form,
        total,
      });
      setForm(getInitialForm());
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
            <Text style={styles.totalLabel}>TOTAL A PAGAR</Text>
            <Text style={styles.totalText}>${total}</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Feather name="database" size={16} color={colors.gold} />
            <Text style={styles.panelTitle}>Inventario Utilizado</Text>
          </View>
          <Text style={styles.hint}>
            La app selecciona automáticamente el lote con menos stock activo para optimizar la salida de botellas abiertas.
          </Text>
          <OptionGrid
            items={availablePurchases}
            selectedIds={form.compra_ids}
            multi
            getLabel={(purchase) =>
              `${purchase.ml_restantes} ml disponibles  ·  Lote: ${purchase.proveedor || 'Sin proveedor'}`
            }
            emptyText="No hay compras de lotes con stock para esta fragancia."
            onSelect={() => {}}
          />
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
            <CalendarDatePicker
              label="Fecha prometida de pago"
              value={form.fecha_pago_promesa}
              onChange={(value) => updateField('fecha_pago_promesa', value)}
            />
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
              disabled={saving || !!stockValidationMessage}
            />
          </View>
        </View>
      </ScrollView>
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
