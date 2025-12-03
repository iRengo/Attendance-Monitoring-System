import { useState, useEffect, useMemo, useRef } from "react";
import AdminLayout from "../../components/adminLayout";
import { db } from "../../firebase";
import { collection, getDocs, onSnapshot } from "firebase/firestore";

// Components
import Card from "./components/adminDashboard/Card";
import AttendanceTrendsChart from "./components/adminDashboard/AttendanceTrendsChart";
import PresencePie from "./components/adminDashboard/PresencePie";
import RecentActivities from "./components/adminDashboard/RecentActivities";

/**
 * This version measures the available viewport width to the right of the
 * Dashboard container's left edge and constrains the dashboard content to
 * that available width. This makes the content "fill the space on the left"
 * (i.e. beside the sidebar) and prevents it from being cut off on the right.
 *
 * It does not change desktop dimensions — it only computes and applies a
 * maxWidth for the dashboard content based on the current left offset.
 */
export default function AdminDashboard() {
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [attendancePercent, setAttendancePercent] = useState(0);
  const [presenceData, setPresenceData] = useState([
    { name: "Present", value: 0 },
    { name: "Absent", value: 0 },
  ]);
  const [activities, setActivities] = useState([]);

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

  useEffect(() => {
    const todayKey = getTodayKey();
    const sessionsRef = collection(db, "attendance_sessions");

    const unsub = onSnapshot(
      sessionsRef,
      (snap) => {
        try {
          const todayDocs = snap.docs.filter((d) => extractDateFromId(d.id) === todayKey);
          let presentSet = new Set();
          let absentSet = new Set();

          todayDocs.forEach((docSnap) => {
            const data = docSnap.data() || {};

            const presentArr = pickArrayField(data, ["studentsPresent", "present", "presentIds"]) || [];
            const absentArr = pickArrayField(data, ["studentsAbsent", "absent", "absentIds"]) || [];

            presentArr.forEach((id) => presentSet.add(id));
            absentArr.forEach((id) => absentSet.add(id));

            if (!presentArr.length && !absentArr.length && Array.isArray(data.entries)) {
              data.entries.forEach((e) => {
                const st = (e?.status || "unknown").toLowerCase();
                if (st === "present" || st === "late") presentSet.add(e.studentId || e.id);
                else if (st === "absent") absentSet.add(e.studentId || e.id);
              });
            }
          });

          absentSet.forEach((id) => {
            if (presentSet.has(id)) absentSet.delete(id);
          });

          const presentCount = presentSet.size;
          const absentCount = absentSet.size;
          const percent = presentCount + absentCount > 0 ? Math.round((presentCount / (presentCount + absentCount)) * 100) : 0;

          setAttendancePercent(percent);
          setPresenceData([
            { name: "Present", value: presentCount },
            { name: "Absent", value: absentCount },
          ]);
        } catch (err) {
          console.error(err);
        }
      },
      (err) => console.error(err)
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    const qAct = collection(db, "recent_activities");
    const unsubscribe = onSnapshot(qAct, (snapshot) => {
      try {
        const list = snapshot.docs.map((d) => {
          const data = d.data();
          const parsedDate = data.timestamp?.toDate?.() || new Date();
          return {
            id: d.id,
            action: data.action || "Activity",
            details: data.details || "",
            actor: data.actor || "Admin",
            parsedDate,
          };
        });
        list.sort((a, b) => b.parsedDate - a.parsedDate);
        setActivities(list);
      } catch (err) {
        console.error(err);
      }
    });
    return () => unsubscribe();
  }, []);

  // ---- NEW: measure available width to prevent right-side cutoff ----
  const wrapperRef = useRef(null);
  const [availableWidth, setAvailableWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 0);

  useEffect(() => {
    const measure = () => {
      if (!wrapperRef.current) {
        setAvailableWidth(window.innerWidth);
        return;
      }
      const rect = wrapperRef.current.getBoundingClientRect();
      // available width to the right of wrapper's left edge (fit to viewport)
      const avail = Math.max(0, Math.floor(window.innerWidth - rect.left - 16)); // 16px safety padding
      setAvailableWidth(avail || window.innerWidth);
    };

    // initial measure and a delayed re-measure to catch layout changes after mount
    measure();
    const delayed = setTimeout(measure, 300); // catches post-mount layout shifts
    const ro = new ResizeObserver(measure);
    ro.observe(document.documentElement);
    window.addEventListener("resize", measure);

    return () => {
      clearTimeout(delayed);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // ---- End measurement logic ----

  // NOTE: we do not change desktop dimensions; we only constrain the dashboard content
  // to not exceed the measured available width. On desktop `rect.left` will usually be the
  // left offset of the main content, so maxWidth becomes (viewport - left).
  const contentStyle = {
    width: "100%",
    maxWidth: availableWidth ? `${availableWidth}px` : "100%",
    boxSizing: "border-box",
  };

  return (
    <AdminLayout title="Dashboard">
      {/* top-level wrapper that we measure */}
      <div ref={wrapperRef} style={contentStyle} className="mx-auto">
        <div className="px-4 py-4 sm:px-1 sm:py-6 space-y-6 sm:space-y-8 w-full box-border">
          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 min-h-0">
            <div className="min-w-0 w-full overflow-hidden">
              <div className="w-full box-border">
                <Card title="Total Students" value={totalStudents} iconName="users" />
              </div>
            </div>
            <div className="min-w-0 w-full overflow-hidden">
              <div className="w-full box-border">
                <Card title="Total Teachers" value={totalTeachers} iconName="book" />
              </div>
            </div>
            <div className="min-w-0 w-full overflow-hidden">
              <div className="w-full box-border">
                <Card title="Attendance % Today" value={`${attendancePercent}%`} iconName="chart" />
              </div>
            </div>
          </div>

          {/* Graphs Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start min-h-0">
            <div className="lg:col-span-2 min-w-0 w-full overflow-hidden">
              <div className="w-full max-w-full overflow-hidden min-w-0">
                <AttendanceTrendsChart data={attendanceTrends} className="w-full max-w-full" />
              </div>
            </div>
            <div className="lg:col-span-1 min-w-0 w-full overflow-hidden">
              <div className="w-full max-w-full overflow-hidden">
                <PresencePie presenceData={presenceData} attendancePercent={attendancePercent} className="w-full h-56 max-w-full" />
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="w-full min-w-0 overflow-hidden break-words">
            <RecentActivities activities={activities} />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}