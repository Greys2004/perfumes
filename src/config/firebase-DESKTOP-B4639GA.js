import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
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

// Evita inicializar Firebase más de una vez
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch (error) {
  auth = getAuth(app);
}

const db = getFirestore(app);

export { auth, db };
export default app;