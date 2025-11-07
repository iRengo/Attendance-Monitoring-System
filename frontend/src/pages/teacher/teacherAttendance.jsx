import TeacherLayout from "../../components/teacherLayout";
import { Search, Download, RefreshCcw, Users, Clock } from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { auth, db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";

// Utility: normalize ISO strings that end with +0800 (no colon)
function parseDate(str) {
  if (!str || typeof str !== "string") return null;
  let normalized = str;
  const offsetMatch = /([+-]\d{2})(\d{2})$/.exec(str);
  if (offsetMatch) {
    normalized = str.replace(/([+-]\d{2})(\d{2})$/, (_, h, m) => `${h}:${m}`);
  }
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateTime(str) {
  const d = parseDate(str);
  return d ? d.toLocaleString() : "—";
}

function toDateKeyAndLabel(str) {
  const d = parseDate(str);
  if (!d) return { key: "unknown", label: "Unknown date" };
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  const key = `${y}-${m}-${day}`;
  const label = d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return { key, label };
}

export default function TeacherAttendance() {
  // Auth-driven teacherId
  const [teacherId, setTeacherId] = useState(null);
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => setTeacherId(user?.uid || null));
    return () => unsub();
  }, []);

  // UI state
  const [selectedClassId, setSelectedClassId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Data state
  const [classes, setClasses] = useState([]);
  const [rawSessions, setRawSessions] = useState([]); // attendance_sessions docs for the selected class
  const [studentNameCache, setStudentNameCache] = useState({}); // sid -> name
  const [studentIdFieldCache, setStudentIdFieldCache] = useState({}); // sid -> studentId field (display ID)
  const [error, setError] = useState("");

  // Fetch classes created by the teacher
  useEffect(() => {
    if (!teacherId) {
      setClasses([]);
      setLoadingClasses(false);
      return;
    }
    let cancelled = false;
    const fetchClasses = async () => {
      setLoadingClasses(true);
      try {
        const qRef = query(
          collection(db, "classes"),
          where("teacherId", "==", teacherId)
        );
        const snap = await getDocs(qRef);
        if (cancelled) return;
        const cls = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        cls.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );
        setClasses(cls);
      } catch (e) {
        console.error(e);
        setError("Failed to load classes.");
        setClasses([]);
      } finally {
        if (!cancelled) setLoadingClasses(false);
      }
    };
    fetchClasses();
    return () => {
      cancelled = true;
    };
  }, [teacherId, db]);

  // Real-time listener for attendance sessions of the selected class
  useEffect(() => {
    if (!teacherId || !selectedClassId) {
      setRawSessions([]);
      return;
    }
    setLoadingAttendance(true);
    setError("");

    const qRef = query(
      collection(db, "attendance_sessions"),
      where("teacherId", "==", teacherId),
      where("classId", "==", selectedClassId)
    );

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Sort by session start descending if present
        docs.sort(
          (a, b) =>
            new Date(b.timeStarted || 0).getTime() -
            new Date(a.timeStarted || 0).getTime()
        );
        setRawSessions(docs);
        setLoadingAttendance(false);
      },
      (err) => {
        console.error("Attendance sessions error:", err);
        setError("Failed to load attendance sessions.");
        setRawSessions([]);
        setLoadingAttendance(false);
      }
    );

    return () => unsub();
  }, [teacherId, selectedClassId, db]);

  // Build a set of all studentIds (document IDs) to fetch names/IDs for
  const allStudentDocIds = useMemo(() => {
    const ids = new Set();
    for (const session of rawSessions || []) {
      const entries = Array.isArray(session?.entries)
        ? session.entries
        : Array.isArray(session?.attendance_entries)
        ? session.attendance_entries
        : [];
      for (const e of entries) {
        if (e?.student_id) ids.add(String(e.student_id));
      }
    }
    return Array.from(ids);
  }, [rawSessions]);

  // Fetch missing student names and studentId fields
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
              // Prefer studentId field; fallbacks for common variants
              newStuIds[sid] =
                data.studentId ||
                data.student_id ||
                data.schoolId ||
                data.school_id ||
                sid; // last-resort fallback to doc id if field missing
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
  }, [allStudentDocIds, studentNameCache, studentIdFieldCache, db]);

  // Selected class object
  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || null,
    [classes, selectedClassId]
  );

  // Group sessions by calendar date (based on timeStarted), and filter entries via search
  const groupedSessions = useMemo(() => {
    const map = new Map(); // key -> { key, label, sessions: [...] }
    const term = String(searchTerm || "").toLowerCase().trim();

    for (const s of rawSessions || []) {
      const { key, label } = toDateKeyAndLabel(s.timeStarted);
      if (!map.has(key)) map.set(key, { key, label, sessions: [] });

      const entries = Array.isArray(s?.entries)
        ? s.entries
        : Array.isArray(s?.attendance_entries)
        ? s.attendance_entries
        : [];

      const filteredEntries = entries.filter((e) => {
        if (!term) return true;
        const sid = String(e?.student_id || "");
        const sname = String(studentNameCache[sid] || sid).toLowerCase();
        const dispId = String(studentIdFieldCache[sid] || sid).toLowerCase();
        // Search by name, display studentId field, or doc id (fallback)
        return sname.includes(term) || dispId.includes(term) || sid.toLowerCase().includes(term);
      });

      map.get(key).sessions.push({
        ...s,
        filteredEntries,
      });
    }

    const groups = Array.from(map.values());
    // Sort by date descending (newest first), with "unknown" always at the bottom
    groups.sort((a, b) => {
      if (a.key === "unknown" && b.key === "unknown") return 0;
      if (a.key === "unknown") return 1;
      if (b.key === "unknown") return -1;
      // keys are YYYY-MM-DD so lexical compare works; b first => descending
      return b.key.localeCompare(a.key);
    });

    // Sort sessions inside each group by timeStarted desc
    groups.forEach((g) => {
      g.sessions.sort(
        (a, b) =>
          new Date(b.timeStarted || 0).getTime() -
          new Date(a.timeStarted || 0).getTime()
      );
    });
    return groups;
  }, [rawSessions, searchTerm, studentNameCache, studentIdFieldCache]);

  // Export CSV (use studentId field instead of doc id for Student ID column)
  const exportToCSV = useCallback(() => {
    if (!selectedClassId) return;
    const headers = ["Date", "Started", "Ended", "Student ID", "Student Name", "Status", "Time Logged"];
    const term = String(searchTerm || "").toLowerCase().trim();

    const rows = [];
    for (const s of rawSessions || []) {
      const { key } = toDateKeyAndLabel(s.timeStarted);
      const entries = Array.isArray(s?.entries)
        ? s.entries
        : Array.isArray(s?.attendance_entries)
        ? s.attendance_entries
        : [];
      for (const e of entries) {
        const sid = String(e?.student_id || "");
        const sname = String(studentNameCache[sid] || sid);
        const displayId = String(studentIdFieldCache[sid] || sid);
        if (
          !term ||
          sname.toLowerCase().includes(term) ||
          displayId.toLowerCase().includes(term) ||
          sid.toLowerCase().includes(term)
        ) {
          rows.push([
            key,
            formatDateTime(s.timeStarted),
            formatDateTime(s.timeEnded),
            displayId,
            sname,
            e?.status || "unknown",
            e?.timeLogged || "",
          ]);
        }
      }
    }

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `${selectedClassId || "attendance"}_records.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [rawSessions, searchTerm, studentNameCache, studentIdFieldCache, selectedClassId]);

  function escapeCSV(v) {
    if (v == null) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  // Status styling helper
  function statusClass(status) {
    const s = String(status || "").toLowerCase();
    if (s === "present")
      return "bg-green-100 text-green-700 border border-green-200";
    if (s === "absent")
      return "bg-red-100 text-red-700 border border-red-200";
    if (s === "late") return "bg-yellow-100 text-yellow-700 border border-yellow-200";
    return "bg-gray-100 text-gray-600 border border-gray-200";
  }

  // Derived stats
  const classStats = useMemo(() => {
    if (!selectedClassId) return { total: 0, minutes: 0 };
    let minutes = 0;
    rawSessions.forEach((s) => {
      if (s.timeStarted && s.timeEnded) {
        const start = parseDate(s.timeStarted);
        const end = parseDate(s.timeEnded);
        if (start && end) {
          minutes += Math.max(
            0,
            Math.round((end.getTime() - start.getTime()) / 60000)
          );
        }
      }
    });
    return { total: rawSessions.length, minutes };
  }, [rawSessions, selectedClassId]);

  return (
    <TeacherLayout title="Attendance">
      <div className="min-h-screen bg-gray-50 p-10 space-y-8">
        {/* Header */}
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            Attendance Management
          </h1>
          <p className="text-gray-500 text-sm">
            Manage and validate student attendance by class.
          </p>
        </div>

        {/* Filters + Export */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            {/* Class Selector */}
            <div className="flex flex-col w-full sm:w-64">
              <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                <Users size={14} className="text-[#3498db]" /> Class
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] shadow-sm bg-white text-gray-700"
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.subjectName || cls.name || cls.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="flex flex-col w-full sm:w-72">
              <label className="text-xs font-semibold text-gray-600 mb-1">
                <span className="inline-flex items-center gap-1">
                  <Search size={14} className="text-[#3498db]" /> Search
                </span>
              </label>
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] bg-white text-gray-700 placeholder-gray-500 shadow-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedClassId((prev) => prev)}
              disabled={!selectedClassId || loadingAttendance}
              className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition disabled:opacity-40"
            >
              <RefreshCcw size={16} /> Refresh
            </button>
            <button
              onClick={exportToCSV}
              disabled={!selectedClassId}
              className="flex items-center gap-2 bg-[#3498db] hover:bg-[#2f89ca] disabled:opacity-40 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm transition"
            >
              <Download size={18} /> Export CSV
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Grouped-by-date session containers */}
        <div className="space-y-6">
          {!selectedClassId ? (
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 text-sm text-gray-500 italic">
              Select a class to view attendance.
            </div>
          ) : loadingAttendance ? (
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 text-sm text-gray-500">
              Loading attendance...
            </div>
          ) : rawSessions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 text-sm text-gray-500 italic">
              No attendance sessions recorded for this class yet.
            </div>
          ) : (
            groupedSessions.map((group) => (
              <div key={group.key} className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
                <div className="px-6 py-3 bg-gray-50 border-b">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Clock size={14} className="text-indigo-500" />
                    {group.label}
                  </h3>
                </div>

                {/* Each session in this date */}
                {group.sessions.map((sess, idx) => (
                  <div
                    key={sess.id}
                    className={`px-6 py-4 ${idx !== group.sessions.length - 1 ? "border-b" : ""}`}
                  >
                    {/* Removed Session ID display as requested */}
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                      <div className="text-xs text-gray-600 flex gap-3">
                        <span>Started: {formatDateTime(sess.timeStarted)}</span>
                        <span>Ended: {formatDateTime(sess.timeEnded)}</span>
                        <span>
                          Students: <strong>{sess.filteredEntries.length}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Entries table for this session */}
                    {sess.filteredEntries.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">
                        No matching students for this session.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-md border border-gray-200">
                        <table className="min-w-full text-xs">
                          <thead className="bg-gray-100">
                            <tr className="text-gray-700">
                              <th className="px-3 py-2 text-left font-medium">Student ID</th>
                              <th className="px-3 py-2 text-left font-medium">Student Name</th>
                              <th className="px-3 py-2 text-left font-medium">Status</th>
                              <th className="px-3 py-2 text-left font-medium">Time Logged</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {sess.filteredEntries.map((e, i) => {
                              const sid = String(e.student_id || ""); // student doc id (not shown)
                              const sname = studentNameCache[sid] || sid;
                              const displayStudentId = studentIdFieldCache[sid] || sid; // show studentId field instead of doc id
                              return (
                                <tr key={`${sess.id}-${sid}-${i}`} className="hover:bg-blue-50/40 transition">
                                  <td className="px-3 py-2 font-mono text-gray-700">{displayStudentId}</td>
                                  <td className="px-3 py-2 text-gray-700">{sname}</td>
                                  <td className="px-3 py-2">
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium inline-block ${statusClass(
                                        e.status
                                      )}`}
                                    >
                                      {e.status || "unknown"}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-gray-700">
                                    {formatDateTime(e.timeLogged)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer stats for context */}
        {selectedClassId && (
          <div className="flex gap-3 text-xs text-gray-600">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 bg-white">
              <Clock size={12} className="text-indigo-500" />
              Sessions: <strong className="text-gray-800">{classStats.total}</strong>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 bg-white">
              ⏱️ Minutes: <strong className="text-gray-800">{classStats.minutes}</strong>
            </span>
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}