import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCOTfAmfRzhae3J32bT0nsChla2KEQiFTI",
  authDomain: "bdmusiciansclub-b369d.firebaseapp.com",
  projectId: "bdmusiciansclub-b369d",
  storageBucket: "bdmusiciansclub-b369d.firebasestorage.app",
  messagingSenderId: "212426876346",
  appId: "1:212426876346:web:1f9664a06e85e7d0cfe983"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
