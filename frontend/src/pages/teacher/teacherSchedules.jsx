import { useEffect, useState, useMemo } from "react";
import TeacherLayout from "../../components/teacherLayout";
import { auth, db } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Clock, Layers, Timer, ChevronDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Components
import HeaderCard from "./components/teacherSchedules/HeaderCard";
import ClassAccordion from "./components/teacherSchedules/ClassAccordion";
import SessionTable from "./components/teacherSchedules/SessionTable";
import ExportButtons from "./components/teacherSchedules/ExportButtons";
import SkeletonLine from "./components/teacherSchedules/SkeletonLine";

export default function TeacherSchedules() {
  const teacherId = auth.currentUser?.uid;

  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState({});
  const [expandedYears, setExpandedYears] = useState({});

  // Current school year (June-May)
  const currentSchoolYear = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  }, []);

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      if (!teacherId) return;
      setLoadingClasses(true);
      try {
        const qRef = query(collection(db, "classes"), where("teacherId", "==", teacherId));
        const snap = await getDocs(qRef);
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setClasses(items);
      } catch (e) {
        console.error("Failed to load classes:", e);
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, [teacherId]);

  // Group classes by schoolYear
  const classesBySchoolYear = useMemo(() => {
    const grouped = {};
    classes.forEach((cls) => {
      const year = cls.schoolYear || currentSchoolYear;
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(cls);
    });

    // Sort: current year first
    const sortedYears = Object.keys(grouped).sort((a, b) => {
      if (a === currentSchoolYear) return -1;
      if (b === currentSchoolYear) return 1;
      return a.localeCompare(b);
    });

    const result = {};
    sortedYears.forEach((y) => (result[y] = grouped[y]));
    return result;
  }, [classes, currentSchoolYear]);

  // Fetch sessions for selected class
  useEffect(() => {
    const fetchSessions = async () => {
      if (!teacherId || !selectedClassId) {
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
        rows.sort((a, b) => new Date(b.timeStarted || 0) - new Date(a.timeStarted || 0));
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

  const selectedClass = useMemo(() => classes.find((c) => c.id === selectedClassId), [classes, selectedClassId]);

  function toggleExpand(classId) {
    setExpandedClasses((prev) => ({ ...prev, [classId]: !prev[classId] }));
    setSelectedClassId(classId);
  }

  function toggleYear(year) {
    setExpandedYears((prev) => ({ ...prev, [year]: !prev[year] }));
  }

  function formatDateTime(val) {
    if (!val) return "—";
    const offsetMatch = /([+-]\d{2})(\d{2})$/.exec(val);
    if (offsetMatch) val = val.replace(/([+-]\d{2})(\d{2})$/, (_, h, m) => `${h}:${m}`);
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toLocaleString();
  }

  function getClassSubject(classId) {
    const c = classes.find((cl) => cl.id === classId);
    return c?.subjectName || c?.name || "Unknown";
  }

  function classStatsForSessions(sessions) {
    let minutes = 0;
    sessions.forEach((s) => {
      if (s.timeStarted && s.timeEnded) {
        minutes += Math.max(0, Math.round((new Date(s.timeEnded) - new Date(s.timeStarted)) / 60000));
      }
    });
    return { total: sessions.length, minutes, lastStarted: sessions[0]?.timeStarted || null };
  }

  function escapeCSV(v) {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  const exportCSV = () => {
    if (!selectedClassId || sessions.length === 0) return;
    const header = ["Session ID", "Class ID", "Subject", "Time Started", "Time Ended", "Duration (mins)"];
    const rows = sessions.map((s) => [
      s.id,
      s.classId,
      getClassSubject(s.classId),
      formatDateTime(s.timeStarted),
      formatDateTime(s.timeEnded),
      s.timeStarted && s.timeEnded ? Math.round((new Date(s.timeEnded) - new Date(s.timeStarted)) / 60000) : "",
    ]);
    const csv = "data:text/csv;charset=utf-8," + [header, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = encodeURI(csv);
    a.download = `attendance_sessions_${selectedClassId}.csv`;
    a.click();
  };

  const exportPDF = () => {
    if (!selectedClassId || sessions.length === 0) return;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Attendance Sessions", 14, 18);
    if (selectedClass) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Class: ${selectedClass.subjectName || selectedClass.name || selectedClass.id}`, 14, 26);
    }
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);

    const tableRows = sessions.map((s) => [
      s.id,
      getClassSubject(s.classId),
      formatDateTime(s.timeStarted),
      formatDateTime(s.timeEnded),
      s.timeStarted && s.timeEnded ? `${Math.round((new Date(s.timeEnded) - new Date(s.timeStarted)) / 60000)} min` : "—",
    ]);

    autoTable(doc, {
      head: [["Session ID", "Subject", "Time Started", "Time Ended", "Duration"]],
      body: tableRows,
      startY: 38,
      theme: "striped",
      headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 9 },
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("System-generated report.", 14, pageHeight - 10);
    doc.save(`attendance_sessions_${selectedClassId}.pdf`);
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
            <div>Loading classes...</div>
          ) : classes.length === 0 ? (
            <div className="text-sm text-gray-500 italic">You don’t have any classes yet.</div>
          ) : (
            <div className="space-y-4">
              {Object.entries(classesBySchoolYear).map(([year, clsList]) => (
                <div key={year} className="border border-gray-200 rounded-xl">
                  {/* Year header */}
                  <div
                    className="flex justify-between items-center px-4 py-4.5 cursor-pointer bg-blue-600 hover:bg-blue-400 rounded-t-xl"
                    onClick={() => toggleYear(year)}
                  >
                    <span className="font-medium">{year === currentSchoolYear ? "Current School Year" : `School Year ${year}`}</span>
                    <ChevronDown
                      className={`transition-transform duration-200 ${expandedYears[year] ? "rotate-180" : ""}`}
                    />
                  </div>

                  {/* Classes under this year */}
                  {expandedYears[year] && (
                    <ul className="space-y-3 p-4">
                      {clsList.map((cls) => {
                        const isOpen = expandedClasses[cls.id] === true;
                        const classStats = classStatsForSessions(selectedClassId === cls.id ? sessions : []);
                        return (
                          <ClassAccordion key={cls.id} cls={cls} isOpen={isOpen} onToggle={() => toggleExpand(cls.id)}>
                            <div className="bg-gray-50 px-4 pb-4 pt-2">
                              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-gray-200">
                                    <Clock size={12} className="text-indigo-500" />
                                    Sessions: <span className="font-semibold text-gray-800">{selectedClassId === cls.id ? sessions.length : "—"}</span>
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-gray-200">
                                    <Timer size={12} className="text-amber-600" />
                                    Minutes: <span className="font-semibold text-gray-800">{selectedClassId === cls.id ? classStats.minutes : "—"}</span>
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
                              ) : sessions.length === 0 ? (
                                <div className="text-xs text-gray-500 italic">No attendance sessions recorded for this class yet.</div>
                              ) : (
                                <SessionTable sessions={sessions} formatDateTime={formatDateTime} />
                              )}
                            </div>
                          </ClassAccordion>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </TeacherLayout>
  );
}
