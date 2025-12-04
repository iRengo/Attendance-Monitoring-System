import { useState, useEffect } from "react";
import axios from "axios";
import { convertTo12Hour, convertTo24Hour } from "../../utils/time";
import Swal from "sweetalert2";
import { Timestamp } from "firebase/firestore";

/**
 * Convert "HH:mm" string to Firestore Timestamp using a fixed UTC date
 */
function timeToTimestamp(time24) {
  if (!time24) return null;
  const [h, m] = time24.split(":").map(Number);
  const date = new Date(Date.UTC(1970, 0, 1, h, m));
  return Timestamp.fromDate(date);
}

/**
 * Convert Firestore Timestamp to "HH:mm" string
 */
function timestampToTime(ts) {
  if (!ts) return "";
  const date = ts.toDate();
  const h = date.getUTCHours().toString().padStart(2, "0");
  const m = date.getUTCMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

const CLASSES_CACHE_KEY = "teacher_classes_cache_v1";
const COUNTS_CACHE_KEY = "teacher_class_counts_cache_v1";

export default function useClasses(teacherId) {
  const [classes, setClasses] = useState([]);
  const [studentCounts, setStudentCounts] = useState({});
  const [classForm, setClassForm] = useState({
    id: null,
    subject: "",
    room: "",
    section: "",
    gradeLevel: "",
    days: [],
    startTime: "", // "HH:mm"
    endTime: "",   // "HH:mm"
  });
  const [showModal, setShowModal] = useState(false);
  const [showDaysDropdown, setShowDaysDropdown] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load classes (with local cache fallback)
  useEffect(() => {
    let cancelled = false;
    const fetchClasses = async () => {
      if (!teacherId) return;
      try {
        const res = await axios.get("/api/teacher/classes", { params: { teacherId } });
        if (res.data.success) {
          const cleaned = (res.data.classes || []).map((cls) => {
            // Convert Firestore Timestamp to HH:mm strings for UI
            const timeStart = cls.time_start && cls.time_start.seconds
              ? timestampToTime(cls.time_start)
              : cls.time_start?.trim() || "";
            const timeEnd = cls.time_end && cls.time_end.seconds
              ? timestampToTime(cls.time_end)
              : cls.time_end?.trim() || "";

            let displayTime = cls.time || "";
            if (!displayTime && timeStart && timeEnd) {
              displayTime = `${convertTo12Hour(timeStart)} - ${convertTo12Hour(timeEnd)}`;
            }

            return {
              ...cls,
              time_start: timeStart,
              time_end: timeEnd,
              time: displayTime,
            };
          });

          if (!cancelled) {
            setClasses(cleaned);
            try {
              localStorage.setItem(CLASSES_CACHE_KEY, JSON.stringify(cleaned));
            } catch (e) {
              console.warn("Could not persist classes to localStorage", e);
            }
          }
        } else {
          throw new Error(res.data.message || "Failed to fetch classes");
        }
      } catch (err) {
        console.error("Error fetching classes:", err);
        try {
          const cached = localStorage.getItem(CLASSES_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (!cancelled) {
              setClasses(parsed);
              console.warn("Loaded cached classes due to fetch error.");
            }
            return;
          }
        } catch (e) {
          console.warn("Failed to read cached classes:", e);
        }

        try {
          Swal.fire({
            icon: "warning",
            title: "Unable to fetch classes",
            text: "Could not fetch classes from the server. Try again later. (Showing cached or no classes.)",
            timer: 2500,
            showConfirmButton: false,
            toast: true,
            position: "top-end",
          });
        } catch (e) {}
      }
    };

    fetchClasses();
    return () => {
      cancelled = true;
    };
  }, [teacherId]);

  // Fetch student counts
  useEffect(() => {
    let cancelled = false;
    if (!teacherId || classes.length === 0) return;

    const fetchCounts = async () => {
      try {
        const classIds = classes.map((c) => c.id);
        try {
          const res = await axios.post("/api/teacher/class-student-counts", { teacherId, classIds });
          if (res.data?.success && res.data.counts) {
            if (!cancelled) {
              setStudentCounts(res.data.counts);
              try {
                localStorage.setItem(COUNTS_CACHE_KEY, JSON.stringify(res.data.counts));
              } catch (e) {}
            }
            return;
          }
        } catch (err) {
          console.warn("Batch counts endpoint failed, falling back.", err);
        }

        // fallback per-class
        const results = {};
        const concurrency = 4;
        const ids = classIds.slice();
        const worker = async () => {
          while (ids.length > 0 && !cancelled) {
            const id = ids.shift();
            try {
              const res = await axios.get("/api/teacher/class-students", { params: { teacherId, classId: id } });
              results[id] = res.data?.success ? (res.data.students || []).length : 0;
            } catch (err) {
              console.warn("Failed fetching students for", id, err);
              const cached = localStorage.getItem(COUNTS_CACHE_KEY);
              if (cached) {
                try {
                  const parsed = JSON.parse(cached);
                  if (typeof parsed[id] !== "undefined") {
                    results[id] = parsed[id];
                    continue;
                  }
                } catch (e) {}
              }
              results[id] = 0;
            }
          }
        };
        await Promise.all(new Array(concurrency).fill(0).map(() => worker()));
        if (!cancelled) {
          setStudentCounts(results);
          try {
            localStorage.setItem(COUNTS_CACHE_KEY, JSON.stringify(results));
          } catch (e) {}
        }
      } catch (err) {
        console.error("Error fetching student counts:", err);
      }
    };

    fetchCounts();
    return () => {
      cancelled = true;
    };
  }, [classes, teacherId]);

  // Save or update class
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

    const start24 = convertTo24Hour(classForm.startTime);
    const end24 = convertTo24Hour(classForm.endTime);
    const start12 = convertTo12Hour(start24);
    const end12 = convertTo12Hour(end24);

    const daysString = classForm.days.join(", ");
    const computedName = `${classForm.subject} ${classForm.section}-${classForm.gradeLevel}`.trim();

    setLoading(true);

    try {
      const payload = {
        teacherId,
        subjectName: classForm.subject,
        roomNumber: classForm.room,
        section: classForm.section,
        gradeLevel: classForm.gradeLevel,
        days: daysString,
        time_start: timeToTimestamp(start24),
        time_end: timeToTimestamp(end24),
        time_display: `${start12} - ${end12}`,
        name: computedName,
      };

      if (isEditMode) {
        const res = await axios.put(`/api/teacher/update-class/${classForm.id}`, payload);
        if (res.data.success) {
          const updated = classes.map((cls) =>
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
                  time_start: start24,
                  time_end: end24,
                  time: `${start12} - ${end12}`,
                }
              : cls
          );
          setClasses(updated);
          try {
            localStorage.setItem(CLASSES_CACHE_KEY, JSON.stringify(updated));
          } catch (e) {}
          await Swal.fire({ icon: "success", title: "Updated", text: "Class updated successfully!", timer: 1400, showConfirmButton: false });
        } else {
          throw new Error(res.data.message || "Update failed");
        }
      } else {
        const res = await axios.post("/api/teacher/add-class", payload);
        if (res.data.success) {
          const newCls = {
            id: res.data.id,
            subjectName: classForm.subject,
            name: computedName,
            teacherId,
            roomNumber: classForm.room,
            section: classForm.section,
            gradeLevel: classForm.gradeLevel,
            days: daysString,
            time_start: start24,
            time_end: end24,
            time: `${start12} - ${end12}`,
          };
          const updated = [...classes, newCls];
          setClasses(updated);
          try {
            localStorage.setItem(CLASSES_CACHE_KEY, JSON.stringify(updated));
          } catch (e) {}
          await Swal.fire({ icon: "success", title: "Added", text: "Class added successfully!", timer: 1400, showConfirmButton: false });
        } else {
          throw new Error(res.data.message || "Add failed");
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
      await Swal.fire({ icon: "error", title: "Error", text: err?.message || "Something went wrong." });
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
      const res = await axios.delete(`/api/teacher/delete-class/${classId}?teacherId=${teacherId}`);
      if (res.data.success) {
        const filtered = classes.filter((c) => c.id !== classId);
        setClasses(filtered);
        try {
          localStorage.setItem(CLASSES_CACHE_KEY, JSON.stringify(filtered));
        } catch (e) {}
        await Swal.fire({ icon: "success", title: "Deleted", text: "Class deleted successfully!", timer: 1400, showConfirmButton: false });
      } else {
        await Swal.fire({ icon: "error", title: "Failed", text: res.data.message || "Failed to delete class." });
      }
    } catch (err) {
      console.error(err);
      await Swal.fire({ icon: "error", title: "Error", text: "Failed to delete class." });
    }
  };

  const handleEditClass = (cls) => {
    let start24 = "";
    let end24 = "";

    if (cls.time_start && /^\d{1,2}:\d{2}$/.test(String(cls.time_start).trim())) {
      start24 = String(cls.time_start).trim().padStart(5, "0");
    } else if (cls.time_start && cls.time_start.seconds) {
      start24 = timestampToTime(cls.time_start);
    }

    if (cls.time_end && /^\d{1,2}:\d{2}$/.test(String(cls.time_end).trim())) {
      end24 = String(cls.time_end).trim().padStart(5, "0");
    } else if (cls.time_end && cls.time_end.seconds) {
      end24 = timestampToTime(cls.time_end);
    }

    setClassForm({
      id: cls.id,
      subject: cls.subjectName || "",
      room: cls.roomNumber || "",
      section: cls.section || "",
      gradeLevel: cls.gradeLevel || "",
      days: (cls.days || "").split(", ").filter(Boolean),
      startTime: start24 || "",
      endTime: end24 || "",
    });

    setIsEditMode(true);
    setShowModal(true);
  };

  const handleCopyLink = async (classId) => {
    const link = `join-class/${classId}`;
    try {
      await navigator.clipboard.writeText(link);
      await Swal.fire({
        icon: "success",
        title: "Copied",
        text: "Class link copied!",
        timer: 1200,
        showConfirmButton: false,
      });
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
