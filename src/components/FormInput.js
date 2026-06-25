import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

export default function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        multiline={multiline}
        keyboardType={keyboardType}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[
          styles.input,
          multiline && styles.multiline,
          isFocused && styles.focusedInput
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    minHeight: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: spacing.md,
  },
  focusedInput: {
    borderColor: colors.gold,
  },
  multiline: {
    minHeight: 88,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },
});
