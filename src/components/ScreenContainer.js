import { ScrollView, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../theme';

export default function ScreenContainer({
  children,
  scroll = true,
  contentStyle,
  keyboardShouldPersistTaps,
  keyboardDismissMode,
}) {
  if (!scroll) {
    return <View style={[styles.container, contentStyle]}>{children}</View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode={keyboardDismissMode}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 48,
  },
});
