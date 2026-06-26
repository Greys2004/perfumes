import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';

import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import { colors, radius, spacing, shadow } from '../theme';
import { createPerfume, updatePerfume } from '../services/perfumesService';
import { subirImagenACloudinary } from '../services/imageService';

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
  const [imagenLocal, setImagenLocal] = useState('');
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para elegir una imagen.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) {
      return;
    }

    setImagenLocal(result.assets[0].uri);
  }

  async function handleSave() {
    if (!form.nombre.trim()) {
      Alert.alert('Falta el nombre', 'Escribe el nombre del perfume antes de guardar.');
      return;
    }

    try {
      setSaving(true);
      setSubiendoImagen(!!imagenLocal);
      const imageUrl = imagenLocal
        ? await subirImagenACloudinary(imagenLocal)
        : form.imagen.trim();
      const perfumePayload = {
        ...form,
        imagen: imageUrl,
      };

      if (editingPerfume) {
        await updatePerfume(editingPerfume.id, perfumePayload);
      } else {
        await createPerfume(perfumePayload);
      }
      setForm(initialForm);
      setImagenLocal('');
      navigation.goBack();
    } catch (error) {
      Alert.alert('No se pudo guardar', error.message);
    } finally {
      setSaving(false);
      setSubiendoImagen(false);
    }
  }

  const previewUri = imagenLocal || form.imagen;
  const disableActions = saving || subiendoImagen;

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
        <Text style={styles.kicker}>{editingPerfume ? 'Edición de Fragancia' : 'Nueva Fragancia'}</Text>
        <Text style={styles.title}>{editingPerfume ? 'Editar Perfume' : 'Registrar Perfume'}</Text>
        <Text style={styles.subtitle}>
          Ingresa la información básica y descriptores olfativos. Posteriormente, podrás registrar lotes de stock y asignar precios por ml.
        </Text>

        <View style={styles.formPanel}>
          <Pressable
            onPress={handlePickImage}
            disabled={disableActions}
            style={styles.imagePicker}
          >
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <View style={styles.placeholderIcon}>
                  <Feather name="image" size={22} color={colors.ink} />
                </View>
                <Text style={styles.placeholderTitle}>Seleccionar imagen</Text>
                <Text style={styles.placeholderText}>Galeria del telefono</Text>
              </View>
            )}
          </Pressable>
          <PrimaryButton
            title={imagenLocal ? 'Cambiar Imagen Seleccionada' : 'Elegir Imagen de Galeria'}
            onPress={handlePickImage}
            disabled={disableActions}
            variant="secondary"
          />
          <View style={styles.imageSpace} />
          
          <FormInput
            label="Nombre del Perfume"
            value={form.nombre}
            onChangeText={(value) => updateField('nombre', value)}
            placeholder="Ej. Sauvage"
          />
          
          <FormInput
            label="Marca / Diseñador"
            value={form.marca}
            onChangeText={(value) => updateField('marca', value)}
            placeholder="Ej. Dior"
          />
          
          <FormInput
            label="Enlace de Imagen (URL alternativa)"
            value={form.imagen}
            onChangeText={(value) => updateField('imagen', value)}
            placeholder="Enlace web opcional"
          />
          
          <FormInput
            label="Descripción del Aroma"
            value={form.descripcion_olor}
            onChangeText={(value) => updateField('descripcion_olor', value)}
            placeholder="Ej. Fresco, especiado, notas cítricas y amaderadas"
            multiline
          />
          
          <FormInput
            label="Longevidad / Duración estimada"
            value={form.duracion}
            onChangeText={(value) => updateField('duracion', value)}
            placeholder="Ej. 8 a 10 horas"
          />
          
          <FormInput
            label="Capacidad Botella Completa (ml)"
            value={form.ml_botella_completa}
            onChangeText={(value) => updateField('ml_botella_completa', value)}
            placeholder="Ej. 100"
            keyboardType="numeric"
          />
          
          <FormInput
            label="Precio de referencia (Liverpool)"
            value={form.precio_liverpool}
            onChangeText={(value) => updateField('precio_liverpool', value)}
            placeholder="Ej. 3200"
            keyboardType="numeric"
          />

          <View style={styles.formSectionDivider}>
            <Feather name="wind" size={13} color={colors.gold} />
            <Text style={styles.sectionHeading}>Pirámide Olfativa</Text>
          </View>
          
          <FormInput
            label="Notas de Salida (Primer impacto)"
            value={form.notas_salida}
            onChangeText={(value) => updateField('notas_salida', value)}
            placeholder="Ej. Bergamota de Calabria, Pimienta de Sichuan"
          />
          
          <FormInput
            label="Notas de Corazón (Cuerpo del aroma)"
            value={form.notas_corazon}
            onChangeText={(value) => updateField('notas_corazon', value)}
            placeholder="Ej. Lavanda, Vetiver, Pachulí"
          />
          
          <FormInput
            label="Notas de Fondo (Base que perdura)"
            value={form.notas_fondo}
            onChangeText={(value) => updateField('notas_fondo', value)}
            placeholder="Ej. Ambroxan, Cedro, Ládano"
          />

          <View style={{ marginTop: spacing.md }}>
            <PrimaryButton
              title={
                subiendoImagen
                  ? 'Subiendo imagen...'
                  : saving
                    ? 'Guardando...'
                    : editingPerfume
                      ? 'Actualizar Informacion'
                      : 'Registrar Perfume'
              }
              onPress={handleSave}
              disabled={disableActions}
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
  imagePicker: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.md,
    minHeight: 220,
    backgroundColor: colors.surfaceRaised,
    ...shadow.glow,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: radius.md - 3,
    backgroundColor: colors.backgroundSoft,
  },
  imagePlaceholder: {
    minHeight: 220,
    borderRadius: radius.md - 3,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  placeholderIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...shadow.glow,
  },
  placeholderTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 3,
  },
  placeholderText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '700',
  },
  imageSpace: {
    height: 12,
  },
  formSectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    paddingTop: spacing.md,
  },
  sectionHeading: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
