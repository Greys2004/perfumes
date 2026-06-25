import { StyleSheet, View } from 'react-native';

import { colors, radius } from '../theme';

export default function ProgressBar({ value = 0, max = 100, muted = false, danger = false }) {
  const numericValue = Math.max(Number(value) || 0, 0);
  const numericMax = Math.max(Number(max) || 1, 1);
  const width = `${Math.min((numericValue / numericMax) * 100, 100)}%`;

  return (
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          muted && styles.muted,
          danger && styles.danger,
          { width },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
  },
  muted: {
    backgroundColor: colors.goldMuted,
  },
  danger: {
    backgroundColor: colors.danger,
  },
});
