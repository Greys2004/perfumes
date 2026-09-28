import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, radius, spacing, shadow } from '../theme';
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

const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function getYearlySalesByMonth(data, year) {
  const salesById = data.sales.reduce((summary, sale) => ({
    ...summary,
    [sale.id]: sale,
  }), {});

  const months = monthLabels.map((label, index) => ({
    label,
    month: index,
    perfumes: 0,
    decants: 0,
  }));

  data.saleDetails.forEach((detail) => {
    const sale = salesById[detail.venta_id];

    if (!sale || sale.estado_pago === 'cancelada') {
      return;
    }

    const saleDate = normalizeDate(sale.fecha_venta);

    if (!saleDate || saleDate.getFullYear() !== year) {
      return;
    }

    const type = detail.tipo_producto === 'botella_completa' ? 'perfumes' : 'decants';
    months[saleDate.getMonth()][type] += Number(detail.subtotal) || 0;
  });

  return months.map((month) => ({
    ...month,
    total: month.perfumes + month.decants,
  }));
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
  const [showDatePicker, setShowDatePicker] = useState(false);
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
  const selectedYear = periodAnchor.getFullYear();
  const yearlySalesByMonth = useMemo(
    () => getYearlySalesByMonth(data, selectedYear),
    [data, selectedYear]
  );
  const maxMoney = Math.max(
    periodDashboard.totalGastado,
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
        {/* Panel Hero */}
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

          {/* Period Tabs */}
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

          {/* Navegador de Periodos */}
          <View style={styles.periodNavigator}>
            <Pressable
              onPress={() => setPeriodAnchor((currentDate) => addPeriod(currentDate, period, -1))}
              style={styles.periodStepButton}
            >
              <Feather name="chevron-left" size={18} color={colors.gold} />
            </Pressable>
            <Pressable onPress={() => setPeriodAnchor(new Date())} style={styles.periodCurrentButton}>
              <Text style={styles.periodCurrentText}>{periodLabel}</Text>
            </Pressable>
            <Pressable
              onPress={() => setPeriodAnchor((currentDate) => addPeriod(currentDate, period, 1))}
              style={styles.periodStepButton}
            >
              <Feather name="chevron-right" size={18} color={colors.gold} />
            </Pressable>
          </View>

          <Pressable
            onPress={() => setShowDatePicker(!showDatePicker)}
            style={styles.toggleDatePickerBtn}
          >
            <Feather name="calendar" size={13} color={colors.amber} style={{ marginRight: 6 }} />
            <Text style={styles.toggleDatePickerText}>
              {showDatePicker ? 'Ocultar selector de fecha' : 'Elegir fecha específica...'}
            </Text>
            <Feather
              name={showDatePicker ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.amber}
            />
          </Pressable>

          {showDatePicker && (
            <View style={styles.directDateBox}>
              <CalendarDatePicker
                label={periodPickerCopy.label}
                value={formatDate(periodAnchor)}
                onChange={(value) => setPeriodAnchor(new Date(`${value}T00:00:00`))}
              />
              <Text style={styles.directDateHint}>{periodPickerCopy.hint}</Text>
            </View>
          )}

          {/* Valor Principal */}
          <View style={styles.heroMain}>
            <View style={styles.heroMainHeader}>
              <Text style={styles.heroLabel}>VENTAS TOTALES ({periodLabel.toUpperCase()})</Text>
              <Feather name="trending-up" size={16} color={colors.amber} />
            </View>
            <Text
              style={[
                styles.heroValue,
                periodDashboard.totalVendido < 0 && styles.negativeValue,
              ]}
            >
              ${periodDashboard.totalVendido}
            </Text>
          </View>

          {/* 4-Card Executive Grid */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <View style={styles.kpiCardTop}>
                <Feather name="check-circle" size={13} color={colors.success} />
                <Text style={styles.kpiLabel}>Cobrado</Text>
              </View>
              <Text style={[styles.kpiValue, { color: colors.success }]}>
                ${periodDashboard.totalPagado}
              </Text>
            </View>

            <View style={[styles.kpiCard, styles.kpiCardFocus]}>
              <View style={styles.kpiCardTop}>
                <Feather name="award" size={13} color={colors.amber} />
                <Text style={[styles.kpiLabel, { color: colors.amber }]}>Ganancia Est.</Text>
              </View>
              <Text style={[styles.kpiValue, { color: colors.amber }]}>
                ${periodDashboard.gananciaVendida}
              </Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiCardTop}>
                <Feather name="alert-circle" size={13} color={colors.rose} />
                <Text style={styles.kpiLabel}>Por Cobrar</Text>
              </View>
              <Text style={[styles.kpiValue, { color: Number(periodDashboard.deudaClientes) > 0 ? colors.rose : colors.text }]}>
                ${periodDashboard.deudaClientes}
              </Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiCardTop}>
                <Feather name="shopping-bag" size={13} color={colors.petroleum} />
                <Text style={styles.kpiLabel}>Inversión Compras</Text>
              </View>
              <Text style={styles.kpiValue}>
                ${periodDashboard.totalGastado}
              </Text>
            </View>
          </View>

          {/* Sub-bar with secondary indicators */}
          <View style={styles.heroFooterStrip}>
            <View style={styles.heroFooterItem}>
              <Feather name="dollar-sign" size={12} color={colors.gold} style={{ marginRight: 4 }} />
              <Text style={styles.heroFooterText}>
                Ganancia Real: <Text style={styles.heroFooterBold}>${periodDashboard.gananciaCobrada}</Text>
              </Text>
            </View>
            <View style={styles.heroFooterItem}>
              <Feather name="box" size={12} color={colors.gold} style={{ marginRight: 4 }} />
              <Text style={styles.heroFooterText}>
                Stock Total: <Text style={styles.heroFooterBold}>{stockTotal} ml</Text>
              </Text>
            </View>
          </View>
        </View>

        {!!error && (
          <View style={styles.messageBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Mapa del Periodo */}
        <View style={styles.panel}>
          <SectionHeader icon="map" title="Mapa del Periodo" detail={`Cifras de rendimiento: ${periodLabel}`} />
          <MoneyBar label="Gastado" value={periodDashboard.totalGastado} maxValue={maxMoney} color={colors.gold} />
          <MoneyBar label="Vendido" value={periodDashboard.totalVendido} maxValue={maxMoney} color={colors.gold} />
          <MoneyBar label="Cobrado" value={periodDashboard.totalPagado} maxValue={maxMoney} color={colors.gold} />
          <MoneyBar label="Deuda de Clientes" value={periodDashboard.deudaClientes} maxValue={maxMoney} tone="debt" muted />
          <MoneyBar label="Ganancia Estimada (Ventas)" value={periodDashboard.gananciaVendida} maxValue={maxMoney} tone="positiveGood" />
          <MoneyBar label="Ganancia Real (Cobrado)" value={periodDashboard.gananciaCobrada} maxValue={maxMoney} tone="positiveGood" muted />
          <MoneyBar label="Diferencia Gastado/Cobrado" value={periodDashboard.gastadoMenosPagado} maxValue={maxMoney} tone="negativeGood" muted />
        </View>

        {/* Ganancia por Tipo */}
        <View style={styles.panel}>
          <SectionHeader icon="bar-chart-2" title="Ganancia por Tipo" detail="Perfumes completos y decants vendidos en el periodo" />
          <ProfitTypeCard label="Perfumes Completos" data={periodDashboard.profitabilityByType.perfumes} />
          <ProfitTypeCard label="Decants Muestra" data={periodDashboard.profitabilityByType.decants} />
        </View>

        {/* Gráficas */}
        <View style={styles.panel}>
          <SectionHeader icon="activity" title="Rendimiento Anual" detail={`Ventas mes a mes: ${selectedYear}`} />
          <YearlySalesChart data={yearlySalesByMonth} year={selectedYear} />
          <SalesMixChart data={periodDashboard.profitabilityByType} />
        </View>

        {/* Alerta de Inventario */}
        <View style={styles.panel}>
          <SectionHeader icon="alert-triangle" title="Alerta de Inventario" detail="Perfumes con menor disponibilidad en stock" />
          {dashboard.perfumesMenosStock.length === 0 ? (
            <Text style={styles.emptyText}>No hay stock bajo registrado.</Text>
          ) : (
            dashboard.perfumesMenosStock.map((perfumeStock, index) => (
              <StockRow key={perfumeStock.perfume_id} item={perfumeStock} index={index} />
            ))
          )}
        </View>

        {/* Ranking */}
        <View style={styles.panel}>
          <SectionHeader icon="award" title="Ranking Más Vendidos" detail={`Perfumes líderes: ${periodLabel}`} />
          {periodDashboard.perfumesMasVendidos.length === 0 ? (
            <Text style={styles.emptyText}>No hay ventas registradas en este periodo.</Text>
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

        {/* Inventario completo */}
        <View style={styles.panel}>
          <SectionHeader icon="database" title="Inventario de Fragancias" detail="Detalle completo de ml y botellas disponibles" />
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
        <Feather name={icon} size={12} color={color} />
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
        <Feather name={icon} size={14} color={focus ? colors.gold : colors.textSubtle} />
      </View>
      <Text style={[styles.metricValue, isNegative && styles.negativeValue, { color: isNegative ? colors.danger : (focus ? colors.gold : colors.text) }]}>
        {value}
      </Text>
    </View>
  );
}

function getMoneyToneColor(value, tone, fallbackColor) {
  const numericValue = Number(value) || 0;

  if (tone === 'debt') {
    return numericValue > 0 ? colors.rose : colors.success;
  }

  if (tone === 'negativeGood') {
    return numericValue > 0 ? colors.rose : colors.success;
  }

  if (tone === 'positiveGood') {
    return numericValue < 0 ? colors.rose : colors.success;
  }

  return numericValue < 0 ? colors.rose : fallbackColor;
}

function MoneyBar({ label, value, maxValue, color = colors.gold, tone = 'fixed', muted = false }) {
  const numericValue = Number(value) || 0;
  const isNegative = numericValue < 0;
  const safeValue = Math.abs(numericValue);
  const width = `${Math.min((safeValue / Math.max(maxValue, 1)) * 100, 100)}%`;
  const toneColor = getMoneyToneColor(numericValue, tone, color);

  return (
    <View style={styles.moneyRow}>
      <View style={styles.moneyTop}>
        <Text style={styles.moneyLabel}>{label}</Text>
        <Text style={[styles.moneyValue, isNegative && styles.negativeValue, { color: toneColor }]}>
          ${value}
        </Text>
      </View>
      <View style={styles.moneyTrack}>
        <View
          style={[
            styles.moneyFill,
            { backgroundColor: toneColor },
            muted && { opacity: 0.55 },
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
      <View style={styles.profitNumbers}>
        <Text style={styles.rowSubtext}>Ganancia Estimada</Text>
        <Text style={[styles.profitValue, isNegative && styles.negativeValue]}>${profit}</Text>
      </View>
    </View>
  );
}

function YearlySalesChart({ data, year }) {
  const totals = data.reduce(
    (summary, item) => ({
      perfumes: summary.perfumes + item.perfumes,
      decants: summary.decants + item.decants,
      total: summary.total + item.total,
    }),
    { perfumes: 0, decants: 0, total: 0 }
  );
  const maxValue = Math.max(...data.map((item) => item.total), 1);

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View>
          <Text style={styles.chartTitle}>Ventas Mensuales {year}</Text>
          <Text style={styles.chartSubtitle}>
            Perfumes ${totals.perfumes.toFixed(2)} · Decants ${totals.decants.toFixed(2)}
          </Text>
        </View>
        <Text style={styles.chartValue}>${totals.total.toFixed(2)}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.yearBarScrollContent}
      >
        {data.map((item) => {
          const perfumeHeight = Math.max((item.perfumes / maxValue) * 104, item.perfumes > 0 ? 5 : 0);
          const decantHeight = Math.max((item.decants / maxValue) * 104, item.decants > 0 ? 5 : 0);

          return (
            <View key={item.label} style={styles.yearBarMonth}>
              <View style={styles.yearBarPlot}>
                <View style={styles.yearBarPair}>
                  <View style={[styles.yearBarPerfume, { height: perfumeHeight }]} />
                  <View style={[styles.yearBarDecant, { height: decantHeight }]} />
                </View>
              </View>
              <Text style={styles.yearBarLabel}>{item.label}</Text>
              <Text style={styles.yearBarValue}>${item.total.toFixed(0)}</Text>
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.chartLegendRow}>
        <View style={styles.chartLegendItem}>
          <View style={styles.legendPerfume} />
          <Text style={styles.chartLegendText}>Perfumes</Text>
        </View>
        <View style={styles.chartLegendItem}>
          <View style={styles.legendDecant} />
          <Text style={styles.chartLegendText}>Decants</Text>
        </View>
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
        <Text style={styles.chartTitle}>Distribución de Ventas</Text>
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
    paddingBottom: 160,
  },
  motionWrap: {
    flex: 1,
  },
  hero: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.lg,
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
    color: colors.amber,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statusChip: {
    borderRadius: radius.pill,
    backgroundColor: 'rgba(166, 106, 53, 0.1)',
    borderWidth: 1,
    borderColor: colors.amber,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusChipText: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  periodTabs: {
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    flexDirection: 'row',
    padding: 3,
    gap: 4,
    marginBottom: spacing.md,
  },
  periodTab: {
    flex: 1,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTabActive: {
    backgroundColor: colors.petroleum,
  },
  periodTabText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  periodTabTextActive: {
    color: colors.white,
    fontWeight: '900',
  },
  periodNavigator: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  periodStepButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodCurrentButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  periodCurrentText: {
    color: colors.petroleum,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  toggleDatePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(166, 106, 53, 0.1)',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  toggleDatePickerText: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '800',
    marginRight: 4,
  },
  directDateBox: {
    marginBottom: spacing.md,
  },
  directDateHint: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  heroMain: {
    marginBottom: spacing.sm,
    backgroundColor: colors.field,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  heroMainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  heroLabel: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroValue: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.xs,
  },
  kpiCard: {
    width: '48.5%',
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.lg,
    padding: spacing.sm,
    minHeight: 62,
    justifyContent: 'center',
  },
  kpiCardFocus: {
    backgroundColor: 'rgba(166, 106, 53, 0.08)',
    borderColor: 'rgba(166, 106, 53, 0.3)',
  },
  kpiCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  kpiLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  heroFooterStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  heroFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroFooterText: {
    color: colors.textSubtle,
    fontSize: 11,
  },
  heroFooterBold: {
    color: colors.text,
    fontWeight: '800',
  },
  heroGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  miniStat: {
    flex: 1,
    minHeight: 62,
    borderRadius: radius.md,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  miniStatTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  miniValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  miniLabel: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metricRail: {
    gap: 8,
    paddingBottom: spacing.sm,
  },
  metricCard: {
    width: 136,
    minHeight: 84,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
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
    borderColor: colors.amber,
    backgroundColor: colors.field,
  },
  metricLabel: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: '900',
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
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  sectionIcon: {
    marginBottom: 1,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  panelDetail: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
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
    fontSize: 13,
    fontWeight: '700',
  },
  moneyValue: {
    fontSize: 13,
    fontWeight: '900',
  },
  moneyTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.field,
    overflow: 'hidden',
  },
  moneyFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  profitTypeCard: {
    minHeight: 66,
    borderRadius: radius.lg,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.md,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  profitNumbers: {
    alignItems: 'flex-end',
    gap: 2,
  },
  profitValue: {
    color: colors.amber,
    fontSize: 14,
    fontWeight: '900',
  },
  chartCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chartTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  chartSubtitle: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  chartValue: {
    color: colors.amber,
    fontSize: 15,
    fontWeight: '900',
  },
  yearBarScrollContent: {
    gap: 8,
    paddingRight: spacing.sm,
  },
  yearBarMonth: {
    width: 56,
    alignItems: 'center',
  },
  yearBarPlot: {
    width: '100%',
    height: 130,
    borderRadius: radius.md,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    justifyContent: 'flex-end',
    paddingHorizontal: 9,
    paddingBottom: 8,
  },
  yearBarPair: {
    height: 112,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  yearBarPerfume: {
    width: 12,
    borderTopLeftRadius: radius.pill,
    borderTopRightRadius: radius.pill,
    backgroundColor: colors.petroleum,
  },
  yearBarDecant: {
    width: 12,
    borderTopLeftRadius: radius.pill,
    borderTopRightRadius: radius.pill,
    backgroundColor: colors.amber,
  },
  yearBarLabel: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '900',
    marginTop: 6,
  },
  yearBarValue: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  chartLegendRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  chartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendPerfume: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.petroleum,
  },
  legendDecant: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.amber,
  },
  chartLegendText: {
    color: colors.textMuted,
    fontSize: 12,
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
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: 'rgba(22, 50, 58, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleMetricMuted: {
    flex: 1,
    aspectRatio: 1.65,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(166, 106, 53, 0.25)',
    backgroundColor: 'rgba(166, 106, 53, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circlePercent: {
    color: colors.text,
    fontSize: 24,
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
    backgroundColor: colors.field,
  },
  stackedFillGold: {
    backgroundColor: colors.petroleum,
  },
  stackedFillSuccess: {
    backgroundColor: colors.amber,
  },
  stockRow: {
    minHeight: 66,
    borderRadius: radius.lg,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.md,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stockRowEmpty: {
    backgroundColor: colors.dangerSurface,
    borderColor: colors.dangerLine,
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    backgroundColor: colors.petroleum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeEmpty: {
    backgroundColor: colors.danger,
  },
  rankBadgeText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
  rowTextGroup: {
    flex: 1,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  rowSubtext: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  rowValue: {
    color: colors.amber,
    fontSize: 14,
    fontWeight: '900',
  },
  stockSignal: {
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stockSignalEmpty: {
    borderColor: colors.dangerLine,
  },
  stockSignalText: {
    color: colors.petroleum,
    fontSize: 10,
    fontWeight: '900',
  },
  rankingCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.md,
    marginBottom: 8,
    flexDirection: 'row',
    gap: spacing.md,
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
    backgroundColor: colors.field,
    overflow: 'hidden',
    marginBottom: 4,
  },
  slimFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.petroleum,
  },
  inventoryCard: {
    minHeight: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.md,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
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
    fontSize: 15,
    fontWeight: '900',
  },
  inventoryBottle: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: 13,
    lineHeight: 19,
  },
  messageBox: {
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
  },
});
