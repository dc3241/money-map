// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBIuBiEl6Im2gj0mz8kDBYBD8p_UDDawHw",
  authDomain: "money-map-3aadf.firebaseapp.com",
  projectId: "money-map-3aadf",
  storageBucket: "money-map-3aadf.firebasestorage.app",
  messagingSenderId: "416560556060",
  appId: "1:416560556060:web:c1b979b002fac1715a57d9",
  measurementId: "G-P0L4TCXSZZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export default app;