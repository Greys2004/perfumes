import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

export default function StatusBadge({ label, tone = 'gold', style }) {
  return (
    <View style={[styles.badge, styles[tone], style]}>
      <Text style={[styles.text, styles[`${tone}Text`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 26,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  gold: {
    backgroundColor: 'rgba(229, 192, 123, 0.08)',
    borderColor: 'rgba(229, 192, 123, 0.25)',
  },
  success: {
    backgroundColor: 'rgba(108, 178, 143, 0.08)',
    borderColor: 'rgba(108, 178, 143, 0.25)',
  },
  danger: {
    backgroundColor: colors.dangerSurface,
    borderColor: colors.dangerLine,
  },
  muted: {
    backgroundColor: colors.overlay,
    borderColor: colors.line,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  goldText: {
    color: colors.gold,
  },
  successText: {
    color: colors.success,
  },
  dangerText: {
    color: colors.danger,
  },
  mutedText: {
    color: colors.textSubtle,
  },
});
