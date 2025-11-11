import { useState, useEffect, useCallback } from "react";
import axios from "axios";

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

  useEffect(()=>{
    const ctrl = new AbortController();
    const t = setTimeout(async ()=>{
      if (reportKind==='student' && studentQuery.trim().length>=2) {
        try {
          const res = await axios.get("http://localhost:3000/admin/list/students", {
            params:{ q: studentQuery.trim(), limit:20 }, signal: ctrl.signal
          });
          if (res.data.success) setStudentOptions(res.data.rows || []);
        } catch {}
      } else setStudentOptions([]);
    },250);
    return ()=>{ clearTimeout(t); ctrl.abort(); };
  },[reportKind, studentQuery]);

  useEffect(()=>{
    const ctrl = new AbortController();
    const t = setTimeout(async ()=>{
      if (reportKind==='teacher' && teacherQuery.trim().length>=2) {
        try {
          const res = await axios.get("http://localhost:3000/admin/list/teachers", {
            params:{ q: teacherQuery.trim(), limit:20 }, signal: ctrl.signal
          });
          if (res.data.success) setTeacherOptions(res.data.rows || []);
        } catch {}
      } else setTeacherOptions([]);
    },250);
    return ()=>{ clearTimeout(t); ctrl.abort(); };
  },[reportKind, teacherQuery]);

  const fetchReport = useCallback(async ()=>{
    setLoading(true); setError(null);
    try {
      let endpoint = "";
      const params = {};
      if (reportKind==='student') {
        endpoint = "/admin/report/student-attendance-all";
        if (selectedStudentId) params.studentId = selectedStudentId;
      } else if (reportKind==='teacher') {
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

  const clearReport = ()=>{
    setRows([]); setMeta(null); setError(null);
  };

  useEffect(()=>{
    setSelectedStudentId(""); setSelectedStudentName("");
    setSelectedTeacherId(""); setSelectedTeacherName("");
    setStudentQuery(""); setTeacherQuery("");
    setStudentOptions([]); setTeacherOptions([]);
  },[reportKind]);

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
    reportKind, setReportKind,
    month, setMonth,
    studentQuery, setStudentQuery, studentOptions, pickStudent, selectedStudentName,
    teacherQuery, setTeacherQuery, teacherOptions, pickTeacher, selectedTeacherName,
    loading, rows, meta, error,
    fetchReport, clearReport
  };
}