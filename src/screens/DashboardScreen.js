import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
  { label: 'Dia', value: 'day' },
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

function getPeriodRange(period) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

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

function isInRange(value, range) {
  const date = normalizeDate(value);

  if (!date) {
    return false;
  }

  return date >= range.start && date <= range.end;
}

function getPeriodLabel(period) {
  if (period === 'day') {
    return 'hoy';
  }

  if (period === 'week') {
    return 'esta semana';
  }

  return 'este mes';
}

export default function DashboardScreen() {
  const [data, setData] = useState(initialData);
  const [period, setPeriod] = useState('month');
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
  const periodRange = useMemo(() => getPeriodRange(period), [period]);
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
    };
  }, [data, periodRange]);
  const periodDashboard = useMemo(() => calculateDashboardData(periodData), [periodData]);
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
              <Text style={styles.kicker}>Dashboard</Text>
              <Text style={styles.title}>Control por periodo</Text>
            </View>
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>
                {getPeriodLabel(period)}
              </Text>
            </View>
          </View>

          <View style={styles.periodTabs}>
            {periodOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setPeriod(option.value)}
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

          <View style={styles.heroMain}>
            <Text style={styles.heroLabel}>Vendido {getPeriodLabel(period)}</Text>
            <Text
              style={[
                styles.heroValue,
                periodDashboard.totalVendido < 0 && styles.negativeValue,
              ]}
            >
              ${periodDashboard.totalVendido}
            </Text>
            <Text style={styles.heroNote}>
              Pagado ${periodDashboard.totalPagado} - Ganancia ${periodDashboard.gananciaVendida} - Deuda ${periodDashboard.deudaClientes}
            </Text>
          </View>

          <View style={styles.heroGrid}>
            <MiniStat label="Gastado" value={`$${periodDashboard.totalGastado}`} />
            <MiniStat label="Pagado" value={`$${periodDashboard.totalPagado}`} />
            <MiniStat label="Stock total" value={`${stockTotal} ml`} />
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
          <MetricCard label="Gastado" value={`$${periodDashboard.totalGastado}`} />
          <MetricCard label="Vendido" value={`$${periodDashboard.totalVendido}`} />
          <MetricCard label="Pagado" value={`$${periodDashboard.totalPagado}`} />
          <MetricCard label="Deben" value={`$${periodDashboard.deudaClientes}`} />
          <MetricCard label="G. ventas" value={`$${periodDashboard.gananciaVendida}`} focus />
          <MetricCard label="G. cobrada" value={`$${periodDashboard.gananciaCobrada}`} focus />
        </ScrollView>

        <View style={styles.panel}>
          <SectionHeader title="Mapa del periodo" detail={`resultado de ${getPeriodLabel(period)}`} />
          <MoneyBar label="Vendido" value={periodDashboard.totalVendido} maxValue={maxMoney} />
          <MoneyBar label="Pagado" value={periodDashboard.totalPagado} maxValue={maxMoney} />
          <MoneyBar label="Deuda" value={periodDashboard.deudaClientes} maxValue={maxMoney} muted />
          <MoneyBar label="Ganancia ventas" value={periodDashboard.gananciaVendida} maxValue={maxMoney} />
          <MoneyBar label="Ganancia cobrada" value={periodDashboard.gananciaCobrada} maxValue={maxMoney} muted />
          <MoneyBar label="Gastado - pagado" value={periodDashboard.gastadoMenosPagado} maxValue={maxMoney} muted />
        </View>

        <View style={styles.panel}>
          <SectionHeader title="Riesgo de inventario" detail="5 perfumes con menos stock" />
          {dashboard.perfumesMenosStock.length === 0 ? (
            <Text style={styles.emptyText}>Aun no hay inventario registrado.</Text>
          ) : (
            dashboard.perfumesMenosStock.map((perfumeStock, index) => (
              <StockRow key={perfumeStock.perfume_id} item={perfumeStock} index={index} />
            ))
          )}
        </View>

        <View style={styles.panel}>
          <SectionHeader title="Mas vendidos" detail={`ranking de ${getPeriodLabel(period)}`} />
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
          <SectionHeader title="Inventario completo" detail="ml y botellas por perfume" />
          {dashboard.inventarioPorPerfume.length === 0 ? (
            <Text style={styles.emptyText}>Aun no hay inventario registrado.</Text>
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

function MiniStat({ label, value }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title, detail }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.panelTitle}>{title}</Text>
      <Text style={styles.panelDetail}>{detail}</Text>
    </View>
  );
}

function MetricCard({ label, value, focus = false }) {
  const isNegative = String(value).includes('$-');

  return (
    <View style={[styles.metricCard, focus && styles.metricFocus]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, isNegative && styles.negativeValue]}>{value}</Text>
    </View>
  );
}

function MoneyBar({ label, value, maxValue, muted = false }) {
  const numericValue = Number(value) || 0;
  const isNegative = numericValue < 0;
  const safeValue = Math.abs(numericValue);
  const width = `${Math.min((safeValue / Math.max(maxValue, 1)) * 100, 100)}%`;

  return (
    <View style={styles.moneyRow}>
      <View style={styles.moneyTop}>
        <Text style={styles.moneyLabel}>{label}</Text>
        <Text style={[styles.moneyValue, isNegative && styles.negativeValue]}>${value}</Text>
      </View>
      <View style={styles.moneyTrack}>
        <View
          style={[
            styles.moneyFill,
            muted && styles.moneyFillMuted,
            isNegative && styles.moneyFillNegative,
            { width },
          ]}
        />
      </View>
    </View>
  );
}

function StockRow({ item, index }) {
  const isEmpty = Number(item.ml_restantes) <= 0;
  const bottles = Number(item.botellas_restantes || 0).toFixed(2);

  return (
    <View style={[styles.stockRow, isEmpty && styles.stockRowEmpty]}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankBadgeText}>{index + 1}</Text>
      </View>
      <View style={styles.rowTextGroup}>
        <Text style={styles.rowTitle}>{item.nombre}</Text>
        <Text style={styles.rowSubtext}>{item.ml_restantes} ml - {bottles} botellas</Text>
      </View>
      <View style={styles.stockSignal}>
        <Text style={[styles.stockSignalText, isEmpty && styles.negativeValue]}>
          {isEmpty ? 'Agotado' : 'Bajo'}
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
        <Text style={styles.rowSubtext}>{item.compras_con_stock} compras con stock</Text>
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
    backgroundColor: '#101114',
  },
  content: {
    padding: 16,
    paddingBottom: 42,
  },
  motionWrap: {
    flex: 1,
  },
  hero: {
    minHeight: 270,
    backgroundColor: '#2a211a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#5f4930',
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 28,
  },
  heroTitleBlock: {
    flex: 1,
  },
  kicker: {
    color: '#d9ad69',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 5,
  },
  title: {
    color: '#fff7ef',
    fontSize: 31,
    fontWeight: '900',
  },
  statusChip: {
    minWidth: 104,
    borderRadius: 8,
    backgroundColor: '#161416',
    borderWidth: 1,
    borderColor: '#6d5438',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statusChipText: {
    color: '#d9ad69',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  periodTabs: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#151518',
    borderWidth: 1,
    borderColor: '#4b3a29',
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    marginBottom: 24,
  },
  periodTab: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTabActive: {
    backgroundColor: '#d9ad69',
  },
  periodTabText: {
    color: '#cdbda9',
    fontSize: 13,
    fontWeight: '900',
  },
  periodTabTextActive: {
    color: '#1a1510',
  },
  heroMain: {
    marginBottom: 24,
  },
  heroLabel: {
    color: '#cdbda9',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 6,
  },
  heroValue: {
    color: '#fff7ef',
    fontSize: 46,
    fontWeight: '900',
  },
  heroNote: {
    color: '#cdbda9',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    lineHeight: 19,
  },
  heroGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  miniStat: {
    flex: 1,
    minHeight: 68,
    borderRadius: 8,
    backgroundColor: '#151518',
    borderWidth: 1,
    borderColor: '#4b3a29',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  miniValue: {
    color: '#fff7ef',
    fontSize: 18,
    fontWeight: '900',
  },
  miniLabel: {
    color: '#9f958d',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },
  metricRail: {
    gap: 10,
    paddingBottom: 14,
  },
  metricCard: {
    width: 140,
    minHeight: 96,
    backgroundColor: '#1b1c21',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2d2e35',
    padding: 14,
    justifyContent: 'space-between',
  },
  metricFocus: {
    backgroundColor: '#241f1c',
    borderColor: '#5f4930',
  },
  metricLabel: {
    color: '#a9a39d',
    fontSize: 12,
    fontWeight: '900',
  },
  metricValue: {
    color: '#fff7ef',
    fontSize: 22,
    fontWeight: '900',
  },
  negativeValue: {
    color: '#f0a9a0',
  },
  panel: {
    backgroundColor: '#18191e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2d2e35',
    padding: 14,
    marginBottom: 14,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  panelTitle: {
    color: '#fff7ef',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 3,
  },
  panelDetail: {
    color: '#8f8984',
    fontSize: 12,
    fontWeight: '800',
  },
  moneyRow: {
    marginBottom: 14,
  },
  moneyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  moneyLabel: {
    color: '#fff7ef',
    fontSize: 13,
    fontWeight: '900',
  },
  moneyValue: {
    color: '#d9ad69',
    fontSize: 13,
    fontWeight: '900',
  },
  moneyTrack: {
    height: 12,
    borderRadius: 8,
    backgroundColor: '#101114',
    overflow: 'hidden',
  },
  moneyFill: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#d9ad69',
  },
  moneyFillMuted: {
    backgroundColor: '#80766a',
  },
  moneyFillNegative: {
    backgroundColor: '#b8645b',
  },
  stockRow: {
    minHeight: 72,
    borderRadius: 8,
    backgroundColor: '#202127',
    borderWidth: 1,
    borderColor: '#35343b',
    padding: 12,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stockRowEmpty: {
    backgroundColor: '#2b2020',
    borderColor: '#714943',
  },
  rankBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#d9ad69',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    color: '#1a1510',
    fontSize: 15,
    fontWeight: '900',
  },
  rowTextGroup: {
    flex: 1,
  },
  rowTitle: {
    color: '#fff7ef',
    fontSize: 15,
    fontWeight: '900',
  },
  rowSubtext: {
    color: '#a9a39d',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  rowValue: {
    color: '#d9ad69',
    fontSize: 13,
    fontWeight: '900',
  },
  stockSignal: {
    borderRadius: 8,
    backgroundColor: '#111216',
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  stockSignalText: {
    color: '#d9ad69',
    fontSize: 11,
    fontWeight: '900',
  },
  rankingCard: {
    borderRadius: 8,
    backgroundColor: '#202127',
    borderWidth: 1,
    borderColor: '#35343b',
    padding: 12,
    marginBottom: 9,
    flexDirection: 'row',
    gap: 12,
  },
  rankingBody: {
    flex: 1,
  },
  rankingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 9,
  },
  slimTrack: {
    height: 8,
    borderRadius: 8,
    backgroundColor: '#101114',
    overflow: 'hidden',
  },
  slimFill: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#d9ad69',
  },
  inventoryCard: {
    minHeight: 68,
    borderRadius: 8,
    backgroundColor: '#202127',
    borderWidth: 1,
    borderColor: '#35343b',
    padding: 12,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  inventoryCardEmpty: {
    backgroundColor: '#2b2020',
    borderColor: '#714943',
  },
  inventoryNumbers: {
    alignItems: 'flex-end',
  },
  inventoryMl: {
    color: '#fff7ef',
    fontSize: 15,
    fontWeight: '900',
  },
  inventoryBottle: {
    color: '#d9ad69',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 3,
  },
  emptyText: {
    color: '#a9a39d',
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
