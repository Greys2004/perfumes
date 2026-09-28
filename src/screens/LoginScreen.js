import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import ScreenContainer from '../components/ScreenContainer';
import { loginWithEmail } from '../services/authService';
import { colors, radius, shadow, spacing } from '../theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Faltan datos', 'Ingresa correo y contraseña.');
      return;
    }

    try {
      setSaving(true);
      await loginWithEmail(email, password);
    } catch (error) {
      Alert.alert('No se pudo iniciar sesión', getAuthErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer
        contentStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.logoBlock}>
          <View style={styles.logoWrap}>
            <Image source={require('../../assets/icon.png')} style={styles.logo} />
          </View>
          <Text style={styles.brand}>AromaOrigen</Text>
          <Text style={styles.brandSubtitle}>Perfumería de Alta Gama • Panel Privado</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.headerIcon}>
              <Feather name="lock" size={16} color={colors.white} />
            </View>
            <Text style={styles.kicker}>Acceso Exclusivo</Text>
          </View>
          <Text style={styles.title}>Iniciar Sesión</Text>

          <FormInput
            label="Correo Electrónico"
            value={email}
            onChangeText={setEmail}
            placeholder="admin@aromaorigen.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
          />

          <FormInput
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            rightElement={
              <Pressable
                onPress={() => setShowPassword((currentValue) => !currentValue)}
                style={styles.eyeButton}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color={colors.gold}
                />
              </Pressable>
            }
          />

          <PrimaryButton
            title={saving ? 'Autenticando...' : 'Iniciar Sesión'}
            onPress={handleLogin}
            disabled={saving}
          />
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

function getAuthErrorMessage(error) {
  if (error?.code === 'auth/invalid-credential') {
    return 'El correo o la contraseña no son correctos.';
  }

  if (error?.code === 'auth/too-many-requests') {
    return 'Hubo demasiados intentos. Intenta más tarde.';
  }

  return error?.message || 'Revisa tus datos e intenta de nuevo.';
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  logoBlock: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoWrap: {
    padding: 6,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surfaceCard,
    marginBottom: spacing.md,
    ...shadow.glow,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: radius.lg,
  },
  brand: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: spacing.xl,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  headerIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.petroleum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    marginBottom: spacing.lg,
  },
  eyeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
