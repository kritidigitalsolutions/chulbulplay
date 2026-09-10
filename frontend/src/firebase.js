import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Reuse the app during Vite hot reloads and prevent duplicate initialization.
const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Analytics is browser-only; this guard also keeps builds that render on the
// server from trying to initialize a browser SDK.
const firebaseAnalytics =
  typeof window !== "undefined" && firebaseConfig.measurementId
    ? getAnalytics(firebaseApp)
    : null;

export { firebaseApp, firebaseAnalytics, firebaseConfig };
