import { Pressable, StyleSheet, View } from 'react-native';

export default function MenuButton({ onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <View style={styles.line} />
      <View style={styles.line} />
      <View style={styles.line} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  line: {
    width: 20,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#f8f4ed',
    marginVertical: 2,
  },
});
