import { useEffect, useState, useCallback, useMemo } from "react";
import StudentLayout from "../../components/studentLayout";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import {
  FileDown,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Utility: parse date string like "2025-11-07T01:35:07+0800"
function parseAttendanceDate(dateStr) {
  if (!dateStr) return null;
  let normalized = dateStr;
  const offsetMatch = /([+-]\d{2})(\d{2})$/.exec(dateStr);
  if (offsetMatch) {
    normalized = dateStr.replace(/([+-]\d{2})(\d{2})$/, (_, h, m) => `${h}:${m}`);
  }
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(d) {
  if (!d) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatTime(d) {
  if (!d) return "—";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function StudentAttendance() {
  const [studentId, setStudentId] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  // Enrichment caches
  const [classesCache, setClassesCache] = useState({});
  const [teachersCache, setTeachersCache] = useState({});
  const [studentName, setStudentName] = useState("");

  // Simplified filters
  const [statusFilter, setStatusFilter] = useState(""); // "", "present", "absent", "late"
  const [subjectFilter, setSubjectFilter] = useState(""); // exact subjectName match, "" = all

  // Pagination (client-side)
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Export loading state
  const [exporting, setExporting] = useState(false);

  // Track logged-in student
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) setStudentId(user.uid);
      else setStudentId(null);
    });
    return () => unsub();
  }, []);

  // Fetch student name once
  useEffect(() => {
    if (!studentId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "students", studentId));
        if (snap.exists()) {
          const data = snap.data();
          const fullName = `${data.firstname || data.firstName || ""} ${data.middlename || data.middleName || ""} ${data.lastname || data.lastName || ""}`
            .replace(/\s+/g, " ")
            .trim();
          setStudentName(fullName || "Student");
        }
      } catch (e) {
        console.error("Error fetching student doc:", e);
      }
    })();
  }, [studentId]);

  // Live attendance snapshot
  useEffect(() => {
    if (!studentId) return;
    setLoading(true);

    const attendCol = collection(db, "students", studentId, "attendance");
    const q = query(attendCol, orderBy("date", "desc"));

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAttendance(rows);
        setLoading(false);

        const classIds = [...new Set(rows.map((r) => r.classId).filter(Boolean))];
        const teacherIds = [...new Set(rows.map((r) => r.teacherId).filter(Boolean))];

        // Fetch missing class docs
        const newClasses = {};
        await Promise.all(
          classIds.map(async (cid) => {
            if (!classesCache[cid]) {
              try {
                const cSnap = await getDoc(doc(db, "classes", cid));
                newClasses[cid] = cSnap.exists() ? { id: cid, ...cSnap.data() } : null;
              } catch (e) {
                console.error("Error fetching class:", cid, e);
                newClasses[cid] = null;
              }
            }
          })
        );
        if (Object.keys(newClasses).length) {
          setClassesCache((prev) => ({ ...prev, ...newClasses }));
        }

        // Fetch missing teacher docs
        const newTeachers = {};
        await Promise.all(
          teacherIds.map(async (tid) => {
            if (!teachersCache[tid]) {
              try {
                const tSnap = await getDoc(doc(db, "teachers", tid));
                if (tSnap.exists()) {
                  const t = tSnap.data();
                  const fullName = `${t.firstName || t.firstname || ""} ${t.middleName || t.middlename || ""} ${t.lastName || t.lastname || ""}`
                    .replace(/\s+/g, " ")
                    .trim();
                  newTeachers[tid] = fullName || "Unknown Teacher";
                } else {
                  newTeachers[tid] = "Unknown Teacher";
                }
              } catch (e) {
                console.error("Error fetching teacher:", tid, e);
                newTeachers[tid] = "Unknown Teacher";
              }
            }
          })
        );
        if (Object.keys(newTeachers).length) {
          setTeachersCache((prev) => ({ ...prev, ...newTeachers }));
        }
      },
      (err) => {
        console.error("Attendance snapshot error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [studentId, classesCache, teachersCache]);

  // Enrich + filter
  const enrichedRows = useMemo(() => {
    return attendance.map((row) => {
      const classMeta = classesCache[row.classId] || {};
      const teacherName = teachersCache[row.teacherId] || "";
      const dateObj = parseAttendanceDate(row.date);
      return { ...row, classMeta, teacherName, dateObj };
    });
  }, [attendance, classesCache, teachersCache]);

  const filteredRows = useMemo(() => {
    return enrichedRows
      .filter((row) => {
        if (statusFilter && row.status !== statusFilter) return false;
        if (subjectFilter && (row.classMeta?.subjectName || "") !== subjectFilter) return false;
        return true;
      })
      .sort((a, b) => (b.dateObj?.getTime() || 0) - (a.dateObj?.getTime() || 0));
  }, [enrichedRows, statusFilter, subjectFilter]);

  // Build subject dropdown options
  const subjectOptions = useMemo(() => {
    const set = new Set();
    enrichedRows.forEach((r) => {
      if (r.classMeta?.subjectName) set.add(r.classMeta.subjectName);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [enrichedRows]);

  // Quick stats (based on current filter)
  const stats = useMemo(() => {
    const total = filteredRows.length;
    const present = filteredRows.filter((r) => r.status === "present").length;
    const absent = filteredRows.filter((r) => r.status === "absent").length;
    const late = filteredRows.filter((r) => r.status === "late").length;
    return { total, present, absent, late };
  }, [filteredRows]);

  // Pagination
  const paginatedRows = useMemo(() => {
    const startIdx = (page - 1) * pageSize;
    return filteredRows.slice(startIdx, startIdx + pageSize);
  }, [filteredRows, page]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const resetFilters = () => {
    setStatusFilter("");
    setSubjectFilter("");
    setPage(1);
  };

  // CSV Export
  const exportCSV = () => {
    const header = ["Date", "Status", "Subject", "Class ID", "Teacher", "Time Logged"];
    const rows = filteredRows.map((r) => [
      formatDate(r.dateObj),
      r.status || "N/A",
      r.classMeta?.subjectName || "N/A",
      r.classId || "N/A",
      r.teacherName || "N/A",
      r.timeLogged || "—",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [header, ...rows].map((arr) => arr.map(escapeCSV).join(",")).join("\n");

    const a = document.createElement("a");
    a.href = encodeURI(csvContent);
    a.download = `${studentName || "attendance"}_attendance.csv`;
    a.click();
  };

  function escapeCSV(value) {
    if (value == null) return "";
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  // PDF Export
  const exportPDF = useCallback(() => {
    if (exporting) return;
    setExporting(true);
    try {
      const docPDF = new jsPDF();
      docPDF.setFont("helvetica", "bold");
      docPDF.setFontSize(16);
      docPDF.text("Student Attendance Report", 14, 18);

      docPDF.setFontSize(11);
      docPDF.setFont("helvetica", "normal");
      docPDF.text(`Student: ${studentName}`, 14, 26);
      docPDF.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);

      const tableRows = filteredRows.map((r) => [
        formatDate(r.dateObj),
        r.status || "N/A",
        r.classMeta?.subjectName || "N/A",
        r.teacherName || "N/A",
        r.timeLogged ? formatTime(parseAttendanceDate(r.timeLogged)) : "—",
      ]);

      autoTable(docPDF, {
        head: [["Date", "Status", "Subject", "Teacher", "Time Logged"]],
        body: tableRows,
        startY: 38,
        theme: "striped",
        headStyles: { fillColor: [65, 92, 160], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 9 },
      });

      const pageHeight = docPDF.internal.pageSize.getHeight();
      docPDF.setFontSize(8);
      docPDF.setTextColor(120);
      docPDF.text("System-generated report.", 14, pageHeight - 10);

      docPDF.save(`${studentName || "student"}_attendance.pdf`);
    } catch (e) {
      console.error("PDF export error:", e);
    } finally {
      setExporting(false);
    }
  }, [filteredRows, studentName, exporting]);

  // Loading skeleton rows
  const SkeletonRows = ({ rows = 6 }) => (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-3 py-3">
            <div className="h-3.5 w-24 bg-gray-200 rounded" />
          </td>
          <td className="px-3 py-3">
            <div className="h-3.5 w-40 bg-gray-200 rounded" />
          </td>
          <td className="px-3 py-3">
            <div className="h-6 w-20 bg-gray-200 rounded-full" />
          </td>
          <td className="px-3 py-3">
            <div className="h-3.5 w-36 bg-gray-200 rounded" />
          </td>
          <td className="px-3 py-3">
            <div className="h-3.5 w-40 bg-gray-200 rounded" />
          </td>
        </tr>
      ))}
    </>
  );

  return (
    <StudentLayout title="Attendance">
      <div className="space-y-6">

        {/* Top gradient summary */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-indigo-100">
          <div className="p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-[#1f376b]">
                  Hello{studentName ? `, ${studentName}` : ""}!
                </h2>
                <p className="text-sm text-[#415CA0]/80 mt-1">
                  Here’s a quick look at your attendance. {statusFilter || subjectFilter ? "(filtered view)" : ""}
                </p>
              </div>

              {/* Stat chips */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-full bg-white shadow-sm border border-indigo-100 px-3 py-1.5">
                  <BookOpen size={16} className="text-indigo-600" />
                  <span className="text-xs text-[#415CA0]">Records</span>
                  <span className="text-sm font-semibold text-[#1f376b]">{stats.total}</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white shadow-sm border border-green-100 px-3 py-1.5">
                  <CheckCircle2 size={16} className="text-green-600" />
                  <span className="text-xs text-[#415CA0]">Present</span>
                  <span className="text-sm font-semibold text-[#1f376b]">{stats.present}</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white shadow-sm border border-red-100 px-3 py-1.5">
                  <XCircle size={16} className="text-red-600" />
                  <span className="text-xs text-[#415CA0]">Absent</span>
                  <span className="text-sm font-semibold text-[#1f376b]">{stats.absent}</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white shadow-sm border border-amber-100 px-3 py-1.5">
                  <Clock size={16} className="text-amber-600" />
                  <span className="text-xs text-[#415CA0]">Late</span>
                  <span className="text-sm font-semibold text-[#1f376b]">{stats.late}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters + Export */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 md:p-5">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <div className="flex flex-wrap text-gray-600 gap-3">
              {/* Status Dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="border border-gray-300 px-3 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                >
                  <option value="">All</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                </select>
              </div>

              {/* Subject Dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">Subject</label>
                <select
                  value={subjectFilter}
                  onChange={(e) => {
                    setSubjectFilter(e.target.value);
                    setPage(1);
                  }}
                  className="border border-gray-300 px-3 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none min-w-[160px]"
                >
                  <option value="">All</option>
                  {subjectOptions.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset */}
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm text-[#415CA0] border-[#415CA0]/30 hover:bg-[#415CA0]/5 transition"
                title="Reset filters"
              >
                <Filter size={14} /> Clear
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportPDF}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition"
              >
                <FileDown size={16} />
                PDF
              </button>
              <button
                onClick={exportCSV}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#415CA0] text-white hover:bg-[#344c89] transition"
              >
                <FileDown size={16} />
                CSV
              </button>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-[#1f376b]">
              <thead className="bg-gray-50 text-left sticky top-0 z-10">
                <tr className="text-gray-700">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Subject</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Teacher</th>
                  <th className="px-4 py-3 font-semibold">Time Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <SkeletonRows rows={8} />
                ) : paginatedRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-gray-500" colSpan={5}>
                      No attendance records found.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => {
                    const dateFormatted = formatDate(row.dateObj);
                    const subject = row.classMeta?.subjectName || "N/A";
                    const teacher = row.teacherName || "—";
                    const timeLoggedDate = parseAttendanceDate(row.timeLogged);
                    const timeLoggedStr = timeLoggedDate
                      ? `${formatDate(timeLoggedDate)} ${formatTime(timeLoggedDate)}`
                      : "—";
                    const statusLabel = (row.status || "").toLowerCase();

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-blue-50/50 transition-colors"
                      >
                        <td className="px-4 py-3">{dateFormatted}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2">
                            <span className="inline-block h-2 w-2 rounded-full bg-indigo-400" />
                            {subject}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              statusLabel === "present"
                                ? "bg-green-100 text-green-700 border border-green-200"
                                : statusLabel === "absent"
                                ? "bg-red-100 text-red-700 border border-red-200"
                                : statusLabel === "late"
                                ? "bg-amber-100 text-amber-700 border border-amber-200"
                                : "bg-gray-100 text-gray-600 border border-gray-200"
                            }`}
                          >
                            {statusLabel === "present" && <CheckCircle2 size={14} />}
                            {statusLabel === "absent" && <XCircle size={14} />}
                            {statusLabel === "late" && <Clock size={14} />}
                            {row.status || "N/A"}
                          </span>
                        </td>
                        <td className="px-4 py-3">{teacher}</td>
                        <td className="px-4 py-3">{timeLoggedStr}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 text-sm px-4 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-[#415CA0]">
              Showing {paginatedRows.length} of {filteredRows.length} record
              {filteredRows.length === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-[#415CA0] disabled:opacity-40 hover:bg-white transition"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <span className="px-2 py-1 text-[#415CA0]">
                Page <span className="font-semibold">{page}</span> / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-[#415CA0] disabled:opacity-40 hover:bg-white transition"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Friendly tip */}
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <BookOpen size={14} className="text-indigo-500" />
          Tip: Use the filters to focus on a specific subject or status. Exports respect your current filters.
        </div>
      </div>
    </StudentLayout>
  );
}