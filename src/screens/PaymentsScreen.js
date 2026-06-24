import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import { listenAllPayments } from '../services/clientAccountService';
import { listenClients } from '../services/clientsService';
import { listenActivePerfumes } from '../services/perfumesService';
import { formatDateValue } from '../services/purchasesService';
import {
  addPaymentToSale,
  cancelSale,
  deletePayment,
  listenAllSaleDetails,
  listenPendingSales,
  updatePayment,
} from '../services/salesService';

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

const today = getLocalDateString();

export default function PaymentsScreen() {
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [saleDetails, setSaleDetails] = useState([]);
  const [perfumes, setPerfumes] = useState([]);
  const [paymentForms, setPaymentForms] = useState({});
  const [expandedSaleId, setExpandedSaleId] = useState('');
  const [editingPaymentId, setEditingPaymentId] = useState('');
  const [savingSaleId, setSavingSaleId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribeSales = listenPendingSales(
      setSales,
      (firebaseError) => setError(firebaseError.message)
    );
    const unsubscribeClients = listenClients(
      setClients,
      (firebaseError) => setError(firebaseError.message)
    );
    const unsubscribePayments = listenAllPayments(
      setPayments,
      (firebaseError) => setError(firebaseError.message)
    );
    const unsubscribeDetails = listenAllSaleDetails(
      setSaleDetails,
      (firebaseError) => setError(firebaseError.message)
    );
    const unsubscribePerfumes = listenActivePerfumes(
      setPerfumes,
      (firebaseError) => setError(firebaseError.message)
    );

    return () => {
      unsubscribeSales();
      unsubscribeClients();
      unsubscribePayments();
      unsubscribeDetails();
      unsubscribePerfumes();
    };
  }, []);

  function getClientName(clientId) {
    const client = clients.find((clientItem) => clientItem.id === clientId);

    return client?.nombre || 'Cliente no encontrado';
  }

  function getSalePayments(saleId) {
    return payments.filter((payment) => payment.venta_id === saleId);
  }

  function getSalePerfumeNames(saleId) {
    const details = saleDetails.filter((detail) => detail.venta_id === saleId);
    const names = details.map((detail) => {
      const perfume = perfumes.find((perfumeItem) => perfumeItem.id === detail.perfume_id);

      return perfume?.nombre || 'Perfume no encontrado';
    });
    const uniqueNames = [...new Set(names)];

    return uniqueNames.length ? uniqueNames.join(', ') : 'Sin perfume registrado';
  }

  function getSaleSummary(sale) {
    const salePayments = getSalePayments(sale.id);
    const totalPaid = salePayments.reduce(
      (sum, payment) => sum + (Number(payment.monto) || 0),
      0
    );
    const total = Number(sale.total) || 0;

    return {
      salePayments,
      totalPaid,
      remaining: total - totalPaid,
    };
  }

  function getForm(saleId) {
    return paymentForms[saleId] || {
      monto: '',
      metodo_pago: '',
      fecha_pago: today,
      notas: '',
    };
  }

  function updatePaymentField(saleId, field, value) {
    setPaymentForms((currentForms) => ({
      ...currentForms,
      [saleId]: {
        ...getForm(saleId),
        [field]: value,
      },
    }));
  }

  async function handleAddPayment(saleId) {
    const paymentForm = getForm(saleId);

    if (!paymentForm.monto.trim()) {
      Alert.alert('Falta el monto', 'Escribe cuanto pago el cliente.');
      return;
    }

    try {
      setSavingSaleId(saleId);
      await addPaymentToSale(saleId, paymentForm);
      setPaymentForms((currentForms) => ({
        ...currentForms,
        [saleId]: {
          monto: '',
          metodo_pago: '',
          fecha_pago: today,
          notas: '',
        },
      }));
    } catch (firebaseError) {
      Alert.alert('No se pudo guardar el pago', firebaseError.message);
    } finally {
      setSavingSaleId('');
    }
  }

  async function handleSavePayment(saleId, paymentId) {
    const paymentForm = getForm(saleId);

    if (!paymentForm.monto.trim()) {
      Alert.alert('Falta el monto', 'Escribe cuanto pago el cliente.');
      return;
    }

    try {
      setSavingSaleId(saleId);
      await updatePayment(saleId, paymentId, paymentForm);
      setEditingPaymentId('');
      setPaymentForms((currentForms) => ({
        ...currentForms,
        [saleId]: {
          monto: '',
          metodo_pago: '',
          fecha_pago: today,
          notas: '',
        },
      }));
    } catch (firebaseError) {
      Alert.alert('No se pudo actualizar el pago', firebaseError.message);
    } finally {
      setSavingSaleId('');
    }
  }

  function startEditPayment(saleId, payment) {
    setEditingPaymentId(payment.id);
    setPaymentForms((currentForms) => ({
      ...currentForms,
      [saleId]: {
        monto: String(payment.monto || ''),
        metodo_pago: payment.metodo_pago || '',
        fecha_pago: formatDateValue(payment.fecha_pago) || today,
        notas: payment.notas || '',
      },
    }));
  }

  function handleDeletePayment(saleId, paymentId) {
    Alert.alert('Borrar pago', 'El pago se eliminara y la deuda se recalculara.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () => deletePayment(saleId, paymentId),
      },
    ]);
  }

  function handleCancelSale(saleId) {
    Alert.alert('Cancelar venta', 'Se restaurara el stock vendido y la venta dejara de aparecer pendiente.', [
      { text: 'No cancelar', style: 'cancel' },
      {
        text: 'Cancelar venta',
        style: 'destructive',
        onPress: () => cancelSale(saleId),
      },
    ]);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Text style={styles.kicker}>Pagos</Text>
      <Text style={styles.title}>Ventas pendientes</Text>
      <Text style={styles.subtitle}>
        Agrega pagos a ventas pendientes o parciales. El estado se actualiza automaticamente.
      </Text>

      {!!error && (
        <View style={styles.messageBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {sales.length === 0 ? (
        <View style={styles.panel}>
          <Text style={styles.emptyText}>No hay ventas pendientes de pago.</Text>
        </View>
      ) : (
        sales.map((sale) => {
          const paymentForm = getForm(sale.id);
          const summary = getSaleSummary(sale);
          const isExpanded = expandedSaleId === sale.id;

          return (
            <View key={sale.id} style={styles.panel}>
              <Pressable
                onPress={() => setExpandedSaleId(isExpanded ? '' : sale.id)}
                style={styles.saleHeader}
              >
                <View>
                  <Text style={styles.saleTitle}>{getClientName(sale.cliente_id)}</Text>
                  <Text style={styles.saleText}>
                    {formatDateValue(sale.fecha_venta)} - resta ${summary.remaining}
                  </Text>
                  <Text style={styles.salePerfume}>{getSalePerfumeNames(sale.id)}</Text>
                </View>
                <Text style={styles.badge}>{sale.estado_pago}</Text>
              </Pressable>

              {isExpanded && (
                <>
                  <View style={styles.breakdown}>
                    <BreakdownItem label="Total venta" value={`$${sale.total || 0}`} />
                    <BreakdownItem label="Pagado" value={`$${summary.totalPaid}`} />
                    <BreakdownItem label="Resta" value={`$${summary.remaining}`} highlight />
                  </View>

                  <Text style={styles.sectionTitle}>Pagos registrados</Text>
                  {summary.salePayments.length === 0 ? (
                    <Text style={styles.emptyText}>Todavia no hay pagos para esta venta.</Text>
                  ) : (
                    summary.salePayments.map((payment) => (
                      <View key={payment.id} style={styles.paymentRow}>
                        <View>
                          <Text style={styles.paymentAmount}>${payment.monto || 0}</Text>
                          <Text style={styles.paymentText}>
                            {formatDateValue(payment.fecha_pago)} - {payment.metodo_pago || 'Sin metodo'}
                          </Text>
                        </View>
                        {!!payment.notas && <Text style={styles.paymentNote}>{payment.notas}</Text>}
                        <View style={styles.paymentActions}>
                          <Pressable onPress={() => startEditPayment(sale.id, payment)} style={styles.smallButton}>
                            <Text style={styles.smallButtonText}>Editar</Text>
                          </Pressable>
                          <Pressable onPress={() => handleDeletePayment(sale.id, payment.id)} style={styles.smallButtonDark}>
                            <Text style={styles.smallButtonTextLight}>Borrar</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))
                  )}

                  <Text style={styles.sectionTitle}>
                    {editingPaymentId ? 'Editar pago' : 'Agregar pago'}
                  </Text>
                  <FormInput
                    label="Monto"
                    value={paymentForm.monto}
                    onChangeText={(value) => updatePaymentField(sale.id, 'monto', value)}
                    placeholder="Ej. 100"
                    keyboardType="numeric"
                  />
                  <FormInput
                    label="Metodo de pago"
                    value={paymentForm.metodo_pago}
                    onChangeText={(value) => updatePaymentField(sale.id, 'metodo_pago', value)}
                    placeholder="Efectivo, transferencia, tarjeta"
                  />
                  <FormInput
                    label="Fecha de pago"
                    value={paymentForm.fecha_pago}
                    onChangeText={(value) => updatePaymentField(sale.id, 'fecha_pago', value)}
                    placeholder="AAAA-MM-DD"
                  />
                  <FormInput
                    label="Notas"
                    value={paymentForm.notas}
                    onChangeText={(value) => updatePaymentField(sale.id, 'notas', value)}
                    placeholder="Detalle opcional"
                  />
                  <PrimaryButton
                    title={
                      savingSaleId === sale.id
                        ? 'Guardando...'
                        : editingPaymentId
                          ? 'Actualizar pago'
                          : 'Agregar pago'
                    }
                    onPress={() =>
                      editingPaymentId
                        ? handleSavePayment(sale.id, editingPaymentId)
                        : handleAddPayment(sale.id)
                    }
                    disabled={savingSaleId === sale.id}
                  />
                  <View style={styles.cancelSaleButton}>
                    <PrimaryButton
                      title="Cancelar venta"
                      onPress={() => handleCancelSale(sale.id)}
                      variant="secondary"
                    />
                  </View>
                </>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function BreakdownItem({ label, value, highlight = false }) {
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
  container: {
    flex: 1,
    backgroundColor: '#151518',
  },
  content: {
    padding: 18,
    paddingBottom: 160,
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
    backgroundColor: '#222329',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#34353a',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  saleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  saleTitle: {
    color: '#f8f4ed',
    fontSize: 18,
    fontWeight: '800',
  },
  saleText: {
    color: '#c7c1b7',
    fontSize: 13,
    marginTop: 4,
  },
  salePerfume: {
    color: '#f0d19a',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  badge: {
    color: '#1d1710',
    backgroundColor: '#d9ad69',
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: '900',
  },
  breakdown: {
    gap: 8,
    marginBottom: 14,
  },
  breakdownItem: {
    backgroundColor: '#2b2c31',
    borderRadius: 8,
    padding: 12,
  },
  breakdownHighlight: {
    backgroundColor: '#d9ad69',
  },
  breakdownLabel: {
    color: '#c7c1b7',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  breakdownLabelHighlight: {
    color: '#3a2a14',
  },
  breakdownValue: {
    color: '#f8f4ed',
    fontSize: 18,
    fontWeight: '900',
  },
  breakdownValueHighlight: {
    color: '#1f1f20',
  },
  sectionTitle: {
    color: '#f0d19a',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 10,
    marginTop: 6,
  },
  paymentRow: {
    backgroundColor: '#2b2c31',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  paymentAmount: {
    color: '#f8f4ed',
    fontSize: 16,
    fontWeight: '900',
  },
  paymentText: {
    color: '#c7c1b7',
    fontSize: 13,
    marginTop: 4,
  },
  paymentNote: {
    color: '#f0d19a',
    fontSize: 13,
    marginTop: 8,
    fontWeight: '700',
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
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
  cancelSaleButton: {
    marginTop: 10,
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
