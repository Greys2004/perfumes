import { StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

export default function SearchBar({ value, onChangeText, placeholder }) {
  return (
    <View style={styles.wrap}>
      <Feather name="search" size={18} color={colors.textSubtle} style={styles.icon} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    minHeight: 48,
    paddingVertical: 0,
  },
});
