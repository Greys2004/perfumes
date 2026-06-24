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
        <Text style={styles.kicker}>{editingClient ? 'Editar cliente' : 'Nuevo cliente'}</Text>
        <Text style={styles.title}>Datos de contacto</Text>
        <Text style={styles.subtitle}>
          Aqui solo guardamos informacion del cliente. La deuda se calcula con ventas y pagos.
        </Text>

        <View style={styles.formPanel}>
          <FormInput
            label="Nombre"
            value={form.nombre}
            onChangeText={(value) => updateField('nombre', value)}
            placeholder="Ej. Ana Lopez"
          />
          <FormInput
            label="Telefono"
            value={form.telefono}
            onChangeText={(value) => updateField('telefono', value)}
            placeholder="Ej. 5551234567"
            keyboardType="phone-pad"
          />
          <FormInput
            label="Email"
            value={form.email}
            onChangeText={(value) => updateField('email', value)}
            placeholder="Ej. ana@email.com"
            keyboardType="email-address"
          />
          <FormInput
            label="Notas"
            value={form.notas}
            onChangeText={(value) => updateField('notas', value)}
            placeholder="Preferencias, entregas o detalles importantes"
            multiline
          />

          <PrimaryButton
            title={saving ? 'Guardando...' : editingClient ? 'Actualizar cliente' : 'Guardar cliente'}
            onPress={handleSave}
            disabled={saving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#242527',
  },
  content: {
    padding: 18,
    paddingBottom: 180,
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
    marginBottom: 8,
  },
  subtitle: {
    color: '#c7c1b7',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  formPanel: {
    backgroundColor: '#303133',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444446',
    padding: 16,
  },
});
