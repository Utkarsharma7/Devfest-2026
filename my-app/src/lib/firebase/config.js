// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCGq2WywGMT6Bgl2L3FKejrSsMZiWl9yKc",
  authDomain: "devfest-2026.firebaseapp.com",
  projectId: "devfest-2026",
  storageBucket: "devfest-2026.firebasestorage.app",
  messagingSenderId: "470780672728",
  appId: "1:470780672728:web:d82756a51d923ee0b2b5ad"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

export default app;
