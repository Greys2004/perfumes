import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

export default function StatusBadge({ label, tone = 'gold', style }) {
  return (
    <View style={[styles.badge, styles[tone] || styles.gold, style]}>
      <View style={[styles.dot, styles[`${tone}Dot`] || styles.goldDot]} />
      <Text style={[styles.text, styles[`${tone}Text`] || styles.goldText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 26,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    marginRight: 6,
  },
  goldDot: { backgroundColor: colors.gold },
  amberDot: { backgroundColor: colors.amber },
  copperDot: { backgroundColor: '#D48A6A' },
  roseDot: { backgroundColor: colors.rose },
  successDot: { backgroundColor: colors.success },
  dangerDot: { backgroundColor: colors.danger },
  mutedDot: { backgroundColor: colors.textSubtle },
  petroleumDot: { backgroundColor: colors.goldLight },
  gold: {
    backgroundColor: 'rgba(166, 136, 100, 0.15)',
    borderColor: 'rgba(166, 136, 100, 0.45)',
  },
  amber: {
    backgroundColor: 'rgba(166, 106, 53, 0.18)',
    borderColor: 'rgba(166, 106, 53, 0.48)',
  },
  copper: {
    backgroundColor: 'rgba(112, 67, 50, 0.22)',
    borderColor: 'rgba(112, 67, 50, 0.52)',
  },
  rose: {
    backgroundColor: 'rgba(201, 151, 152, 0.18)',
    borderColor: 'rgba(201, 151, 152, 0.48)',
  },
  success: {
    backgroundColor: 'rgba(95, 175, 139, 0.15)',
    borderColor: 'rgba(95, 175, 139, 0.45)',
  },
  danger: {
    backgroundColor: colors.dangerSurface,
    borderColor: colors.dangerLine,
  },
  muted: {
    backgroundColor: 'rgba(78, 85, 87, 0.25)',
    borderColor: colors.lineSoft,
  },
  petroleum: {
    backgroundColor: 'rgba(22, 50, 58, 0.40)',
    borderColor: 'rgba(166, 136, 100, 0.30)',
  },
  text: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  goldText: {
    color: colors.gold,
  },
  amberText: {
    color: colors.amber,
  },
  copperText: {
    color: '#D48A6A',
  },
  roseText: {
    color: colors.rose,
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
  petroleumText: {
    color: colors.ivory,
  },
});
