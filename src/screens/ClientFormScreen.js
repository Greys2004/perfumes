import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import { colors, radius, spacing, shadow } from '../theme';
import { createClient, updateClient } from '../services/clientsService';

const initialForm = {
  nombre: '',
  telefono: '',
  email: '',
  notas: '',
};

function getInitialForm(client) {
  if (!client) {
    return initialForm;
  }

  return {
    nombre: client.nombre || '',
    telefono: client.telefono || '',
    email: client.email || '',
    notas: client.notas || '',
  };
}

export default function ClientFormScreen({ navigation, route }) {
  const editingClient = route.params?.client;
  const [form, setForm] = useState(getInitialForm(editingClient));
  const [saving, setSaving] = useState(false);

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function getInitials() {
    if (!form.nombre.trim()) return 'CP';
    const parts = form.nombre.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  async function handleSave() {
    if (!form.nombre.trim()) {
      Alert.alert('Falta el nombre', 'Escribe el nombre del cliente antes de guardar.');
      return;
    }

    try {
      setSaving(true);
      if (editingClient) {
        await updateClient(editingClient.id, form);
      } else {
        await createClient(form);
      }
      setForm(initialForm);
      navigation.goBack();
    } catch (firebaseError) {
      Alert.alert('No se pudo guardar el cliente', firebaseError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card with Dynamic Initials Badge */}
        <View style={styles.headerBlock}>
          <LinearGradient
            colors={['#1B3C45', '#10272F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarRing}
          >
            <View style={styles.avatarInner}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
          </LinearGradient>
          <Text style={styles.kicker}>
            {editingClient ? 'INFORMACIÓN DE CONTACTO' : 'NUEVO CLIENTE'}
          </Text>
          <Text style={styles.title}>
            {editingClient ? 'Actualizar Cliente' : 'Registrar Cliente'}
          </Text>
          <Text style={styles.subtitle}>
            Organiza datos de contacto y gustos sensoriales para ofrecer una experiencia de alta perfumería impecable.
          </Text>
        </View>

        {/* Section 1: Identidad Personal */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBadge}>
              <Feather name="user" size={15} color={colors.amber} />
            </View>
            <Text style={styles.sectionTitle}>Identidad del Cliente</Text>
          </View>

          <FormInput
            label="Nombre Completo *"
            value={form.nombre}
            onChangeText={(value) => updateField('nombre', value)}
            placeholder="Ej. Ana Victoria López"
            leftIcon="user-check"
          />
        </View>

        {/* Section 2: Canales de Comunicación */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBadge}>
              <Feather name="phone-call" size={15} color={colors.gold} />
            </View>
            <Text style={styles.sectionTitle}>Canales de Contacto</Text>
          </View>

          <FormInput
            label="Teléfono Móvil (WhatsApp)"
            value={form.telefono}
            onChangeText={(value) => updateField('telefono', value)}
            placeholder="Ej. 55 1234 5678"
            keyboardType="phone-pad"
            leftIcon="phone"
            helperText="Se utilizará para confirmar pedidos y recordatorios de entrega."
          />

          <FormInput
            label="Correo Electrónico"
            value={form.email}
            onChangeText={(value) => updateField('email', value)}
            placeholder="Ej. anavictoria@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail"
          />
        </View>

        {/* Section 3: Notas & Preferencias Sensoriales */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBadge}>
              <Feather name="heart" size={15} color={colors.rose} />
            </View>
            <Text style={styles.sectionTitle}>Preferencias & Notas Sensoriales</Text>
          </View>

          <FormInput
            label="Gustos Olfativos & Acuerdos Predilectos"
            value={form.notas}
            onChangeText={(value) => updateField('notas', value)}
            placeholder="Ej. Predilección por notas ambarinas, vainilla de Madagascar o maderas nobles; detalles de dirección de entrega..."
            multiline
            helperText="Notas de preferencias o gustos en fragancias."
          />
        </View>

        {/* Action Button */}
        <View style={styles.actionWrapper}>
          <PrimaryButton
            title={
              saving
                ? 'Guardando Cliente...'
                : editingClient
                  ? 'Guardar Modificaciones'
                  : 'Registrar Cliente'
            }
            onPress={handleSave}
            disabled={saving}
            loading={saving}
            icon={editingClient ? 'check-circle' : 'plus-circle'}
            variant="primary"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  headerBlock: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: 8,
  },
  avatarRing: {
    width: 66,
    height: 66,
    borderRadius: radius.pill,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(166, 136, 100, 0.45)',
    ...shadow.glow,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: '#16323A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#F4F1EA',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  kicker: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subtitle: {
    color: colors.textSubtle,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  sectionCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.28)',
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionIconBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(166, 136, 100, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  actionWrapper: {
    marginTop: spacing.sm,
  },
});
