import { useEffect, useState } from "react";
import { db } from "../../../../../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function useStudentDirectory(allStudentDocIds) {
  const [studentNameCache, setStudentNameCache] = useState({}); // sid -> name
  const [studentIdFieldCache, setStudentIdFieldCache] = useState({}); // sid -> studentId field

  useEffect(() => {
    const missingIds = allStudentDocIds.filter(
      (id) => !(id in studentNameCache) || !(id in studentIdFieldCache)
    );
    if (!missingIds.length) return;
    let cancelled = false;
    (async () => {
      const newNames = {};
      const newStuIds = {};
      await Promise.all(
        missingIds.map(async (sid) => {
          try {
            const snap = await getDoc(doc(db, "students", sid));
            if (snap.exists()) {
              const data = snap.data() || {};
              const name = `${data.firstname || data.firstName || ""} ${data.middlename || data.middleName || ""} ${data.lastname || data.lastName || ""}`
                .replace(/\s+/g, " ")
                .trim();
              newNames[sid] = name || sid;
              newStuIds[sid] =
                data.studentId ||
                data.student_id ||
                data.schoolId ||
                data.school_id ||
                sid;
            } else {
              newNames[sid] = sid;
              newStuIds[sid] = sid;
            }
          } catch {
            newNames[sid] = sid;
            newStuIds[sid] = sid;
          }
        })
      );
      if (!cancelled) {
        setStudentNameCache((prev) => ({ ...prev, ...newNames }));
        setStudentIdFieldCache((prev) => ({ ...prev, ...newStuIds }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allStudentDocIds]); // eslint-disable-line react-hooks/exhaustive-deps

  return { studentNameCache, studentIdFieldCache };
}