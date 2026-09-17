// ---- Firebase connection ----
// Same project as before (mia-sales-c9623). If you ever need to point this
// at a different Firebase project, this is the only file to change.
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDZn3WBh7l78bxnXMhuUsSuC5CtmA3b3yQ",
  authDomain: "mia-sales-c9623.firebaseapp.com",
  projectId: "mia-sales-c9623",
  storageBucket: "mia-sales-c9623.firebasestorage.app",
  messagingSenderId: "254926909292",
  appId: "1:254926909292:web:ce6be2ff6607979b7d0d49"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
