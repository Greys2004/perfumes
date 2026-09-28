import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
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
  leftIcon,
  prefix,
  helperText,
  errorText,
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {!!label && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, isFocused && styles.focusedLabel]}>{label}</Text>
        </View>
      )}
      <View
        style={[
          styles.inputWrap,
          isFocused && styles.focusedWrap,
          !editable && styles.disabledWrap,
          !!errorText && styles.errorWrap,
        ]}
      >
        {!!leftIcon && (
          <View style={styles.leftIconContainer}>
            <Feather
              name={leftIcon}
              size={17}
              color={isFocused ? colors.gold : colors.textSubtle}
            />
          </View>
        )}
        {!!prefix && (
          <View style={styles.prefixContainer}>
            <Text style={[styles.prefixText, isFocused && styles.prefixTextFocused]}>
              {prefix}
            </Text>
          </View>
        )}
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
            multiline && styles.multiline,
            rightElement && styles.inputWithRightElement,
            (leftIcon || prefix) && styles.inputWithLeftSpacing,
          ]}
        />
        {rightElement ? <View style={styles.rightElement}>{rightElement}</View> : null}
      </View>
      {!!errorText && <Text style={styles.errorText}>{errorText}</Text>}
      {!!helperText && !errorText && <Text style={styles.helperText}>{helperText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  focusedLabel: {
    color: colors.amber,
  },
  inputWrap: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1.2,
    borderColor: 'rgba(166, 136, 100, 0.28)',
    shadowColor: colors.petroleum,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  focusedWrap: {
    borderColor: colors.gold,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  disabledWrap: {
    opacity: 0.6,
    backgroundColor: colors.surfaceSoft,
    borderColor: 'rgba(78, 85, 87, 0.15)',
  },
  errorWrap: {
    borderColor: colors.danger,
    borderWidth: 1.5,
  },
  leftIconContainer: {
    paddingLeft: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefixContainer: {
    paddingLeft: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefixText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textSubtle,
  },
  prefixTextFocused: {
    color: colors.amber,
  },
  input: {
    flex: 1,
    minHeight: 48,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  inputWithLeftSpacing: {
    paddingLeft: spacing.xs,
  },
  inputWithRightElement: {
    paddingRight: 48,
  },
  rightElement: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  helperText: {
    marginTop: 4,
    fontSize: 11,
    color: colors.textSubtle,
    letterSpacing: 0.2,
    paddingHorizontal: 2,
  },
  errorText: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: colors.danger,
    letterSpacing: 0.2,
    paddingHorizontal: 2,
  },
});
