// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

const appCheckSiteKey = import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY;
if (appCheckSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
} else {
  // App Check is required by callable functions; warn if site key is missing.
  console.warn("VITE_RECAPTCHA_V3_SITE_KEY is not set; callable functions may fail App Check.");
}
// Callable functions: use httpsCallable only (no fetch/axios). SDK handles CORS and auth.
const functions = getFunctions(app, "us-central1");
export const createLinkToken = httpsCallable<unknown, { linkToken: string }>(functions, "createLinkToken");
export const exchangePublicToken = httpsCallable<{ publicToken: string }, { success: boolean }>(functions, "exchangePublicToken");
export const syncTransactions = httpsCallable<unknown, { success: boolean; added?: number; modified?: number }>(functions, "syncTransactions");
export const syncBalances = httpsCallable<unknown, { success: boolean }>(functions, "syncBalances");
export const syncPlaidInsights = httpsCallable<
  unknown,
  { success: boolean; recurring?: boolean; liabilities?: boolean }
>(functions, "syncPlaidInsights");
export const disconnectPlaid = httpsCallable<unknown, { success: boolean; removedFromPlaid?: boolean }>(
  functions,
  "disconnectPlaid"
);
export const deleteUserData = httpsCallable<unknown, { success: boolean }>(functions, "deleteUserData");
export default app;