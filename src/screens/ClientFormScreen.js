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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.kicker}>{editingClient ? 'Edición de Perfil' : 'Registro de Cliente'}</Text>
        <Text style={styles.title}>{editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}</Text>
        <Text style={styles.subtitle}>
          Registra o actualiza la información básica del cliente. El saldo histórico y abonos se calculan de manera autónoma con las ventas y recibos.
        </Text>

        <View style={styles.formPanel}>
          <FormInput
            label="Nombre Completo"
            value={form.nombre}
            onChangeText={(value) => updateField('nombre', value)}
            placeholder="Ej. Ana López"
          />
          <FormInput
            label="Teléfono Móvil"
            value={form.telefono}
            onChangeText={(value) => updateField('telefono', value)}
            placeholder="Ej. 5551234567"
            keyboardType="phone-pad"
          />
          <FormInput
            label="Correo Electrónico"
            value={form.email}
            onChangeText={(value) => updateField('email', value)}
            placeholder="Ej. ana@email.com"
            keyboardType="email-address"
          />
          <FormInput
            label="Notas & Referencias"
            value={form.notas}
            onChangeText={(value) => updateField('notas', value)}
            placeholder="Dirección, fragancias favoritas o comentarios útiles..."
            multiline
          />

          <View style={{ marginTop: spacing.md }}>
            <PrimaryButton
              title={saving ? 'Guardando...' : editingClient ? 'Actualizar Información' : 'Registrar Cliente'}
              onPress={handleSave}
              disabled={saving}
            />
          </View>
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
    paddingBottom: 80,
  },
  kicker: {
    color: colors.gold,
    fontSize: 11,
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
    marginBottom: 6,
  },
  subtitle: {
    color: colors.textSubtle,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  formPanel: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    ...shadow.card,
  },
});
