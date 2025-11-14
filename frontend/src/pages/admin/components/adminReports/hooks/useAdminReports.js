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
        const res = await axios.get("http://localhost:3000/admin/list/students", {
          params: { q: debouncedStudent.trim(), limit: 20 },
          signal: ctrl.signal,
        });
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
        const res = await axios.get("http://localhost:3000/admin/list/teachers", {
          params: { q: debouncedTeacher.trim(), limit: 20 },
          signal: ctrl.signal,
        });
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

      const res = await axios.get(`http://localhost:3000${endpoint}`, { params });
      if (res.data.success) {
        setRows(res.data.rows || []);
        setMeta(res.data.meta || null);
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
