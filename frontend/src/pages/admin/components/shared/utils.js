export function getStudentStatusForSession(session, studentUid) {
    if (Array.isArray(session.studentsPresent)) {
      if (session.studentsPresent.includes(studentUid)) return "Present";
    }
    const entries =
      (Array.isArray(session.entries) && session.entries) ||
      (Array.isArray(session.attendance_entries) && session.attendance_entries) ||
      [];
    if (entries.length) {
      const rec = entries.find((e) => {
        const sid = e?.student_id || e?.studentId || e?.uid || "";
        return String(sid) === String(studentUid);
      });
      if (rec) {
        const st = String(rec.status || "").toLowerCase();
        if (st === "present") return "Present";
        if (st === "late") return "Late";
        if (st === "absent") return "Absent";
        return rec.status || "—";
      }
    }
    return "—";
  }