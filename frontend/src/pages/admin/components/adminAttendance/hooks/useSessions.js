import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../../../firebase";

export default function useSessions(selectedSection, selectedTeacher) {
  const [sectionSessions, setSectionSessions] = useState([]);
  const [teacherSessionsNoSection, setTeacherSessionsNoSection] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Load sessions for section
  useEffect(() => {
    let active = true;
    async function loadSection() {
      if (!selectedSection) {
        setSectionSessions([]);
        return;
      }
      setLoadingSessions(true);
      try {
        const clsSnap = await getDocs(collection(db, "classes"));
        const cls = clsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const sectionClasses = cls.filter(
          (c) => (c.section || "").trim() === selectedSection
        );
        const classIds = sectionClasses.map((c) => c.id);

        // chunk for 'in'
        const chunks = [];
        for (let i = 0; i < classIds.length; i += 10) {
          chunks.push(classIds.slice(i, i + 10));
        }

        const gathered = [];
        for (const chunk of chunks) {
          if (!chunk.length) continue;
            const qSess = query(
              collection(db, "attendance_sessions"),
              where("classId", "in", chunk)
            );
            const snap = await getDocs(qSess);
            snap.docs.forEach((d) => gathered.push({ id: d.id, ...d.data() }));
        }

        gathered.sort(
          (a, b) =>
            new Date(b.timeStarted || 0).getTime() -
            new Date(a.timeStarted || 0).getTime()
        );
        if (active) setSectionSessions(gathered);
      } catch (e) {
        console.error("useSessions section error:", e);
        if (active) setSectionSessions([]);
      } finally {
        if (active) setLoadingSessions(false);
      }
    }
    loadSection();
    return () => {
      active = false;
    };
  }, [selectedSection]);

  // Load sessions by teacher (when no section)
  useEffect(() => {
    let active = true;
    async function loadByTeacher() {
      if (!selectedTeacher || selectedSection) {
        setTeacherSessionsNoSection([]);
        return;
      }
      setLoadingSessions(true);
      try {
        const qSess = query(
          collection(db, "attendance_sessions"),
          where("teacherId", "==", selectedTeacher.teacherId)
        );
        const snap = await getDocs(qSess);
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort(
            (a, b) =>
              new Date(b.timeStarted || 0).getTime() -
              new Date(a.timeStarted || 0).getTime()
          );
        if (active) setTeacherSessionsNoSection(list);
      } catch (e) {
        console.error("useSessions teacher error:", e);
        if (active) setTeacherSessionsNoSection([]);
      } finally {
        if (active) setLoadingSessions(false);
      }
    }
    loadByTeacher();
    return () => {
      active = false;
    };
  }, [selectedTeacher, selectedSection]);

  return {
    sectionSessions,
    teacherSessionsNoSection,
    loadingSessions,
  };
}