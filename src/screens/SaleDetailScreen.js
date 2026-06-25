import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
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
    fecha_venta: formatDateValue(sale.fecha_venta),
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
      'Se ocultará la venta de pendientes y se restaurará el stock vendido.',
      [
        { text: 'No cancelar', style: 'cancel' },
        {
          text: 'Cancelar venta',
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Ficha de Venta</Text>
      <Text style={styles.title}>{client.nombre}</Text>

      {!!error && (
        <View style={styles.messageBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.panel}>
        {editing ? (
          <>
            <FormInput
              label="Fecha de venta"
              value={form.fecha_venta}
              onChangeText={(value) => updateField('fecha_venta', value)}
              placeholder="AAAA-MM-DD"
            />
            <FormInput
              label="Total de venta"
              value={form.total}
              onChangeText={(value) => updateField('total', value)}
              placeholder="Ej. 180"
              keyboardType="numeric"
            />
            <FormInput
              label="Notas internas"
              value={form.notas}
              onChangeText={(value) => updateField('notas', value)}
              placeholder="Escribe comentarios sobre la venta..."
              multiline
            />
            <View style={{ marginTop: 8 }}>
              <PrimaryButton
                title={saving ? 'Guardando...' : 'Guardar Cambios'}
                onPress={handleSave}
                disabled={saving}
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.breakdownGrid}>
              <Breakdown label="Total Venta" value={`$${sale.total || 0}`} />
              <Breakdown label="Pagado" value={`$${totalPaid}`} color={colors.success} />
              <Breakdown label="Pendiente" value={`$${remaining}`} highlight />
            </View>
            <View style={styles.metaRow}>
              <Feather name="calendar" size={12} color={colors.textSubtle} />
              <Text style={styles.metaText}>
                Registrado: {formatDateValue(sale.fecha_venta)}  ·  Estado: <Text style={{ color: sale.estado_pago === 'liquidado' ? colors.success : colors.gold, fontWeight: '700' }}>{sale.estado_pago?.toUpperCase()}</Text>
              </Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Feather name="shopping-bag" size={16} color={colors.gold} />
          <Text style={styles.panelTitle}>Productos Vendidos</Text>
        </View>
        {groupedDetails.map((detail) => (
          <View key={detail.id} style={styles.rowItem}>
            <View>
              <Text style={styles.rowTitle}>{getPerfumeName(detail.perfume_id)}</Text>
              <Text style={styles.rowText}>
                {detail.cantidad} x {detail.ml_vendidos} ml  ·  {detail.tipo_producto?.replace('_', ' ')}
              </Text>
            </View>
            <Text style={styles.rowValue}>${detail.subtotal || 0}</Text>
          </View>
        ))}
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Feather name="credit-card" size={16} color={colors.gold} />
          <Text style={styles.panelTitle}>Historial de Pagos</Text>
        </View>
        {payments.length === 0 ? (
          <Text style={styles.emptyText}>No hay pagos registrados para esta venta.</Text>
        ) : (
          payments.map((payment) => (
            <View key={payment.id} style={styles.rowItem}>
              <View>
                <Text style={styles.rowTitle}>${payment.monto || 0}</Text>
                <Text style={styles.rowText}>
                  {formatDateValue(payment.fecha_pago)}  ·  {payment.metodo_pago}
                </Text>
              </View>
              {!!payment.notas && <Text style={styles.paymentNote}>{payment.notas}</Text>}
            </View>
          ))
        )}
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          title={editing ? 'Cancelar Edición' : 'Editar Información'}
          onPress={() => setEditing((value) => !value)}
          variant="secondary"
        />
        <View style={{ marginTop: 2 }}>
          <PrimaryButton title="Cancelar Venta (Reactivar Stock)" onPress={handleCancelSale} />
        </View>
      </View>
    </ScrollView>
  );
}

function Breakdown({ label, value, highlight = false, color = colors.text }) {
  return (
    <View style={[styles.breakdownItem, highlight && styles.breakdownHighlight]}>
      <Text style={[styles.breakdownLabel, highlight && styles.breakdownLabelHighlight]}>
        {label}
      </Text>
      <Text style={[styles.breakdownValue, highlight && styles.breakdownValueHighlight, { color: highlight ? colors.ink : color }]}>
        {value}
      </Text>
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
    paddingBottom: 60,
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
    marginBottom: 16,
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
  breakdownGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.sm,
  },
  breakdownItem: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: 10,
  },
  breakdownHighlight: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    ...shadow.glow,
  },
  breakdownLabel: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  breakdownLabelHighlight: {
    color: colors.ink,
    opacity: 0.8,
  },
  breakdownValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  breakdownValueHighlight: {
    fontWeight: '900',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
    paddingHorizontal: 2,
  },
  metaText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '600',
  },
  rowItem: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  rowText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  rowValue: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '800',
  },
  paymentNote: {
    color: colors.textSubtle,
    fontSize: 11,
    fontStyle: 'italic',
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: 13,
  },
  actions: {
    gap: 8,
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
