import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';

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

export default function DashboardScreen() {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

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
  const maxMoney = Math.max(
    dashboard.totalVendido,
    dashboard.totalPagado,
    dashboard.deudaClientes,
    Math.abs(dashboard.gananciaVendida),
    Math.abs(dashboard.gananciaCobrada),
    Math.abs(dashboard.gastadoMenosPagado),
    1
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Dashboard</Text>
      <Text style={styles.title}>Resumen</Text>
      <Text style={styles.subtitle}>
        Una vista clara de dinero, cobranza e inventario disponible.
      </Text>

      {!!error && (
        <View style={styles.messageBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={styles.metricsGrid}>
          <MetricCard label="Total gastado" value={`$${dashboard.totalGastado}`} />
          <MetricCard label="Total vendido" value={`$${dashboard.totalVendido}`} />
          <MetricCard label="Total pagado" value={`$${dashboard.totalPagado}`} />
          <MetricCard label="Deben clientes" value={`$${dashboard.deudaClientes}`} />
          <MetricCard label="Ganancia por ventas" value={`$${dashboard.gananciaVendida}`} highlight />
          <MetricCard label="Ganancia cobrada" value={`$${dashboard.gananciaCobrada}`} highlight />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Dinero</Text>
          <BarRow label="Vendido" value={dashboard.totalVendido} maxValue={maxMoney} />
          <BarRow label="Pagado" value={dashboard.totalPagado} maxValue={maxMoney} />
          <BarRow label="Deuda" value={dashboard.deudaClientes} maxValue={maxMoney} muted />
          <BarRow label="Ganancia vendida" value={dashboard.gananciaVendida} maxValue={maxMoney} />
          <BarRow label="Ganancia cobrada" value={dashboard.gananciaCobrada} maxValue={maxMoney} muted />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>5 perfumes con menos stock</Text>
          {dashboard.perfumesMenosStock.length === 0 ? (
            <Text style={styles.emptyText}>Aun no hay inventario registrado.</Text>
          ) : (
            dashboard.perfumesMenosStock.map((perfumeStock) => (
              <InventoryRow key={perfumeStock.perfume_id} item={perfumeStock} />
            ))
          )}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Inventario por perfume</Text>
          {dashboard.inventarioPorPerfume.length === 0 ? (
            <Text style={styles.emptyText}>Aun no hay inventario registrado.</Text>
          ) : (
            dashboard.inventarioPorPerfume.map((perfumeStock) => (
              <InventoryRow key={perfumeStock.perfume_id} item={perfumeStock} />
            ))
          )}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Perfumes mas vendidos</Text>
          {dashboard.perfumesMasVendidos.length === 0 ? (
            <Text style={styles.emptyText}>Aun no hay ventas para calcular este ranking.</Text>
          ) : (
            dashboard.perfumesMasVendidos.map((perfume) => (
              <View key={perfume.perfume_id} style={styles.rankingItem}>
                <View style={styles.rankingHeader}>
                  <Text style={styles.rowTitle}>{perfume.nombre}</Text>
                  <Text style={styles.rowValue}>${perfume.total_vendido}</Text>
                </View>
                <BarRow
                  label={`${perfume.ml_vendidos} ml`}
                  value={perfume.ml_vendidos}
                  maxValue={dashboard.perfumesMasVendidos[0]?.ml_vendidos || 1}
                  compact
                />
              </View>
            ))
          )}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

function MetricCard({ label, value, highlight = false }) {
  const isNegative = String(value).includes('$-');

  return (
    <View style={[styles.metricCard, highlight && styles.metricHighlight]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, isNegative && styles.negativeValue]}>{value}</Text>
    </View>
  );
}

function InventoryRow({ item }) {
  const bottles = Number(item.botellas_restantes || 0).toFixed(2);
  const isEmpty = Number(item.ml_restantes) <= 0;

  return (
    <View style={[styles.rowItem, isEmpty && styles.rowItemEmpty]}>
      <View style={styles.rowTextGroup}>
        <Text style={styles.rowTitle}>{item.nombre}</Text>
        <Text style={styles.rowSubtext}>
          {item.ml_restantes} ml disponibles
        </Text>
      </View>
      <View style={styles.stockBadge}>
        <Text style={styles.stockBadgeValue}>{bottles}</Text>
        <Text style={styles.stockBadgeLabel}>botellas</Text>
      </View>
    </View>
  );
}

function BarRow({ label, value, maxValue, muted = false, compact = false }) {
  const numericValue = Number(value) || 0;
  const isNegative = numericValue < 0;
  const safeValue = Math.max(Math.abs(numericValue), 0);
  const safeMax = Math.max(Number(maxValue) || 1, 1);
  const width = `${Math.min((safeValue / safeMax) * 100, 100)}%`;

  return (
    <View style={compact ? styles.barRowCompact : styles.barRow}>
      <View style={styles.barLabelRow}>
        <Text style={styles.barLabel}>{label}</Text>
        {!compact && (
          <Text style={[styles.barValue, isNegative && styles.negativeValue]}>
            ${value}
          </Text>
        )}
      </View>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            muted && styles.barFillMuted,
            isNegative && styles.barFillNegative,
            { width },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18191c',
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  kicker: {
    color: '#d8ad62',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  title: {
    color: '#f8f4ed',
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: '#c7c1b7',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  metricsGrid: {
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    backgroundColor: '#25262a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3d3e42',
    padding: 16,
  },
  metricHighlight: {
    backgroundColor: '#2f2b24',
    borderColor: '#5d4a2d',
  },
  metricLabel: {
    color: '#c7c1b7',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  metricValue: {
    color: '#f8f4ed',
    fontSize: 28,
    fontWeight: '900',
  },
  negativeValue: {
    color: '#f0a9a0',
  },
  panel: {
    backgroundColor: '#232428',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3d3e42',
    padding: 16,
    marginBottom: 14,
  },
  panelTitle: {
    color: '#f8f4ed',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12,
  },
  emptyText: {
    color: '#c7c1b7',
    fontSize: 14,
    lineHeight: 20,
  },
  rowItem: {
    minHeight: 62,
    backgroundColor: '#2f3035',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3d3e42',
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowItemEmpty: {
    borderColor: '#6b4a43',
    backgroundColor: '#332927',
  },
  rowTextGroup: {
    flex: 1,
  },
  rowTitle: {
    color: '#f8f4ed',
    fontSize: 15,
    fontWeight: '800',
  },
  rowSubtext: {
    color: '#c7c1b7',
    fontSize: 13,
    marginTop: 4,
  },
  rowValue: {
    color: '#f0d19a',
    fontSize: 14,
    fontWeight: '900',
  },
  stockBadge: {
    minWidth: 78,
    borderRadius: 8,
    backgroundColor: '#1f2023',
    borderWidth: 1,
    borderColor: '#514638',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  stockBadgeValue: {
    color: '#f0d19a',
    fontSize: 16,
    fontWeight: '900',
  },
  stockBadgeLabel: {
    color: '#a9a59f',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  rankingItem: {
    backgroundColor: '#2f3035',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  rankingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  barRow: {
    marginBottom: 14,
  },
  barRowCompact: {
    marginBottom: 0,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  barLabel: {
    color: '#f8f4ed',
    fontSize: 13,
    fontWeight: '800',
  },
  barValue: {
    color: '#f0d19a',
    fontSize: 13,
    fontWeight: '900',
  },
  barTrack: {
    height: 10,
    borderRadius: 8,
    backgroundColor: '#18191c',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#d8ad62',
  },
  barFillMuted: {
    backgroundColor: '#7a756c',
  },
  barFillNegative: {
    backgroundColor: '#b8645b',
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
