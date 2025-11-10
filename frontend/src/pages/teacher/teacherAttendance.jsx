import TeacherLayout from "../../components/teacherLayout";
import { useEffect, useState, useMemo, useCallback } from "react";
import useTeacherId from "./components/teacherAttendance/hooks/useTeacherId";
import useTeacherClasses from "./components/teacherAttendance/hooks/useTeacherClasses";
import useClassAttendance from "./components/teacherAttendance/hooks/useClassAttendance";
import useStudentDirectory from "./components/teacherAttendance/hooks/useStudentDirectory";
import ClassSelector from "./components/teacherAttendance/ClassSelector";
import SearchBox from "./components/teacherAttendance/SearchBox";
import Toolbar from "./components/teacherAttendance/Toolbar";
import SessionsGroupedList from "./components/teacherAttendance/SessionsGroupedList";
import { toDateKeyAndLabel, formatDateTime, parseDate } from "./components/teacherAttendance/hooks/utils/date";

export default function TeacherAttendance() {
  // Auth-driven teacherId
  const teacherId = useTeacherId();

  // UI state
  const [selectedClassId, setSelectedClassId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Data: classes
  const { classes, loadingClasses, error, setError } = useTeacherClasses(teacherId);

  // Data: attendance sessions (realtime) for selected class
  const { rawSessions, loadingAttendance } = useClassAttendance(
    teacherId,
    selectedClassId,
    setError
  );

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

  // Directory cache: student display name + display ID
  const { studentNameCache, studentIdFieldCache } = useStudentDirectory(allStudentDocIds);

  // Group sessions by calendar date (based on timeStarted), and filter entries via search
  const groupedSessions = useMemo(() => {
    const map = new Map();
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
        return sname.includes(term) || dispId.includes(term) || sid.toLowerCase().includes(term);
      });

      map.get(key).sessions.push({
        ...s,
        filteredEntries,
      });
    }

    const groups = Array.from(map.values());
    groups.sort((a, b) => {
      if (a.key === "unknown" && b.key === "unknown") return 0;
      if (a.key === "unknown") return 1;
      if (b.key === "unknown") return -1;
      return b.key.localeCompare(a.key);
    });

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

  // Derived stats (footer)
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
            <ClassSelector
              classes={classes}
              selectedClassId={selectedClassId}
              onChange={setSelectedClassId}
            />
            <SearchBox searchTerm={searchTerm} onChange={setSearchTerm} />
          </div>

          <Toolbar
            canRefresh={!!selectedClassId && !loadingAttendance}
            onRefresh={() => setSelectedClassId((prev) => prev)}
            canExport={!!selectedClassId}
            onExport={exportToCSV}
          />
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Grouped-by-date session containers */}
        <SessionsGroupedList
          groupedSessions={groupedSessions}
          studentNameCache={studentNameCache}
          studentIdFieldCache={studentIdFieldCache}
          loadingAttendance={loadingAttendance}
          selectedClassId={selectedClassId}
        />

        {/* Footer stats for context */}
        {selectedClassId && (
          <div className="flex gap-3 text-xs text-gray-600">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 bg-white">
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