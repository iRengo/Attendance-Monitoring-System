import { useState, useEffect } from "react";
import axios from "axios";
import { convertTo12Hour } from "../utils/time";
import Swal from "sweetalert2";

export default function useClasses(teacherId) {
  const [classes, setClasses] = useState([]);
  const [studentCounts, setStudentCounts] = useState({});
  const [classForm, setClassForm] = useState({
    id: null,
    subject: "",
    room: "",          // maps to roomNumber only
    section: "",
    gradeLevel: "",
    days: [],
    startTime: "",
    endTime: "",
  });
  const [showModal, setShowModal] = useState(false);
  const [showDaysDropdown, setShowDaysDropdown] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!teacherId) return;
      try {
        const res = await axios.get("http://localhost:3000/teacher/classes", {
          params: { teacherId },
        });
        if (res.data.success) {
          const cleaned = (res.data.classes || []).map(cls => {
            // Remove any lingering roomId field if backend hasn't fully pruned yet
            const { roomId, ...rest } = cls;
            return rest;
          });
          setClasses(cleaned);
          if (res.data.needsIndex) {
            console.warn("Firestore composite index missing for classes {teacherId, createdAt}.");
          }
        }
      } catch (err) {
        console.error("Error fetching classes:", err);
        Swal.fire({ icon: "error", title: "Error", text: "Error fetching classes." });
      }
    };
    fetchClasses();
  }, [teacherId]);

  useEffect(() => {
    const fetchStudentCounts = async () => {
      if (!teacherId || classes.length === 0) return;
      try {
        const counts = {};
        for (const cls of classes) {
          const res = await axios.get("http://localhost:3000/teacher/class-students", {
            params: { teacherId, classId: cls.id },
          });
          counts[cls.id] = res.data.success ? res.data.students.length : 0;
        }
        setStudentCounts(counts);
      } catch (err) {
        console.error("Error fetching student counts:", err);
        Swal.fire({ icon: "error", title: "Error", text: "Error fetching student counts." });
      }
    };
    fetchStudentCounts();
  }, [classes, teacherId]);

  const handleSaveClass = async () => {
    if (
      !classForm.subject.trim() ||
      !classForm.room.trim() ||
      !classForm.section.trim() ||
      !classForm.gradeLevel ||
      classForm.days.length === 0 ||
      !classForm.startTime ||
      !classForm.endTime
    ) {
      await Swal.fire({ icon: "warning", title: "Missing fields", text: "Please fill in all fields." });
      return;
    }

    const startTime12 = convertTo12Hour(classForm.startTime);
    const endTime12 = convertTo12Hour(classForm.endTime);
    const fullTime = `${startTime12} - ${endTime12}`;
    const daysString = classForm.days.join(", ");

    const computedName = `${classForm.subject} ${classForm.section}-${classForm.gradeLevel}`.trim();

    setLoading(true);

    try {
      if (isEditMode) {
        const res = await axios.put(
          `http://localhost:3000/teacher/update-class/${classForm.id}`,
          {
            teacherId,
            subjectName: classForm.subject,
            roomNumber: classForm.room,
            section: classForm.section,
            gradeLevel: classForm.gradeLevel,
            days: daysString,
            time: fullTime,
            name: computedName,
          }
        );

        if (res.data.success) {
          setClasses(prev =>
            prev.map(cls =>
              cls.id === classForm.id
                ? {
                    ...cls,
                    subjectName: classForm.subject,
                    name: computedName,
                    teacherId,
                    roomNumber: classForm.room,
                    section: classForm.section,
                    gradeLevel: classForm.gradeLevel,
                    days: daysString,
                    time: fullTime,
                  }
                : cls
            )
          );
          await Swal.fire({
            icon: "success",
            title: "Updated",
            text: "Class updated successfully!",
            timer: 1400,
            showConfirmButton: false,
          });
        }
      } else {
        const res = await axios.post("http://localhost:3000/teacher/add-class", {
          teacherId,
          subjectName: classForm.subject,
          roomNumber: classForm.room,
          section: classForm.section,
          gradeLevel: classForm.gradeLevel,
          days: daysString,
          time: fullTime,
          name: computedName,
        });

        if (res.data.success) {
          setClasses(prev => [
            ...prev,
            {
              id: res.data.id,
              subjectName: classForm.subject,
              name: computedName,
              teacherId,
              roomNumber: classForm.room,
              section: classForm.section,
              gradeLevel: classForm.gradeLevel,
              days: daysString,
              time: fullTime,
            },
          ]);
          await Swal.fire({
            icon: "success",
            title: "Added",
            text: "Class added successfully!",
            timer: 1400,
            showConfirmButton: false,
          });
        }
      }

      setShowModal(false);
      setClassForm({
        id: null,
        subject: "",
        room: "",
        section: "",
        gradeLevel: "",
        days: [],
        startTime: "",
        endTime: "",
      });
      setIsEditMode(false);
    } catch (err) {
      console.error(err);
      await Swal.fire({ icon: "error", title: "Error", text: "Something went wrong." });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (classId) => {
    const result = await Swal.fire({
      title: "Delete class?",
      text: "Are you sure you want to delete this class? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#e11d48",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await axios.delete(
        `http://localhost:3000/teacher/delete-class/${classId}?teacherId=${teacherId}`
      );
      if (res.data.success) {
        setClasses(prev => prev.filter(cls => cls.id !== classId));
        await Swal.fire({
          icon: "success",
          title: "Deleted",
          text: "Class deleted successfully!",
          timer: 1400,
          showConfirmButton: false,
        });
      } else {
        await Swal.fire({
          icon: "error",
          title: "Failed",
          text: res.data.message || "Failed to delete class.",
        });
      }
    } catch (err) {
      console.error(err);
      await Swal.fire({ icon: "error", title: "Error", text: "Failed to delete class." });
    }
  };

  const handleEditClass = (cls) => {
    const [start, end] = (cls.time || "").split(" - ").map((t) => {
      const [h = "", m = ""] = t.split(":");
      return h.length === 1 ? `0${h}:${m}` : `${h}:${m}`;
    });

    setClassForm({
      id: cls.id,
      subject: cls.subjectName || "",
      room: cls.roomNumber || "",
      section: cls.section || "",
      gradeLevel: cls.gradeLevel || "",
      days: (cls.days || "").split(", ").filter(Boolean),
      startTime: start || "",
      endTime: end || "",
    });

    setIsEditMode(true);
    setShowModal(true);
  };

  const handleCopyLink = async (classId) => {
    const link = `${window.location.origin}/join-class/${classId}`;
    try {
      await navigator.clipboard.writeText(link);
      await Swal.fire({ icon: "success", title: "Copied", text: "Class link copied!", timer: 1200, showConfirmButton: false });
    } catch (err) {
      console.error("Error copying link:", err);
      await Swal.fire({ icon: "error", title: "Error", text: "Failed to copy link." });
    }
  };

  return {
    classes,
    studentCounts,
    classForm,
    setClassForm,
    showModal,
    setShowModal,
    showDaysDropdown,
    setShowDaysDropdown,
    isEditMode,
    loading,
    handleSaveClass,
    handleDeleteClass,
    handleEditClass,
    handleCopyLink,
    setIsEditMode,
    setClasses,
  };
}