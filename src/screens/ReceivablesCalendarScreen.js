import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import CalendarDatePicker, {
  addMonths,
  getLocalDateString,
  parseDateString,
} from '../components/CalendarDatePicker';
import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import { colors, radius, spacing, shadow } from '../theme';
import { listenClients } from '../services/clientsService';
import { listenAllPayments } from '../services/clientAccountService';
import { listenActivePerfumes } from '../services/perfumesService';
import { formatDateValue } from '../services/purchasesService';
import {
  addPaymentToSale,
  listenAllSaleDetails,
  listenAllSales,
  registerSaleCollectionOutcome,
  updateSalePaymentPromises,
} from '../services/salesService';

const monthNames = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function getMonthGrid(dateString) {
  const selectedDate = parseDateString(dateString);
  const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const gridStart = new Date(firstDay);
  const weekDay = firstDay.getDay();
  const daysFromMonday = weekDay === 0 ? 6 : weekDay - 1;
  gridStart.setDate(firstDay.getDate() - daysFromMonday);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      value: getLocalDateString(date),
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === selectedDate.getMonth(),
    };
  });
}

function getStatusColor(status) {
  return status === 'pendiente' ? colors.danger : colors.gold;
}

function normalizeSalePromises(sale, remaining) {
  const promises = Array.isArray(sale.fechas_pago_promesa)
    ? sale.fechas_pago_promesa
    : [];

  if (promises.length > 0) {
    return promises
      .map((paymentPromise, index) => ({
        id: paymentPromise.id || `${sale.id}-${index}`,
        fecha: formatDateValue(paymentPromise.fecha) || formatDateValue(sale.fecha_pago_promesa),
        monto: Number(paymentPromise.monto) || remaining,
      }))
      .filter((paymentPromise) => paymentPromise.fecha);
  }

  const legacyDate = formatDateValue(sale.fecha_pago_promesa) || formatDateValue(sale.fecha_venta);

  return legacyDate
    ? [{ id: `${sale.id}-legacy`, fecha: legacyDate, monto: remaining }]
    : [];
}

function getPaidAmountForDate(sale, date) {
  const history = Array.isArray(sale.historial_cobranza) ? sale.historial_cobranza : [];

  return history
    .filter((item) => item.estado === 'pago' && item.fecha === date)
    .reduce((sum, item) => sum + (Number(item.monto) || 0), 0);
}

export default function ReceivablesCalendarScreen() {
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [clients, setClients] = useState([]);
  const [saleDetails, setSaleDetails] = useState([]);
  const [perfumes, setPerfumes] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [editingSaleId, setEditingSaleId] = useState('');
  const [editingReceivable, setEditingReceivable] = useState(null);
  const [promiseForm, setPromiseForm] = useState([]);
  const [outcomeReceivable, setOutcomeReceivable] = useState(null);
  const [outcomeForm, setOutcomeForm] = useState({
    estado: 'pago',
    monto: '',
    metodo_pago: '',
    notas: '',
    accion_no_pago: 'reprogramar',
    nueva_fecha: getLocalDateString(),
  });
  const [rescheduleReceivable, setRescheduleReceivable] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({
    nueva_fecha: getLocalDateString(),
    monto_pendiente: '',
  });
  const [savingSaleId, setSavingSaleId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribeSales = listenAllSales(
      setSales,
      (firebaseError) => setError(firebaseError.message)
    );
    const unsubscribePayments = listenAllPayments(
      setPayments,
      (firebaseError) => setError(firebaseError.message)
    );
    const unsubscribeClients = listenClients(
      setClients,
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
      unsubscribePayments();
      unsubscribeClients();
      unsubscribeDetails();
      unsubscribePerfumes();
    };
  }, []);

  const receivables = useMemo(() => {
    return sales
      .filter((sale) => sale.estado_pago === 'pendiente' || sale.estado_pago === 'parcial')
      .flatMap((sale) => {
        const salePayments = payments.filter((payment) => payment.venta_id === sale.id);
        const paid = salePayments.reduce((sum, payment) => sum + (Number(payment.monto) || 0), 0);
        const total = Number(sale.total) || 0;
        const remaining = Math.max(total - paid, 0);
        const promises = normalizeSalePromises(sale, remaining);

        if (remaining <= 0) {
          return [];
        }

        return promises
          .map((paymentPromise) => {
            const expectedAmount = Number(paymentPromise.monto) || remaining;
            const paidForDate = getPaidAmountForDate(sale, paymentPromise.fecha);
            const pendingForDate = Math.max(expectedAmount - paidForDate, 0);

            return {
              ...paymentPromise,
              sale,
              paid,
              paidForDate,
              total,
              remaining,
              pendingForDate,
              expectedAmount,
            };
          })
          .filter((receivable) => receivable.pendingForDate > 0);
      });
  }, [payments, sales]);

  const receivablesByDate = useMemo(() => {
    return receivables.reduce((summary, receivable) => {
      const items = summary[receivable.fecha] || [];
      return {
        ...summary,
        [receivable.fecha]: [...items, receivable],
      };
    }, {});
  }, [receivables]);

  const paidOutcomesByDate = useMemo(() => {
    return sales.reduce((summary, sale) => {
      const history = Array.isArray(sale.historial_cobranza) ? sale.historial_cobranza : [];

      return history
        .filter((item) => item.estado === 'pago')
        .reduce((historySummary, item) => {
          const items = historySummary[item.fecha] || [];
          return {
            ...historySummary,
            [item.fecha]: [...items, { ...item, sale }],
          };
        }, summary);
    }, {});
  }, [sales]);

  const monthDays = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);
  const selectedItems = receivablesByDate[selectedDate] || [];
  const selectedPaidItems = paidOutcomesByDate[selectedDate] || [];
  const selectedMonth = parseDateString(selectedDate);
  const monthTitle = `${monthNames[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`;

  function getClientName(clientId) {
    const client = clients.find((clientItem) => clientItem.id === clientId);
    return client?.nombre || 'Cliente no encontrado';
  }

  function getSaleProducts(saleId) {
    const details = saleDetails.filter((detail) => detail.venta_id === saleId);
    const summary = details.reduce((items, detail) => {
      const perfume = perfumes.find((perfumeItem) => perfumeItem.id === detail.perfume_id);
      const key = detail.perfume_id || detail.id;
      const current = items[key] || {
        nombre: perfume?.nombre || 'Perfume no encontrado',
        ml: 0,
      };

      return {
        ...items,
        [key]: {
          ...current,
          ml: current.ml + (Number(detail.ml_vendidos) || 0),
        },
      };
    }, {});

    const products = Object.values(summary);
    return products.length
      ? products.map((product) => `${product.nombre} · ${product.ml} ml`).join(' / ')
      : 'Sin perfume registrado';
  }

  function getLatestOutcomeForDate(sale, date) {
    const history = Array.isArray(sale.historial_cobranza) ? sale.historial_cobranza : [];
    const outcomes = history.filter((item) => item.fecha === date);

    return outcomes[outcomes.length - 1];
  }

  function startEditingSale(receivable) {
    const sale = receivable.sale;
    const salePayments = payments.filter((payment) => payment.venta_id === sale.id);
    const paid = salePayments.reduce((sum, payment) => sum + (Number(payment.monto) || 0), 0);
    const remaining = Math.max((Number(sale.total) || 0) - paid, 0);

    setEditingReceivable(receivable);
    setEditingSaleId(sale.id);
    setPromiseForm(
      normalizeSalePromises(sale, remaining).map((paymentPromise) => ({
        id: paymentPromise.id,
        fecha: paymentPromise.fecha,
        monto: String(paymentPromise.monto || ''),
      }))
    );
  }

  function startOutcome(receivable) {
    setOutcomeReceivable(receivable);
    setOutcomeForm({
      estado: 'pago',
      monto: String(Math.min(receivable.pendingForDate, receivable.remaining) || ''),
      metodo_pago: '',
      notas: '',
      accion_no_pago: 'reprogramar',
      nueva_fecha: receivable.fecha,
    });
  }

  function updateOutcomeField(field, value) {
    setOutcomeForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function openPartialPaymentReschedule(receivable, pendingAmount) {
    setRescheduleReceivable(receivable);
    setRescheduleForm({
      nueva_fecha: getLocalDateString(),
      monto_pendiente: String(Number(pendingAmount.toFixed(2))),
    });
  }

  function updateRescheduleField(field, value) {
    setRescheduleForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function updatePromiseForm(promiseId, field, value) {
    setPromiseForm((currentForm) =>
      currentForm.map((paymentPromise) =>
        paymentPromise.id === promiseId
          ? { ...paymentPromise, [field]: value }
          : paymentPromise
      )
    );
  }

  function addPromiseDate() {
    setPromiseForm((currentForm) => [
      ...currentForm,
      { id: `${Date.now()}`, fecha: selectedDate, monto: '' },
    ]);
  }

  function removePromiseDate(promiseId) {
    setPromiseForm((currentForm) => currentForm.filter((paymentPromise) => paymentPromise.id !== promiseId));
  }

  async function savePromiseDates() {
    if (!editingSaleId) {
      return;
    }

    if (promiseForm.length === 0) {
      Alert.alert('Falta una fecha', 'Agrega al menos una fecha prometida de pago.');
      return;
    }

    try {
      setSavingSaleId(editingSaleId);
      await updateSalePaymentPromises(editingSaleId, promiseForm);
      setEditingSaleId('');
      setEditingReceivable(null);
      setPromiseForm([]);
    } catch (firebaseError) {
      Alert.alert('No se pudieron guardar las fechas', firebaseError.message);
    } finally {
      setSavingSaleId('');
    }
  }

  async function saveCollectionOutcome(receivable) {
    const paid = outcomeForm.estado === 'pago';
    const paidAmount = Number(outcomeForm.monto) || 0;

    if (paid && !outcomeForm.monto.trim()) {
      Alert.alert('Falta el monto', 'Escribe cuanto pago el cliente.');
      return;
    }

    try {
      setSavingSaleId(receivable.sale.id);

      if (paid) {
        await addPaymentToSale(receivable.sale.id, {
          monto: outcomeForm.monto,
          metodo_pago: outcomeForm.metodo_pago,
          fecha_pago: selectedDate,
          notas: outcomeForm.notas || 'Pago calendario',
        });

        await registerSaleCollectionOutcome(receivable.sale.id, {
          fecha: selectedDate,
          estado: 'pago',
          monto: outcomeForm.monto,
          notas: outcomeForm.notas,
        });

        const pendingAfterPayment = Math.max(receivable.pendingForDate - paidAmount, 0);

        if (pendingAfterPayment > 0) {
          openPartialPaymentReschedule(receivable, pendingAfterPayment);
        }
      } else {
        let matchedPromise = false;
        const nextPromises = normalizeSalePromises(receivable.sale, receivable.remaining)
          .filter((paymentPromise) =>
            outcomeForm.accion_no_pago === 'cancelar'
              ? paymentPromise.id !== receivable.id
              : true
          )
          .map((paymentPromise) => {
            if (paymentPromise.id !== receivable.id) {
              return paymentPromise;
            }

            matchedPromise = true;
            return {
              ...paymentPromise,
              fecha: outcomeForm.nueva_fecha || selectedDate,
            };
          });

        if (outcomeForm.accion_no_pago === 'reprogramar' && !matchedPromise) {
          nextPromises.push({
            id: receivable.id || `${Date.now()}`,
            fecha: outcomeForm.nueva_fecha || selectedDate,
            monto: receivable.expectedAmount,
          });
        }

        await updateSalePaymentPromises(receivable.sale.id, nextPromises);

        try {
          await registerSaleCollectionOutcome(receivable.sale.id, {
            fecha: selectedDate,
            estado: 'no_pago',
            monto: 0,
            notas: outcomeForm.notas,
          });
        } catch {
          // La fecha reprogramada ya quedo guardada; el historial es complementario.
        }
      }

      setOutcomeReceivable(null);
      setOutcomeForm({
        estado: 'pago',
        monto: '',
        metodo_pago: '',
        notas: '',
        accion_no_pago: 'reprogramar',
        nueva_fecha: getLocalDateString(),
      });
    } catch (firebaseError) {
      Alert.alert('No se pudo registrar la cobranza', firebaseError.message);
    } finally {
      setSavingSaleId('');
    }
  }

  async function savePartialPaymentReschedule() {
    if (!rescheduleReceivable) {
      return;
    }

    if (!rescheduleForm.nueva_fecha) {
      Alert.alert('Falta fecha', 'Selecciona a que dia quieres reprogramar el pendiente.');
      return;
    }

    const pendingAmount = Number(rescheduleForm.monto_pendiente) || 0;

    if (pendingAmount <= 0) {
      Alert.alert('Falta monto', 'El monto pendiente debe ser mayor a 0.');
      return;
    }

    const paidForPromise = Math.max(
      rescheduleReceivable.expectedAmount - pendingAmount,
      0
    );
    const normalizedPromises = normalizeSalePromises(
      rescheduleReceivable.sale,
      rescheduleReceivable.remaining
    );
    let matchedPromise = false;
    const nextPromises = normalizedPromises
      .flatMap((paymentPromise) => {
        if (paymentPromise.id !== rescheduleReceivable.id) {
          return [paymentPromise];
        }

        matchedPromise = true;

        if (paidForPromise <= 0) {
          return [];
        }

        return [
          {
            ...paymentPromise,
            monto: Number(paidForPromise.toFixed(2)),
          },
        ];
      });

    nextPromises.push({
      id: `${rescheduleReceivable.id || rescheduleReceivable.sale.id}-pendiente-${Date.now()}`,
      fecha: rescheduleForm.nueva_fecha,
      monto: pendingAmount,
    });

    if (!matchedPromise && paidForPromise > 0) {
      nextPromises.push({
        id: rescheduleReceivable.id || `${rescheduleReceivable.sale.id}-pagado-${Date.now()}`,
        fecha: rescheduleReceivable.fecha,
        monto: Number(paidForPromise.toFixed(2)),
      });
    }

    try {
      setSavingSaleId(rescheduleReceivable.sale.id);
      await updateSalePaymentPromises(rescheduleReceivable.sale.id, nextPromises);
      setRescheduleReceivable(null);
      setRescheduleForm({
        nueva_fecha: getLocalDateString(),
        monto_pendiente: '',
      });
    } catch (firebaseError) {
      Alert.alert('No se pudo reprogramar el pendiente', firebaseError.message);
    } finally {
      setSavingSaleId('');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Cobranza</Text>
      <Text style={styles.title}>Calendario de Pagos</Text>
      <Text style={styles.subtitle}>
        Puntos rojos indican ventas pendientes; puntos dorados indican pagos parciales.
      </Text>

      {!!error && (
        <View style={styles.messageBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.calendarPanel}>
        <View style={styles.monthHeader}>
          <Pressable onPress={() => setSelectedDate(addMonths(selectedDate, -1))} style={styles.iconButton}>
            <Feather name="chevron-left" size={16} color={colors.text} />
          </Pressable>
          <Text style={styles.monthTitle}>{monthTitle}</Text>
          <Pressable onPress={() => setSelectedDate(addMonths(selectedDate, 1))} style={styles.iconButton}>
            <Feather name="chevron-right" size={16} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.dayLabelRow}>
          {dayLabels.map((dayLabel, index) => (
            <Text key={`${dayLabel}-${index}`} style={styles.dayLabel}>
              {dayLabel}
            </Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {monthDays.map((day) => {
            const dayItems = receivablesByDate[day.value] || [];
            const paidItems = paidOutcomesByDate[day.value] || [];
            const isSelected = day.value === selectedDate;
            const hasOpenItems = dayItems.length > 0;
            const dotColor = hasOpenItems ? colors.danger : colors.success;
            const dotCount = hasOpenItems ? dayItems.length : paidItems.length;

            return (
              <Pressable
                key={day.value}
                onPress={() => setSelectedDate(day.value)}
                style={[
                  styles.dayCell,
                  !day.isCurrentMonth && styles.dayCellMuted,
                  isSelected && styles.dayCellActive,
                ]}
              >
                <Text style={[styles.dayNumber, isSelected && styles.dayNumberActive]}>
                  {day.day}
                </Text>
                {dotCount > 0 && (
                  <View
                    style={[
                      styles.dueDot,
                      { backgroundColor: isSelected ? colors.ink : dotColor },
                    ]}
                  >
                    <Text style={[styles.dueDotText, isSelected && { color: dotColor }]}>
                      {dotCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Feather name="calendar" size={16} color={colors.gold} />
          <Text style={styles.panelTitle}>Pagos del {selectedDate}</Text>
        </View>

        {selectedItems.length === 0 ? (
          selectedPaidItems.length > 0 ? (
            selectedPaidItems.map((item) => (
              <View key={`${item.sale.id}-${item.id}`} style={styles.saleCard}>
                <View style={styles.saleNameRow}>
                  <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                  <Text style={styles.saleClient}>{getClientName(item.sale.cliente_id)}</Text>
                </View>
                <Text style={styles.saleMeta}>{getSaleProducts(item.sale.id)}</Text>
                <View style={styles.outcomeSummary}>
                  <Feather name="check-circle" size={13} color={colors.success} />
                  <Text style={styles.outcomeSummaryText}>Pago registrado: ${item.monto || 0}</Text>
                </View>
              </View>
            ))
          ) : (
          <Text style={styles.emptyText}>No hay pagos prometidos para este dia.</Text>
          )
        ) : (
          selectedItems.map((receivable) => {
            const statusColor = getStatusColor(receivable.sale.estado_pago);
            const latestOutcome = getLatestOutcomeForDate(receivable.sale, selectedDate);

            return (
              <View key={`${receivable.sale.id}-${receivable.id}`} style={styles.saleCard}>
                <View style={styles.saleTop}>
                  <View style={styles.saleInfo}>
                    <View style={styles.saleNameRow}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={styles.saleClient}>{getClientName(receivable.sale.cliente_id)}</Text>
                    </View>
                    <Text style={styles.saleMeta}>
                      {getSaleProducts(receivable.sale.id)}
                    </Text>
                    <Text style={styles.saleMeta}>
                      Venta: {formatDateValue(receivable.sale.fecha_venta)} · {receivable.sale.estado_pago?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.amountBlock}>
                    <Text style={[styles.remainingText, { color: statusColor }]}>
                      ${receivable.pendingForDate}
                    </Text>
                    <Text style={styles.amountCaption}>pendiente del dia</Text>
                  </View>
                </View>
                <View style={styles.saleNumbers}>
                  <Text style={styles.saleNumberText}>Total ${receivable.total}</Text>
                  <Text style={styles.saleNumberText}>Pagado ${receivable.paid}</Text>
                  <Text style={styles.saleNumberText}>Falta ${receivable.remaining}</Text>
                </View>
                {!!latestOutcome && (
                  <View style={styles.outcomeSummary}>
                    <Feather
                      name={latestOutcome.estado === 'pago' ? 'check-circle' : 'slash'}
                      size={13}
                      color={latestOutcome.estado === 'pago' ? colors.success : colors.danger}
                    />
                    <Text style={styles.outcomeSummaryText}>
                      {latestOutcome.estado === 'pago'
                        ? `Pago registrado: $${latestOutcome.monto || 0}`
                        : 'Marcado como no pago'}
                    </Text>
                  </View>
                )}

                <View style={styles.cardActions}>
                  <Pressable
                    onPress={() => startOutcome(receivable)}
                    style={[styles.resultButton, { borderColor: statusColor }]}
                  >
                    <Feather name="check-circle" size={13} color={colors.ink} />
                    <Text style={styles.resultButtonText}>Resultado</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => startEditingSale(receivable)}
                    style={styles.editButton}
                  >
                    <Feather name="edit-2" size={12} color={colors.gold} />
                    <Text style={styles.editButtonText}>Fecha/monto</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>

      <Modal
        visible={!!outcomeReceivable}
        transparent
        animationType="slide"
        onRequestClose={() => setOutcomeReceivable(null)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setOutcomeReceivable(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetKicker}>Cobranza del {selectedDate}</Text>
                <Text style={styles.sheetTitle}>
                  {outcomeReceivable ? getClientName(outcomeReceivable.sale.cliente_id) : ''}
                </Text>
              </View>
              <Pressable onPress={() => setOutcomeReceivable(null)} style={styles.sheetCloseButton}>
                <Feather name="x" size={16} color={colors.ink} />
              </Pressable>
            </View>

            {!!outcomeReceivable && (
              <>
                <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                  <Text style={styles.sheetMeta}>{getSaleProducts(outcomeReceivable.sale.id)}</Text>
                  <View style={styles.outcomeSegmentRow}>
                    {[
                      { label: 'Pago recibido', value: 'pago' },
                      { label: 'No pago', value: 'no_pago' },
                    ].map((option) => {
                      const selected = outcomeForm.estado === option.value;

                      return (
                        <Pressable
                          key={option.value}
                          onPress={() => updateOutcomeField('estado', option.value)}
                          style={[styles.outcomeSegment, selected && styles.outcomeSegmentActive]}
                        >
                          <Text style={[styles.outcomeSegmentText, selected && styles.outcomeSegmentTextActive]}>
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {outcomeForm.estado === 'pago' && (
                    <>
                      <FormInput
                        label="Cantidad pagada"
                        value={outcomeForm.monto}
                        onChangeText={(value) => updateOutcomeField('monto', value)}
                        placeholder="Ej. 500"
                        keyboardType="numeric"
                      />
                      <FormInput
                        label="Metodo de pago"
                        value={outcomeForm.metodo_pago}
                        onChangeText={(value) => updateOutcomeField('metodo_pago', value)}
                        placeholder="Efectivo, transferencia..."
                      />
                    </>
                  )}

                  {outcomeForm.estado === 'no_pago' && (
                    <>
                      <View style={styles.outcomeSegmentRow}>
                        {[
                          { label: 'Reprogramar', value: 'reprogramar' },
                          { label: 'Cancelar fecha', value: 'cancelar' },
                        ].map((option) => {
                          const selected = outcomeForm.accion_no_pago === option.value;

                          return (
                            <Pressable
                              key={option.value}
                              onPress={() => updateOutcomeField('accion_no_pago', option.value)}
                              style={[styles.outcomeSegment, selected && styles.outcomeSegmentActive]}
                            >
                              <Text style={[styles.outcomeSegmentText, selected && styles.outcomeSegmentTextActive]}>
                                {option.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      {outcomeForm.accion_no_pago === 'reprogramar' && (
                        <CalendarDatePicker
                          label="Nueva fecha"
                          value={outcomeForm.nueva_fecha}
                          onChange={(value) => updateOutcomeField('nueva_fecha', value)}
                        />
                      )}
                    </>
                  )}

                  <FormInput
                    label={outcomeForm.estado === 'pago' ? 'Notas' : 'Motivo / seguimiento'}
                    value={outcomeForm.notas}
                    onChangeText={(value) => updateOutcomeField('notas', value)}
                    placeholder={outcomeForm.estado === 'pago' ? 'Comentario opcional' : 'Ej. Reprogramar, no contesto...'}
                  />
                </ScrollView>

                <View style={styles.sheetFooter}>
                  <PrimaryButton
                    title={savingSaleId === outcomeReceivable.sale.id ? 'Guardando...' : 'Guardar resultado'}
                    onPress={() => saveCollectionOutcome(outcomeReceivable)}
                    disabled={savingSaleId === outcomeReceivable.sale.id}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!rescheduleReceivable}
        transparent
        animationType="slide"
        onRequestClose={() => setRescheduleReceivable(null)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setRescheduleReceivable(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetKicker}>Pago pendiente</Text>
                <Text style={styles.sheetTitle}>
                  {rescheduleReceivable
                    ? getClientName(rescheduleReceivable.sale.cliente_id)
                    : ''}
                </Text>
              </View>
              <Pressable onPress={() => setRescheduleReceivable(null)} style={styles.sheetCloseButton}>
                <Feather name="x" size={16} color={colors.ink} />
              </Pressable>
            </View>

            {!!rescheduleReceivable && (
              <>
                <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                  <Text style={styles.sheetMeta}>
                    El pago no cubrio el monto esperado. Reprograma el faltante para otra fecha.
                  </Text>
                  <View style={styles.rescheduleSummary}>
                    <Text style={styles.rescheduleLabel}>Pendiente a reprogramar</Text>
                    <Text style={styles.rescheduleAmount}>${rescheduleForm.monto_pendiente}</Text>
                  </View>
                  <CalendarDatePicker
                    label="Nueva fecha"
                    value={rescheduleForm.nueva_fecha}
                    onChange={(value) => updateRescheduleField('nueva_fecha', value)}
                  />
                  <FormInput
                    label="Monto pendiente"
                    value={rescheduleForm.monto_pendiente}
                    onChangeText={(value) => updateRescheduleField('monto_pendiente', value)}
                    placeholder="Ej. 500"
                    keyboardType="numeric"
                  />
                </ScrollView>

                <View style={styles.sheetFooter}>
                  <PrimaryButton
                    title={savingSaleId === rescheduleReceivable.sale.id ? 'Reprogramando...' : 'Reprogramar pendiente'}
                    onPress={savePartialPaymentReschedule}
                    disabled={savingSaleId === rescheduleReceivable.sale.id}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!editingReceivable}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setEditingReceivable(null);
          setEditingSaleId('');
        }}
      >
        <View style={styles.sheetOverlay}>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => {
              setEditingReceivable(null);
              setEditingSaleId('');
            }}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetKicker}>Editar fecha y monto</Text>
                <Text style={styles.sheetTitle}>
                  {editingReceivable ? getClientName(editingReceivable.sale.cliente_id) : ''}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setEditingReceivable(null);
                  setEditingSaleId('');
                }}
                style={styles.sheetCloseButton}
              >
                <Feather name="x" size={16} color={colors.ink} />
              </Pressable>
            </View>

            {!!editingReceivable && (
              <>
                <Text style={styles.sheetMeta}>{getSaleProducts(editingReceivable.sale.id)}</Text>
                <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                  {promiseForm.map((paymentPromise, index) => (
                    <View key={paymentPromise.id} style={styles.promiseEditor}>
                      <View style={styles.promiseEditorHeader}>
                        <Text style={styles.promiseEditorTitle}>Promesa {index + 1}</Text>
                        {promiseForm.length > 1 && (
                          <Pressable
                            onPress={() => removePromiseDate(paymentPromise.id)}
                            style={styles.removeButton}
                          >
                            <Feather name="x" size={12} color={colors.textMuted} />
                          </Pressable>
                        )}
                      </View>
                      <CalendarDatePicker
                        label="Selecciona fecha"
                        value={paymentPromise.fecha}
                        onChange={(value) => updatePromiseForm(paymentPromise.id, 'fecha', value)}
                      />
                      <FormInput
                        label="Monto esperado para esa fecha"
                        value={paymentPromise.monto}
                        onChangeText={(value) => updatePromiseForm(paymentPromise.id, 'monto', value)}
                        placeholder="Ej. 500"
                        keyboardType="numeric"
                      />
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.editorActions}>
                  <Pressable onPress={addPromiseDate} style={styles.secondaryButton}>
                    <Feather name="plus" size={13} color={colors.gold} />
                    <Text style={styles.secondaryButtonText}>Agregar otra fecha</Text>
                  </Pressable>
                  <PrimaryButton
                    title={savingSaleId === editingReceivable.sale.id ? 'Guardando...' : 'Guardar fechas'}
                    onPress={savePromiseDates}
                    disabled={savingSaleId === editingReceivable.sale.id}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    paddingBottom: 80,
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
  calendarPanel: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  dayLabelRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dayLabel: {
    flex: 1,
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 6,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 0.9,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dayCellMuted: {
    opacity: 0.35,
  },
  dayCellActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    ...shadow.glow,
  },
  dayNumber: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  dayNumberActive: {
    color: colors.ink,
  },
  dueDot: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  dueDotText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '900',
  },
  panel: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
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
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: 13,
  },
  saleCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    marginBottom: 8,
  },
  saleTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  saleInfo: {
    flex: 1,
  },
  saleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  saleClient: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  saleMeta: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  amountBlock: {
    alignItems: 'flex-end',
  },
  remainingText: {
    fontSize: 18,
    fontWeight: '900',
  },
  amountCaption: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  saleNumbers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.sm,
  },
  saleNumberText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  outcomeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.sm - 2,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 8,
    paddingVertical: 7,
    marginTop: spacing.sm,
  },
  outcomeSummaryText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.sm,
  },
  resultButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...shadow.glow,
  },
  resultButtonText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  outcomeBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.sm,
  },
  outcomeSegmentRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.sm,
  },
  outcomeSegment: {
    flex: 1,
    minHeight: 36,
    borderRadius: radius.sm - 2,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  outcomeSegmentActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  outcomeSegmentText: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '900',
  },
  outcomeSegmentTextActive: {
    color: colors.ink,
  },
  editButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: radius.sm - 2,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editButtonText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  editorBox: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    paddingTop: spacing.sm,
  },
  promiseEditor: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  promiseEditorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  promiseEditorTitle: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: radius.sm - 4,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorActions: {
    gap: spacing.sm,
  },
  secondaryButton: {
    minHeight: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surfaceCard,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryButtonText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
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
  sheetMeta: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginBottom: spacing.md,
  },
  sheetScroll: {
    maxHeight: 470,
  },
  rescheduleSummary: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  rescheduleLabel: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  rescheduleAmount: {
    color: colors.gold,
    fontSize: 24,
    fontWeight: '900',
  },
  sheetFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
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
