import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../../../firebase";

export default function useTeachers(classes, selectedSection) {
  const [allTeachers, setAllTeachers] = useState([]);
  const [teachersInSection, setTeachersInSection] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  // Load all teachers once
  useEffect(() => {
    let active = true;
    async function loadTeachers() {
      setLoadingTeachers(true);
      try {
        const tSnap = await getDocs(collection(db, "teachers"));
        const all = tSnap.docs.map((d) => {
          const td = d.data() || {};
          const fn = td.firstName || td.firstname || "";
          const mn = td.middleName || td.middlename || "";
          const ln = td.lastName || td.lastname || "";
          const name =
            [fn, mn, ln].map((s) => (s || "").trim()).filter(Boolean).join(" ") ||
            d.id;
          const profilePicUrl = td.profilePicUrl || td.photoURL || "";
          return { teacherId: d.id, name, profilePicUrl };
        });
        all.sort((a, b) => a.name.localeCompare(b.name));
        if (active) setAllTeachers(all);
      } catch (e) {
        console.error("useTeachers load error:", e);
      } finally {
        if (active) setLoadingTeachers(false);
      }
    }
    loadTeachers();
    return () => {
      active = false;
    };
  }, []);

  // When section changes, compute teachersInSection
  useEffect(() => {
    if (!selectedSection) {
      setTeachersInSection([]);
      return;
    }
    const sectionClasses = classes.filter(
      (c) => (c.section || "").trim() === selectedSection
    );
    const teacherIds = Array.from(
      new Set(sectionClasses.map((c) => c.teacherId).filter(Boolean))
    );
    const filtered = allTeachers.filter((t) => teacherIds.includes(t.teacherId));
    setTeachersInSection(filtered.sort((a, b) => a.name.localeCompare(b.name)));
  }, [selectedSection, classes, allTeachers]);

  return { allTeachers, teachersInSection, loadingTeachers };
}