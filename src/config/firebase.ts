import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "gen-lang-client-0664700327",
  appId: "1:465190003880:web:72860545749cd20204ce9d",
  apiKey: "AIzaSyBy0g8e-YgsI7fscFQWoRiWbpL7fXO6hho",
  authDomain: "gen-lang-client-0664700327.firebaseapp.com",
  storageBucket: "gen-lang-client-0664700327.firebasestorage.app",
  messagingSenderId: "465190003880",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-novaai-27b8f5cb-ed0e-4b02-82b3-535e76f52e4d");
