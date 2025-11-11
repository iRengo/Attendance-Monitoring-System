import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../../../firebase";

export default function useStudents(selectedSection) {
  const [studentsInSection, setStudentsInSection] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadStudents() {
      if (!selectedSection) {
        setStudentsInSection([]);
        return;
      }
      setLoadingStudents(true);
      try {
        const qStudents = query(
          collection(db, "students"),
          where("section", "==", selectedSection)
        );
        const snap = await getDocs(qStudents);
        const list = snap.docs.map((d) => {
          const s = d.data() || {};
          const fn = s.firstname || s.firstName || "";
          const mn = s.middlename || s.middleName || "";
          const ln = s.lastname || s.lastName || "";
          const name =
            [fn, mn, ln].map((x) => (x || "").trim()).filter(Boolean).join(" ") ||
            d.id;
          const profilePicUrl = s.profilePicUrl || s.photoURL || "";
          return {
            id: d.id,
            name,
            studentId: s.studentId || s.studentid || "",
            section: s.section || "",
            gradelevel: s.gradelevel || s.gradeLevel || "",
            profilePicUrl,
          };
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        if (active) setStudentsInSection(list);
      } catch (e) {
        console.error("useStudents error:", e);
        if (active) setStudentsInSection([]);
      } finally {
        if (active) setLoadingStudents(false);
      }
    }
    loadStudents();
    return () => {
      active = false;
    };
  }, [selectedSection]);

  return { studentsInSection, loadingStudents };
}