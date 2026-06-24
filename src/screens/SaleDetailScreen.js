import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import { listenActivePerfumes } from '../services/perfumesService';
import { formatDateValue } from '../services/purchasesService';
import {
  cancelSale,
  listenAllSaleDetails,
  listenPaymentsBySale,
  updateSaleBasic,
} from '../services/salesService';

export default function SaleDetailScreen({ navigation, route }) {
  const { sale, client } = route.params;
  const [details, setDetails] = useState([]);
  const [payments, setPayments] = useState([]);
  const [perfumes, setPerfumes] = useState([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fecha_venta: formatDateValue(sale.fecha_venta),
    total: String(sale.total || ''),
    notas: sale.notas || '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribeDetails = listenAllSaleDetails(
      (items) => setDetails(items.filter((detail) => detail.venta_id === sale.id)),
      (firebaseError) => setError(firebaseError.message)
    );
    const unsubscribePayments = listenPaymentsBySale(
      sale.id,
      setPayments,
      (firebaseError) => setError(firebaseError.message)
    );
    const unsubscribePerfumes = listenActivePerfumes(
      setPerfumes,
      (firebaseError) => setError(firebaseError.message)
    );

    return () => {
      unsubscribeDetails();
      unsubscribePayments();
      unsubscribePerfumes();
    };
  }, [sale.id]);

  const totalPaid = payments.reduce((sum, payment) => sum + (Number(payment.monto) || 0), 0);
  const remaining = (Number(form.total) || Number(sale.total) || 0) - totalPaid;
  const groupedDetails = useMemo(() => {
    const grouped = details.reduce((summary, detail) => {
      const key = `${detail.perfume_id}-${detail.tipo_producto}`;
      const current = summary[key] || {
        ...detail,
        ml_vendidos: 0,
        cantidad: 0,
        subtotal: 0,
      };

      return {
        ...summary,
        [key]: {
          ...current,
          ml_vendidos: current.ml_vendidos + (Number(detail.ml_vendidos) || 0),
          cantidad: current.cantidad + (Number(detail.cantidad) || 0),
          subtotal: current.subtotal + (Number(detail.subtotal) || 0),
        },
      };
    }, {});

    return Object.values(grouped);
  }, [details]);

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function getPerfumeName(perfumeId) {
    const perfume = perfumes.find((perfumeItem) => perfumeItem.id === perfumeId);

    return perfume?.nombre || 'Perfume no encontrado';
  }

  async function handleSave() {
    try {
      setSaving(true);
      await updateSaleBasic(sale.id, form);
      setEditing(false);
    } catch (firebaseError) {
      Alert.alert('No se pudo actualizar', firebaseError.message);
    } finally {
      setSaving(false);
    }
  }

  function handleCancelSale() {
    Alert.alert(
      'Cancelar venta',
      'Se ocultara la venta de pendientes y se restaurara el stock vendido.',
      [
        { text: 'No cancelar', style: 'cancel' },
        {
          text: 'Cancelar venta',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelSale(sale.id);
              navigation.goBack();
            } catch (firebaseError) {
              Alert.alert('No se pudo cancelar', firebaseError.message);
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Detalle de venta</Text>
      <Text style={styles.title}>{client.nombre}</Text>

      {!!error && (
        <View style={styles.messageBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.panel}>
        {editing ? (
          <>
            <FormInput
              label="Fecha"
              value={form.fecha_venta}
              onChangeText={(value) => updateField('fecha_venta', value)}
              placeholder="AAAA-MM-DD"
            />
            <FormInput
              label="Total"
              value={form.total}
              onChangeText={(value) => updateField('total', value)}
              placeholder="Ej. 180"
              keyboardType="numeric"
            />
            <FormInput
              label="Notas"
              value={form.notas}
              onChangeText={(value) => updateField('notas', value)}
              placeholder="Notas"
              multiline
            />
            <PrimaryButton
              title={saving ? 'Guardando...' : 'Guardar cambios'}
              onPress={handleSave}
              disabled={saving}
            />
          </>
        ) : (
          <>
            <Breakdown label="Total" value={`$${sale.total || 0}`} />
            <Breakdown label="Pagado" value={`$${totalPaid}`} />
            <Breakdown label="Resta" value={`$${remaining}`} highlight />
            <Text style={styles.metaText}>
              {formatDateValue(sale.fecha_venta)} - {sale.estado_pago}
            </Text>
          </>
        )}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Productos</Text>
        {groupedDetails.map((detail) => (
          <View key={detail.id} style={styles.rowItem}>
            <View>
              <Text style={styles.rowTitle}>{getPerfumeName(detail.perfume_id)}</Text>
              <Text style={styles.rowText}>
                {detail.cantidad} x {detail.ml_vendidos} ml - {detail.tipo_producto}
              </Text>
            </View>
            <Text style={styles.rowValue}>${detail.subtotal || 0}</Text>
          </View>
        ))}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Pagos</Text>
        {payments.length === 0 ? (
          <Text style={styles.emptyText}>No hay pagos registrados.</Text>
        ) : (
          payments.map((payment) => (
            <View key={payment.id} style={styles.rowItem}>
              <View>
                <Text style={styles.rowTitle}>${payment.monto || 0}</Text>
                <Text style={styles.rowText}>
                  {formatDateValue(payment.fecha_pago)} - {payment.metodo_pago}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          title={editing ? 'Cancelar edicion' : 'Editar venta'}
          onPress={() => setEditing((value) => !value)}
          variant="secondary"
        />
        <PrimaryButton title="Cancelar venta" onPress={handleCancelSale} />
      </View>
    </ScrollView>
  );
}

function Breakdown({ label, value, highlight = false }) {
  return (
    <View style={[styles.breakdownItem, highlight && styles.breakdownHighlight]}>
      <Text style={[styles.breakdownLabel, highlight && styles.breakdownLabelHighlight]}>
        {label}
      </Text>
      <Text style={[styles.breakdownValue, highlight && styles.breakdownValueHighlight]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#242527' },
  content: { padding: 18, paddingBottom: 60 },
  kicker: { color: '#d8ad62', fontSize: 13, fontWeight: '800', marginBottom: 6 },
  title: { color: '#f8f4ed', fontSize: 30, fontWeight: '900', marginBottom: 16 },
  panel: {
    backgroundColor: '#303133',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444446',
    padding: 16,
    marginBottom: 14,
  },
  panelTitle: { color: '#f8f4ed', fontSize: 20, fontWeight: '900', marginBottom: 12 },
  breakdownItem: { backgroundColor: '#3b3b3d', borderRadius: 8, padding: 12, marginBottom: 8 },
  breakdownHighlight: { backgroundColor: '#d8ad62' },
  breakdownLabel: { color: '#c7c1b7', fontSize: 12, fontWeight: '800', marginBottom: 4 },
  breakdownLabelHighlight: { color: '#3a2a14' },
  breakdownValue: { color: '#f8f4ed', fontSize: 20, fontWeight: '900' },
  breakdownValueHighlight: { color: '#1f1f20' },
  metaText: { color: '#c7c1b7', fontSize: 14, marginTop: 6 },
  rowItem: {
    backgroundColor: '#3b3b3d',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowTitle: { color: '#f8f4ed', fontSize: 15, fontWeight: '900' },
  rowText: { color: '#c7c1b7', fontSize: 13, marginTop: 4 },
  rowValue: { color: '#f0d19a', fontSize: 15, fontWeight: '900' },
  emptyText: { color: '#c7c1b7', fontSize: 14, lineHeight: 20 },
  actions: { gap: 10 },
  messageBox: {
    backgroundColor: '#3a2d2d',
    borderColor: '#7f4a4a',
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
  },
  errorText: { color: '#ffd7d7', fontSize: 14, lineHeight: 20 },
});
