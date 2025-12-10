import { useState, useMemo } from "react";
import AdminLayout from "../../components/adminLayout";
import FiltersBar from "./components/adminAttendance/layout/FiltersBar";
import TeachersList from "./components/adminAttendance/teachers/TeachersList";
import TeacherDetail from "./components/adminAttendance/teachers/TeacherDetail";
import StudentsList from "./components/adminAttendance/students/StudentsList";
import StudentDetail from "./components/adminAttendance/students/StudentDetail";
import EmptyState from "./components/shared/EmptyState";

import useSections from "./components/adminAttendance/hooks/useSections";
import useTeachers from "./components/adminAttendance/hooks/useTeachers";
import useStudents from "./components/adminAttendance/hooks/useStudents";
import useSessions from "./components/adminAttendance/hooks/useSessions";

const TEACHERS_PAGE_SIZE = 15;
const STUDENTS_PAGE_SIZE = 15;

export default function AdminAttendance() {
  const [activeTab, setActiveTab] = useState("teachers");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [teacherQuery, setTeacherQuery] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [teachersPage, setTeachersPage] = useState(1);
  const [studentsPage, setStudentsPage] = useState(1);

  const { sections, classes, loadingClasses } = useSections();
  const { allTeachers, teachersInSection, loadingTeachers } = useTeachers(classes, selectedSection);
  const { studentsInSection, loadingStudents } = useStudents(selectedSection);
  const { sectionSessions, teacherSessionsNoSection, loadingSessions } = useSessions(selectedSection, selectedTeacher);

  const teachersSource = selectedSection ? teachersInSection : allTeachers;

  // -----------------------------
  // FILTER TEACHERS
  // -----------------------------
  const filteredTeachers = useMemo(() => {
    const q = teacherQuery.trim().toLowerCase();
    if (!q) return teachersSource;
    return teachersSource.filter(
      t => (t.name || "").toLowerCase().includes(q) ||
           String(t.teacherId || "").toLowerCase().includes(q)
    );
  }, [teachersSource, teacherQuery]);

  const totalTeacherPages = Math.max(1, Math.ceil(filteredTeachers.length / TEACHERS_PAGE_SIZE));
  const teachersPageData = filteredTeachers.slice((teachersPage - 1) * TEACHERS_PAGE_SIZE, teachersPage * TEACHERS_PAGE_SIZE);

  // -----------------------------
  // FILTER STUDENTS
  // -----------------------------
  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return studentsInSection;

    return studentsInSection.filter(s => {
      const nameStr = String(s.name || "");
      const idStr = String(s.studentId || s.id || "");
      return nameStr.toLowerCase().includes(q) || idStr.toLowerCase().includes(q);
    });
  }, [studentsInSection, studentQuery]);

  const totalStudentPages = Math.max(1, Math.ceil(filteredStudents.length / STUDENTS_PAGE_SIZE));
  const studentsPageData = filteredStudents.slice((studentsPage - 1) * STUDENTS_PAGE_SIZE, studentsPage * STUDENTS_PAGE_SIZE);

  // -----------------------------
  // TEACHER SESSION FILTER
  // -----------------------------
  const teacherDetailSessions = useMemo(() => {
    if (!selectedTeacher) return [];
    if (selectedSection) {
      return sectionSessions.filter(s => (s.teacherId || "") === selectedTeacher.teacherId);
    }
    return teacherSessionsNoSection;
  }, [selectedTeacher, selectedSection, sectionSessions, teacherSessionsNoSection]);

  // -----------------------------
  // STUDENT SESSION FILTER
  // -----------------------------
  const studentDetailSessions = useMemo(() => {
    if (!selectedStudent || !selectedSection) return [];
    const uid = String(selectedStudent.id);

    return sectionSessions.filter(sess => {
      if (Array.isArray(sess.studentsPresent) && sess.studentsPresent.includes(uid)) return true;

      const entries = (Array.isArray(sess.entries) && sess.entries) ||
                      (Array.isArray(sess.attendance_entries) && sess.attendance_entries) || [];

      if (entries.some(e => String(e?.student_id ?? e?.studentId ?? e?.uid ?? e?.id ?? "") === uid)) return true;
      if (Array.isArray(sess.studentsAbsent) && sess.studentsAbsent.includes(uid)) return true;

      if (sess.raw) {
        if (Array.isArray(sess.raw.entries) &&
            sess.raw.entries.some(e => String(e?.student_id ?? e?.studentId ?? e?.uid ?? e?.id ?? "") === uid)) return true;
        if (Array.isArray(sess.raw.studentsAbsent) && sess.raw.studentsAbsent.includes(uid)) return true;
        if (Array.isArray(sess.raw.studentsPresent) && sess.raw.studentsPresent.includes(uid)) return true;
      }

      return false;
    });
  }, [selectedStudent, selectedSection, sectionSessions]);

  // -----------------------------
  // HANDLERS
  // -----------------------------
  function handleSectionChange(sec) {
    setSelectedSection(sec);
    setSelectedTeacher(null);
    setSelectedStudent(null);
    setTeachersPage(1);
    setStudentsPage(1);
  }

  // -----------------------------
  // CSV EXPORT
  // -----------------------------
  function exportTeacherCSV() {
    if (!selectedTeacher) return;

    const groups = groupSessionsBySubjectAndSchoolYear(teacherDetailSessions, classes);
    const headers = ["SchoolYear", "Subject", "SessionID", "ClassID", "TimeStarted", "TimeEnded", "DurationMinutes", "Date"];
    const rows = [];

    Object.entries(groups).forEach(([schoolYear, subjects]) => {
      Object.entries(subjects).forEach(([subject, sessions]) => {
        sessions.forEach(s => {
          const start = s.timeStarted ? new Date(s.timeStarted) : null;
          const end = s.timeEnded ? new Date(s.timeEnded) : null;
          const duration = start && end ? Math.max(0, Math.round((end - start) / 60000)) : "";
          rows.push([schoolYear, subject, s.id, s.classId || "", s.timeStarted || "", s.timeEnded || "", duration,
                     start ? start.toLocaleDateString() : end ? end.toLocaleDateString() : ""]);
        });
      });
    });

    const csv = "data:text/csv;charset=utf-8," + [headers, ...rows].map(r => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `TeacherSessions_${selectedTeacher.teacherId}_${selectedSection || "AllSections"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // -----------------------------
  // GROUP LOGIC: School Year → Subject → Sessions
  // -----------------------------
  const teacherGroups = useMemo(() => groupSessionsBySubjectAndSchoolYear(teacherDetailSessions, classes), [teacherDetailSessions, classes]);
  const studentGroups = useMemo(() => groupSessionsBySubjectAndSchoolYear(studentDetailSessions, classes), [studentDetailSessions, classes]);

  return (
    <AdminLayout title="Attendance">
      <FiltersBar
        sections={sections}
        selectedSection={selectedSection}
        onSectionChange={handleSectionChange}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        teacherQuery={teacherQuery}
        setTeacherQuery={setTeacherQuery}
        studentQuery={studentQuery}
        setStudentQuery={setStudentQuery}
        showTeacherSearch={!selectedTeacher && activeTab === "teachers"}
        showStudentSearch={!selectedStudent && activeTab === "students"}
        loadingClasses={loadingClasses}
      />

      {/* TEACHERS TAB */}
      {activeTab === "teachers" && !selectedTeacher && (
        <TeachersList
          loading={loadingTeachers}
          filteredTeachers={filteredTeachers}
          pageData={teachersPageData}
          page={teachersPage}
          totalPages={totalTeacherPages}
          setPage={setTeachersPage}
          setSelectedTeacher={setSelectedTeacher}
          pageSize={TEACHERS_PAGE_SIZE}
          totalItems={filteredTeachers.length}
        />
      )}

      {activeTab === "teachers" && selectedTeacher && (
        <TeacherDetail
          selectedSection={selectedSection}
          selectedTeacher={selectedTeacher}
          setSelectedTeacher={setSelectedTeacher}
          groupedSessions={teacherGroups}
          loadingSessions={loadingSessions}
          onExportCSV={exportTeacherCSV}
        />
      )}

      {/* STUDENTS TAB */}
      {activeTab === "students" && !selectedStudent && (
        <>
          {!selectedSection ? (
            <EmptyState message="Select a section to view students." />
          ) : loadingStudents ? (
            <EmptyState message="Loading students..." />
          ) : studentsInSection.length === 0 ? (
            <EmptyState message="No students found for this section." />
          ) : (
            <StudentsList
              filteredStudents={filteredStudents}
              pageData={studentsPageData}
              page={studentsPage}
              totalPages={totalStudentPages}
              setPage={setStudentsPage}
              setSelectedStudent={setSelectedStudent}
              pageSize={STUDENTS_PAGE_SIZE}
              totalItems={filteredStudents.length}
            />
          )}
        </>
      )}

      {activeTab === "students" && selectedStudent && (
        <StudentDetail
          selectedSection={selectedSection}
          selectedStudent={selectedStudent}
          setSelectedStudent={setSelectedStudent}
          groupedSessions={studentGroups}
          loadingSessions={loadingSessions}
        />
      )}
    </AdminLayout>
  );
}

/* ======================================================
   GROUP: SCHOOL YEAR → SUBJECT → SESSIONS
====================================================== */
function groupSessionsBySubjectAndSchoolYear(sessions, classes) {
  const classMap = new Map(classes.map(c => [c.id, c]));
  const groups = {};

  sessions.forEach(sess => {
    const cls = classMap.get(sess.classId) || {};
    const subject = (cls.subjectName || cls.name || "Unknown Subject").trim();
    let sy;
      if (sess.schoolYear && String(sess.schoolYear).trim() !== "") {
        sy = `School Year ${sess.schoolYear}`;
      } else {
        sy = "Current School Year";
      }

    if (!groups[sy]) groups[sy] = {};
    if (!groups[sy][subject]) groups[sy][subject] = [];

    groups[sy][subject].push(sess);
  });

  Object.values(groups).forEach(subjectGroup => {
    Object.values(subjectGroup).forEach(arr => {
      arr.sort((a, b) => new Date(b.timeStarted || 0).getTime() - new Date(a.timeStarted || 0).getTime());
    });
  });

  return groups;
}
