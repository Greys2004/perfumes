import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AnimatedPressable from './AnimatedPressable';
import { colors, radius, shadow } from '../theme';

export default function MenuButton({ onPress }) {
  return (
    <AnimatedPressable onPress={onPress} style={styles.button} scaleTo={0.92}>
      <View style={styles.inner}>
        <Feather name="menu" size={18} color={colors.gold} />
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    ...shadow.glow,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
