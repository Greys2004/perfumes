import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};

function getExtraValue(key) {
  return typeof extra[key] === 'string' ? extra[key].trim() : extra[key];
}

const firebaseConfig = {
  apiKey: getExtraValue('firebaseApiKey'),
  authDomain: getExtraValue('firebaseAuthDomain'),
  projectId: getExtraValue('firebaseProjectId'),
  storageBucket: getExtraValue('firebaseStorageBucket'),
  messagingSenderId: getExtraValue('firebaseMessagingSenderId'),
  appId: getExtraValue('firebaseAppId'),
  measurementId: getExtraValue('firebaseMeasurementId'),
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export default app;