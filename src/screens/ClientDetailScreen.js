import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  calculateClientAccount,
  listenAllPayments,
  listenSalesByClient,
} from '../services/clientAccountService';
import { listenActivePerfumes } from '../services/perfumesService';
import { formatDateValue } from '../services/purchasesService';
import { listenAllSaleDetails } from '../services/salesService';

export default function ClientDetailScreen({ navigation, route }) {
  const { client } = route.params;

  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [saleDetails, setSaleDetails] = useState([]);
  const [perfumes, setPerfumes] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribeSales = listenSalesByClient(
      client.id,
      setSales,
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
      unsubscribePayments();
      unsubscribeDetails();
      unsubscribePerfumes();
    };
  }, [client.id]);

  const account = useMemo(
    () => calculateClientAccount(sales, payments),
    [sales, payments]
  );

  function getSalePerfumeNames(saleId) {
    const details = saleDetails.filter((detail) => detail.venta_id === saleId);
    const names = details.map((detail) => {
      const perfume = perfumes.find((perfumeItem) => perfumeItem.id === detail.perfume_id);

      return perfume?.nombre || 'Perfume no encontrado';
    });

    return names.length ? names.join(', ') : 'Sin detalle de perfume';
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{client.nombre?.charAt(0) || 'C'}</Text>
        </View>
        <View style={styles.heroInfo}>
          <Text style={styles.kicker}>Cliente</Text>
          <Text style={styles.title}>{client.nombre}</Text>
          <Text style={styles.contactText}>{client.telefono || 'Telefono pendiente'}</Text>
          {!!client.email && <Text style={styles.contactText}>{client.email}</Text>}
        </View>
      </View>

      {!!error && (
        <View style={styles.messageBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.metricsGrid}>
        <MetricCard label="Total comprado" value={`$${account.totalComprado}`} />
        <MetricCard label="Total pagado" value={`$${account.totalPagado}`} />
        <MetricCard label="Debe" value={`$${account.deuda}`} highlight />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Historial de compras</Text>
        {sales.length === 0 ? (
          <Text style={styles.emptyText}>
            Aun no hay ventas registradas para este cliente.
          </Text>
        ) : (
          sales.map((sale) => (
            <Pressable
              key={sale.id}
              onPress={() =>
                navigation.navigate('SaleDetail', {
                  sale,
                  client,
                })
              }
              style={({ pressed }) => [styles.saleItem, pressed && styles.saleItemPressed]}
            >
              <View>
                <Text style={styles.saleTitle}>Venta ${sale.total || 0}</Text>
                <Text style={styles.salePerfume}>{getSalePerfumeNames(sale.id)}</Text>
                <Text style={styles.saleText}>
                  {formatDateValue(sale.fecha_venta)} - {sale.estado_pago || 'sin estado'}
                </Text>
              </View>
              <Text style={styles.saleValue}>${sale.total || 0}</Text>
            </Pressable>
          ))
        )}
      </View>

      {!!client.notas && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Notas</Text>
          <Text style={styles.notes}>{client.notas}</Text>
        </View>
      )}
    </ScrollView>
  );
}

function MetricCard({ label, value, highlight = false }) {
  return (
    <View style={[styles.metricCard, highlight && styles.metricHighlight]}>
      <Text style={[styles.metricLabel, highlight && styles.metricLabelHighlight]}>
        {label}
      </Text>
      <Text style={[styles.metricValue, highlight && styles.metricValueHighlight]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#242527',
  },
  content: {
    padding: 18,
    paddingBottom: 34,
  },
  hero: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 8,
    backgroundColor: '#d8ad62',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#1f1f20',
    fontSize: 28,
    fontWeight: '800',
  },
  heroInfo: {
    flex: 1,
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
    marginBottom: 6,
  },
  contactText: {
    color: '#c7c1b7',
    fontSize: 14,
    marginTop: 3,
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
  metricsGrid: {
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    backgroundColor: '#303133',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444446',
    padding: 16,
  },
  metricHighlight: {
    backgroundColor: '#d8ad62',
    borderColor: '#d8ad62',
  },
  metricLabel: {
    color: '#c7c1b7',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricLabelHighlight: {
    color: '#3a2a14',
  },
  metricValue: {
    color: '#f8f4ed',
    fontSize: 26,
    fontWeight: '900',
  },
  metricValueHighlight: {
    color: '#1f1f20',
  },
  panel: {
    backgroundColor: '#303133',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444446',
    padding: 16,
    marginBottom: 14,
  },
  panelTitle: {
    color: '#f8f4ed',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  emptyText: {
    color: '#c7c1b7',
    fontSize: 14,
    lineHeight: 20,
  },
  saleItem: {
    backgroundColor: '#3b3b3d',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  saleItemPressed: {
    opacity: 0.84,
  },
  saleTitle: {
    color: '#f8f4ed',
    fontSize: 15,
    fontWeight: '700',
  },
  saleText: {
    color: '#c7c1b7',
    fontSize: 13,
    marginTop: 4,
  },
  salePerfume: {
    color: '#f0d19a',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '800',
  },
  saleValue: {
    color: '#f0d19a',
    fontSize: 15,
    fontWeight: '800',
  },
  notes: {
    color: '#d7d2ca',
    fontSize: 15,
    lineHeight: 22,
  },
});
