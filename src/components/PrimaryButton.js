import { StyleSheet, Text } from 'react-native';
import AnimatedPressable from './AnimatedPressable';
import { colors, radius, shadow } from '../theme';

export default function PrimaryButton({ title, onPress, disabled = false, variant = 'primary' }) {
  const buttonStyle = [
    styles.button,
    variant === 'secondary' && styles.secondary,
    disabled && styles.disabled,
  ];

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      style={buttonStyle}
    >
      <Text style={[styles.text, variant === 'secondary' && styles.secondaryText, disabled && styles.disabledText]}>
        {title}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.gold,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: 'transparent',
    ...shadow.glow,
  },
  secondary: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.lineStrong,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  disabled: {
    backgroundColor: colors.surfaceSoft,
    borderColor: 'transparent',
    opacity: 0.5,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  text: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  secondaryText: {
    color: colors.textMuted,
  },
  disabledText: {
    color: colors.textSubtle,
  },
});
