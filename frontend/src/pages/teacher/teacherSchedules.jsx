import { useEffect, useState, useMemo } from "react";
import TeacherLayout from "../../components/teacherLayout";
import { auth, db } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  FileDown,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
  Timer,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * TeacherSchedules
 * Attractive accordion-style list of teacher classes.
 * - First shows classes created by the teacher.
 * - Clicking a class expands to show its attendance sessions.
 * - Pretty badges, chips, and subtle animations.
 * - Export CSV/PDF for the selected class' sessions.
 */
export default function TeacherSchedules() {
  const teacherId = auth.currentUser?.uid;

  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [selectedClassId, setSelectedClassId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [expandedClasses, setExpandedClasses] = useState({});

  // Fetch teacher's classes
  useEffect(() => {
    const fetchClasses = async () => {
      if (!teacherId) return;
      setLoadingClasses(true);
      try {
        const qRef = query(collection(db, "classes"), where("teacherId", "==", teacherId));
        const snap = await getDocs(qRef);
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        items.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );
        setClasses(items);
      } catch (e) {
        console.error("Failed to load classes:", e);
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, [teacherId]);

  // Fetch sessions for selected class
  useEffect(() => {
    const fetchSessions = async () => {
      if (!teacherId) return;
      if (!selectedClassId) {
        setSessions([]);
        return;
      }
      setLoadingSessions(true);
      try {
        const qRef = query(
          collection(db, "attendance_sessions"),
          where("teacherId", "==", teacherId),
          where("classId", "==", selectedClassId)
        );
        const snap = await getDocs(qRef);
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort(
          (a, b) =>
            new Date(b.timeStarted || 0).getTime() -
            new Date(a.timeStarted || 0).getTime()
        );
        setSessions(rows);
      } catch (e) {
        console.error("Failed to load attendance sessions:", e);
        setSessions([]);
      } finally {
        setLoadingSessions(false);
      }
    };
    fetchSessions();
  }, [teacherId, selectedClassId]);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId),
    [classes, selectedClassId]
  );

  function toggleExpand(classId) {
    setExpandedClasses((prev) => ({
      ...prev,
      [classId]: !prev[classId],
    }));
    setSelectedClassId(classId);
  }

  function formatDateTime(val) {
    if (!val) return "—";
    let normalized = val;
    const offsetMatch = /([+-]\d{2})(\d{2})$/.exec(val);
    if (offsetMatch) {
      normalized = val.replace(/([+-]\d{2})(\d{2})$/, (_, h, m) => `${h}:${m}`);
    }
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleString();
  }

  function getClassSubject(classId) {
    const c = classes.find((cl) => cl.id === classId);
    return c?.subjectName || c?.name || "Unknown";
  }

  // Stats for expanded (selected) class (used inside the panel only)
  const classStats = useMemo(() => {
    if (!selectedClassId) return { total: 0, minutes: 0, lastStarted: null };
    let minutes = 0;
    let lastStarted = sessions[0]?.timeStarted || null;
    sessions.forEach((s) => {
      if (s.timeStarted && s.timeEnded) {
        minutes += Math.max(
          0,
          Math.round((new Date(s.timeEnded).getTime() - new Date(s.timeStarted).getTime()) / 60000)
        );
      }
    });
    return { total: sessions.length, minutes, lastStarted };
  }, [selectedClassId, sessions]);

  const exportCSV = () => {
    if (!selectedClassId || sessions.length === 0) return;
    const header = ["Session ID", "Class ID", "Subject", "Time Started", "Time Ended", "Duration (mins)"];
    const rows = sessions.map((s) => {
      const duration =
        s.timeStarted && s.timeEnded
          ? Math.round(
              (new Date(s.timeEnded).getTime() -
                new Date(s.timeStarted).getTime()) / 60000
            )
          : "";
      return [
        s.id,
        s.classId,
        getClassSubject(s.classId),
        formatDateTime(s.timeStarted),
        formatDateTime(s.timeEnded),
        duration,
      ];
    });

    const csv =
      "data:text/csv;charset=utf-8," +
      [header, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = encodeURI(csv);
    a.download = `attendance_sessions_${selectedClassId}.csv`;
    a.click();
  };

  function escapeCSV(v) {
    if (v == null) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  const exportPDF = () => {
    if (!selectedClassId || sessions.length === 0) return;
    const docPDF = new jsPDF();
    docPDF.setFont("helvetica", "bold");
    docPDF.setFontSize(16);
    docPDF.text("Attendance Sessions", 14, 18);

    if (selectedClass) {
      docPDF.setFontSize(11);
      docPDF.setFont("helvetica", "normal");
      docPDF.text(
        `Class: ${selectedClass.subjectName || selectedClass.name || selectedClass.id}`,
        14,
        26
      );
    }

    docPDF.setFontSize(9);
    docPDF.setTextColor(100);
    docPDF.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);

    const tableRows = sessions.map((s) => {
      const duration =
        s.timeStarted && s.timeEnded
          ? Math.round(
              (new Date(s.timeEnded).getTime() -
                new Date(s.timeStarted).getTime()) /
                60000
            )
          : "";
      return [
        s.id,
        getClassSubject(s.classId),
        formatDateTime(s.timeStarted),
        formatDateTime(s.timeEnded),
        duration ? `${duration} min` : "—",
      ];
    });

    autoTable(docPDF, {
      head: [["Session ID", "Subject", "Time Started", "Time Ended", "Duration"]],
      body: tableRows,
      startY: 38,
      theme: "striped",
      headStyles: {
        fillColor: [52, 152, 219],
        textColor: 255,
        fontStyle: "bold",
      },
      styles: { fontSize: 9 },
    });

    const pageHeight = docPDF.internal.pageSize.getHeight();
    docPDF.setFontSize(8);
    docPDF.setTextColor(120);
    docPDF.text("System-generated report.", 14, pageHeight - 10);

    docPDF.save(`attendance_sessions_${selectedClassId}.pdf`);
  };

  function refreshSelectedSessions() {
    setSelectedClassId((prev) => (prev ? prev : prev));
  }

  // Skeleton loaders
  const SkeletonLine = ({ w = "w-40" }) => (
    <div className={`h-3 rounded ${w} bg-gray-200 animate-pulse`} />
  );

  return (
    <TeacherLayout title="Class Schedules">
      <div className="p-6 space-y-8">
        {/* Decorative header card (stats removed as requested) */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
          <div className="p-6">
            <h1 className="text-2xl md:text-3xl font-bold text-[#1f376b]">
              Manage Attendance Sessions
            </h1>
            <p className="text-sm text-[#415CA0]/80 mt-1">
              Select a class to view its session history, download logs, and review timings.
            </p>
          </div>
        </div>

        {/* Classes accordion */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <Layers className="text-blue-500" /> Your Classes
          </h2>

          {loadingClasses ? (
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-gray-200">
                <SkeletonLine w="w-56" />
                <div className="mt-2 flex gap-2">
                  <SkeletonLine w="w-28" />
                  <SkeletonLine w="w-24" />
                  <SkeletonLine w="w-20" />
                </div>
              </div>
              <div className="p-4 rounded-xl border border-gray-200">
                <SkeletonLine w="w-48" />
                <div className="mt-2 flex gap-2">
                  <SkeletonLine w="w-36" />
                  <SkeletonLine w="w-16" />
                </div>
              </div>
            </div>
          ) : classes.length === 0 ? (
            <div className="text-sm text-gray-500 italic">
              You don’t have any classes yet.
            </div>
          ) : (
            <ul className="space-y-3">
              {classes.map((cls) => {
                const isOpen = expandedClasses[cls.id] === true;

                return (
                  <li
                    key={cls.id}
                    className="group border border-gray-200 rounded-xl overflow-hidden bg-white transition hover:shadow-md"
                  >
                    <button
                      onClick={() => toggleExpand(cls.id)}
                      className="w-full flex justify-between items-center gap-3 px-4 py-3 text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-1.5 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500 group-hover:from-indigo-500 group-hover:to-blue-500 transition" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900">
                              {cls.subjectName || cls.name || "Untitled Class"}
                            </p>
                            {cls.section && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                                Section: {cls.section}
                              </span>
                            )}
                            {cls.gradeLevel && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                Grade: {cls.gradeLevel}
                              </span>
                            )}
                            {cls.roomNumber && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                Room: {cls.roomNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {cls.days || "—"} {cls.time ? `• ${cls.time}` : ""}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-gray-500 transition-transform ${
                          isOpen ? "rotate-180" : "rotate-0"
                        }`}
                      >
                        <ChevronDown size={18} />
                      </span>
                    </button>

                    {/* Expanded panel */}
                    {isOpen && (
                      <div className="bg-gray-50 px-4 pb-4 pt-2">
                        {/* Actions */}
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-gray-200">
                              <Clock size={12} className="text-indigo-500" />
                              Sessions:{" "}
                              <span className="font-semibold text-gray-800">
                                {selectedClassId === cls.id ? sessions.length : "—"}
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-gray-200">
                              <Timer size={12} className="text-amber-600" />
                              Minutes:{" "}
                              <span className="font-semibold text-gray-800">
                                {selectedClassId === cls.id ? classStats.minutes : "—"}
                              </span>
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={exportPDF}
                              disabled={sessions.length === 0 || selectedClassId !== cls.id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 text-xs font-medium hover:bg-indigo-50 disabled:opacity-40"
                              title="Export PDF for this class"
                            >
                              <FileDown size={14} /> PDF
                            </button>
                            <button
                              onClick={exportCSV}
                              disabled={sessions.length === 0 || selectedClassId !== cls.id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-40"
                              title="Export CSV for this class"
                            >
                              <FileDown size={14} /> CSV
                            </button>
                            <button
                              onClick={refreshSelectedSessions}
                              disabled={selectedClassId !== cls.id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-100 disabled:opacity-40"
                              title="Refresh"
                            >
                              <RefreshCcw size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Sessions list */}
                        {selectedClassId !== cls.id ? (
                          <p className="text-xs text-gray-400">Loading sessions...</p>
                        ) : loadingSessions ? (
                          <div className="space-y-2">
                            <div className="p-3 rounded-md border border-gray-200 bg-white">
                              <SkeletonLine w="w-32" />
                              <div className="mt-2 flex gap-2">
                                <SkeletonLine w="w-24" />
                                <SkeletonLine w="w-20" />
                              </div>
                            </div>
                            <div className="p-3 rounded-md border border-gray-200 bg-white">
                              <SkeletonLine w="w-28" />
                              <div className="mt-2 flex gap-2">
                                <SkeletonLine w="w-24" />
                                <SkeletonLine w="w-16" />
                              </div>
                            </div>
                          </div>
                        ) : sessions.length === 0 ? (
                          <div className="text-xs text-gray-500 italic">
                            No attendance sessions recorded for this class yet.
                          </div>
                        ) : (
                          <div className="max-h-72 overflow-y-auto rounded-md border border-gray-200 bg-white">
                            <table className="min-w-full text-xs">
                              <thead className="bg-gray-100 sticky top-0 z-10">
                                <tr className="text-gray-700">
                                  {/* Removed Session column */}
                                  <th className="px-3 py-2 text-left font-medium">Started</th>
                                  <th className="px-3 py-2 text-left font-medium">Ended</th>
                                  <th className="px-3 py-2 text-left font-medium">Duration</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {sessions.map((s, idx) => {
                                  const duration =
                                    s.timeStarted && s.timeEnded
                                      ? Math.round(
                                          (new Date(s.timeEnded).getTime() -
                                            new Date(s.timeStarted).getTime()) /
                                            60000
                                        )
                                      : null;
                                  return (
                                    <tr
                                      key={s.id}
                                      className={`transition ${
                                        idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                                      } hover:bg-blue-50/50`}
                                    >
                                      {/* Removed Session ID cell */}
                                      <td className="px-3 py-2 text-gray-700">
                                        {formatDateTime(s.timeStarted)}
                                      </td>
                                      <td className="px-3 py-2 text-gray-700">
                                        {formatDateTime(s.timeEnded)}
                                      </td>
                                      <td className="px-3 py-2 text-gray-700">
                                        {duration != null ? `${duration} min` : "—"}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </TeacherLayout>
  );
}