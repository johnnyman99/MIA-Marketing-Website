import { useCallback } from "react";
import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "../firebase.js";
import { useAuth } from "../contexts/AuthContext.jsx";

// Fires an in-app notification to everyone with a given role (except
// yourself). Used whenever a new order/invoice request/lead is created.
export function useNotifyRole() {
  const { currentUser } = useAuth();

  return useCallback(
    async (role, title, body) => {
      try {
        const snap = await getDocs(query(collection(db, "users"), where("role", "==", role)));
        const jobs = [];
        snap.forEach((u) => {
          if (u.id === currentUser?.uid) return;
          jobs.push(
            addDoc(collection(db, "notifications"), {
              userId: u.id,
              title,
              body,
              read: false,
              createdAt: serverTimestamp()
            })
          );
        });
        await Promise.all(jobs);
      } catch (err) {
        console.error("Notification failed:", err);
      }
    },
    [currentUser]
  );
}
