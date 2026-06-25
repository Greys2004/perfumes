import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, radius, spacing, shadow } from '../theme';
import { listenClients } from '../services/clientsService';
import { listenAllPayments } from '../services/clientAccountService';
import { listenAllSales } from '../services/salesService';
import {
  addMonths,
  getLocalDateString,
  parseDateString,
} from '../components/CalendarDatePicker';
import { formatDateValue } from '../services/purchasesService';

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

export default function ReceivablesCalendarScreen() {
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
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

    return () => {
      unsubscribeSales();
      unsubscribePayments();
      unsubscribeClients();
    };
  }, []);

  const receivables = useMemo(() => {
    return sales
      .filter((sale) => sale.estado_pago === 'pendiente' || sale.estado_pago === 'parcial')
      .map((sale) => {
        const salePayments = payments.filter((payment) => payment.venta_id === sale.id);
        const paid = salePayments.reduce((sum, payment) => sum + (Number(payment.monto) || 0), 0);
        const total = Number(sale.total) || 0;

        return {
          ...sale,
          paid,
          remaining: total - paid,
          dueDate: formatDateValue(sale.fecha_pago_promesa) || formatDateValue(sale.fecha_venta) || getLocalDateString(),
        };
      })
      .filter((sale) => sale.remaining > 0);
  }, [payments, sales]);

  const receivablesByDate = useMemo(() => {
    return receivables.reduce((summary, sale) => {
      const items = summary[sale.dueDate] || [];
      return {
        ...summary,
        [sale.dueDate]: [...items, sale],
      };
    }, {});
  }, [receivables]);

  const monthDays = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);
  const selectedItems = receivablesByDate[selectedDate] || [];
  const selectedMonth = parseDateString(selectedDate);
  const monthTitle = `${monthNames[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`;

  function getClientName(clientId) {
    const client = clients.find((clientItem) => clientItem.id === clientId);
    return client?.nombre || 'Cliente no encontrado';
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Cobranza</Text>
      <Text style={styles.title}>Calendario de Pagos</Text>
      <Text style={styles.subtitle}>
        Ventas pendientes y parciales organizadas por fecha prometida de pago.
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
            const isSelected = day.value === selectedDate;

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
                {dayItems.length > 0 && (
                  <View style={[styles.dueDot, isSelected && styles.dueDotActive]}>
                    <Text style={[styles.dueDotText, isSelected && styles.dueDotTextActive]}>
                      {dayItems.length}
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
          <Text style={styles.emptyText}>No hay pagos prometidos para este dia.</Text>
        ) : (
          selectedItems.map((sale) => (
            <View key={sale.id} style={styles.saleCard}>
              <View style={styles.saleTop}>
                <View style={styles.saleInfo}>
                  <Text style={styles.saleClient}>{getClientName(sale.cliente_id)}</Text>
                  <Text style={styles.saleMeta}>
                    Venta: {formatDateValue(sale.fecha_venta)}  ·  {sale.estado_pago?.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.remainingText}>${sale.remaining}</Text>
              </View>
              <View style={styles.saleNumbers}>
                <Text style={styles.saleNumberText}>Total ${sale.total || 0}</Text>
                <Text style={styles.saleNumberText}>Pagado ${sale.paid}</Text>
              </View>
            </View>
          ))
        )}
      </View>
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
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  dueDotActive: {
    backgroundColor: colors.ink,
  },
  dueDotText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '900',
  },
  dueDotTextActive: {
    color: colors.gold,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  saleInfo: {
    flex: 1,
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
    marginTop: 2,
  },
  remainingText: {
    color: colors.gold,
    fontSize: 18,
    fontWeight: '900',
  },
  saleNumbers: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.sm,
  },
  saleNumberText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
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
