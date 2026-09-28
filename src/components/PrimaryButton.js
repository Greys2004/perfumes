import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import AnimatedPressable from './AnimatedPressable';
import { colors, radius, shadow } from '../theme';

const gradientMap = {
  primary: ['#1A3D46', '#10272E'],
  gold: ['#C4A987', '#A68864'],
  amber: ['#BC7C43', '#965C29'],
  copper: ['#7E4C3A', '#5A2F22'],
  secondary: ['#FFFFFF', '#F7F4EE'],
  danger: ['rgba(189, 83, 88, 0.12)', 'rgba(189, 83, 88, 0.06)'],
};

export default function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  icon,
  style,
  textStyle,
}) {
  function handlePress() {
    if (disabled || loading) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
    onPress?.();
  }

  const isOutline = variant === 'outline';
  const hasGradient = !isOutline && gradientMap[variant];
  const gradientColors = hasGradient ? gradientMap[variant] : null;

  return (
    <AnimatedPressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.buttonWrapper,
        isOutline && styles.outline,
        variant === 'danger' && styles.dangerBorder,
        disabled && styles.disabled,
        style,
      ]}
    >
      {hasGradient ? (
        <LinearGradient
          colors={disabled ? [colors.surfaceSoft, colors.surfaceSoft] : gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.innerGradient}
        >
          {loading ? (
            <ActivityIndicator
              size="small"
              color={variant === 'secondary' ? colors.gold : '#FFFFFF'}
            />
          ) : (
            <View style={styles.contentRow}>
              {!!icon && (
                <Feather
                  name={icon}
                  size={16}
                  color={
                    variant === 'secondary'
                      ? colors.text
                      : variant === 'danger'
                        ? colors.danger
                        : '#FFFFFF'
                  }
                  style={styles.icon}
                />
              )}
              <Text
                style={[
                  styles.text,
                  variant === 'secondary' && styles.secondaryText,
                  variant === 'danger' && styles.dangerText,
                  disabled && styles.disabledText,
                  textStyle,
                ]}
              >
                {title}
              </Text>
            </View>
          )}
        </LinearGradient>
      ) : (
        <View style={styles.innerStandard}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.gold} />
          ) : (
            <View style={styles.contentRow}>
              {!!icon && (
                <Feather name={icon} size={16} color={colors.gold} style={styles.icon} />
              )}
              <Text style={[styles.text, styles.outlineText, disabled && styles.disabledText, textStyle]}>
                {title}
              </Text>
            </View>
          )}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  buttonWrapper: {
    minHeight: 50,
    borderRadius: radius.pill,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(166, 136, 100, 0.35)',
    ...shadow.card,
  },
  innerGradient: {
    minHeight: 50,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  innerStandard: {
    minHeight: 50,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: colors.gold,
    borderWidth: 1.5,
    shadowColor: 'transparent',
    elevation: 0,
  },
  dangerBorder: {
    borderColor: 'rgba(189, 83, 88, 0.4)',
  },
  disabled: {
    opacity: 0.5,
    shadowColor: 'transparent',
    elevation: 0,
    borderColor: 'rgba(78, 85, 87, 0.2)',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  secondaryText: {
    color: colors.text,
    fontWeight: '800',
  },
  outlineText: {
    color: colors.goldDark,
    fontWeight: '800',
  },
  dangerText: {
    color: colors.danger,
    fontWeight: '800',
  },
  disabledText: {
    color: colors.textSubtle,
  },
});
