import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCVQihEJ8pIeNdJrtGa13zluhtqnzLtyLA",
  authDomain: "attendance-management-sy-57ce1.firebaseapp.com",
  projectId: "attendance-management-sy-57ce1",
  storageBucket: "attendance-management-sy-57ce1.appspot.com", 
  messagingSenderId: "927530833371",
  appId: "1:927530833371:web:e5624ff837e868294943fe",
  measurementId: "G-PXDCZC4Y7K",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
