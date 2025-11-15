import { useEffect, useState } from "react";
import { auth, db } from "../../../../../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

// Normalize date strings like "2025-11-10T16:39:22+0800" => valid ISO "2025-11-10T16:39:22+08:00"
function toISOWithOffset(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const fixed = dateStr.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const d = new Date(fixed);
  return isNaN(d.getTime()) ? null : d;
}

function useDashboardData() {
  const [teacherId, setTeacherId] = useState(null);

  const [totalClasses, setTotalClasses] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalSubjects, setTotalSubjects] = useState(0);
  const [loading, setLoading] = useState(true);

  const [incomingClass, setIncomingClass] = useState(null);

  const [attendanceData, setAttendanceData] = useState([
    { day: "Mon", Present: 0, Absent: 0 },
    { day: "Tue", Present: 0, Absent: 0 },
    { day: "Wed", Present: 0, Absent: 0 },
    { day: "Thu", Present: 0, Absent: 0 },
    { day: "Fri", Present: 0, Absent: 0 },
  ]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Absent map Mon..Fri -> Set(studentId)
  const [absentMap, setAbsentMap] = useState({
    Mon: new Set(),
    Tue: new Set(),
    Wed: new Set(),
    Thu: new Set(),
    Fri: new Set(),
  });

  // Auth
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => setTeacherId(user?.uid || null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!teacherId) return;

    let isActive = true;
    (async () => {
      setLoading(true);
      try {
        // Fetch classes
        const classesQ = query(collection(db, "classes"), where("teacherId", "==", teacherId));
        const classSnap = await getDocs(classesQ);

        const subjectSet = new Set();
        const studentSet = new Set();
        const classList = [];

        for (const classDoc of classSnap.docs) {
          const classData = classDoc.data() || {};
          const cls = { id: classDoc.id, ...classData };
          classList.push(cls);

          if (classData.subjectName) {
            subjectSet.add(String(classData.subjectName).trim().toLowerCase());
          }

          const studentsRef = collection(db, "classes", classDoc.id, "students");
          const studentsSnap = await getDocs(studentsRef);
          studentsSnap.docs.forEach((s) => studentSet.add(s.id));
        }

        if (!isActive) return;

        setTotalClasses(classSnap.size);
        setTotalSubjects(subjectSet.size);
        setTotalStudents(studentSet.size);

        const nextClass = getNextUpcomingClass(classList);
        setIncomingClass(nextClass);

        // Attendance sessions
        setAttendanceLoading(true);
        const sessions = await fetchAttendanceSessionsForClasses(classList);
        if (!isActive) return;
        const { weeklyData, absentSets } = computeWeeklyAttendance(sessions);
        setAttendanceData(weeklyData);
        setAbsentMap(absentSets);
      } catch (e) {
        console.error("Dashboard fetch error:", e);
      } finally {
        if (isActive) {
          setLoading(false);
          setAttendanceLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [teacherId]);

  return {
    loading,
    totalClasses,
    totalStudents,
    totalSubjects,
    incomingClass,
    attendanceData,
    attendanceLoading,
    absentMap,
  };
}

export default useDashboardData;

// Helpers

async function fetchAttendanceSessionsForClasses(classes) {
  if (!classes?.length) return [];
  const all = [];
  for (const cls of classes) {
    try {
      const sessionsQ = query(collection(db, "attendance_sessions"), where("classId", "==", cls.id));
      const snap = await getDocs(sessionsQ);
      snap.docs.forEach((doc) => {
        const data = doc.data() || {};
        all.push({
          id: doc.id,
          classId: data.classId,
          date: data.date,
          timeStarted: data.timeStarted,
          timeEnded: data.timeEnded,
          studentsPresent: data.studentsPresent,
          studentsAbsent: data.studentsAbsent,
          entries: Array.isArray(data.entries) ? data.entries : [],
        });
      });
    } catch (e) {
      console.warn("Failed to fetch attendance for class", cls.id, e);
    }
  }
  return all;
}

function computeWeeklyAttendance(sessions) {
  const dayMap = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri" };
  const now = new Date();
  const dow = now.getDay(); // 0 Sun..6 Sat
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  monday.setDate(now.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const aggregates = {
    Mon: { Present: 0, Absent: 0 },
    Tue: { Present: 0, Absent: 0 },
    Wed: { Present: 0, Absent: 0 },
    Thu: { Present: 0, Absent: 0 },
    Fri: { Present: 0, Absent: 0 },
  };

  const absentSets = {
    Mon: new Set(),
    Tue: new Set(),
    Wed: new Set(),
    Thu: new Set(),
    Fri: new Set(),
  };

  const resolveCount = (v) => (Array.isArray(v) ? v.length : typeof v === "number" ? v : 0);

  for (const session of sessions) {
    const dt = toISOWithOffset(session.date) || toISOWithOffset(session.timeStarted);
    if (!dt) continue;
    if (dt < monday || dt > sunday) continue;

    const d = dt.getDay();
    if (d === 0 || d === 6) continue;
    const short = dayMap[d];
    if (!short) continue;

    let presentCount = resolveCount(session.studentsPresent);
    let absentCount = resolveCount(session.studentsAbsent);

    if (presentCount === 0 && absentCount === 0 && Array.isArray(session.entries)) {
      for (const entry of session.entries) {
        const status = String(entry?.status || "").toLowerCase();
        if (status === "present") presentCount += 1;
        else if (status === "absent") absentCount += 1;
      }
    }

    aggregates[short].Present += presentCount;
    aggregates[short].Absent += absentCount;

    if (Array.isArray(session.studentsAbsent)) {
      session.studentsAbsent.forEach((sid) => absentSets[short].add(sid));
    } else if (Array.isArray(session.entries)) {
      session.entries
        .filter((e) => String(e.status || "").toLowerCase() === "absent")
        .forEach((e) => absentSets[short].add(e.student_id || e.studentId));
    }
  }

  const weeklyData = [
    { day: "Mon", Present: aggregates.Mon.Present, Absent: aggregates.Mon.Absent },
    { day: "Tue", Present: aggregates.Tue.Present, Absent: aggregates.Tue.Absent },
    { day: "Wed", Present: aggregates.Wed.Present, Absent: aggregates.Wed.Absent },
    { day: "Thu", Present: aggregates.Thu.Present, Absent: aggregates.Thu.Absent },
    { day: "Fri", Present: aggregates.Fri.Present, Absent: aggregates.Fri.Absent },
  ];

  return { weeklyData, absentSets };
}

function getNextUpcomingClass(classes) {
  if (!classes || classes.length === 0) return null;

  const now = new Date();

  const toDateFromPossible = (val) => {
    if (!val) return null;
    // Firestore Timestamp
    if (typeof val === "object" && typeof val.toDate === "function") return val.toDate();
    if (val instanceof Date) return val;
    if (typeof val === "string") return toISOWithOffset(val);
    return null;
  };

  // Compact time formatter: "12pm" or "12:30pm" (lowercase am/pm), omit minutes when zero
  const formatTime = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const h12 = hours % 12 === 0 ? 12 : hours % 12;
    const minutePart = minutes ? `:${String(minutes).padStart(2, "0")}` : "";
    const ampm = hours >= 12 ? "pm" : "am";
    return `${h12}${minutePart}${ampm}`;
  };

  const formatRange = (start, end) => `${formatTime(start)} - ${formatTime(end)}`;

  let nearestClass = null;
  let nearestDiff = Infinity;

  // First, prefer classes that have explicit time_start/time_end timestamps.
  for (const cls of classes) {
    const startDate = toDateFromPossible(cls.time_start || cls.timeStart || cls.timeStartDate);
    const endDate = toDateFromPossible(cls.time_end || cls.timeEnd || cls.timeEndDate);

    if (startDate && endDate) {
      // If class is currently ongoing -> return immediately and label Today if same date
      if (startDate <= now && now <= endDate) {
        return {
          ...cls,
          dayLabel: areSameDate(startDate, now) ? "Today" : weekdayLabel(startDate),
          // IMPORTANT: time is ALWAYS set to a compact time range string (no full date)
          time: formatRange(startDate, endDate),
          time_start: startDate,
          time_end: endDate,
        };
      }

      // If class is later than now, consider for nearest upcoming
      if (startDate > now) {
        const diff = startDate.getTime() - now.getTime();
        if (diff < nearestDiff) {
          nearestDiff = diff;
          nearestClass = {
            ...cls,
            dayLabel: areSameDate(startDate, now) ? "Today" : weekdayLabel(startDate),
            time: formatRange(startDate, endDate), // compact range
            time_start: startDate,
            time_end: endDate,
          };
        }
      }
      continue;
    }

    // If timestamps aren't present, fall through and try to handle legacy "time" strings later
  }

  if (nearestClass) return nearestClass;

  // Fallback: handle classes defined with a "time" string like "8:00 AM - 10:00 AM" and recurring "days".
  const parseTime = (timeStr) => {
    if (!timeStr) return null;
    const [time, meridian] = timeStr.split(" ");
    if (!time || !meridian) return null;
    let [hourStr, minuteStr] = time.split(":");
    let hour = Number(hourStr);
    const minute = Number(minuteStr || 0);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    if (meridian.toUpperCase() === "PM" && hour !== 12) hour += 12;
    if (meridian.toUpperCase() === "AM" && hour === 12) hour = 0;
    return hour * 60 + minute;
  };

  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const currentDay = now.toLocaleString("en-US", { weekday: "long" });
  const todayIndex = daysOfWeek.indexOf(currentDay);
  nearestDiff = Infinity;

  for (const cls of classes) {
    if (!cls?.days || !cls?.time || !cls.time.includes(" - ")) continue;

    const classDays = String(cls.days)
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);

    const [startStr, endStr] = cls.time.split(" - ").map((t) => t.trim());
    const start = parseTime(startStr);
    let end = parseTime(endStr);
    if (start == null || end == null) continue;
    if (end <= start) end += 24 * 60;

    for (const day of classDays) {
      const dayIndex = daysOfWeek.indexOf(day);
      if (dayIndex === -1) continue;

      let diffDays = dayIndex - todayIndex;
      if (diffDays < 0) diffDays += 7;

      const totalMinutesDiff = diffDays * 24 * 60 + start - (now.getHours() * 60 + now.getMinutes());
      const classEndDiff = diffDays * 24 * 60 + end - (now.getHours() * 60 + now.getMinutes());

      if (totalMinutesDiff <= 0 && classEndDiff > 0) {
        // convert startStr/endStr into compact form like "8am - 10am"
        const compact = `${compactFromTimeString(startStr)} - ${compactFromTimeString(endStr)}`;
        return {
          ...cls,
          dayLabel: "Today",
          time: compact,
        };
      }

      if (totalMinutesDiff > 0 && totalMinutesDiff < nearestDiff) {
        nearestDiff = totalMinutesDiff;
        const compact = `${compactFromTimeString(startStr)} - ${compactFromTimeString(endStr)}`;
        nearestClass = {
          ...cls,
          dayLabel: diffDays === 0 ? "Today" : day,
          time: compact,
        };
      }
    }
  }

  return nearestClass;
}

// helpers used in fallback compacting of legacy "8:00 AM" style strings => "8am" or "8:30am"
function compactFromTimeString(timeStr) {
  if (!timeStr) return "";
  const parts = timeStr.trim().split(" ");
  if (parts.length < 2) return timeStr.toLowerCase();
  const [timePart, meridian] = parts;
  const [h, m] = timePart.split(":");
  const hour = Number(h);
  const minute = Number(m || "0");
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const minutePart = minute ? `:${String(minute).padStart(2, "0")}` : "";
  return `${h12}${minutePart}${meridian.toLowerCase()}`;
}

function areSameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function weekdayLabel(date) {
  return date.toLocaleString("en-US", { weekday: "long" });
}