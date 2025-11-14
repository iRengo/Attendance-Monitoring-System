import { useEffect, useState } from "react";
import { auth, db } from "../../../../../firebase";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import {
  normalizeArrayOrNumericMap,
  normalizeItem,
  sortByDay,
  buildSectionKey,
} from "../utils/scheduleHelpers";

export default function useStudentDashboardData() {
  const [studentId, setStudentId] = useState(null);

  const [announcements, setAnnouncements] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [computedKey, setComputedKey] = useState("");

  const [attendance, setAttendance] = useState({
    present: 0,
    absent: 0,
    late: 0,
    rate: "0%",
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setStudentId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Announcements
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "announcements"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const filtered = data.filter((a) => {
        const isExpired = new Date(a.expiration) < new Date();
        return !isExpired && (a.target === "students" || a.target === "all");
      });
      filtered.sort(
        (a, b) =>
          new Date(b.createdAt?.toDate?.() || 0) -
          new Date(a.createdAt?.toDate?.() || 0)
      );
      setAnnouncements(filtered);
    });
    return () => unsub();
  }, []);

  // Attendance stats
  useEffect(() => {
    if (!studentId) return;
    const attendRef = collection(db, "students", studentId, "attendance");
    const unsub = onSnapshot(
      attendRef,
      (snap) => {
        let present = 0;
        let absent = 0;
        let late = 0;
  
        snap.docs.forEach((d) => {
          const status = String(d.data()?.status || "").toLowerCase();
          if (status === "present") present += 1;
          else if (status === "absent") absent += 1;
          else if (status === "late") late += 1;
        });
  
        // Attendance percentage calculation
        // First 3 lates count as present, after that each late counts as absent
        const effectiveLate = Math.max(late - 3, 0); // extra lates that count as absent
        const totalSessions = present + absent + late;
        const effectivePresent = present + Math.min(late, 3);
        const ratePct = totalSessions
          ? Math.round((effectivePresent / totalSessions) * 100)
          : 0;
  
        setAttendance({
          present, // actual present count
          absent,  // actual absent count
          late,    // actual late count
          rate: `${ratePct}%`,
        });
      },
      () => {
        setAttendance({ present: 0, absent: 0, late: 0, rate: "0%" });
      }
    );
    return () => unsub();
  }, [studentId]);
  
  // Schedules by SectionKey
  useEffect(() => {
    if (!studentId) return;
    const studentRef = doc(db, "students", studentId);
    let unsubSchedule = null;

    const unsubStudent = onSnapshot(
      studentRef,
      (snap) => {
        if (!snap.exists()) {
          setSchedules([]);
          setComputedKey("");
          if (unsubSchedule) unsubSchedule();
          unsubSchedule = null;
          return;
        }
        const data = snap.data() || {};
        const section = String(data.section || "").trim();
        const gradeLevel = String(data.gradelevel ?? data.gradeLevel ?? "").trim();
        const sectionKey = buildSectionKey(gradeLevel, section);
        if (!sectionKey) {
          setSchedules([]);
          setComputedKey("");
          if (unsubSchedule) unsubSchedule();
          unsubSchedule = null;
          return;
        }
        setComputedKey(sectionKey);

        const scheduleRef = doc(db, "schedules", "sectionschedule");
        if (unsubSchedule) unsubSchedule();
        unsubSchedule = onSnapshot(
          scheduleRef,
          (s) => {
            if (!s.exists()) {
              setSchedules([]);
              return;
            }
            const schedData = s.data() || {};
            let bySection =
              schedData[sectionKey] ??
              schedData[section] ??
              schedData[gradeLevel];

            const arr = normalizeArrayOrNumericMap(bySection)
              .map(normalizeItem)
              .filter(Boolean)
              .sort(sortByDay);
            setSchedules(arr);
          },
          () => {
            setSchedules([]);
          }
        );
      },
      () => {
        setSchedules([]);
      }
    );

    return () => {
      unsubStudent();
      if (unsubSchedule) unsubSchedule();
    };
  }, [studentId]);

  // For PDF export need student full doc
  const fetchStudentData = async () => {
    if (!studentId) return null;
    const snap = await getDoc(doc(db, "students", studentId));
    return snap.exists() ? snap.data() : null;
  };

  return {
    studentId,
    attendance,
    announcements,
    schedules,
    computedKey,
    fetchStudentData,
  };
}