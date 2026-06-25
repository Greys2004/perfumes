import { StyleSheet, Text, View } from 'react-native';

import LuxuryCard from './LuxuryCard';
import { colors, radius, spacing } from '../theme';

export default function StepCard({ step, title, subtitle, children }) {
  return (
    <LuxuryCard style={styles.card}>
      <View style={styles.header}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>{step}</Text>
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      {children}
    </LuxuryCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stepBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
});
