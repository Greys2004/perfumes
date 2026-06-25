import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, shadow } from '../theme';

export default function MetricCard({ label, value, detail, highlight = false, compact = false }) {
  return (
    <View style={[
      styles.card, 
      highlight && styles.highlight, 
      compact && styles.compact,
      !highlight && shadow.card
    ]}>
      <Text style={[styles.label, highlight && styles.highlightLabel]}>{label}</Text>
      <Text style={[styles.value, highlight && styles.highlightValue]}>{value}</Text>
      {!!detail && <Text style={[styles.detail, highlight && styles.highlightDetail]}>{detail}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 96,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceCard,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  compact: {
    minHeight: 76,
  },
  highlight: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    ...shadow.glow,
  },
  label: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  detail: {
    color: colors.textSubtle,
    fontSize: 11,
    marginTop: 4,
  },
  highlightLabel: {
    color: colors.ink,
    opacity: 0.8,
  },
  highlightValue: {
    color: colors.ink,
  },
  highlightDetail: {
    color: colors.ink,
    opacity: 0.7,
  },
});
