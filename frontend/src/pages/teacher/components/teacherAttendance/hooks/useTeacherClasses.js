import { useEffect, useState } from "react";
import { db } from "../../../../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function useTeacherClasses(teacherId) {
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!teacherId) {
      setClasses([]);
      setLoadingClasses(false);
      return;
    }
    let cancelled = false;
    const fetchClasses = async () => {
      setLoadingClasses(true);
      try {
        const qRef = query(
          collection(db, "classes"),
          where("teacherId", "==", teacherId)
        );
        const snap = await getDocs(qRef);
        if (cancelled) return;
        const cls = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        cls.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );
        setClasses(cls);
      } catch (e) {
        console.error(e);
        setError("Failed to load classes.");
        setClasses([]);
      } finally {
        if (!cancelled) setLoadingClasses(false);
      }
    };
    fetchClasses();
    return () => {
      cancelled = true;
    };
  }, [teacherId]);

  return { classes, loadingClasses, error, setError };
}