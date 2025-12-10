import { useEffect, useState, useMemo, useCallback } from "react";
import { auth, db } from "../../../../../firebase";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { parseAttendanceDate, formatDate, formatTime } from "../utils/attendanceDate";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function useStudentAttendanceData(pageSize = 10) {
  const [studentId, setStudentId] = useState(null);
  const [studentName, setStudentName] = useState("");
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const [classesCache, setClassesCache] = useState({});
  const [teachersCache, setTeachersCache] = useState({});

  // Filters
  // Filters
const [statusFilter, setStatusFilter] = useState(""); // "", "present", "absent", "late"
const [subjectFilter, setSubjectFilter] = useState("");
const [schoolYearFilter, setSchoolYearFilter] = useState("Current Year"); // ← default to Current Year

  // Pagination
  const [page, setPage] = useState(1);

  // Exporting state
  const [exporting, setExporting] = useState(false);

  // Auth listener
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) setStudentId(user.uid);
      else setStudentId(null);
    });
    return () => unsub();
  }, []);

  // Fetch student name
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

  // Live attendance snapshot + enrichment caches
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

        // Fetch classes
        const newClasses = {};
        await Promise.all(
          classIds.map(async (cid) => {
            if (!classesCache[cid]) {
              try {
                const cSnap = await getDoc(doc(db, "classes", cid));
                newClasses[cid] = cSnap.exists() ? { id: cid, ...cSnap.data() } : null;
              } catch {
                newClasses[cid] = null;
              }
            }
          })
        );
        if (Object.keys(newClasses).length) setClassesCache((prev) => ({ ...prev, ...newClasses }));

        // Fetch teachers
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
              } catch {
                newTeachers[tid] = "Unknown Teacher";
              }
            }
          })
        );
        if (Object.keys(newTeachers).length) setTeachersCache((prev) => ({ ...prev, ...newTeachers }));
      },
      (err) => {
        console.error("Attendance snapshot error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [studentId, classesCache, teachersCache]);

  // Enrich rows
  const enrichedRows = useMemo(() => {
    return attendance.map((row) => {
      const classMeta = classesCache[row.classId] || {};
      const teacherName = teachersCache[row.teacherId] || "";
      const dateObj = parseAttendanceDate(row.date);
      return { ...row, classMeta, teacherName, dateObj };
    });
  }, [attendance, classesCache, teachersCache]);

  // Subject options
  const subjectOptions = useMemo(() => {
    const set = new Set();
  
    enrichedRows.forEach((r) => {
      const rowSchoolYear = r.classMeta?.schoolYear || "Current Year";
  
      // Include only if matches current schoolYearFilter
      if (schoolYearFilter === "Current Year" && !r.classMeta?.schoolYear) {
        if (r.classMeta?.subjectName) set.add(r.classMeta.subjectName);
      } else if (schoolYearFilter !== "Current Year" && r.classMeta?.schoolYear === schoolYearFilter) {
        if (r.classMeta?.subjectName) set.add(r.classMeta.subjectName);
      }
    });
  
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [enrichedRows, schoolYearFilter]);
  

  // School Year options
  const schoolYearOptions = useMemo(() => {
    const set = new Set();
    let hasCurrentYear = false;
  
    enrichedRows.forEach((r) => {
      if (r.classMeta?.schoolYear) {
        set.add(r.classMeta.schoolYear);
      } else {
        hasCurrentYear = true; // mark that we have records with no schoolYear
      }
    });
  
    const years = Array.from(set).sort().reverse();
    if (hasCurrentYear) years.unshift("Current Year"); // only add "Current Year" if there are records with no schoolYear
    return years;
  }, [enrichedRows]);
  
  // Filter + sort
  const filteredRows = useMemo(() => {
    return enrichedRows
      .filter((row) => {
        // Status filter
        if (statusFilter && row.status !== statusFilter) return false;
  
        // Subject filter
        if (subjectFilter && (row.classMeta?.subjectName || "") !== subjectFilter) return false;
  
        // School Year filter
        if (schoolYearFilter) {
          if (schoolYearFilter === "Current Year") {
            // Only include rows with NO schoolYear
            if (row.classMeta?.schoolYear) return false;
          } else {
            // Only include rows with a matching schoolYear
            if (row.classMeta?.schoolYear !== schoolYearFilter) return false;
          }
        }
  
        return true;
      })
      .sort((a, b) => (b.dateObj?.getTime() || 0) - (a.dateObj?.getTime() || 0));
  }, [enrichedRows, statusFilter, subjectFilter, schoolYearFilter]);
  
  

  // Stats
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
  }, [filteredRows, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const resetFilters = () => {
    setStatusFilter("");
    setSubjectFilter("");
    setSchoolYearFilter("");
    setPage(1);
  };

  // CSV Export
  const exportCSV = () => {
    const header = ["Date", "Status", "Subject", "School Year", "Class ID", "Teacher", "Time Logged"];
    const rows = filteredRows.map((r) => [
      formatDate(r.dateObj),
      r.status || "N/A",
      r.classMeta?.subjectName || "N/A",
      r.classMeta?.schoolYear || "Current Year",
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
    if (/[\",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
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
        r.classMeta?.schoolYear || "Current Year",
        r.teacherName || "N/A",
        r.timeLogged ? formatTime(parseAttendanceDate(r.timeLogged)) : "—",
      ]);

      autoTable(docPDF, {
        head: [["Date", "Status", "Subject", "School Year", "Teacher", "Time Logged"]],
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

  return {
    // Raw
    studentId,
    studentName,
    loading,

    // Data
    stats,
    subjectOptions,
    schoolYearOptions,
    paginatedRows,
    filteredRows,
    totalPages,
    page,

    // Filters
    statusFilter,
    subjectFilter,
    schoolYearFilter,

    // Actions
    setStatusFilter,
    setSubjectFilter,
    setSchoolYearFilter,
    setPage,
    resetFilters,
    exportCSV,
    exportPDF,
    exporting,
  };
}
