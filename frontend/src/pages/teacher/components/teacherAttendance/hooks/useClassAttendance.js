import { useEffect, useState } from "react";
import { db } from "../../../../../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function useClassAttendance(teacherId, selectedClassId, setError) {
  const [rawSessions, setRawSessions] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  useEffect(() => {
    if (!teacherId || !selectedClassId) {
      setRawSessions([]);
      return;
    }
    setLoadingAttendance(true);
    setError?.("");

    const qRef = query(
      collection(db, "attendance_sessions"),
      where("teacherId", "==", teacherId),
      where("classId", "==", selectedClassId)
    );

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort(
          (a, b) =>
            new Date(b.timeStarted || 0).getTime() -
            new Date(a.timeStarted || 0).getTime()
        );
        setRawSessions(docs);
        setLoadingAttendance(false);
      },
      (err) => {
        console.error("Attendance sessions error:", err);
        setError?.("Failed to load attendance sessions.");
        setRawSessions([]);
        setLoadingAttendance(false);
      }
    );

    return () => unsub();
  }, [teacherId, selectedClassId, setError]);

  return { rawSessions, loadingAttendance };
}