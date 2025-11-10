import { useEffect, useState } from "react";
import { auth } from "../../../../../firebase";

export default function useTeacherId() {
  const [teacherId, setTeacherId] = useState(null);
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) =>
      setTeacherId(user?.uid || null)
    );
    return () => unsub();
  }, []);
  return teacherId;
}