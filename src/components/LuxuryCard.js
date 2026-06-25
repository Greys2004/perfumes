import { StyleSheet, View } from 'react-native';

import { colors, radius, shadow, spacing } from '../theme';

export default function LuxuryCard({ children, style, elevated = true, accent = false }) {
  return (
    <View style={[styles.card, elevated && shadow.card, accent && styles.accent, style]}>
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
  accent: {
    borderColor: colors.lineStrong,
    backgroundColor: colors.surfaceRaised,
  },
});
