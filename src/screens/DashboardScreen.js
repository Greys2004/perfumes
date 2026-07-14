import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, radius, spacing, shadow } from '../theme';
import AnimatedPressable from '../components/AnimatedPressable';
import CalendarDatePicker from '../components/CalendarDatePicker';
import {
  calculateDashboardData,
  listenCollection,
} from '../services/dashboardService';

const initialData = {
  purchases: [],
  sales: [],
  payments: [],
  saleDetails: [],
  perfumes: [],
};

const periodOptions = [
  { label: 'Día', value: 'day' },
  { label: 'Semana', value: 'week' },
  { label: 'Mes', value: 'month' },
];

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return new Date(`${value}T00:00:00`);
  }

  if (typeof value.toDate === 'function') {
    return value.toDate();
  }

  if (typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getPeriodRange(period, anchorDate) {
  const start = new Date(anchorDate);
  const end = new Date(anchorDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (period === 'week') {
    const day = start.getDay();
    const daysFromMonday = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - daysFromMonday);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  }

  if (period === 'month') {
    start.setDate(1);
    end.setMonth(start.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

function addPeriod(anchorDate, period, direction) {
  const nextDate = new Date(anchorDate);

  if (period === 'day') {
    nextDate.setDate(nextDate.getDate() + direction);
    return nextDate;
  }

  if (period === 'week') {
    nextDate.setDate(nextDate.getDate() + direction * 7);
    return nextDate;
  }

  nextDate.setMonth(nextDate.getMonth() + direction);
  return nextDate;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getTrendBuckets(range) {
  const buckets = [];
  const cursor = new Date(range.start);

  while (cursor <= range.end) {
    buckets.push({
      date: formatDate(cursor),
      label: String(cursor.getDate()),
      value: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
}

function isInRange(value, range) {
  const date = normalizeDate(value);

  if (!date) {
    return false;
  }

  return date >= range.start && date <= range.end;
}

function getPeriodLabel(period, range) {
  if (period === 'day') {
    return formatDate(range.start);
  }

  if (period === 'week') {
    return `${formatDate(range.start)} a ${formatDate(range.end)}`;
  }

  return range.start.toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });
}

function getPeriodPickerCopy(period) {
  if (period === 'day') {
    return {
      label: 'Elegir día',
      hint: 'Selecciona el día exacto que quieres revisar.',
    };
  }

  if (period === 'week') {
    return {
      label: 'Elegir semana',
      hint: 'Selecciona cualquier día de la semana que quieres revisar.',
    };
  }

  return {
    label: 'Elegir mes',
    hint: 'Selecciona cualquier día del mes que quieres revisar.',
  };
}

export default function DashboardScreen() {
  const [data, setData] = useState(initialData);
  const [period, setPeriod] = useState('month');
  const [periodAnchor, setPeriodAnchor] = useState(() => new Date());
  const [error, setError] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    const unsubscribers = [
      listenCollection('compras', (purchases) => updateData('purchases', purchases), handleError),
      listenCollection('ventas', (sales) => updateData('sales', sales), handleError),
      listenCollection('pagos', (payments) => updateData('payments', payments), handleError),
      listenCollection('detalle_venta', (saleDetails) => updateData('saleDetails', saleDetails), handleError),
      listenCollection('perfumes', (perfumes) => updateData('perfumes', perfumes), handleError),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 520,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 520,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  function updateData(key, value) {
    setData((currentData) => ({
      ...currentData,
      [key]: value,
    }));
  }

  function handleError(firebaseError) {
    setError(firebaseError.message);
  }

  const dashboard = useMemo(() => calculateDashboardData(data), [data]);
  const periodRange = useMemo(() => getPeriodRange(period, periodAnchor), [period, periodAnchor]);
  const periodLabel = useMemo(() => getPeriodLabel(period, periodRange), [period, periodRange]);
  const periodPickerCopy = getPeriodPickerCopy(period);
  const periodData = useMemo(() => {
    const periodSaleIds = data.sales
      .filter((sale) => isInRange(sale.fecha_venta, periodRange))
      .map((sale) => sale.id);

    return {
      purchases: data.purchases.filter((purchase) => isInRange(purchase.fecha_compra, periodRange)),
      sales: data.sales.filter((sale) => periodSaleIds.includes(sale.id)),
      payments: data.payments.filter((payment) => isInRange(payment.fecha_pago, periodRange)),
      saleDetails: data.saleDetails.filter((detail) => periodSaleIds.includes(detail.venta_id)),
      perfumes: data.perfumes,
      purchaseCatalog: data.purchases,
    };
  }, [data, periodRange]);
  const periodDashboard = useMemo(() => calculateDashboardData(periodData), [periodData]);
  const salesTrend = useMemo(() => {
    const buckets = getTrendBuckets(periodRange);
    const bucketByDate = buckets.reduce((summary, bucket) => ({
      ...summary,
      [bucket.date]: bucket,
    }), {});

    periodData.sales.forEach((sale) => {
      const date = typeof sale.fecha_venta === 'string'
        ? sale.fecha_venta
        : formatDate(normalizeDate(sale.fecha_venta) || new Date());

      if (bucketByDate[date]) {
        bucketByDate[date].value += Number(sale.total) || 0;
      }
    });

    return buckets;
  }, [periodData.sales, periodRange]);
  const maxMoney = Math.max(
    periodDashboard.totalVendido,
    periodDashboard.totalPagado,
    periodDashboard.deudaClientes,
    Math.abs(periodDashboard.gananciaVendida),
    Math.abs(periodDashboard.gananciaCobrada),
    Math.abs(periodDashboard.gastadoMenosPagado),
    1
  );
  const stockTotal = dashboard.inventarioPorPerfume.reduce(
    (sum, item) => sum + (Number(item.ml_restantes) || 0),
    0
  );
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View
        style={[
          styles.motionWrap,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroTitleBlock}>
              <Text style={styles.kicker}>Resumen Financiero</Text>
              <Text style={styles.title}>Control de Caja</Text>
            </View>
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>
                {periodLabel.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.periodTabs}>
            {periodOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  setPeriod(option.value);
                  setPeriodAnchor(new Date());
                }}
                style={[styles.periodTab, period === option.value && styles.periodTabActive]}
              >
                <Text
                  style={[
                    styles.periodTabText,
                    period === option.value && styles.periodTabTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.periodNavigator}>
            <Pressable
              onPress={() => setPeriodAnchor((currentDate) => addPeriod(currentDate, period, -1))}
              style={styles.periodStepButton}
            >
              <Feather name="chevron-left" size={16} color={colors.text} />
            </Pressable>
            <Pressable onPress={() => setPeriodAnchor(new Date())} style={styles.periodCurrentButton}>
              <Text style={styles.periodCurrentText}>{periodLabel}</Text>
            </Pressable>
            <Pressable
              onPress={() => setPeriodAnchor((currentDate) => addPeriod(currentDate, period, 1))}
              style={styles.periodStepButton}
            >
              <Feather name="chevron-right" size={16} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.directDateBox}>
            <CalendarDatePicker
              label={periodPickerCopy.label}
              value={formatDate(periodAnchor)}
              onChange={(value) => setPeriodAnchor(new Date(`${value}T00:00:00`))}
            />
            <Text style={styles.directDateHint}>{periodPickerCopy.hint}</Text>
          </View>

          <View style={styles.heroMain}>
            <Text style={styles.heroLabel}>Total Vendido: {periodLabel}</Text>
            <Text
              style={[
                styles.heroValue,
                periodDashboard.totalVendido < 0 && styles.negativeValue,
              ]}
            >
              ${periodDashboard.totalVendido}
            </Text>
            <View style={styles.heroDivider} />
            <Text style={styles.heroNote}>
              Cobrado <Text style={styles.goldHighlight}>${periodDashboard.totalPagado}</Text>  ·  Ganancia <Text style={styles.goldHighlight}>${periodDashboard.gananciaVendida}</Text>  ·  Deuda <Text style={styles.goldHighlight}>${periodDashboard.deudaClientes}</Text>
            </Text>
          </View>

          <View style={styles.heroGrid}>
            <MiniStat icon="arrow-up-right" label="Gastado" value={`$${periodDashboard.totalGastado}`} color={colors.danger} />
            <MiniStat icon="dollar-sign" label="Cobrado" value={`$${periodDashboard.totalPagado}`} color={colors.success} />
            <MiniStat icon="box" label="Stock ml" value={`${stockTotal} ml`} color={colors.gold} />
          </View>
        </View>

        {!!error && (
          <View style={styles.messageBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.metricRail}
        >
          <DashboardMetricCard icon="arrow-up-right" label="Gastado" value={`$${periodDashboard.totalGastado}`} color={colors.danger} />
          <DashboardMetricCard icon="tag" label="Vendido" value={`$${periodDashboard.totalVendido}`} color={colors.text} />
          <DashboardMetricCard icon="dollar-sign" label="Cobrado" value={`$${periodDashboard.totalPagado}`} color={colors.success} />
          <DashboardMetricCard icon="alert-circle" label="Deben" value={`$${periodDashboard.deudaClientes}`} color={colors.gold} />
          <DashboardMetricCard icon="trending-up" label="Ganancia Ventas" value={`$${periodDashboard.gananciaVendida}`} color={colors.gold} focus />
          <DashboardMetricCard icon="trending-up" label="Ganancia Cobrada" value={`$${periodDashboard.gananciaCobrada}`} color={colors.success} focus />
        </ScrollView>

        <View style={styles.panel}>
          <SectionHeader icon="map" title="Mapa del Periodo" detail={`Cifras de rendimiento: ${periodLabel}`} />
          <MoneyBar label="Vendido" value={periodDashboard.totalVendido} maxValue={maxMoney} color={colors.text} />
          <MoneyBar label="Cobrado" value={periodDashboard.totalPagado} maxValue={maxMoney} color={colors.success} />
          <MoneyBar label="Deuda de Clientes" value={periodDashboard.deudaClientes} maxValue={maxMoney} color={colors.gold} muted />
          <MoneyBar label="Ganancia Estimada (Ventas)" value={periodDashboard.gananciaVendida} maxValue={maxMoney} color={colors.gold} />
          <MoneyBar label="Ganancia Real (Cobrado)" value={periodDashboard.gananciaCobrada} maxValue={maxMoney} color={colors.success} muted />
          <MoneyBar label="Diferencia Gastado/Cobrado" value={periodDashboard.gastadoMenosPagado} maxValue={maxMoney} color={colors.danger} muted />
        </View>

        <View style={styles.panel}>
          <SectionHeader icon="bar-chart-2" title="Ganancia por Tipo" detail="Perfumes completos y decants vendidos en el periodo" />
          <ProfitTypeCard label="Perfumes" data={periodDashboard.profitabilityByType.perfumes} />
          <ProfitTypeCard label="Decants" data={periodDashboard.profitabilityByType.decants} />
        </View>

        <View style={styles.panel}>
          <SectionHeader icon="activity" title="Graficas" detail={`Ventas y distribucion: ${periodLabel}`} />
          <SalesTrendChart data={salesTrend} />
          <SalesMixChart data={periodDashboard.profitabilityByType} />
        </View>

        <View style={styles.panel}>
          <SectionHeader icon="alert-triangle" title="Alerta de Inventario" detail="Perfumes críticos con menor stock" />
          {dashboard.perfumesMenosStock.length === 0 ? (
            <Text style={styles.emptyText}>No hay stock bajo registrado.</Text>
          ) : (
            dashboard.perfumesMenosStock.map((perfumeStock, index) => (
              <StockRow key={perfumeStock.perfume_id} item={perfumeStock} index={index} />
            ))
          )}
        </View>

        <View style={styles.panel}>
          <SectionHeader icon="award" title="Ranking Más Vendidos" detail={`Perfumes lideres: ${periodLabel}`} />
          {periodDashboard.perfumesMasVendidos.length === 0 ? (
            <Text style={styles.emptyText}>No hay ventas en este periodo.</Text>
          ) : (
            periodDashboard.perfumesMasVendidos.map((perfume, index) => (
              <RankingCard
                key={perfume.perfume_id}
                perfume={perfume}
                index={index}
                maxValue={periodDashboard.perfumesMasVendidos[0]?.ml_vendidos || 1}
              />
            ))
          )}
        </View>

        <View style={styles.panel}>
          <SectionHeader icon="database" title="Inventario de Fragancias" detail="Detalle completo de ml y botellas" />
          {dashboard.inventarioPorPerfume.length === 0 ? (
            <Text style={styles.emptyText}>Aún no hay inventario registrado.</Text>
          ) : (
            dashboard.inventarioPorPerfume.map((perfumeStock) => (
              <InventoryCard key={perfumeStock.perfume_id} item={perfumeStock} />
            ))
          )}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

function MiniStat({ icon, label, value, color }) {
  return (
    <View style={styles.miniStat}>
      <View style={styles.miniStatTop}>
        <Feather name={icon} size={11} color={color} />
        <Text style={styles.miniLabel}>{label}</Text>
      </View>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

function SectionHeader({ icon, title, detail }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleBlock}>
        <Feather name={icon} size={18} color={colors.gold} style={styles.sectionIcon} />
        <Text style={styles.panelTitle}>{title}</Text>
      </View>
      <Text style={styles.panelDetail}>{detail}</Text>
    </View>
  );
}

function DashboardMetricCard({ icon, label, value, color, focus = false }) {
  const isNegative = String(value).includes('$-');

  return (
    <View style={[styles.metricCard, focus && styles.metricFocus]}>
      <View style={styles.metricCardHeader}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Feather name={icon} size={13} color={focus ? colors.gold : colors.textSubtle} />
      </View>
      <Text style={[styles.metricValue, isNegative && styles.negativeValue, { color: isNegative ? colors.danger : (focus ? colors.gold : colors.text) }]}>
        {value}
      </Text>
    </View>
  );
}

function MoneyBar({ label, value, maxValue, color, muted = false }) {
  const numericValue = Number(value) || 0;
  const isNegative = numericValue < 0;
  const safeValue = Math.abs(numericValue);
  const width = `${Math.min((safeValue / Math.max(maxValue, 1)) * 100, 100)}%`;

  return (
    <View style={styles.moneyRow}>
      <View style={styles.moneyTop}>
        <Text style={styles.moneyLabel}>{label}</Text>
        <Text style={[styles.moneyValue, isNegative && styles.negativeValue, { color: isNegative ? colors.danger : color }]}>
          ${value}
        </Text>
      </View>
      <View style={styles.moneyTrack}>
        <View
          style={[
            styles.moneyFill,
            { backgroundColor: isNegative ? colors.danger : color },
            muted && { opacity: 0.5 },
            { width },
          ]}
        />
      </View>
    </View>
  );
}

function ProfitTypeCard({ label, data }) {
  const profit = Number(data.ganancia || 0).toFixed(2);
  const isNegative = Number(profit) < 0;

  return (
    <View style={styles.profitTypeCard}>
      <View style={styles.rowTextGroup}>
        <Text style={styles.rowTitle}>{label}</Text>
        <Text style={styles.rowSubtext}>Vendido: ${Number(data.vendido || 0).toFixed(2)}</Text>
      </View>
    </View>
  );
}

function SalesTrendChart({ data }) {
  const maxValue = Math.max(...data.map((item) => Number(item.value) || 0), 1);
  const visibleLabels = data.length > 12
    ? data.filter((_, index) => index === 0 || index === data.length - 1 || index % 5 === 0)
    : data;

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Tendencia de ventas</Text>
        <Text style={styles.chartValue}>${data.reduce((sum, item) => sum + item.value, 0)}</Text>
      </View>
      <View style={styles.trendArea}>
        {data.map((item) => {
          const height = Math.max((Number(item.value) / maxValue) * 100, item.value > 0 ? 8 : 2);

          return (
            <View key={item.date} style={styles.trendColumn}>
              <View style={[styles.trendBar, { height: `${height}%` }]} />
              <View style={[styles.trendDot, item.value > 0 && styles.trendDotActive]} />
            </View>
          );
        })}
      </View>
      <View style={styles.trendLabels}>
        {visibleLabels.map((item) => (
          <Text key={item.date} style={styles.trendLabel}>{item.label}</Text>
        ))}
      </View>
    </View>
  );
}

function SalesMixChart({ data }) {
  const perfumeValue = Number(data.perfumes?.vendido) || 0;
  const decantValue = Number(data.decants?.vendido) || 0;
  const totalValue = Math.max(perfumeValue + decantValue, 1);
  const perfumePercent = Math.round((perfumeValue / totalValue) * 100);
  const decantPercent = Math.round((decantValue / totalValue) * 100);

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Distribucion de ventas</Text>
        <Text style={styles.chartValue}>${perfumeValue + decantValue}</Text>
      </View>
      <View style={styles.mixRow}>
        <View style={styles.circleMetric}>
          <Text style={styles.circlePercent}>{perfumePercent}%</Text>
          <Text style={styles.circleLabel}>Perfumes</Text>
        </View>
        <View style={styles.circleMetricMuted}>
          <Text style={styles.circlePercent}>{decantPercent}%</Text>
          <Text style={styles.circleLabel}>Decants</Text>
        </View>
      </View>
      <View style={styles.stackedTrack}>
        <View style={[styles.stackedFillGold, { flex: perfumeValue || 1 }]} />
        <View style={[styles.stackedFillSuccess, { flex: decantValue || 1 }]} />
      </View>
    </View>
  );
}

function StockRow({ item, index }) {
  const isEmpty = Number(item.ml_restantes) <= 0;
  const bottles = Number(item.botellas_restantes || 0).toFixed(2);

  return (
    <View style={[styles.stockRow, isEmpty && styles.stockRowEmpty]}>
      <View style={[styles.rankBadge, isEmpty && styles.rankBadgeEmpty]}>
        <Text style={styles.rankBadgeText}>{index + 1}</Text>
      </View>
      <View style={styles.rowTextGroup}>
        <Text style={styles.rowTitle}>{item.nombre}</Text>
        <Text style={styles.rowSubtext}>{item.ml_restantes} ml restantes  ·  {bottles} botellas</Text>
      </View>
      <View style={[styles.stockSignal, isEmpty && styles.stockSignalEmpty]}>
        <Text style={[styles.stockSignalText, isEmpty && styles.negativeValue]}>
          {isEmpty ? 'AGOTADO' : 'BAJO'}
        </Text>
      </View>
    </View>
  );
}

function RankingCard({ perfume, index, maxValue }) {
  const width = `${Math.min(((Number(perfume.ml_vendidos) || 0) / maxValue) * 100, 100)}%`;

  return (
    <View style={styles.rankingCard}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankBadgeText}>{index + 1}</Text>
      </View>
      <View style={styles.rankingBody}>
        <View style={styles.rankingHeader}>
          <Text style={styles.rowTitle}>{perfume.nombre}</Text>
          <Text style={styles.rowValue}>${perfume.total_vendido}</Text>
        </View>
        <View style={styles.slimTrack}>
          <View style={[styles.slimFill, { width }]} />
        </View>
        <Text style={styles.rowSubtext}>{perfume.ml_vendidos} ml vendidos</Text>
      </View>
    </View>
  );
}

function InventoryCard({ item }) {
  const bottles = Number(item.botellas_restantes || 0).toFixed(2);
  const isEmpty = Number(item.ml_restantes) <= 0;

  return (
    <View style={[styles.inventoryCard, isEmpty && styles.inventoryCardEmpty]}>
      <View style={styles.rowTextGroup}>
        <Text style={styles.rowTitle}>{item.nombre}</Text>
        <Text style={styles.rowSubtext}>{item.compras_con_stock} compras en lote activo</Text>
      </View>
      <View style={styles.inventoryNumbers}>
        <Text style={[styles.inventoryMl, isEmpty && styles.negativeValue]}>{item.ml_restantes} ml</Text>
        <Text style={styles.inventoryBottle}>{bottles} botellas</Text>
      </View>
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
    paddingBottom: 42,
  },
  motionWrap: {
    flex: 1,
  },
  hero: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.glow,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  heroTitleBlock: {
    flex: 1,
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
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statusChip: {
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusChipText: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  periodTabs: {
    minHeight: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    padding: 3,
    gap: 4,
    marginBottom: spacing.md,
  },
  periodTab: {
    flex: 1,
    borderRadius: radius.sm - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTabActive: {
    backgroundColor: colors.gold,
  },
  periodTabText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '800',
  },
  periodTabTextActive: {
    color: colors.ink,
  },
  periodNavigator: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  periodStepButton: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodCurrentButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  periodCurrentText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  directDateBox: {
    marginBottom: spacing.md,
  },
  directDateHint: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: -spacing.md,
    marginBottom: spacing.sm,
  },
  heroMain: {
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  heroLabel: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroValue: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  heroDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.sm,
  },
  goldHighlight: {
    color: colors.gold,
    fontWeight: '900',
  },
  heroNote: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  heroGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  miniStat: {
    flex: 1,
    minHeight: 58,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  miniStatTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  miniValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  miniLabel: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricRail: {
    gap: 8,
    paddingBottom: spacing.sm,
  },
  metricCard: {
    width: 130,
    minHeight: 80,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    justifyContent: 'space-between',
    ...shadow.card,
  },
  metricCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricFocus: {
    borderColor: colors.lineStrong,
    backgroundColor: colors.surfaceRaised,
  },
  metricLabel: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  negativeValue: {
    color: colors.danger,
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
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  sectionIcon: {
    marginBottom: 1,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  panelDetail: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '600',
  },
  moneyRow: {
    marginBottom: spacing.sm,
  },
  moneyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  moneyLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  moneyValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  moneyTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  moneyFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  profitTypeCard: {
    minHeight: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  profitNumbers: {
    alignItems: 'flex-end',
    gap: 3,
  },
  profitExpense: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '800',
  },
  profitValue: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
  },
  chartCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chartTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  chartValue: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '900',
  },
  trendArea: {
    height: 120,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    backgroundColor: colors.background,
    borderRadius: radius.sm - 2,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 10,
  },
  trendColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  trendBar: {
    width: '72%',
    minHeight: 2,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(229, 192, 123, 0.45)',
  },
  trendDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.lineStrong,
    marginTop: 3,
  },
  trendDotActive: {
    backgroundColor: colors.gold,
  },
  trendLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  trendLabel: {
    color: colors.textSubtle,
    fontSize: 9,
    fontWeight: '800',
  },
  mixRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  circleMetric: {
    flex: 1,
    aspectRatio: 1.65,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: 'rgba(229, 192, 123, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleMetricMuted: {
    flex: 1,
    aspectRatio: 1.65,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(108, 178, 143, 0.35)',
    backgroundColor: 'rgba(108, 178, 143, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circlePercent: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  circleLabel: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  stackedTrack: {
    height: 10,
    borderRadius: radius.pill,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  stackedFillGold: {
    backgroundColor: colors.gold,
  },
  stackedFillSuccess: {
    backgroundColor: colors.success,
  },
  stockRow: {
    minHeight: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stockRowEmpty: {
    backgroundColor: colors.dangerSurface,
    borderColor: colors.dangerLine,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeEmpty: {
    backgroundColor: colors.danger,
  },
  rankBadgeText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  rowTextGroup: {
    flex: 1,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  rowSubtext: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  rowValue: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '900',
  },
  stockSignal: {
    borderRadius: radius.sm - 2,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stockSignalEmpty: {
    borderColor: colors.dangerLine,
  },
  stockSignalText: {
    color: colors.gold,
    fontSize: 9,
    fontWeight: '900',
  },
  rankingCard: {
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    marginBottom: 8,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  rankingBody: {
    flex: 1,
  },
  rankingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  slimTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    overflow: 'hidden',
    marginBottom: 4,
  },
  slimFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
  },
  inventoryCard: {
    minHeight: 58,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  inventoryCardEmpty: {
    backgroundColor: colors.dangerSurface,
    borderColor: colors.dangerLine,
  },
  inventoryNumbers: {
    alignItems: 'flex-end',
  },
  inventoryMl: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  inventoryBottle: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: 13,
    lineHeight: 18,
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
