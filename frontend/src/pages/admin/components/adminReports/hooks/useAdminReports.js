import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

// Debounce utility – waits for user to stop typing before making API call
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

export default function useAdminReports() {
  const [reportKind, setReportKind] = useState("student");
  const [month, setMonth] = useState("");

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [studentQuery, setStudentQuery] = useState("");
  const [teacherQuery, setTeacherQuery] = useState("");
  const [studentOptions, setStudentOptions] = useState([]);
  const [teacherOptions, setTeacherOptions] = useState([]);

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedTeacherName, setSelectedTeacherName] = useState("");

  const studentCtrl = useRef(null);
  const teacherCtrl = useRef(null);

  // Debounced search values
  const debouncedStudent = useDebounce(studentQuery, 250);
  const debouncedTeacher = useDebounce(teacherQuery, 250);

  // Helper to compute total classes for a row (defensive, checks multiple possible shapes)
  const computeTotalClasses = (row = {}, metaData = {}) => {
    // 1) If API already provided totalClasses
    if (typeof row.totalClasses === "number") return row.totalClasses;

    const toNumberOrNaN = (v) => {
      if (v == null) return NaN;
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    };

    // 2) Monthly-specific shape: totalPresents + totalAbsences + lateEntries
    //    (This covers your example where monthly rows use these fields.)
    const totalPresents = toNumberOrNaN(row.totalPresents ?? row.presents ?? row.present ?? row.present_count);
    const totalAbsences = toNumberOrNaN(row.totalAbsences ?? row.absences ?? row.absent ?? row.absent_count);
    const lateEntries = toNumberOrNaN(row.lateEntries ?? row.late ?? 0);

    if (!Number.isNaN(totalPresents) && !Number.isNaN(totalAbsences)) {
      const lateN = Number.isNaN(lateEntries) ? 0 : lateEntries;
      return totalPresents + totalAbsences + lateN;
    }

    // 3) If there's an explicit totalDays/total_days value that looks like the class count, use it
    const totalDays = toNumberOrNaN(row.totalDays ?? row.total_days ?? row.daysCount ?? row.days_count);
    if (!Number.isNaN(totalDays) && totalDays >= 0) return totalDays;

    // 4) Common fields: attended/present + absent/missed/absences (fallback)
    const attended = toNumberOrNaN(row.attended ?? row.present ?? row.presents ?? row.attends ?? row.present_count);
    const absent = toNumberOrNaN(row.absent ?? row.missed ?? row.absences ?? row.absent_count);

    if (!Number.isNaN(attended) && !Number.isNaN(absent)) return attended + absent;

    // 5) If there's a sessions/days array on the row
    if (Array.isArray(row.sessions)) return row.sessions.length;
    if (Array.isArray(row.days)) return row.days.length;

    // 6) If row has an object of day keys (e.g. { "2025-01-01": {...} })
    if (row.days && typeof row.days === "object" && !Array.isArray(row.days)) {
      return Object.keys(row.days).length;
    }

    // 7) Fallback to meta.totalClasses if available
    if (typeof metaData.totalClasses === "number") return metaData.totalClasses;
    if (typeof metaData.total_classes === "number") return metaData.total_classes;

    // 8) Could not determine
    return null;
  };

  // 🚀 Optimized Student Search
  useEffect(() => {
    if (reportKind !== "student" || debouncedStudent.trim().length < 2) {
      setStudentOptions([]);
      return;
    }
    if (studentCtrl.current) studentCtrl.current.abort();

    const ctrl = new AbortController();
    studentCtrl.current = ctrl;

    (async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/admin/list/students`,
          { params: { q: debouncedStudent.trim(), limit: 20 }, signal: ctrl.signal }
        );         
        if (res.data.success) setStudentOptions(res.data.rows || []);
      } catch (err) {
        if (err.name !== "CanceledError") console.error(err);
      }
    })();

    return () => ctrl.abort();
  }, [reportKind, debouncedStudent]);

  // 🚀 Optimized Teacher Search
  useEffect(() => {
    if (reportKind !== "teacher" || debouncedTeacher.trim().length < 2) {
      setTeacherOptions([]);
      return;
    }
    if (teacherCtrl.current) teacherCtrl.current.abort();

    const ctrl = new AbortController();
    teacherCtrl.current = ctrl;

    (async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/admin/list/teachers`,
          { params: { q: debouncedTeacher.trim(), limit: 20 }, signal: ctrl.signal }
        );        
        if (res.data.success) setTeacherOptions(res.data.rows || []);
      } catch (err) {
        if (err.name !== "CanceledError") console.error(err);
      }
    })();

    return () => ctrl.abort();
  }, [reportKind, debouncedTeacher]);

  // 📊 Fetch Reports
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = "";
      const params = {};

      if (reportKind === "student") {
        endpoint = "/admin/report/student-attendance-all";
        if (selectedStudentId) params.studentId = selectedStudentId;
      } else if (reportKind === "teacher") {
        endpoint = "/admin/report/teacher-compliance-all";
        if (selectedTeacherId) params.teacherId = selectedTeacherId;
      } else {
        endpoint = "/admin/report/monthly-summary";
        if (month) params.month = month;
      }

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}${endpoint}`,
        { params }
      );      
      if (res.data.success) {
        // Attach totalClasses for student and monthly reports
        const fetchedMeta = res.data.meta || null;
        let fetchedRows = res.data.rows || [];

        if (reportKind === "student" || reportKind === "monthly") {
          fetchedRows = fetchedRows.map((r) => ({
            ...r,
            totalClasses: computeTotalClasses(r, fetchedMeta),
          }));
        }

        setRows(fetchedRows);
        setMeta(fetchedMeta);
      } else setError("Failed to fetch report");
    } catch (e) {
      setError(e.response?.data?.message || "Error fetching report");
    } finally {
      setLoading(false);
    }
  }, [reportKind, month, selectedStudentId, selectedTeacherId]);

  const clearReport = () => {
    setRows([]);
    setMeta(null);
    setError(null);
  };

  // Reset selections when reportKind changes
  useEffect(() => {
    setSelectedStudentId("");
    setSelectedStudentName("");
    setSelectedTeacherId("");
    setSelectedTeacherName("");
    setStudentQuery("");
    setTeacherQuery("");
    setStudentOptions([]);
    setTeacherOptions([]);
  }, [reportKind]);

  const pickStudent = (opt) => {
    setSelectedStudentId(opt.id);
    setSelectedStudentName(opt.name);
    setStudentQuery(opt.name);
    setStudentOptions([]);
  };

  const pickTeacher = (opt) => {
    setSelectedTeacherId(opt.id);
    setSelectedTeacherName(opt.name);
    setTeacherQuery(opt.name);
    setTeacherOptions([]);
  };

  return {
    reportKind,
    setReportKind,
    month,
    setMonth,
    studentQuery,
    setStudentQuery,
    studentOptions,
    pickStudent,
    selectedStudentName,
    teacherQuery,
    setTeacherQuery,
    teacherOptions,
    pickTeacher,
    selectedTeacherName,
    loading,
    rows,
    meta,
    error,
    fetchReport,
    clearReport,
  };
}