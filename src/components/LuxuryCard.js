import { StyleSheet, View } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';

export default function LuxuryCard({ children, style, elevated = true, accent = false, variant = 'normal' }) {
  const cardStyles = [
    styles.card,
    elevated && styles.elevated,
    accent && styles.accent,
    variant === 'copper' && styles.copperCard,
    variant === 'amber' && styles.amberCard,
    variant === 'rose' && styles.roseCard,
    style,
  ];

  return (
    <View style={cardStyles}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
  },
  elevated: {
    ...shadow.card,
  },
  accent: {
    borderColor: colors.lineStrong,
    backgroundColor: colors.surfaceRaised,
    ...shadow.glow,
  },
  copperCard: {
    backgroundColor: 'rgba(112, 67, 50, 0.25)',
    borderColor: 'rgba(112, 67, 50, 0.50)',
  },
  amberCard: {
    backgroundColor: 'rgba(166, 106, 53, 0.20)',
    borderColor: 'rgba(166, 106, 53, 0.45)',
  },
  roseCard: {
    backgroundColor: colors.dangerSurface,
    borderColor: colors.dangerLine,
  },
});
