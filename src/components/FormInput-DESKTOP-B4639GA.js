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
  editable = true,
  secureTextEntry = false,
  autoCapitalize,
  autoCorrect,
  textContentType,
  rightElement,
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSubtle}
          multiline={multiline}
          keyboardType={keyboardType}
          editable={editable}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          textContentType={textContentType}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.input,
            rightElement && styles.inputWithRightElement,
            multiline && styles.multiline,
            isFocused && styles.focusedInput,
            !editable && styles.disabledInput,
          ]}
        />
        {rightElement ? <View style={styles.rightElement}>{rightElement}</View> : null}
      </View>
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
  inputWrap: {
    position: 'relative',
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
  inputWithRightElement: {
    paddingRight: 52,
  },
  rightElement: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 52,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusedInput: {
    borderColor: colors.gold,
  },
  disabledInput: {
    opacity: 0.65,
  },
  multiline: {
    minHeight: 88,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },
});
