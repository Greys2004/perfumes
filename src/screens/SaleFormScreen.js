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

import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import { listenClients } from '../services/clientsService';
import { listenActivePerfumes } from '../services/perfumesService';
import {
  listenPresentationPrices,
  presentationTypes,
} from '../services/presentationPricesService';
import { listenPurchasesByPerfume } from '../services/purchasesService';
import { createSale } from '../services/salesService';

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addDays(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  return getLocalDateString(date);
}

function getWeekDays(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const selectedDate = new Date(year, month - 1, day);
  const start = new Date(selectedDate);
  const weekDay = start.getDay();
  const daysFromMonday = weekDay === 0 ? 6 : weekDay - 1;
  start.setDate(start.getDate() - daysFromMonday);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return getLocalDateString(date);
  });
}

const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function getInitialForm() {
  return {
    cliente_id: '',
    perfume_id: '',
    compra_ids: [],
    tipo_producto: 'decant_3ml',
    ml_vendidos: '3',
    cantidad: '1',
    precio_unitario: '',
    pago_inicial: '',
    metodo_pago: '',
    fecha_venta: getLocalDateString(),
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

export default function SaleFormScreen({ navigation }) {
  const [clients, setClients] = useState([]);
  const [perfumes, setPerfumes] = useState([]);
  const [prices, setPrices] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [form, setForm] = useState(() => getInitialForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      return undefined;
    }

    const unsubscribePrices = listenPresentationPrices(
      form.perfume_id,
      setPrices,
      (firebaseError) => setError(firebaseError.message)
    );
    const unsubscribePurchases = listenPurchasesByPerfume(
      form.perfume_id,
      setPurchases,
      (firebaseError) => setError(firebaseError.message)
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
  const total = useMemo(() => {
    return (Number(form.precio_unitario) || 0) * (Number(form.cantidad) || 1);
  }, [form.precio_unitario, form.cantidad]);

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

  async function handleSave() {
    if (!form.cliente_id || !form.perfume_id || form.compra_ids.length === 0) {
      Alert.alert('Faltan datos', 'Selecciona cliente, perfume y al menos una compra de inventario.');
      return;
    }

    if (!form.precio_unitario.trim() || !form.ml_vendidos.trim()) {
      Alert.alert('Faltan importes', 'Escribe precio unitario y ml vendidos.');
      return;
    }

    if ((Number(form.ml_vendidos) || 0) > selectedStockMl) {
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
        <Text style={styles.kicker}>Nueva venta</Text>
        <Text style={styles.title}>Crear venta</Text>
        <Text style={styles.subtitle}>
          Selecciona cliente, perfume, presentacion y la compra que se descontara del inventario.
        </Text>

        {!!error && (
          <View style={styles.messageBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Cliente</Text>
          <OptionGrid
            items={clients}
            selectedId={form.cliente_id}
            getLabel={(client) => client.nombre}
            emptyText="Primero registra un cliente."
            onSelect={(client) => updateField('cliente_id', client.id)}
          />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Perfume</Text>
          <OptionGrid
            items={perfumes}
            selectedId={form.perfume_id}
            getLabel={(perfume) => `${perfume.nombre} - ${perfume.marca || 'Sin marca'}`}
            emptyText="Primero registra un perfume."
            onSelect={selectPerfume}
          />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Presentacion</Text>
          <View style={styles.segmentRow}>
            {presentationTypes.map((type) => (
              <Pressable
                key={type.value}
                onPress={() => selectPresentation(type.value)}
                style={[
                  styles.segment,
                  form.tipo_producto === type.value && styles.segmentActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    form.tipo_producto === type.value && styles.segmentTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}>
            Precio sugerido: {selectedPrice ? `$${selectedPrice.precio_publico}` : 'sin precio guardado'}
          </Text>

          <FormInput
            label="Cantidad"
            value={form.cantidad}
            onChangeText={updateQuantity}
            placeholder="Ej. 1"
            keyboardType="numeric"
          />
          <FormInput
            label="Ml vendidos"
            value={form.ml_vendidos}
            onChangeText={(value) => updateField('ml_vendidos', value)}
            placeholder="Ej. 3"
            keyboardType="numeric"
          />
          <FormInput
            label="Precio unitario"
            value={form.precio_unitario}
            onChangeText={(value) => updateField('precio_unitario', value)}
            placeholder="Ej. 180"
            keyboardType="numeric"
          />
          <Text style={styles.totalText}>Total: ${total}</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Compra para descontar stock</Text>
          <Text style={styles.hint}>
            Se seleccionan automaticamente de menor a mayor stock para acabar primero la botella con menos ml.
          </Text>
          <OptionGrid
            items={availablePurchases}
            selectedIds={form.compra_ids}
            multi
            getLabel={(purchase) =>
              `${purchase.ml_restantes} ml disponibles${purchase.proveedor ? ` - ${purchase.proveedor}` : ''}`
            }
            emptyText="No hay compras con stock para este perfume."
            onSelect={() => {}}
          />
          {form.compra_ids.length > 0 && (
            <Text style={styles.selectedStockText}>Seleccionado: {selectedStockMl} ml</Text>
          )}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Pago inicial</Text>
          <FormInput
            label="Pago inicial"
            value={form.pago_inicial}
            onChangeText={(value) => updateField('pago_inicial', value)}
            placeholder="Ej. 100"
            keyboardType="numeric"
          />
          <FormInput
            label="Metodo de pago"
            value={form.metodo_pago}
            onChangeText={(value) => updateField('metodo_pago', value)}
            placeholder="Efectivo, transferencia, tarjeta"
          />
          <DateSelector
            value={form.fecha_venta}
            onChange={(value) => updateField('fecha_venta', value)}
          />
          <FormInput
            label="Notas"
            value={form.notas}
            onChangeText={(value) => updateField('notas', value)}
            placeholder="Detalle opcional"
            multiline
          />
          <PrimaryButton
            title={saving ? 'Guardando...' : 'Guardar venta'}
            onPress={handleSave}
            disabled={saving}
          />
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
          <Text style={styles.dateLabel}>Fecha de venta</Text>
          <Text style={styles.dateValue}>{value}</Text>
        </View>
        <Pressable onPress={() => onChange(getLocalDateString())} style={styles.todayButton}>
          <Text style={styles.todayButtonText}>Hoy</Text>
        </Pressable>
      </View>

      <View style={styles.dateControls}>
        <Pressable onPress={() => onChange(addDays(value, -1))} style={styles.dateStepButton}>
          <Text style={styles.dateStepText}>Anterior</Text>
        </Pressable>
        <Pressable onPress={() => onChange(addDays(value, 1))} style={styles.dateStepButton}>
          <Text style={styles.dateStepText}>Siguiente</Text>
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
            <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
              {getLabel(item)}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
  subtitle: {
    color: '#c7c1b7',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
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
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 12,
  },
  optionGrid: {
    gap: 8,
  },
  option: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: '#3b3b3d',
    borderWidth: 1,
    borderColor: '#565658',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  optionActive: {
    backgroundColor: '#d8ad62',
    borderColor: '#d8ad62',
  },
  optionText: {
    color: '#f8f4ed',
    fontSize: 14,
    fontWeight: '700',
  },
  optionTextActive: {
    color: '#1f1f20',
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
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
  hint: {
    color: '#c7c1b7',
    fontSize: 14,
    marginBottom: 12,
  },
  totalText: {
    color: '#f0d19a',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  selectedStockText: {
    color: '#6db28f',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 10,
  },
  dateBox: {
    backgroundColor: '#24252a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4f463b',
    padding: 12,
    marginBottom: 16,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  dateLabel: {
    color: '#f0d19a',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },
  dateValue: {
    color: '#f8f4ed',
    fontSize: 18,
    fontWeight: '900',
  },
  todayButton: {
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: '#d8ad62',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  todayButtonText: {
    color: '#1f1f20',
    fontSize: 13,
    fontWeight: '900',
  },
  dateControls: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  dateStepButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: '#303133',
    borderWidth: 1,
    borderColor: '#4b4b4d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateStepText: {
    color: '#f8f4ed',
    fontSize: 13,
    fontWeight: '800',
  },
  weekRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 8,
    backgroundColor: '#303133',
    borderWidth: 1,
    borderColor: '#444446',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonActive: {
    backgroundColor: '#d8ad62',
    borderColor: '#d8ad62',
  },
  dayLabel: {
    color: '#c7c1b7',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 3,
  },
  dayLabelActive: {
    color: '#3a2a14',
  },
  dayNumber: {
    color: '#f8f4ed',
    fontSize: 15,
    fontWeight: '900',
  },
  dayNumberActive: {
    color: '#1f1f20',
  },
  emptyText: {
    color: '#c7c1b7',
    fontSize: 14,
    lineHeight: 20,
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
});
