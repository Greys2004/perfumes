import { StyleSheet, Text, TextInput, View } from 'react-native';

export default function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8f8f91"
        multiline={multiline}
        keyboardType={keyboardType}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: '#f0d19a',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  input: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#1f2023',
    borderWidth: 1,
    borderColor: '#4f463b',
    color: '#f8f4ed',
    fontSize: 16,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  multiline: {
    minHeight: 92,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
});
