import { useRef } from "react";
import { db } from "../../../../../firebase";
import { doc, getDoc } from "firebase/firestore";

// Build a display name from { firstname, middlename, lastname }
function buildFullName(data, idFallback) {
  if (!data) return idFallback;
  const first = (data.firstname || "").trim();
  const middle = (data.middlename || "").trim();
  const last = (data.lastname || "").trim();
  const parts = [first, middle, last].filter(Boolean);
  return parts.length ? parts.join(" ") : idFallback;
}

/**
 * Returns getStudentNames(ids) that resolves to [{ studentId, name, section }]
 * Uses a simple in-memory cache to avoid re-fetching.
 */
export default function useStudentNames() {
  const cache = useRef(new Map());

  async function getStudentNames(studentIds) {
    const results = [];
    for (const sid of studentIds) {
      if (cache.current.has(sid)) {
        results.push({ studentId: sid, ...cache.current.get(sid) });
        continue;
      }
      try {
        const snap = await getDoc(doc(db, "students", sid));
        if (snap.exists()) {
          const data = snap.data() || {};
          const name = buildFullName(data, sid);
          const section = (data.section || "").toString();
          const payload = { name, section };
          cache.current.set(sid, payload);
          results.push({ studentId: sid, ...payload });
        } else {
          const payload = { name: sid, section: "" };
          cache.current.set(sid, payload);
          results.push({ studentId: sid, ...payload });
        }
      } catch (e) {
        console.warn("Failed to fetch student", sid, e);
        const payload = { name: sid, section: "" };
        cache.current.set(sid, payload);
        results.push({ studentId: sid, ...payload });
      }
    }
    return results;
  }

  return { getStudentNames };
}