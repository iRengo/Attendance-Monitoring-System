import { useState, useEffect } from "react";
import AdminLayout from "../../components/adminLayout";
import { Users, BookOpen, BarChart3 } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  query,
  limit,
  onSnapshot,
} from "firebase/firestore";

export default function AdminDashboard() {
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalTeachers, setTotalTeachers] = useState(0);

  const [attendancePercent, setAttendancePercent] = useState(0);
  const [presenceData, setPresenceData] = useState([
    { name: "Present", value: 0 },
    { name: "Absent", value: 0 },
  ]);

  const [activities, setActivities] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(activities.length / itemsPerPage);

  // Sample weekly trend (static placeholder)
  const attendanceTrends = [
    { name: "Mon", attendance: 90 },
    { name: "Tue", attendance: 95 },
    { name: "Wed", attendance: 88 },
    { name: "Thu", attendance: 92 },
    { name: "Fri", attendance: 94 },
  ];

  const COLORS = ["#4CAF50", "#F87171"];

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

  // Helpers
  function parseDateGeneric(val) {
    if (!val) return null;
    if (typeof val === "string") {
      const norm = val.replace(/([+-]\d{2})(\d{2})$/, (_, h, m) => `${h}:${m}`);
      const d = new Date(norm);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof val === "number") {
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof val === "object" && val !== null && typeof val.toDate === "function") {
      try {
        const d = val.toDate();
        return isNaN(d.getTime()) ? null : d;
      } catch {
        return null;
      }
    }
    return null;
  }

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

  // Utility to safely pick the first array found among candidate keys
  function pickArrayField(obj, keys) {
    for (const k of keys) {
      const v = obj?.[k];
      if (Array.isArray(v)) return v;
    }
    return null;
  }

  /**
   * Attendance % TODAY
   * - Include ALL documents whose docID ends with today's YYYY-MM-DD (e.g., *_2025-11-08)
   * - Count using studentsPresent and studentsAbsent arrays in EACH doc.
   *   NOTE: We DO NOT deduplicate by student across docs. Each doc (subject) counts separately.
   * - If a doc does not have those arrays, we fallback to entries/attendance_entries.
   * - Percent = totalPresent / (totalPresent + totalAbsent)
   */
  useEffect(() => {
    const todayKey = getTodayKey();
    console.log("[Attendance %] Today key:", todayKey);

    const sessionsRef = collection(db, "attendance_sessions");
    const unsub = onSnapshot(
      sessionsRef,
      (snap) => {
        try {
          console.log("[Attendance %] Snapshot docs count:", snap.size);

          const todayDocs = snap.docs.filter((d) => {
            const idDate = extractDateFromId(d.id);
            const match = idDate === todayKey;
            console.log(
              `[Attendance %] Doc: ${d.id} | extractedDate: ${idDate} | matchesToday: ${match}`
            );
            return match;
          });

          console.log(
            "[Attendance %] Matched doc IDs for today:",
            todayDocs.map((d) => d.id)
          );

          let presentSum = 0;
          let absentSum = 0;

          todayDocs.forEach((docSnap) => {
            const data = docSnap.data() || {};

            // Prefer array fields if present
            const presentArr =
              pickArrayField(data, [
                "studentsPresent",
                "students_present",
                "present",
                "present_students",
                "presentIds",
                "present_ids",
              ]) || []; // default empty

            const absentArr =
              pickArrayField(data, [
                "studentsAbsent",
                "students_absent",
                "absent",
                "absent_students",
                "absentIds",
                "absent_ids",
              ]) || []; // default empty

            // If arrays exist, use them directly
            if (presentArr.length || absentArr.length) {
              console.log(
                `[Attendance %] Using arrays for ${docSnap.id} | present=${presentArr.length}, absent=${absentArr.length}`
              );
              presentSum += presentArr.length;
              absentSum += absentArr.length;
              return;
            }

            // Fallback: derive counts from entries if arrays missing
            const entries =
              Array.isArray(data.entries)
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
              console.log(
                `[Attendance %] Fallback entries for ${docSnap.id} | present=${p}, absent=${a}`
              );
              presentSum += p;
              absentSum += a;
            } else {
              console.log(`[Attendance %] ${docSnap.id} has no arrays nor entries`);
            }
          });

          const denom = presentSum + absentSum;
          const percent = denom > 0 ? Math.round((presentSum / denom) * 100) : 0;

          console.log(
            `[Attendance %] FINAL today | presentSum=${presentSum}, absentSum=${absentSum}, percent=${percent}%`
          );

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
  }, []); // run once per load

  // Recent activities --------------------------------------------------------
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

  const formatDate = (d) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleString();
    } catch {
      return "";
    }
  };

  return (
    <AdminLayout title="Dashboard">
      <div className="p-6 space-y-8">
        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            title="Total Students"
            value={totalStudents}
            icon={<Users className="text-blue-500" size={32} />}
          />
          <Card
            title="Total Teachers"
            value={totalTeachers}
            icon={<BookOpen className="text-yellow-500" size={32} />}
          />
          <Card
            title="Attendance % Today"
            value={`${attendancePercent}%`}
            icon={<BarChart3 className="text-purple-500" size={32} />}
          />
        </div>

        {/* Graphs Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border rounded-xl shadow-md p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              📈 Attendance Trends (Sample Week)
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={attendanceTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[80, 100]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  stroke="#2563EB"
                  strokeWidth={3}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border rounded-xl shadow-md p-5 flex flex-col items-center justify-center relative">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              🧍‍♂️ Presence vs Absence (Today)
            </h2>
            <div className="flex flex-col items-center relative">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={presenceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {presenceData.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute top-[105px] text-center pointer-events-none">
                <p className="text-2xl font-bold text-gray-800">
                  {attendancePercent}%
                </p>
                <p className="text-sm text-gray-500">Present</p>
              </div>

              <div className="flex mt-4 gap-4 text-sm">
                <div className="flex items-center text-gray-500 gap-1">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  <p>Present / Late</p>
                </div>
                <div className="flex items-center text-gray-500 gap-1">
                  <span className="w-3 h-3 bg-red-400 rounded-full"></span>
                  <p>Absent</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent Activities</h2>

          {activities.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent activities yet.</p>
          ) : (
            <>
              <ul className="divide-y divide-gray-100">
                {activities
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((item) => (
                    <li
                      key={item.id}
                      className="py-2 flex justify-between items-center text-sm"
                    >
                      <span className="text-gray-700">
                        {item.action}
                        {item.details ? `: ${item.details}` : ""}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {item.parsedDate ? formatDate(item.parsedDate) : ""}
                      </span>
                    </li>
                  ))}
              </ul>

              <div className="flex justify-center items-center gap-2 mt-4">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className={`text-sm px-2 py-1 rounded transition ${
                    currentPage === 1
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-gray-700 hover:text-blue-600"
                  }`}
                >
                  Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`text-sm px-2 py-1 rounded transition ${
                      currentPage === i + 1
                        ? "bg-blue-500 text-white"
                        : "text-gray-700 hover:text-blue-600"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`text-sm px-2 py-1 rounded transition ${
                    currentPage === totalPages
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-gray-700 hover:text-blue-600"
                  }`}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function Card({ title, value, icon }) {
  return (
    <div className="p-5 rounded-xl shadow-md border bg-white hover:shadow-lg transition">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-600 text-sm font-medium">{title}</h2>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        {icon}
      </div>
    </div>
  );
}