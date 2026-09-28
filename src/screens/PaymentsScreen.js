import { useEffect, useMemo, useState } from 'react';
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
    const remaining = Math.max(total - totalPaid, 0);

    return {
      salePayments,
      totalPaid,
      remaining,
      percent: total > 0 ? Math.min(Math.round((totalPaid / total) * 100), 100) : 0,
    };
  }

  const overallPendingTotal = useMemo(() => {
    return sales.reduce((sum, sale) => {
      const summary = getSaleSummary(sale);
      return sum + summary.remaining;
    }, 0);
  }, [sales, payments]);

  function getForm(saleId) {
    return (
      paymentForms[saleId] || {
        monto: '',
        metodo_pago: '',
        fecha_pago: today,
        notas: '',
      }
    );
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
    const form = getForm(saleId);

    if (!form.monto.trim()) {
      Alert.alert('Falta el monto', 'Escribe el valor del abono.');
      return;
    }

    try {
      setSavingSaleId(saleId);
      await addPaymentToSale(saleId, form);
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
      Alert.alert('No se pudo guardar el abono', firebaseError.message);
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

  async function handleSavePayment(saleId, paymentId) {
    const form = getForm(saleId);

    if (!form.monto.trim()) {
      Alert.alert('Falta el monto', 'Escribe el valor del abono.');
      return;
    }

    try {
      setSavingSaleId(saleId);
      await updatePayment(saleId, paymentId, form);
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
      Alert.alert('No se pudo actualizar el abono', firebaseError.message);
    } finally {
      setSavingSaleId('');
    }
  }

  function handleDeletePayment(saleId, paymentId) {
    Alert.alert('Borrar abono', '¿Estás seguro de que quieres eliminar este abono?', [
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
      showsVerticalScrollIndicator={false}
    >
      {/* Header Ledger Block */}
      <View style={styles.headerBlock}>
        <View style={styles.headerIconCircle}>
          <Feather name="credit-card" size={24} color={colors.gold} />
        </View>
        <Text style={styles.kicker}>TRANSACCIONES & COBRANZA</Text>
        <Text style={styles.title}>Cuentas por Cobrar</Text>
        <Text style={styles.subtitle}>
          Registra abonos directos y supervisa el balance de pagos pendientes en tiempo real.
        </Text>
      </View>

      {/* Global Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceInfo}>
          <Text style={styles.balanceLabel}>SALDO GLOBAL POR COBRAR</Text>
          <Text style={styles.balanceValue}>${overallPendingTotal}</Text>
          <Text style={styles.balanceSub}>
            Distribuido en {sales.length} venta(s) activas
          </Text>
        </View>
        <View style={styles.balanceCrestWrap}>
          <Feather name="shield" size={28} color={colors.gold} />
        </View>
      </View>

      {!!error && (
        <View style={styles.errorAlert}>
          <Feather name="alert-circle" size={16} color={colors.rose} />
          <Text style={styles.errorAlertText}>{error}</Text>
        </View>
      )}

      {/* Pending Sales List */}
      {sales.length === 0 ? (
        <View style={styles.emptyCard}>
          <Feather name="check-circle" size={32} color={colors.success} style={{ marginBottom: 8 }} />
          <Text style={styles.emptyTitle}>¡Todo al corriente!</Text>
          <Text style={styles.emptySub}>
            No hay cuentas pendientes de cobro registradas.
          </Text>
        </View>
      ) : (
        sales.map((sale) => {
          const paymentForm = getForm(sale.id);
          const summary = getSaleSummary(sale);
          const isExpanded = expandedSaleId === sale.id;

          return (
            <View key={sale.id} style={[styles.saleCard, isExpanded && styles.saleCardExpanded]}>
              <Pressable
                onPress={() => setExpandedSaleId(isExpanded ? '' : sale.id)}
                style={styles.saleHeader}
              >
                <View style={styles.saleHeaderLeft}>
                  <Text style={styles.clientName}>{getClientName(sale.cliente_id)}</Text>
                  <Text style={styles.perfumeNames}>{getSalePerfumeNames(sale.id)}</Text>

                  {/* Progress Mini Bar */}
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${summary.percent}%` },
                      ]}
                    />
                  </View>

                  <View style={styles.metaRow}>
                    <Feather name="calendar" size={10} color={colors.textSubtle} />
                    <Text style={styles.metaText}>{formatDateValue(sale.fecha_venta)}</Text>
                    <Text style={styles.metaDivider}>·</Text>
                    <Text style={styles.percentText}>{summary.percent}% abonado</Text>
                  </View>
                </View>

                <View style={styles.saleHeaderRight}>
                  <Text style={styles.remainingAmount}>${summary.remaining}</Text>
                  <Text style={styles.remainingCaption}>resta por pagar</Text>
                  <View style={styles.expandChevron}>
                    <Feather
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={colors.gold}
                    />
                  </View>
                </View>
              </Pressable>

              {/* Expanded Ledger Panel */}
              {isExpanded && (
                <View style={styles.expandedVault}>
                  {/* Financial Mini Rail */}
                  <View style={styles.miniRail}>
                    <View style={styles.miniRailCard}>
                      <Text style={styles.miniRailLabel}>TOTAL VENTA</Text>
                      <Text style={styles.miniRailValue}>${sale.total || 0}</Text>
                    </View>
                    <View style={styles.miniRailCard}>
                      <Text style={styles.miniRailLabel}>ABONADO</Text>
                      <Text style={[styles.miniRailValue, { color: colors.success }]}>
                        ${summary.totalPaid}
                      </Text>
                    </View>
                    <View style={[styles.miniRailCard, { borderColor: colors.rose }]}>
                      <Text style={[styles.miniRailLabel, { color: colors.rose }]}>
                        SALDO RESTANTE
                      </Text>
                      <Text style={[styles.miniRailValue, { color: colors.rose }]}>
                        ${summary.remaining}
                      </Text>
                    </View>
                  </View>

                  {/* Abonos History */}
                  <Text style={styles.sectionSubtitle}>HISTORIAL DE ABONOS</Text>
                  {summary.salePayments.length === 0 ? (
                    <Text style={styles.emptyNote}>
                      Aún no hay abonos registrados para esta venta.
                    </Text>
                  ) : (
                    summary.salePayments.map((payment) => (
                      <View key={payment.id} style={styles.paymentRow}>
                        <View style={styles.paymentInfo}>
                          <View style={styles.paymentAmountLine}>
                            <Text style={styles.paymentAmountText}>+${payment.monto || 0}</Text>
                            <Text style={styles.paymentMethodText}>
                              {payment.metodo_pago?.toUpperCase() || 'PAGO DIRECTO'}
                            </Text>
                          </View>
                          <Text style={styles.paymentDateText}>
                            {formatDateValue(payment.fecha_pago)}
                          </Text>
                          {!!payment.notas && (
                            <Text style={styles.paymentNotesText}>{payment.notas}</Text>
                          )}
                        </View>

                        <View style={styles.paymentActionButtons}>
                          <AnimatedPressable
                            onPress={() => startEditPayment(sale.id, payment)}
                            style={styles.actionMiniBtn}
                            scaleTo={0.9}
                          >
                            <Feather name="edit-2" size={11} color={colors.ink} />
                          </AnimatedPressable>
                          <AnimatedPressable
                            onPress={() => handleDeletePayment(sale.id, payment.id)}
                            style={styles.actionMiniBtnDark}
                            scaleTo={0.9}
                          >
                            <Feather name="trash-2" size={11} color={colors.textSubtle} />
                          </AnimatedPressable>
                        </View>
                      </View>
                    ))
                  )}

                  {/* New/Edit Abono Form */}
                  <View style={styles.abonoFormCard}>
                    <Text style={styles.formCardHeading}>
                      {editingPaymentId ? 'MODIFICAR ABONO SELECCIONADO' : 'REGISTRAR NUEVO ABONO'}
                    </Text>

                    <FormInput
                      label="Monto del Abono ($ MXN) *"
                      value={paymentForm.monto}
                      onChangeText={(val) => updatePaymentField(sale.id, 'monto', val)}
                      placeholder="Ej. 200"
                      keyboardType="numeric"
                    />

                    <FormInput
                      label="Método de Pago"
                      value={paymentForm.metodo_pago}
                      onChangeText={(val) => updatePaymentField(sale.id, 'metodo_pago', val)}
                      placeholder="Efectivo, Transferencia SPEI, Tarjeta..."
                    />

                    <CalendarDatePicker
                      label="Fecha del Abono"
                      value={paymentForm.fecha_pago}
                      onChange={(val) => updatePaymentField(sale.id, 'fecha_pago', val)}
                    />

                    <FormInput
                      label="Notas del Abono"
                      value={paymentForm.notas}
                      onChangeText={(val) => updatePaymentField(sale.id, 'notas', val)}
                      placeholder="Comentarios adicionales"
                    />

                    <View style={styles.submitAbonoRow}>
                      <PrimaryButton
                        title={
                          savingSaleId === sale.id
                            ? 'Guardando...'
                            : editingPaymentId
                              ? 'Actualizar Abono'
                              : 'Registrar Abono'
                        }
                        onPress={() =>
                          editingPaymentId
                            ? handleSavePayment(sale.id, editingPaymentId)
                            : handleAddPayment(sale.id)
                        }
                        disabled={savingSaleId === sale.id}
                        variant="amber"
                      />
                    </View>
                  </View>

                  {/* Cancel Sale Option */}
                  <View style={{ marginTop: 12 }}>
                    <PrimaryButton
                      title="Cancelar Esta Venta (Reactivar Stock)"
                      onPress={() => handleCancelSale(sale.id)}
                      variant="outline"
                    />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 110,
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: 8,
  },
  headerIconCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(166, 106, 53, 0.1)',
    borderWidth: 1.5,
    borderColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kicker: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subtitle: {
    color: colors.textSubtle,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  balanceValue: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
  },
  balanceSub: {
    color: colors.textSubtle,
    fontSize: 11,
    marginTop: 4,
  },
  balanceCrestWrap: {
    width: 50,
    height: 50,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(166, 106, 53, 0.1)',
    borderWidth: 1.5,
    borderColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerSurface,
    borderWidth: 1,
    borderColor: colors.dangerLine,
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
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    ...shadow.card,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  emptySub: {
    color: colors.textSubtle,
    fontSize: 13,
  },
  saleCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    marginBottom: 10,
    overflow: 'hidden',
    ...shadow.card,
  },
  saleCardExpanded: {
    borderColor: colors.amber,
  },
  saleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  saleHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  clientName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  perfumeNames: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 6,
  },
  progressBarTrack: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.lineStrong,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.petroleum,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: colors.textSubtle,
    fontSize: 11,
  },
  metaDivider: {
    color: colors.textSubtle,
    fontSize: 11,
  },
  percentText: {
    color: colors.petroleum,
    fontSize: 11,
    fontWeight: '800',
  },
  saleHeaderRight: {
    alignItems: 'flex-end',
  },
  remainingAmount: {
    color: colors.danger,
    fontSize: 18,
    fontWeight: '900',
  },
  remainingCaption: {
    color: colors.textSubtle,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  expandChevron: {
    marginTop: 4,
  },
  expandedVault: {
    padding: spacing.md,
    backgroundColor: colors.field,
    borderTopWidth: 1,
    borderTopColor: colors.lineStrong,
  },
  miniRail: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  miniRailCard: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: 8,
    alignItems: 'center',
  },
  miniRailLabel: {
    color: colors.amber,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  miniRailValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: colors.amber,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptyNote: {
    color: colors.textSubtle,
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmountLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentAmountText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '900',
  },
  paymentMethodText: {
    color: colors.petroleum,
    fontSize: 9,
    fontWeight: '800',
  },
  paymentDateText: {
    color: colors.textSubtle,
    fontSize: 10,
  },
  paymentNotesText: {
    color: colors.textMuted,
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
  },
  paymentActionButtons: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  actionMiniBtn: {
    width: 26,
    height: 26,
    borderRadius: radius.xs,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionMiniBtnDark: {
    width: 26,
    height: 26,
    borderRadius: radius.xs,
    backgroundColor: colors.dangerSurface,
    borderWidth: 1,
    borderColor: colors.dangerLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abonoFormCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  formCardHeading: {
    color: colors.amber,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  submitAbonoRow: {
    marginTop: 8,
  },
});
