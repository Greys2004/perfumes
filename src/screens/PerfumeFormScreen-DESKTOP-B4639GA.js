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
import { LinearGradient } from 'expo-linear-gradient';
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
  categoria_perfume: 'diseñador',
  genero_perfume: 'unisex',
  duracion: '',
  ml_botella_completa: '',
  precio_liverpool: '',
  notas_salida: '',
  notas_corazon: '',
  notas_fondo: '',
};

const perfumeCategories = [
  { label: 'Diseñador', value: 'diseñador', icon: 'award' },
  { label: 'Nicho', value: 'nicho', icon: 'star' },
  { label: 'Árabe', value: 'arabe', icon: 'compass' },
];

const perfumeGenders = [
  { label: 'Femenino', value: 'mujer' },
  { label: 'Masculino', value: 'hombre' },
  { label: 'Unisex', value: 'unisex' },
];

function getInitialForm(perfume) {
  if (!perfume) {
    return initialForm;
  }

  return {
    nombre: perfume.nombre || '',
    marca: perfume.marca || '',
    imagen: perfume.imagen || '',
    descripcion_olor: perfume.descripcion_olor || '',
    categoria_perfume: perfume.categoria_perfume || 'diseñador',
    genero_perfume: perfume.genero_perfume || 'unisex',
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
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para elegir una fotografía del frasco.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
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
      Alert.alert('No se pudo guardar la fragancia', error.message);
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Block */}
        <View style={styles.headerBlock}>
          <View style={styles.headerIconWrap}>
            <Feather name="droplet" size={24} color={colors.amber} />
          </View>
          <Text style={styles.kicker}>
            {editingPerfume ? 'EDICIÓN DE FÓRMULA' : 'CREACIÓN PRIVÉE'}
          </Text>
          <Text style={styles.title}>
            {editingPerfume ? 'Editar Fragancia' : 'Nueva Fragancia'}
          </Text>
          <Text style={styles.subtitle}>
            Configura las propiedades sensoriales, casa perfumista y descriptores olfativos para el catálogo.
          </Text>
        </View>

        {/* Section: Fotografía del Frasco */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBadge}>
              <Feather name="camera" size={15} color={colors.gold} />
            </View>
            <Text style={styles.sectionTitle}>Fotografía de la Botella</Text>
          </View>

          <Pressable
            onPress={handlePickImage}
            disabled={disableActions}
            style={styles.imagePickerFrame}
          >
            {previewUri ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="cover" />
                <View style={styles.changeImageOverlay}>
                  <Feather name="edit-2" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.changeImageText}>Cambiar Fotografía</Text>
                </View>
              </View>
            ) : (
              <View style={styles.imagePlaceholder}>
                <LinearGradient
                  colors={['rgba(166, 136, 100, 0.2)', 'rgba(166, 136, 100, 0.05)']}
                  style={styles.placeholderIconRing}
                >
                  <Feather name="image" size={28} color={colors.gold} />
                </LinearGradient>
                <Text style={styles.placeholderTitle}>Seleccionar de Galería</Text>
                <Text style={styles.placeholderSub}>Toca aquí para subir la foto del frasco</Text>
              </View>
            )}
          </Pressable>

          <FormInput
            label="O ingresar URL directa de imagen web"
            value={form.imagen}
            onChangeText={(value) => updateField('imagen', value)}
            placeholder="https://images.unsplash.com/..."
            autoCapitalize="none"
            leftIcon="link"
          />
        </View>

        {/* Section: Identidad de la Fragancia */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBadge}>
              <Feather name="tag" size={15} color={colors.amber} />
            </View>
            <Text style={styles.sectionTitle}>Identidad & Casa Perfumista</Text>
          </View>

          <FormInput
            label="Nombre de la Fragancia *"
            value={form.nombre}
            onChangeText={(value) => updateField('nombre', value)}
            placeholder="Ej. Baccarat Rouge 540"
            leftIcon="bookmark"
          />

          <FormInput
            label="Casa / Marca *"
            value={form.marca}
            onChangeText={(value) => updateField('marca', value)}
            placeholder="Ej. Maison Francis Kurkdjian"
            leftIcon="briefcase"
          />

          {/* Categoría Selector */}
          <Text style={styles.segmentLabel}>CATEGORÍA DE PERFUMERÍA</Text>
          <View style={styles.segmentRow}>
            {perfumeCategories.map((category) => {
              const selected = form.categoria_perfume === category.value;
              return (
                <Pressable
                  key={category.value}
                  onPress={() => updateField('categoria_perfume', category.value)}
                  style={[styles.segmentBtn, selected && styles.segmentBtnActive]}
                >
                  <Feather
                    name={category.icon}
                    size={14}
                    color={selected ? '#FFFFFF' : colors.textMuted}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.segmentBtnText, selected && styles.segmentBtnTextActive]}>
                    {category.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Género Selector */}
          <Text style={styles.segmentLabel}>PÚBLICO OBJETIVO / GÉNERO</Text>
          <View style={styles.segmentRow}>
            {perfumeGenders.map((gender) => {
              const selected = form.genero_perfume === gender.value;
              return (
                <Pressable
                  key={gender.value}
                  onPress={() => updateField('genero_perfume', gender.value)}
                  style={[styles.segmentBtn, selected && styles.segmentBtnActive]}
                >
                  <Text style={[styles.segmentBtnText, selected && styles.segmentBtnTextActive]}>
                    {gender.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <FormInput
            label="Descripción Sensorial & Acuerdos Principales"
            value={form.descripcion_olor}
            onChangeText={(value) => updateField('descripcion_olor', value)}
            placeholder="Aroma envolvente, ámbar gris luminoso, cedro majestuoso y acordes azafranados de alta densidad..."
            multiline
          />
        </View>

        {/* Section: Pirámide Olfativa */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBadge}>
              <Feather name="layers" size={15} color={colors.gold} />
            </View>
            <Text style={styles.sectionTitle}>Pirámide Olfativa</Text>
          </View>

          <FormInput
            label="Notas de Salida (Apertura · Primeros 15 min)"
            value={form.notas_salida}
            onChangeText={(value) => updateField('notas_salida', value)}
            placeholder="Ej. Jazmín grandiflorum, Azafrán de Persia"
            leftIcon="sun"
          />

          <FormInput
            label="Notas de Corazón (Cuerpo · Evolución)"
            value={form.notas_corazon}
            onChangeText={(value) => updateField('notas_corazon', value)}
            placeholder="Ej. Almendra amarga de Marruecos, Madera de cedro"
            leftIcon="feather"
          />

          <FormInput
            label="Notas de Fondo (Base · Fijación duradera)"
            value={form.notas_fondo}
            onChangeText={(value) => updateField('notas_fondo', value)}
            placeholder="Ej. Ámbar gris amaderado, Almizcle cálido"
            leftIcon="shield"
          />
        </View>

        {/* Section: Datos Técnicos y Mercado */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBadge}>
              <Feather name="sliders" size={15} color={colors.copper} />
            </View>
            <Text style={styles.sectionTitle}>Especificaciones & Mercado</Text>
          </View>

          <View style={styles.twoColumnRow}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <FormInput
                label="Capacidad (ml)"
                value={form.ml_botella_completa}
                onChangeText={(value) => updateField('ml_botella_completa', value)}
                placeholder="100"
                keyboardType="numeric"
                prefix="ml"
              />
            </View>
            <View style={{ flex: 1 }}>
              <FormInput
                label="Precio Departamental"
                value={form.precio_liverpool}
                onChangeText={(value) => updateField('precio_liverpool', value)}
                placeholder="6800"
                keyboardType="numeric"
                prefix="$"
              />
            </View>
          </View>

          <FormInput
            label="Longevidad / Duración Estimada en Piel"
            value={form.duracion}
            onChangeText={(value) => updateField('duracion', value)}
            placeholder="Ej. 10 a 14 horas con estela moderada"
            leftIcon="clock"
          />
        </View>

        {/* Action Button */}
        <View style={styles.submitWrapper}>
          <PrimaryButton
            title={
              subiendoImagen
                ? 'Subiendo imagen a la nube...'
                : saving
                  ? 'Guardando fragancia...'
                  : editingPerfume
                    ? 'Guardar Modificaciones'
                    : 'Añadir al Catálogo'
            }
            onPress={handleSave}
            disabled={disableActions}
            loading={disableActions}
            icon={editingPerfume ? 'check-circle' : 'plus-circle'}
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
  headerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(166, 106, 53, 0.12)',
    borderWidth: 1.5,
    borderColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...shadow.amberGlow,
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
  imagePickerFrame: {
    height: 180,
    borderRadius: radius.md,
    backgroundColor: '#FAF8F4',
    borderWidth: 1.5,
    borderColor: 'rgba(166, 136, 100, 0.35)',
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  changeImageOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(22, 50, 58, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeImageText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  placeholderIconRing: {
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  placeholderTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  placeholderSub: {
    color: colors.textSubtle,
    fontSize: 12,
  },
  segmentLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.md,
    backgroundColor: '#FAF8F4',
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  segmentBtnActive: {
    backgroundColor: colors.petroleum,
    borderColor: colors.gold,
  },
  segmentBtnText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  twoColumnRow: {
    flexDirection: 'row',
  },
  submitWrapper: {
    marginTop: spacing.sm,
  },
});
