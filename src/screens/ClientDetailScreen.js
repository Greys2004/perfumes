import { useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import AnimatedPressable from '../components/AnimatedPressable';
import PrimaryButton from '../components/PrimaryButton';
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* VIP Client Hero Sanctuary */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.avatarCrest}>
            <Text style={styles.avatarLetter}>
              {client.nombre?.charAt(0).toUpperCase() || 'C'}
            </Text>
          </View>
          <View style={styles.heroTitles}>
            <View style={styles.badgeRow}>
              <Text style={styles.kicker}>CLIENTE</Text>
              <View style={styles.vipTag}>
                <Text style={styles.vipTagText}>VIP</Text>
              </View>
            </View>
            <Text style={styles.clientName}>{client.nombre}</Text>
          </View>
        </View>

        <View style={styles.contactContainer}>
          {!!client.telefono && (
            <View style={styles.contactItem}>
              <View style={styles.contactIconWrap}>
                <Feather name="phone" size={13} color={colors.gold} />
              </View>
              <Text style={styles.contactValue}>{client.telefono}</Text>
            </View>
          )}
          {!!client.email && (
            <View style={styles.contactItem}>
              <View style={styles.contactIconWrap}>
                <Feather name="mail" size={13} color={colors.gold} />
              </View>
              <Text style={styles.contactValue}>{client.email}</Text>
            </View>
          )}
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.heroActionsRow}>
          <AnimatedPressable
            onPress={() => navigation.navigate('SaleForm', { clientId: client.id })}
            style={styles.actionBtnPrimary}
            scaleTo={0.94}
          >
            <Feather name="plus-circle" size={14} color={colors.white} />
            <Text style={styles.actionBtnPrimaryText}>Nueva Venta</Text>
          </AnimatedPressable>

          {!!client.telefono && (
            <AnimatedPressable
              onPress={() => {
                const clean = client.telefono.replace(/[^0-9]/g, '');
                Linking.openURL(`https://wa.me/${clean}`);
              }}
              style={styles.actionBtnWhatsApp}
              scaleTo={0.94}
            >
              <Feather name="message-circle" size={14} color="#128C7E" />
              <Text style={styles.actionBtnWhatsAppText}>WhatsApp</Text>
            </AnimatedPressable>
          )}

          <AnimatedPressable
            onPress={() => navigation.navigate('ClientForm', { client })}
            style={styles.actionBtnSecondary}
            scaleTo={0.94}
          >
            <Feather name="edit-2" size={14} color={colors.petroleum} />
            <Text style={styles.actionBtnSecondaryText}>Editar Datos</Text>
          </AnimatedPressable>
        </View>
      </View>

      {!!error && (
        <View style={styles.messageBox}>
          <Feather name="alert-circle" size={16} color={colors.rose} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Financial Health Balance Ledger */}
      <View style={styles.metricsRail}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>TOTAL COMPRADO</Text>
          <Text style={styles.metricValue}>${account.totalComprado}</Text>
          <Text style={styles.metricSub}>{sales.length} adquisiciones</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>TOTAL ABONADO</Text>
          <Text style={[styles.metricValue, { color: colors.success }]}>
            ${account.totalPagado}
          </Text>
          <Text style={styles.metricSub}>{payments.length} abonos</Text>
        </View>

        <View
          style={[
            styles.metricCard,
            account.deuda > 0 && styles.metricCardHighlight,
          ]}
        >
          <Text
            style={[
              styles.metricLabel,
              account.deuda > 0 && { color: colors.rose },
            ]}
          >
            SALDO PENDIENTE
          </Text>
          <Text
            style={[
              styles.metricValue,
              { color: account.deuda > 0 ? colors.rose : colors.success },
            ]}
          >
            ${account.deuda}
          </Text>
          <Text style={styles.metricSub}>
            {account.deuda > 0 ? 'Cuenta activa' : 'Al corriente'}
          </Text>
        </View>
      </View>

      {/* Sales History Section */}
      <View style={styles.luxuryPanel}>
        <View style={styles.panelHeader}>
          <Feather name="shopping-bag" size={16} color={colors.gold} />
          <Text style={styles.panelTitle}>Historial de Compras</Text>
        </View>

        {sales.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Aún no hay compras registradas para este cliente.
            </Text>
          </View>
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
              style={styles.saleItemCard}
              scaleTo={0.98}
            >
              <View style={styles.saleItemTop}>
                <View style={styles.saleItemLeft}>
                  <Text style={styles.saleTotal}>${sale.total || 0}</Text>
                  <Text style={styles.salePerfumes}>{getSalePerfumeNames(sale.id)}</Text>
                </View>

                <View
                  style={[
                    styles.saleBadge,
                    {
                      backgroundColor:
                        sale.estado_pago === 'liquidado'
                          ? 'rgba(95, 175, 139, 0.2)'
                          : sale.estado_pago === 'parcial'
                            ? 'rgba(166, 106, 53, 0.25)'
                            : 'rgba(201, 151, 152, 0.25)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.saleBadgeText,
                      {
                        color:
                          sale.estado_pago === 'liquidado'
                            ? colors.success
                            : sale.estado_pago === 'parcial'
                              ? colors.amber
                              : colors.danger,
                      },
                    ]}
                  >
                    {sale.estado_pago?.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.saleItemBottom}>
                <View style={styles.saleMetaItem}>
                  <Feather name="calendar" size={11} color={colors.textSubtle} />
                  <Text style={styles.saleMetaText}>{formatDateValue(sale.fecha_venta)}</Text>
                </View>
                <Feather name="chevron-right" size={15} color={colors.gold} />
              </View>
            </AnimatedPressable>
          ))
        )}
      </View>

      {/* Notes & Olfactory Preferences */}
      {!!client.notas && (
        <View style={styles.luxuryPanel}>
          <View style={styles.panelHeader}>
            <Feather name="feather" size={16} color={colors.gold} />
            <Text style={styles.panelTitle}>Notas & Preferencias Olfativas</Text>
          </View>
          <View style={styles.notesBox}>
            <Text style={styles.notesContent}>{client.notas}</Text>
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
    paddingBottom: 110,
  },
  heroCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  avatarCrest: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: colors.petroleum,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.amber,
  },
  avatarLetter: {
    color: colors.gold,
    fontSize: 26,
    fontWeight: '900',
  },
  heroTitles: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  kicker: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  vipTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(166, 106, 53, 0.12)',
    borderWidth: 1,
    borderColor: colors.amber,
  },
  vipTagText: {
    color: colors.amber,
    fontSize: 9,
    fontWeight: '900',
  },
  clientName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  contactContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
    marginBottom: 14,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactIconWrap: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(166, 106, 53, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactValue: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  heroActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.petroleum,
    paddingVertical: 10,
    borderRadius: radius.pill,
    ...shadow.card,
  },
  actionBtnPrimaryText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  actionBtnSecondaryText: {
    color: colors.petroleum,
    fontSize: 12,
    fontWeight: '800',
  },
  actionBtnWhatsApp: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(37, 211, 102, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.35)',
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  actionBtnWhatsAppText: {
    color: '#128C7E',
    fontSize: 12,
    fontWeight: '800',
  },
  messageBox: {
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
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  metricsRail: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: 10,
    alignItems: 'center',
  },
  metricCardHighlight: {
    borderColor: colors.dangerLine,
    backgroundColor: colors.dangerSurface,
  },
  metricLabel: {
    color: colors.amber,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  metricSub: {
    color: colors.textSubtle,
    fontSize: 9,
  },
  luxuryPanel: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  emptyState: {
    padding: spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontStyle: 'italic',
  },
  saleItemCard: {
    backgroundColor: colors.field,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: 12,
    marginBottom: 8,
  },
  saleItemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  saleItemLeft: {
    flex: 1,
    marginRight: 8,
  },
  saleTotal: {
    color: colors.amber,
    fontSize: 17,
    fontWeight: '900',
  },
  salePerfumes: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  saleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  saleBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  saleItemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  saleMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saleMetaText: {
    color: colors.textSubtle,
    fontSize: 11,
  },
  notesBox: {
    backgroundColor: colors.field,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: 12,
  },
  notesContent: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
