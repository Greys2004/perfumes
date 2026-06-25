import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, type } from '../theme';

export default function AppHeader({ eyebrow = 'AromaOrigen', title, subtitle, right }) {
  return (
    <View style={styles.header}>
      <View style={styles.textBlock}>
        {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  textBlock: {
    flex: 1,
  },
  eyebrow: {
    ...type.kicker,
    marginBottom: 4,
  },
  title: {
    ...type.title,
    fontSize: 28,
  },
  subtitle: {
    color: colors.textSubtle,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});
