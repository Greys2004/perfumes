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
    marginBottom: 15,
  },
  label: {
    color: '#d8c0a0',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  input: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: '#222329',
    borderWidth: 1,
    borderColor: '#3d3b38',
    color: '#f8f4ed',
    fontSize: 16,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
  },
  multiline: {
    minHeight: 92,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
});
