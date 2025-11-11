import { useState, useEffect, useMemo } from "react";
import AdminLayout from "../../components/adminLayout";
import { Users, BookOpen, BarChart3 } from "lucide-react";
import { db } from "../../firebase";
import { collection, getDocs, query, limit, onSnapshot } from "firebase/firestore";

// Components
import Card from "./components/adminDashboard/Card";
import AttendanceTrendsChart from "./components/adminDashboard/AttendanceTrendsChart";
import PresencePie from "./components/adminDashboard/PresencePie";
import RecentActivities from "./components/adminDashboard/RecentActivities";

export default function AdminDashboard() {
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalTeachers, setTotalTeachers] = useState(0);

  const [attendancePercent, setAttendancePercent] = useState(0);
  const [presenceData, setPresenceData] = useState([
    { name: "Present", value: 0 },
    { name: "Absent", value: 0 },
  ]);

  const [activities, setActivities] = useState([]);

  // Sample weekly trend (static placeholder)
  const attendanceTrends = useMemo(
    () => [
      { name: "Mon", attendance: 90 },
      { name: "Tue", attendance: 95 },
      { name: "Wed", attendance: 88 },
      { name: "Thu", attendance: 92 },
      { name: "Fri", attendance: 94 },
    ],
    []
  );

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [studentSnap, teacherSnap] = await Promise.all([
          getDocs(collection(db, "students")),
          getDocs(collection(db, "teachers")),
        ]);
        setTotalStudents(studentSnap.size || 0);
        setTotalTeachers(teacherSnap.size || 0);
      } catch (err) {
        console.error("Failed to fetch counts:", err);
      }
    };
    fetchCounts();
  }, []);

  // Helpers (scoped to this page)
  function getTodayKey() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  function extractDateFromId(id) {
    if (!id) return null;
    const match = id.match(/(\d{4}-\d{2}-\d{2})$/);
    return match ? match[1] : null;
  }
  function pickArrayField(obj, keys) {
    for (const k of keys) {
      const v = obj?.[k];
      if (Array.isArray(v)) return v;
    }
    return null;
  }

  // Attendance % TODAY (live)
  useEffect(() => {
    const todayKey = getTodayKey();
    const sessionsRef = collection(db, "attendance_sessions");
    const unsub = onSnapshot(
      sessionsRef,
      (snap) => {
        try {
          const todayDocs = snap.docs.filter((d) => extractDateFromId(d.id) === todayKey);

          let presentSum = 0;
          let absentSum = 0;

          todayDocs.forEach((docSnap) => {
            const data = docSnap.data() || {};

            const presentArr =
              pickArrayField(data, [
                "studentsPresent",
                "students_present",
                "present",
                "present_students",
                "presentIds",
                "present_ids",
              ]) || [];
            const absentArr =
              pickArrayField(data, [
                "studentsAbsent",
                "students_absent",
                "absent",
                "absent_students",
                "absentIds",
                "absent_ids",
              ]) || [];

            if (presentArr.length || absentArr.length) {
              presentSum += presentArr.length;
              absentSum += absentArr.length;
              return;
            }

            const entries = Array.isArray(data.entries)
              ? data.entries
              : Array.isArray(data.attendance_entries)
              ? data.attendance_entries
              : [];

            if (entries.length) {
              let p = 0;
              let a = 0;
              entries.forEach((e) => {
                const st = (e?.status || "unknown").toLowerCase();
                if (st === "present" || st === "late") p++;
                else if (st === "absent") a++;
                else a++; // treat unknown as absent
              });
              presentSum += p;
              absentSum += a;
            }
          });

          const denom = presentSum + absentSum;
          const percent = denom > 0 ? Math.round((presentSum / denom) * 100) : 0;

          setAttendancePercent(percent);
          setPresenceData([
            { name: "Present", value: presentSum },
            { name: "Absent", value: absentSum },
          ]);
        } catch (err) {
          console.error("Failed to aggregate today's attendance:", err);
        }
      },
      (err) => console.error("Listener error on attendance_sessions:", err)
    );

    return () => unsub();
  }, []);

  // Recent activities (live)
  function parseToDate(val) {
    if (!val && val !== 0) return null;
    if (typeof val === "object" && val !== null && typeof val.toDate === "function") {
      try {
        return val.toDate();
      } catch {
        return null;
      }
    }
    if (typeof val === "string") {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d;
      const num = Number(val);
      if (!isNaN(num)) {
        const d2 = new Date(num);
        if (!isNaN(d2.getTime())) return d2;
      }
      return null;
    }
    if (typeof val === "number") {
      if (val < 1e12) return new Date(val * 1000);
      return new Date(val);
    }
    return null;
  }

  useEffect(() => {
    const qAct = query(collection(db, "recent_activities"), limit(1000));
    const unsubscribe = onSnapshot(
      qAct,
      (snapshot) => {
        try {
          const list = snapshot.docs.map((d) => {
            const data = d.data();
            const raw = data.timestamp ?? data.createdAt ?? data.time ?? null;
            const parsedDate = parseToDate(raw);

            const cleanText = (text = "") =>
              text.replace(/\s*[-—:]?\s*Admin\s*$/i, "").trim();

            const details =
              cleanText(data.details) ||
              cleanText(data.description) ||
              "";

            const action =
              cleanText(data.action) ||
              cleanText(data.title) ||
              "Activity";

            return {
              id: d.id,
              action: action.trim(),
              details: details.trim(),
              actor: data.actor ?? "Admin",
              parsedDate,
            };
          });

          list.sort((a, b) => {
            const ta = a.parsedDate ? a.parsedDate.getTime() : -Infinity;
            const tb = b.parsedDate ? b.parsedDate.getTime() : -Infinity;
            return tb - ta;
          });

          setActivities(list);
        } catch (err) {
          console.error("Failed to process activities:", err);
        }
      },
      (err) => console.error("Failed to listen to recent_activities:", err)
    );

    return () => unsubscribe();
  }, []);

  return (
    <AdminLayout title="Dashboard">
      <div className="p-6 space-y-8">
        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            title="Total Students"
            value={totalStudents}
            iconName="users"
          />
          <Card
            title="Total Teachers"
            value={totalTeachers}
            iconName="book"
          />
          <Card
            title="Attendance % Today"
            value={`${attendancePercent}%`}
            iconName="chart"
          />
        </div>

        {/* Graphs Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AttendanceTrendsChart data={attendanceTrends} className="lg:col-span-2" />
          <PresencePie presenceData={presenceData} attendancePercent={attendancePercent} />
        </div>

        {/* Recent Activities */}
        <RecentActivities activities={activities} />
      </div>
    </AdminLayout>
  );
}