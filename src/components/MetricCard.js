import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, shadow } from '../theme';

export default function MetricCard({ label, value, detail, highlight = false, variant = 'gold', compact = false }) {
  return (
    <View style={[
      styles.card, 
      compact && styles.compact,
      highlight && (variant === 'copper' ? styles.copperHighlight : variant === 'amber' ? styles.amberHighlight : styles.highlight), 
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
    minHeight: 100,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceCard,
    padding: spacing.md,
    justifyContent: 'space-between',
    ...shadow.card,
  },
  compact: {
    minHeight: 78,
  },
  highlight: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    ...shadow.glow,
  },
  amberHighlight: {
    backgroundColor: colors.amber,
    borderColor: colors.amber,
    ...shadow.glow,
  },
  copperHighlight: {
    backgroundColor: colors.copper,
    borderColor: colors.copper,
    ...shadow.copperGlow,
  },
  label: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  detail: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  highlightLabel: {
    color: colors.ink,
    opacity: 0.85,
  },
  highlightValue: {
    color: colors.ink,
  },
  highlightDetail: {
    color: colors.ink,
    opacity: 0.80,
  },
});
