// src/utils/logActivity.js
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Logs admin actions (e.g., import, delete, edit, maintenance toggle, announcement)
 * into the "recent_activities" collection in Firestore.
 */
export const logActivity = async (action, details) => {
  try {
    const activityRef = collection(db, "recent_activities");
    await addDoc(activityRef, {
      action,
      details,
      timestamp: serverTimestamp(),
      actor: "Admin",
    });
    console.log("✅ Logged activity:", action);
  } catch (error) {
    console.error("❌ Failed to log activity:", error);
  }
};
