import { StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AnimatedPressable from './AnimatedPressable';
import { colors } from '../theme';

export default function MenuButton({ onPress }) {
  return (
    <AnimatedPressable onPress={onPress} style={styles.button}>
      <Feather name="menu" size={22} color={colors.gold} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});
