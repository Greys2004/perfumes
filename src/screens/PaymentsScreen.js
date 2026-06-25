import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import AnimatedPressable from '../components/AnimatedPressable';
import CalendarDatePicker from '../components/CalendarDatePicker';
import { colors, radius, spacing, shadow } from '../theme';
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
      Alert.alert('Falta el monto', 'Escribe cuánto pagó el cliente.');
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
      Alert.alert('Falta el monto', 'Escribe cuánto pagó el cliente.');
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
    Alert.alert('Borrar pago', 'El pago se eliminará y la deuda se recalculará.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () => deletePayment(saleId, paymentId),
      },
    ]);
  }

  function handleCancelSale(saleId) {
    Alert.alert('Cancelar venta', 'Se restaurará el stock vendido y la venta dejará de aparecer pendiente.', [
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
      <Text style={styles.kicker}>Transacciones</Text>
      <Text style={styles.title}>Cuentas por Cobrar</Text>
      <Text style={styles.subtitle}>
        Gestiona y registra abonos a ventas pendientes. El estado del pago se actualiza de forma automática.
      </Text>

      {!!error && (
        <View style={styles.messageBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {sales.length === 0 ? (
        <View style={styles.emptyPanel}>
          <Feather name="check-circle" size={24} color={colors.success} style={{ marginBottom: 8 }} />
          <Text style={styles.emptyText}>No hay ventas pendientes de pago. ¡Todo al corriente!</Text>
        </View>
      ) : (
        sales.map((sale) => {
          const paymentForm = getForm(sale.id);
          const summary = getSaleSummary(sale);
          const isExpanded = expandedSaleId === sale.id;

          return (
            <View key={sale.id} style={[styles.panel, isExpanded && styles.panelExpanded]}>
              <Pressable
                onPress={() => setExpandedSaleId(isExpanded ? '' : sale.id)}
                style={styles.saleHeader}
              >
                <View style={styles.headerInfo}>
                  <Text style={styles.saleTitle}>{getClientName(sale.cliente_id)}</Text>
                  <View style={styles.textDetailRow}>
                    <Feather name="calendar" size={11} color={colors.textSubtle} />
                    <Text style={styles.saleText}>{formatDateValue(sale.fecha_venta)}</Text>
                    <Text style={styles.dividerDot}>·</Text>
                    <Feather name="alert-circle" size={11} color={colors.gold} />
                    <Text style={[styles.saleText, { color: colors.gold, fontWeight: '700' }]}>resta ${summary.remaining}</Text>
                  </View>
                  <Text style={styles.salePerfume}>{getSalePerfumeNames(sale.id)}</Text>
                </View>
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{sale.estado_pago?.toUpperCase()}</Text>
                  <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.ink} style={{ marginLeft: 4 }} />
                </View>
              </Pressable>

              {isExpanded && (
                <View style={styles.expandedContent}>
                  <View style={styles.breakdown}>
                    <BreakdownItem label="Total Venta" value={`$${sale.total || 0}`} />
                    <BreakdownItem label="Abonado" value={`$${summary.totalPaid}`} color={colors.success} />
                    <BreakdownItem label="Saldo Pendiente" value={`$${summary.remaining}`} highlight />
                  </View>

                  <Text style={styles.sectionTitle}>Historial de Abonos</Text>
                  {summary.salePayments.length === 0 ? (
                    <Text style={styles.emptyTextSmall}>No se han registrado abonos para esta venta.</Text>
                  ) : (
                    summary.salePayments.map((payment) => (
                      <View key={payment.id} style={styles.paymentRow}>
                        <View style={styles.paymentRowHeader}>
                          <View>
                            <Text style={styles.paymentAmount}>${payment.monto || 0}</Text>
                            <Text style={styles.paymentText}>
                              {formatDateValue(payment.fecha_pago)}  ·  {payment.metodo_pago || 'Sin método'}
                            </Text>
                          </View>
                          <View style={styles.paymentActions}>
                            <Pressable onPress={() => startEditPayment(sale.id, payment)} style={styles.smallButton}>
                              <Feather name="edit-2" size={11} color={colors.ink} />
                            </Pressable>
                            <Pressable onPress={() => handleDeletePayment(sale.id, payment.id)} style={styles.smallButtonDark}>
                              <Feather name="trash-2" size={11} color={colors.textMuted} />
                            </Pressable>
                          </View>
                        </View>
                        {!!payment.notes && (
                          <View style={styles.notesContainer}>
                            <Text style={styles.paymentNote}>{payment.notes}</Text>
                          </View>
                        )}
                      </View>
                    ))
                  )}

                  <Text style={styles.sectionTitle}>
                    {editingPaymentId ? 'Modificar Abono' : 'Registrar Nuevo Abono'}
                  </Text>
                  
                  <FormInput
                    label="Monto del abono"
                    value={paymentForm.monto}
                    onChangeText={(value) => updatePaymentField(sale.id, 'monto', value)}
                    placeholder="Ej. 200"
                    keyboardType="numeric"
                  />
                  <FormInput
                    label="Método de pago"
                    value={paymentForm.metodo_pago}
                    onChangeText={(value) => updatePaymentField(sale.id, 'metodo_pago', value)}
                    placeholder="Efectivo, transferencia, tarjeta..."
                  />
                  <CalendarDatePicker
                    label="Fecha del abono"
                    value={paymentForm.fecha_pago}
                    onChange={(value) => updatePaymentField(sale.id, 'fecha_pago', value)}
                  />
                  <FormInput
                    label="Notas opcionales"
                    value={paymentForm.notas}
                    onChangeText={(value) => updatePaymentField(sale.id, 'notas', value)}
                    placeholder="Escribe comentarios sobre el abono"
                  />
                  
                  <View style={styles.formActionButtons}>
                    <PrimaryButton
                      title={
                        savingSaleId === sale.id
                          ? 'Guardando...'
                          : editingPaymentId
                            ? 'Actualizar abono'
                            : 'Registrar abono'
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
                        title="Cancelar esta venta"
                        onPress={() => handleCancelSale(sale.id)}
                        variant="secondary"
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function BreakdownItem({ label, value, highlight = false, color = colors.text }) {
  return (
    <View style={[styles.breakdownItem, highlight && styles.breakdownHighlight]}>
      <Text style={[styles.breakdownLabel, highlight && styles.breakdownLabelHighlight]}>
        {label}
      </Text>
      <Text style={[styles.breakdownValue, highlight && styles.breakdownValueHighlight, { color: highlight ? colors.ink : color }]}>
        {value}
      </Text>
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
    paddingBottom: 160,
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
  panelExpanded: {
    borderColor: colors.lineStrong,
  },
  emptyPanel: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerInfo: {
    flex: 1,
  },
  saleTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  textDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  saleText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '600',
  },
  dividerDot: {
    color: colors.textSubtle,
    fontSize: 12,
  },
  salePerfume: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: radius.sm - 2,
    paddingHorizontal: 8,
    paddingVertical: 5,
    ...shadow.glow,
  },
  badgeText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  expandedContent: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    paddingTop: spacing.md,
  },
  breakdown: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.md,
  },
  breakdownItem: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: 10,
  },
  breakdownHighlight: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    ...shadow.glow,
  },
  breakdownLabel: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  breakdownLabelHighlight: {
    color: colors.ink,
    opacity: 0.8,
  },
  breakdownValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  breakdownValueHighlight: {
    fontWeight: '900',
  },
  sectionTitle: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '850',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  paymentRow: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    marginBottom: 8,
  },
  paymentRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentAmount: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  paymentText: {
    color: colors.textSubtle,
    fontSize: 11,
    marginTop: 2,
  },
  notesContainer: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    paddingTop: 4,
  },
  paymentNote: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 6,
  },
  smallButton: {
    width: 28,
    height: 28,
    backgroundColor: colors.gold,
    borderRadius: radius.sm - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonDark: {
    width: 28,
    height: 28,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formActionButtons: {
    gap: 10,
    marginTop: spacing.sm,
  },
  cancelSaleButton: {
    marginTop: 2,
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyTextSmall: {
    color: colors.textSubtle,
    fontSize: 12,
    marginBottom: spacing.sm,
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
