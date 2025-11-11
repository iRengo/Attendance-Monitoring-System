import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../../../firebase";

export default function useSections() {
  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoadingClasses(true);
      try {
        const clsSnap = await getDocs(collection(db, "classes"));
        const cls = clsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (!active) return;
        setClasses(cls);
        const uniqueSections = Array.from(
          new Set(
            cls
              .map((c) => (c.section || "").trim())
              .filter((s) => s && s.length > 0)
          )
        ).sort((a, b) => a.localeCompare(b));
        setSections(uniqueSections);
      } catch (e) {
        console.error("useSections error:", e);
      } finally {
        if (active) setLoadingClasses(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return { sections, classes, loadingClasses };
}