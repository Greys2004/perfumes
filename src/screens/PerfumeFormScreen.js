import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import { createPerfume, updatePerfume, uploadPerfumeImage } from '../services/perfumesService';

const initialForm = {
  nombre: '',
  marca: '',
  imagen: '',
  descripcion_olor: '',
  duracion: '',
  ml_botella_completa: '',
  precio_liverpool: '',
  notas_salida: '',
  notas_corazon: '',
  notas_fondo: '',
};

function getInitialForm(perfume) {
  if (!perfume) {
    return initialForm;
  }

  return {
    nombre: perfume.nombre || '',
    marca: perfume.marca || '',
    imagen: perfume.imagen || '',
    descripcion_olor: perfume.descripcion_olor || '',
    duracion: perfume.duracion || '',
    ml_botella_completa: String(perfume.ml_botella_completa || ''),
    precio_liverpool: String(perfume.precio_liverpool || ''),
    notas_salida: perfume.notas_salida || '',
    notas_corazon: perfume.notas_corazon || '',
    notas_fondo: perfume.notas_fondo || '',
  };
}

export default function PerfumeFormScreen({ navigation, route }) {
  const editingPerfume = route.params?.perfume;
  const [form, setForm] = useState(getInitialForm(editingPerfume));
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galeria para elegir una imagen.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.75,
    });

    if (result.canceled) {
      return;
    }

    try {
      setUploadingImage(true);
      const imageUrl = await uploadPerfumeImage(result.assets[0].uri);
      updateField('imagen', imageUrl);
    } catch (error) {
      Alert.alert('No se pudo subir la imagen', error.message);
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSave() {
    if (!form.nombre.trim()) {
      Alert.alert('Falta el nombre', 'Escribe el nombre del perfume antes de guardar.');
      return;
    }

    try {
      setSaving(true);
      if (editingPerfume) {
        await updatePerfume(editingPerfume.id, form);
      } else {
        await createPerfume(form);
      }
      setForm(initialForm);
      navigation.goBack();
    } catch (error) {
      Alert.alert('No se pudo guardar', error.message);
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
        <Text style={styles.kicker}>{editingPerfume ? 'Editar perfume' : 'Nuevo perfume'}</Text>
        <Text style={styles.title}>Datos principales</Text>
        <Text style={styles.subtitle}>
          Empieza con la informacion basica. Despues, desde el detalle del perfume, podras agregar precios y compras.
        </Text>

        <View style={styles.formPanel}>
          {!!form.imagen && <Image source={{ uri: form.imagen }} style={styles.previewImage} />}
          <PrimaryButton
            title={uploadingImage ? 'Subiendo imagen...' : 'Elegir imagen de galeria'}
            onPress={handlePickImage}
            disabled={uploadingImage}
            variant="secondary"
          />
          <View style={styles.imageSpace} />
          <FormInput
            label="Nombre"
            value={form.nombre}
            onChangeText={(value) => updateField('nombre', value)}
            placeholder="Ej. Sauvage"
          />
          <FormInput
            label="Marca"
            value={form.marca}
            onChangeText={(value) => updateField('marca', value)}
            placeholder="Ej. Dior"
          />
          <FormInput
            label="URL de imagen"
            value={form.imagen}
            onChangeText={(value) => updateField('imagen', value)}
            placeholder="Opcional por ahora"
          />
          <FormInput
            label="Descripcion del olor"
            value={form.descripcion_olor}
            onChangeText={(value) => updateField('descripcion_olor', value)}
            placeholder="Ej. Fresco, citrico, amaderado"
            multiline
          />
          <FormInput
            label="Duracion"
            value={form.duracion}
            onChangeText={(value) => updateField('duracion', value)}
            placeholder="Ej. 8 horas"
          />
          <FormInput
            label="Mililitros botella completa"
            value={form.ml_botella_completa}
            onChangeText={(value) => updateField('ml_botella_completa', value)}
            placeholder="Ej. 100"
            keyboardType="numeric"
          />
          <FormInput
            label="Precio Liverpool"
            value={form.precio_liverpool}
            onChangeText={(value) => updateField('precio_liverpool', value)}
            placeholder="Ej. 3200"
            keyboardType="numeric"
          />
          <FormInput
            label="Notas de salida"
            value={form.notas_salida}
            onChangeText={(value) => updateField('notas_salida', value)}
            placeholder="Ej. Bergamota, pimienta"
          />
          <FormInput
            label="Notas de corazon"
            value={form.notas_corazon}
            onChangeText={(value) => updateField('notas_corazon', value)}
            placeholder="Ej. Lavanda, geranio"
          />
          <FormInput
            label="Notas de fondo"
            value={form.notas_fondo}
            onChangeText={(value) => updateField('notas_fondo', value)}
            placeholder="Ej. Ambar, cedro"
          />

          <PrimaryButton
            title={saving ? 'Guardando...' : editingPerfume ? 'Actualizar perfume' : 'Guardar perfume'}
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
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#1f1f20',
  },
  imageSpace: {
    height: 16,
  },
});
