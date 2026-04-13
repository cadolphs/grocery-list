import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
// @ts-expect-error: RN-specific exports not in default firebase/auth typings
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import {
  Firestore,
  initializeFirestore,
  persistentLocalCache,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCyA1p0LoE-j9hK9_Lb5OkfZ62W5WK-xR0',
  authDomain: 'grocery-list-cad.firebaseapp.com',
  projectId: 'grocery-list-cad',
  storageBucket: 'grocery-list-cad.firebasestorage.app',
  messagingSenderId: '479234993313',
  appId: '1:479234993313:web:fd2e0083f1c93b7da994e0',
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

const getOrInitializeApp = (): FirebaseApp => {
  if (app) return app;

  app =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp(firebaseConfig);

  return app;
};

export const getFirebaseApp = (): FirebaseApp => getOrInitializeApp();

export const getFirebaseAuth = (): Auth => {
  if (auth) return auth;
  const app = getOrInitializeApp();
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  }
  return auth;
};

export const getFirebaseDb = (): Firestore => {
  if (db) return db;
  const firestoreConfig: Record<string, unknown> = {
    experimentalForceLongPolling: true,
  };
  if (Platform.OS === 'web') {
    firestoreConfig.localCache = persistentLocalCache();
  }
  db = initializeFirestore(getOrInitializeApp(), firestoreConfig);
  return db;
};
