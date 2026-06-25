import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import MetricCard from '../components/MetricCard';
import AnimatedPressable from '../components/AnimatedPressable';
import { colors, radius, spacing, shadow } from '../theme';
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
          <Text style={styles.avatarText}>{client.nombre?.charAt(0).toUpperCase() || 'C'}</Text>
        </View>
        <View style={styles.heroInfo}>
          <Text style={styles.kicker}>Ficha de Cliente</Text>
          <Text style={styles.title}>{client.nombre}</Text>
          
          {!!client.telefono && (
            <View style={styles.contactRow}>
              <Feather name="phone" size={12} color={colors.gold} />
              <Text style={styles.contactText}>{client.telefono}</Text>
            </View>
          )}
          {!!client.email && (
            <View style={styles.contactRow}>
              <Feather name="mail" size={12} color={colors.textSubtle} />
              <Text style={styles.contactText}>{client.email}</Text>
            </View>
          )}
        </View>
      </View>

      {!!error && (
        <View style={styles.messageBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.metricsGrid}>
        <MetricCard label="Total Comprado" value={`$${account.totalComprado}`} />
        <MetricCard label="Total Abonado" value={`$${account.totalPagado}`} />
        <MetricCard label="Saldo Pendiente" value={`$${account.deuda}`} highlight />
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Feather name="clock" size={16} color={colors.gold} />
          <Text style={styles.panelTitle}>Historial de Compras</Text>
        </View>
        {sales.length === 0 ? (
          <Text style={styles.emptyText}>
            Aún no hay ventas registradas para este cliente.
          </Text>
        ) : (
          sales.map((sale) => (
            <AnimatedPressable
              key={sale.id}
              onPress={() =>
                navigation.navigate('SaleDetail', {
                  sale,
                  client,
                })
              }
              style={styles.saleItem}
              scaleTo={0.98}
            >
              <View style={styles.saleItemBody}>
                <View style={styles.saleTextGroup}>
                  <Text style={styles.saleTitle}>Compra ${sale.total || 0}</Text>
                  <Text style={styles.salePerfume}>{getSalePerfumeNames(sale.id)}</Text>
                  <View style={styles.dateStatusRow}>
                    <Feather name="calendar" size={11} color={colors.textSubtle} />
                    <Text style={styles.saleText}>{formatDateValue(sale.fecha_venta)}</Text>
                    <Text style={styles.dividerDot}>·</Text>
                    <Text style={[styles.saleText, { color: sale.estado_pago === 'liquidado' ? colors.success : colors.gold, fontWeight: '750' }]}>
                      {sale.estado_pago?.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color={colors.textSubtle} />
              </View>
            </AnimatedPressable>
          ))
        )}
      </View>

      {!!client.notas && (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Feather name="file-text" size={16} color={colors.gold} />
            <Text style={styles.panelTitle}>Notas & Preferencias</Text>
          </View>
          <View style={styles.notesContainer}>
            <Text style={styles.notes}>{client.notas}</Text>
          </View>
        </View>
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
    paddingBottom: 34,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.glow,
  },
  avatarText: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '900',
  },
  heroInfo: {
    flex: 1,
  },
  kicker: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  contactText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '600',
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
  metricsGrid: {
    gap: 8,
    marginBottom: spacing.md,
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
    letterSpacing: -0.2,
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: 13,
    lineHeight: 18,
  },
  saleItem: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    marginBottom: 8,
  },
  saleItemBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  saleTextGroup: {
    flex: 1,
  },
  saleTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '850',
  },
  dateStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  saleText: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '600',
  },
  dividerDot: {
    color: colors.textSubtle,
    fontSize: 11,
  },
  salePerfume: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  notesContainer: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
  },
  notes: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
