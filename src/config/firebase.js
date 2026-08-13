import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
