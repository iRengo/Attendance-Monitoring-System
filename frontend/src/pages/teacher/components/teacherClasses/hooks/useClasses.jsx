import { useState, useEffect } from "react";
import axios from "axios";
import { convertTo12Hour } from "../../utils/time";
import Swal from "sweetalert2";

/**
 * Resilient useClasses hook
 * - caches last good classes in localStorage so UI can still render if backend fails
 * - fetches student counts in a single batched request (preferred) or falls back to batched per-class calls
 * - non-blocking on initial fetch failure (loads cached data if available)
 */

function convertTo24Hour(time12h) {
  if (!time12h) return "";
  const t = String(time12h).trim();
  if (/^\d{2}:\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (!m) return t; // fallback
  let [_, hh, mm, ap] = m;
  let h = parseInt(hh, 10);
  const isPM = ap.toLowerCase() === "pm";
  if (isPM && h < 12) h += 12;
  if (!isPM && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${mm}`;
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
    startTime: "",
    endTime: "",
  });
  const [showModal, setShowModal] = useState(false);
  const [showDaysDropdown, setShowDaysDropdown] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load classes from server but fall back to cached copy if server fails
  useEffect(() => {
    let cancelled = false;
    const fetchClasses = async () => {
      if (!teacherId) return;
      try {
        axios.get("/api/teacher/classes", {
          params: { teacherId },
      });      
        if (res.data.success) {
          const cleaned = (res.data.classes || []).map((cls) => {
            const { roomId, ...rest } = cls;
            return rest;
          });
          if (!cancelled) {
            setClasses(cleaned);
            try {
              localStorage.setItem(CLASSES_CACHE_KEY, JSON.stringify(cleaned));
            } catch (e) {
              console.warn("Could not persist classes to localStorage", e);
            }
            if (res.data.needsIndex) {
              console.warn("Firestore composite index missing for classes {teacherId, createdAt}.");
            }
          }
        } else {
          throw new Error(res.data.message || "Failed to fetch classes");
        }
      } catch (err) {
        console.error("Error fetching classes:", err);
        // Try load cached classes from localStorage
        try {
          const cached = localStorage.getItem(CLASSES_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (!cancelled) {
              setClasses(parsed);
              console.warn("Loaded cached classes due to fetch error.");
            }
            // do not alarm the user with a blocking modal here; just log
            return;
          }
        } catch (e) {
          console.warn("Failed to read cached classes:", e);
        }

        // if no cached data, then show a lightweight non-blocking toast so user knows
        // (avoid blocking promises during page render)
        try {
          Swal.fire({
            icon: "warning",
            title: "Unable to fetch classes",
            text:
              "Could not fetch classes from the server. Try again later. (Showing no classes.)",
            timer: 2500,
            showConfirmButton: false,
            toast: true,
            position: "top-end",
          });
        } catch (e) {
          // ignore Swal errors in initial load
        }
      }
    };
    fetchClasses();
    return () => {
      cancelled = true;
    };
  }, [teacherId]);

  // Fetch student counts in one request if possible, otherwise do batched requests.
  // This effect is non-blocking — classes will render immediately without waiting for counts.
  useEffect(() => {
    let cancelled = false;
    if (!teacherId || classes.length === 0) return;

    const fetchCounts = async () => {
      try {
        const classIds = classes.map((c) => c.id);

        // Preferred: single endpoint that returns counts for many classIds
        try {
          const res = await axios.post("/api/teacher/class-student-counts", {
            teacherId,
            classIds,
          });
          if (res.data && res.data.success && res.data.counts) {
            if (!cancelled) {
              setStudentCounts(res.data.counts);
              try {
                localStorage.setItem(COUNTS_CACHE_KEY, JSON.stringify(res.data.counts));
              } catch (e) {
                console.warn("Could not persist class counts", e);
              }
            }
            return;
          }
        } catch (err) {
          // endpoint may not exist or failed; fall back to per-class batched fetches
          console.warn("Batch counts endpoint failed, falling back to batched per-class requests.", err);
        }

        // Fallback: batched per-class calls with controlled concurrency and failure tolerance
        const results = {};
        const concurrency = 4; // tune as needed to avoid server spikes
        const ids = classIds.slice();

        const worker = async () => {
          while (ids.length > 0 && !cancelled) {
            const id = ids.shift();
            try {
              const res = await axios.get("/api/teacher/class-students", {
                params: { teacherId, classId: id },
              });
              results[id] = res.data && res.data.success ? (res.data.students || []).length : 0;
            } catch (err) {
              console.warn("Failed fetching students for", id, err);
              // try using cached counts for this class if present:
              const cached = localStorage.getItem(COUNTS_CACHE_KEY);
              if (cached) {
                try {
                  const parsed = JSON.parse(cached);
                  if (typeof parsed[id] !== "undefined") {
                    results[id] = parsed[id];
                    continue;
                  }
                } catch (e) {
                  // ignore
                }
              }
              results[id] = 0; // safe fallback
            }
          }
        };

        // start workers
        await Promise.all(new Array(concurrency).fill(0).map(() => worker()));
        if (!cancelled) {
          setStudentCounts(results);
          try {
            localStorage.setItem(COUNTS_CACHE_KEY, JSON.stringify(results));
          } catch (e) {
            console.warn("Could not persist counts cache", e);
          }
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
    const daysString = classForm.days.join(", ");
    const computedName = `${classForm.subject} ${classForm.section}-${classForm.gradeLevel}`.trim();

    setLoading(true);

    try {
      if (isEditMode) {
        const res = await axios.put(
          `/api/teacher/update-class/${classForm.id}`,        
          {
            teacherId,
            subjectName: classForm.subject,
            roomNumber: classForm.room,
            section: classForm.section,
            gradeLevel: classForm.gradeLevel,
            days: daysString,
            time_start: startTime12,
            time_end: endTime12,
            name: computedName,
          }
        );

        if (res.data.success) {
          setClasses((prev) =>
            prev.map((cls) =>
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
                    time_start: startTime12,
                    time_end: endTime12,
                  }
                : cls
            )
          );
          try {
            localStorage.setItem(CLASSES_CACHE_KEY, JSON.stringify(
              classes.map((c) => (c.id === classForm.id ? {
                ...c,
                subjectName: classForm.subject,
                name: computedName,
                teacherId,
                roomNumber: classForm.room,
                section: classForm.section,
                gradeLevel: classForm.gradeLevel,
                days: daysString,
                time_start: startTime12,
                time_end: endTime12,
              } : c))
            ));
          } catch (e) {
            // ignore localStorage write failure
          }

          await Swal.fire({
            icon: "success",
            title: "Updated",
            text: "Class updated successfully!",
            timer: 1400,
            showConfirmButton: false,
          });
        } else {
          throw new Error(res.data.message || "Update failed");
        }
      } else {
        const res = await axios.post("/api/teacher/add-class", {
          teacherId,
          subjectName: classForm.subject,
          roomNumber: classForm.room,
          section: classForm.section,
          gradeLevel: classForm.gradeLevel,
          days: daysString,
          time_start: startTime12,
          time_end: endTime12,
          name: computedName,
        });

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
            time_start: startTime12,
            time_end: endTime12,
          };
          setClasses((prev) => [...prev, newCls]);

          try {
            localStorage.setItem(CLASSES_CACHE_KEY, JSON.stringify([...classes, newCls]));
          } catch (e) {
            // ignore
          }

          await Swal.fire({
            icon: "success",
            title: "Added",
            text: "Class added successfully!",
            timer: 1400,
            showConfirmButton: false,
          });
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
      const res = await axios.delete(
        `/api/teacher/delete-class/${classId}?teacherId=${teacherId}`
      );      
      if (res.data.success) {
        setClasses((prev) => prev.filter((cls) => cls.id !== classId));
        // update cache
        try {
          localStorage.setItem(CLASSES_CACHE_KEY, JSON.stringify(classes.filter((c) => c.id !== classId)));
        } catch (e) {
          // ignore
        }
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
    let start12 = cls.time_start || "";
    let end12 = cls.time_end || "";

    if ((!start12 || !end12) && cls.time) {
      const [a, b] = String(cls.time).split(" - ").map((s) => s?.trim());
      start12 = start12 || a || "";
      end12 = end12 || b || "";
    }

    setClassForm({
      id: cls.id,
      subject: cls.subjectName || "",
      room: cls.roomNumber || "",
      section: cls.section || "",
      gradeLevel: cls.gradeLevel || "",
      days: (cls.days || "").split(", ").filter(Boolean),
      startTime: convertTo24Hour(start12),
      endTime: convertTo24Hour(end12),
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