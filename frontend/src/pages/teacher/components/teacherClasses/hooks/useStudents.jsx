import { useState, useEffect } from "react";
import axios from "axios";

/**
 * useStudents: fetches students for selectedClass and maps fullName/email like original
 */
export default function useStudents(teacherId, selectedClass) {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass || !teacherId) return;
      try {
        const res = await axios.get(`/api/teacher/class-students`, {
          params: { teacherId, classId: selectedClass.id },
        });
        if (res.data.success) {
          const mappedStudents = res.data.students.map((s) => ({
            ...s,
            fullName: `${s.firstName || ""} ${s.middleName || ""} ${s.lastName || ""}`.trim(),
            email: s.email || s.personal_email || s.school_email || "N/A",
          }));
          setStudents(mappedStudents);
        }
      } catch (err) {
        console.error("Error fetching students:", err);
      }
    };
    fetchStudents();
  }, [selectedClass, teacherId]);

  const refreshStudents = () => {
    if (selectedClass) {
      // trigger effect by setting same selectedClass (no-op) or simply re-run fetch:
      (async () => {
        try {
          const res = await axios.get(`/api/teacher/class-students`, {
            params: { teacherId, classId: selectedClass.id },
          });
          if (res.data.success) {
            const mappedStudents = res.data.students.map((s) => ({
              ...s,
              fullName: `${s.firstName || ""} ${s.middleName || ""} ${s.lastName || ""}`.trim(),
              email: s.email || s.personal_email || s.school_email || "N/A",
            }));
            setStudents(mappedStudents);
          }
        } catch (err) {
          console.error("Error fetching students:", err);
        }
      })();
    }
  };

  return { students, refreshStudents };
}