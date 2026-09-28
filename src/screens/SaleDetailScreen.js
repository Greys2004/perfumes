import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import CalendarDatePicker, { getLocalDateString } from '../components/CalendarDatePicker';
import { colors, radius, spacing, shadow } from '../theme';
import { listenActivePerfumes } from '../services/perfumesService';
import { formatDateValue } from '../services/purchasesService';
import {
  cancelSale,
  listenAllSaleDetails,
  listenPaymentsBySale,
  updateSaleBasic,
} from '../services/salesService';

export default function SaleDetailScreen({ navigation, route }) {
  const { sale, client } = route.params;
  const [details, setDetails] = useState([]);
  const [payments, setPayments] = useState([]);
  const [perfumes, setPerfumes] = useState([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fecha_venta: formatDateValue(sale.fecha_venta) || getLocalDateString(),
    fecha_pago_promesa: formatDateValue(sale.fecha_pago_promesa) || getLocalDateString(),
    fechas_pago_promesa: Array.isArray(sale.fechas_pago_promesa) ? sale.fechas_pago_promesa : [],
    total: String(sale.total || ''),
    notas: sale.notas || '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribeDetails = listenAllSaleDetails(
      (items) => setDetails(items.filter((detail) => detail.venta_id === sale.id)),
      (firebaseError) => setError(firebaseError.message)
    );
    const unsubscribePayments = listenPaymentsBySale(
      sale.id,
      setPayments,
      (firebaseError) => setError(firebaseError.message)
    );
    const unsubscribePerfumes = listenActivePerfumes(
      setPerfumes,
      (firebaseError) => setError(firebaseError.message)
    );

    return () => {
      unsubscribeDetails();
      unsubscribePayments();
      unsubscribePerfumes();
    };
  }, [sale.id]);

  const totalPaid = payments.reduce((sum, payment) => sum + (Number(payment.monto) || 0), 0);
  const remaining = (Number(form.total) || Number(sale.total) || 0) - totalPaid;
  const groupedDetails = useMemo(() => {
    const grouped = details.reduce((summary, detail) => {
      const key = `${detail.perfume_id}-${detail.tipo_producto}`;
      const current = summary[key] || {
        ...detail,
        ml_vendidos: 0,
        cantidad: 0,
        subtotal: 0,
      };

      return {
        ...summary,
        [key]: {
          ...current,
          ml_vendidos: current.ml_vendidos + (Number(detail.ml_vendidos) || 0),
          cantidad: current.cantidad + (Number(detail.cantidad) || 0),
          subtotal: current.subtotal + (Number(detail.subtotal) || 0),
        },
      };
    }, {});

    return Object.values(grouped);
  }, [details]);

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function getPerfumeName(perfumeId) {
    const perfume = perfumes.find((perfumeItem) => perfumeItem.id === perfumeId);
    return perfume?.nombre || 'Perfume no encontrado';
  }

  async function handleSave() {
    try {
      setSaving(true);
      await updateSaleBasic(sale.id, form);
      setEditing(false);
    } catch (firebaseError) {
      Alert.alert('No se pudo actualizar', firebaseError.message);
    } finally {
      setSaving(false);
    }
  }

  function handleCancelSale() {
    Alert.alert(
      'Cancelar venta',
      'Se restaurará el stock vendido en los lotes correspondientes y se ocultará la venta.',
      [
        { text: 'Mantener venta', style: 'cancel' },
        {
          text: 'Sí, Cancelar Venta',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelSale(sale.id);
              navigation.goBack();
            } catch (firebaseError) {
              Alert.alert('No se pudo cancelar', firebaseError.message);
            }
          },
        },
      ]
    );
  }

  function handleShareTicketWhatsApp() {
    const clientName = client?.nombre || 'Cliente';
    const phone = client?.telefono ? client.telefono.replace(/[^0-9]/g, '') : '';
    const date = formatDateValue(sale.fecha_venta);

    const itemsText = groupedDetails
      .map((item) => {
        const pName = getPerfumeName(item.perfume_id);
        const tipo = item.tipo_producto ? item.tipo_producto.replace('_', ' ') : 'perfume';
        return `• ${item.cantidad}x ${pName} (${tipo}, ${item.ml_vendidos}ml) - $${item.subtotal || 0} MXN`;
      })
      .join('\n');

    const statusText =
      sale.estado_pago === 'liquidado'
        ? '✨ *Estado:* Liquidado completamente'
        : `⏳ *Saldo Pendiente:* $${remaining} MXN`;

    const text = `*COMPROBANTE DE VENTA · AROMAORIGEN*
📅 *Fecha:* ${date}
👤 *Cliente:* ${clientName}

📦 *Artículos:*
${itemsText}

💰 *Total Venta:* $${sale.total || 0} MXN
💳 *Abonado:* $${totalPaid} MXN
${statusText}

¡Agradecemos mucho tu preferencia!`;

    const encoded = encodeURIComponent(text);
    if (phone) {
      Linking.openURL(`https://wa.me/${phone}?text=${encoded}`);
    } else {
      Linking.openURL(`https://wa.me/?text=${encoded}`);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Official Certificate / Invoice Hero */}
      <View style={styles.invoiceHeroCard}>
        <View style={styles.invoiceHeroTop}>
          <View style={styles.crestBadge}>
            <Feather name="file-text" size={20} color={colors.gold} />
          </View>
          <View style={styles.invoiceHeroTitleGroup}>
            <Text style={styles.kicker}>COMPROBANTE DE VENTA</Text>
            <Text style={styles.clientTitle}>{client.nombre}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
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
                styles.statusBadgeText,
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

        <View style={styles.invoiceHeroMeta}>
          <View style={styles.metaItem}>
            <Feather name="calendar" size={12} color={colors.gold} />
            <Text style={styles.metaItemText}>
              Fecha: {formatDateValue(sale.fecha_venta)}
            </Text>
          </View>
          {!!sale.fecha_pago_promesa &&
            (sale.estado_pago === 'pendiente' || sale.estado_pago === 'parcial') && (
              <View style={styles.metaItem}>
                <Feather name="clock" size={12} color={colors.amber} />
                <Text style={[styles.metaItemText, { color: colors.amber }]}>
                  Promesa: {formatDateValue(sale.fecha_pago_promesa)}
                </Text>
              </View>
            )}
        </View>
      </View>

      {!!error && (
        <View style={styles.errorAlert}>
          <Feather name="alert-circle" size={16} color={colors.rose} />
          <Text style={styles.errorAlertText}>{error}</Text>
        </View>
      )}

      {/* Financial Health Summary Cards */}
      <View style={styles.financialRail}>
        <View style={styles.financialCard}>
          <Text style={styles.financialLabel}>TOTAL VENTA</Text>
          <Text style={styles.financialValue}>${sale.total || 0}</Text>
          <Text style={styles.financialSub}>Monto acordado</Text>
        </View>

        <View style={styles.financialCard}>
          <Text style={styles.financialLabel}>TOTAL ABONADO</Text>
          <Text style={[styles.financialValue, { color: colors.success }]}>
            ${totalPaid}
          </Text>
          <Text style={styles.financialSub}>{payments.length} abonos</Text>
        </View>

        <View
          style={[
            styles.financialCard,
            remaining > 0 && styles.financialCardDebt,
          ]}
        >
          <Text
            style={[
              styles.financialLabel,
              remaining > 0 && { color: colors.rose },
            ]}
          >
            SALDO RESTANTE
          </Text>
          <Text
            style={[
              styles.financialValue,
              { color: remaining > 0 ? colors.rose : colors.success },
            ]}
          >
            ${remaining}
          </Text>
          <Text style={styles.financialSub}>
            {remaining > 0 ? 'Por liquidar' : 'Saldado'}
          </Text>
        </View>
      </View>

      {/* Editable Form Panel if active */}
      {editing && (
        <View style={styles.editPanel}>
          <View style={styles.editPanelHeader}>
            <Feather name="edit-3" size={16} color={colors.gold} />
            <Text style={styles.editPanelTitle}>Editar Ficha de Venta</Text>
          </View>

          <CalendarDatePicker
            label="Fecha de Venta"
            value={form.fecha_venta}
            onChange={(val) => updateField('fecha_venta', val)}
          />

          {(sale.estado_pago === 'pendiente' || sale.estado_pago === 'parcial') && (
            <CalendarDatePicker
              label="Fecha Prometida de Pago"
              value={form.fecha_pago_promesa}
              onChange={(val) => updateField('fecha_pago_promesa', val)}
            />
          )}

          <FormInput
            label="Monto Total ($ MXN)"
            value={form.total}
            onChangeText={(val) => updateField('total', val)}
            placeholder="Ej. 180"
            keyboardType="numeric"
          />

          <FormInput
            label="Notas Internas de la Venta"
            value={form.notas}
            onChangeText={(val) => updateField('notas', val)}
            placeholder="Comentarios de entrega o abonos..."
            multiline
          />

          <View style={{ marginTop: 8 }}>
            <PrimaryButton
              title={saving ? 'Guardando Cambios...' : 'Confirmar Cambios'}
              onPress={handleSave}
              disabled={saving}
              variant="amber"
            />
          </View>
        </View>
      )}

      {/* Sold Products Catalog Section */}
      <View style={styles.luxuryPanel}>
        <View style={styles.panelHeader}>
          <Feather name="package" size={16} color={colors.gold} />
          <Text style={styles.panelTitle}>Artículos Seleccionados ({groupedDetails.length})</Text>
        </View>

        {groupedDetails.map((detail) => (
          <View key={detail.id} style={styles.productCard}>
            <View style={styles.productIconWrap}>
              <Feather name="droplet" size={16} color={colors.gold} />
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productPerfumeName}>
                {getPerfumeName(detail.perfume_id)}
              </Text>
              <Text style={styles.productSub}>
                {detail.cantidad} unid. × {detail.ml_vendidos} ml ·{' '}
                {detail.tipo_producto?.replace('_', ' ')}
              </Text>
            </View>
            <Text style={styles.productSubtotal}>${detail.subtotal || 0}</Text>
          </View>
        ))}
      </View>

      {/* Payment History Section */}
      <View style={styles.luxuryPanel}>
        <View style={styles.panelHeader}>
          <Feather name="credit-card" size={16} color={colors.gold} />
          <Text style={styles.panelTitle}>Historial de Abonos Recibidos</Text>
        </View>

        {payments.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No se han registrado abonos para esta venta aún.
            </Text>
          </View>
        ) : (
          payments.map((payment) => (
            <View key={payment.id} style={styles.paymentCard}>
              <View style={styles.paymentTop}>
                <View style={styles.paymentAmountGroup}>
                  <Text style={styles.paymentAmount}>+${payment.monto || 0}</Text>
                  <Text style={styles.paymentMethodBadge}>
                    {payment.metodo_pago?.toUpperCase() || 'PAGO DIRECTO'}
                  </Text>
                </View>
                <Text style={styles.paymentDate}>
                  {formatDateValue(payment.fecha_pago)}
                </Text>
              </View>
              {!!payment.notas && (
                <Text style={styles.paymentNotes}>Nota: {payment.notas}</Text>
              )}
            </View>
          ))
        )}
      </View>

      {/* WhatsApp Share Ticket Button */}
      <View style={{ marginBottom: 12 }}>
        <PrimaryButton
          title="Compartir Comprobante por WhatsApp"
          onPress={handleShareTicketWhatsApp}
          icon="message-circle"
          variant="amber"
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsBlock}>
        <PrimaryButton
          title={editing ? 'Cerrar Edición' : 'Editar Información de Venta'}
          onPress={() => setEditing((val) => !val)}
          variant="outline"
        />
        <View style={{ marginTop: 10 }}>
          <PrimaryButton
            title="Cancelar Venta (Reactivar Stock en Lotes)"
            onPress={handleCancelSale}
            variant="danger"
          />
        </View>
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
    paddingBottom: 160,
  },
  invoiceHeroCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  invoiceHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  crestBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(166, 106, 53, 0.1)',
    borderWidth: 1.5,
    borderColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceHeroTitleGroup: {
    flex: 1,
  },
  kicker: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  clientTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  invoiceHeroMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaItemText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '600',
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
  financialRail: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  financialCard: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: 10,
    alignItems: 'center',
  },
  financialCardDebt: {
    borderColor: colors.dangerLine,
    backgroundColor: colors.dangerSurface,
  },
  financialLabel: {
    color: colors.amber,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  financialValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  financialSub: {
    color: colors.textSubtle,
    fontSize: 9,
  },
  editPanel: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  editPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  editPanelTitle: {
    color: colors.amber,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
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
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.field,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: 12,
    marginBottom: 8,
  },
  productIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(166, 106, 53, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  productInfo: {
    flex: 1,
  },
  productPerfumeName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  productSub: {
    color: colors.textSubtle,
    fontSize: 11,
    marginTop: 2,
  },
  productSubtotal: {
    color: colors.amber,
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 8,
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
  paymentCard: {
    backgroundColor: colors.field,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: 12,
    marginBottom: 8,
  },
  paymentTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentAmountGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentAmount: {
    color: colors.success,
    fontSize: 16,
    fontWeight: '900',
  },
  paymentMethodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.xs,
    backgroundColor: 'rgba(166, 106, 53, 0.1)',
    color: colors.petroleum,
    fontSize: 9,
    fontWeight: '900',
  },
  paymentDate: {
    color: colors.textSubtle,
    fontSize: 11,
  },
  paymentNotes: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 6,
  },
  actionsBlock: {
    marginTop: spacing.md,
  },
});
