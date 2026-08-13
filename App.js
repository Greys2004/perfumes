import { StatusBar } from 'react-native';

import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <>
      <AppNavigator />
      <StatusBar barStyle="light-content" />
    </>
  );
}
