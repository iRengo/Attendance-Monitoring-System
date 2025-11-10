import { useEffect, useState, useMemo } from "react";
import TeacherLayout from "../../components/teacherLayout";
import { auth, db } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  FileDown,
  Clock,
  Layers,
  RefreshCcw,
  Timer,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Components
import HeaderCard from "./components/teacherSchedules/HeaderCard";
import ClassAccordion from "./components/teacherSchedules/ClassAccordion";
import SessionTable from "./components/teacherSchedules/SessionTable";  
import ExportButtons from "./components/teacherSchedules/ExportButtons";  
import SkeletonLine from "./components/teacherSchedules/SkeletonLine";

/**
 * Page: TeacherSchedules
 * Handles data fetching & state; delegates UI to components in teacher/components/teacherSchedules.
 */
export default function TeacherSchedules() {
  const teacherId = auth.currentUser?.uid;

  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [selectedClassId, setSelectedClassId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [expandedClasses, setExpandedClasses] = useState({});

  // Fetch classes
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

  function escapeCSV(v) {
    if (v == null) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  // Export handlers
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

  return (
    <TeacherLayout title="Class Schedules">
      <div className="p-6 space-y-8">
        <HeaderCard />

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
                  <ClassAccordion
                    key={cls.id}
                    cls={cls}
                    isOpen={isOpen}
                    onToggle={() => toggleExpand(cls.id)}
                  >
                    {/* Expanded Panel Content */}
                    <div className="bg-gray-50 px-4 pb-4 pt-2">
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
                        <ExportButtons
                          disabledForClass={selectedClassId !== cls.id}
                          hasSessions={sessions.length > 0}
                          onExportCSV={exportCSV}
                          onExportPDF={exportPDF}
                          onRefresh={refreshSelectedSessions}
                        />
                      </div>

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
                        <SessionTable
                          sessions={sessions}
                          formatDateTime={formatDateTime}
                        />
                      )}
                    </div>
                  </ClassAccordion>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </TeacherLayout>
  );
}