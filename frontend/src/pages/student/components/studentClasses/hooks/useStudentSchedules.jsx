import { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { auth, db } from "../../../../../firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

/**
 * useStudentSchedules
 * Updated to fetch and use time_start / time_end (with legacy fallback to time).
 */
export default function useStudentSchedules() {
  const navigate = useNavigate();
  const studentId = auth.currentUser?.uid;

  const [joinLink, setJoinLink] = useState("");
  const [classes, setClasses] = useState([]); // full class docs
  const [teachers, setTeachers] = useState({});
  const [selectedClass, setSelectedClass] = useState(null);
  const [dropdownOpenId, setDropdownOpenId] = useState(null);
  const [posts, setPosts] = useState([]);
  const [leaveModal, setLeaveModal] = useState({ open: false, classId: null });
  const [gradeLevel, setGradeLevel] = useState(null);

  // Helper to normalize a class doc (adds time_start/time_end fallback)
  const normalizeClassDoc = (snap) => {
    if (!snap || !snap.exists()) return null;
    const data = snap.data() || {};
    // Prefer new fields; fallback to legacy combined 'time'
    let { time_start, time_end } = data;
    if ((!time_start || !time_end) && data.time) {
      const [a, b] = String(data.time).split(" - ").map((s) => s?.trim());
      time_start = time_start || a || "";
      time_end = time_end || b || "";
    }
    return {
      id: snap.id,
      ...data,
      time_start: time_start || "",
      time_end: time_end || "",
    };
  };

  // Fetch student's classes
  useEffect(() => {
    if (!studentId) return;

    const fetchStudentData = async () => {
      try {
        const studentDoc = await getDoc(doc(db, "students", studentId));
        if (!studentDoc.exists()) return;

        const studentData = studentDoc.data() || {};
        const classIds = Array.isArray(studentData.classes) ? studentData.classes : [];
        setGradeLevel(
          studentData.gradeLevel ||
            studentData.grade ||
            studentData.level ||
            "N/A"
        );

        if (!classIds.length) {
          setClasses([]);
          return;
        }

        const classDocs = await Promise.all(
          classIds.map(async (id) => {
            const snap = await getDoc(doc(db, "classes", id));
            return normalizeClassDoc(snap);
          })
        );

        setClasses(classDocs.filter(Boolean));
      } catch (err) {
        console.error("Error fetching student classes:", err);
      }
    };

    fetchStudentData();
  }, [studentId]);

  // Fetch teacher names
  useEffect(() => {
    const fetchTeacherNames = async () => {
      const teacherIds = classes.map((cls) => cls.teacherId).filter(Boolean);
      const teacherData = {};

      await Promise.all(
        teacherIds.map(async (id) => {
          if (teachers[id]) return;
            const teacherDoc = await getDoc(doc(db, "teachers", id));
            if (teacherDoc.exists()) {
              const t = teacherDoc.data();
              const firstName = t.firstName ?? t.firstname ?? "";
              const middleName = t.middleName ?? t.middlename ?? "";
              const lastName = t.lastName ?? t.lastname ?? "";
              const fullName = `${firstName} ${middleName} ${lastName}`
                .replace(/\s+/g, " ")
                .trim();
              teacherData[id] = fullName || "Unknown Teacher";
            } else {
              teacherData[id] = "Unknown Teacher";
            }
        })
      );

      if (Object.keys(teacherData).length) {
        setTeachers((prev) => ({ ...prev, ...teacherData }));
      }
    };

    if (classes.length > 0) fetchTeacherNames();
  }, [classes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch posts for selected class
  useEffect(() => {
    if (!selectedClass || !selectedClass.id) {
      setPosts([]);
      return;
    }

    const fetchClassPosts = async () => {
      try {
        const postsRef = collection(db, "classes", selectedClass.id, "posts");
        const postsSnap = await getDocs(postsRef);
        const postsData = postsSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        postsData.sort(
          (a, b) =>
            new Date(b.timestamp || 0).getTime() -
            new Date(a.timestamp || 0).getTime()
        );
        setPosts(postsData);
      } catch (err) {
        console.error("Error fetching posts:", err);
        setPosts([]);
      }
    };

    fetchClassPosts();
  }, [selectedClass]);

  // Join class
  const handleJoinLink = async () => {
    const raw = joinLink.trim();
    if (!raw) {
      Swal.fire({
        icon: "warning",
        title: "Missing Link",
        text: "Please enter a valid class link.",
        confirmButtonColor: "#3498db",
      });
      return;
    }

    try {
      let cleaned = raw.replace(/^https?:\/\/[^/]+/i, "");
      cleaned = cleaned.replace(/^\/+/, "");
      cleaned = cleaned.replace(/^join-class\//i, "").replace(/^joinclass\//i, "");
      if (cleaned.includes("/")) {
        Swal.fire({
          icon: "error",
          title: "Invalid Link",
          text: "The class link format is invalid.",
          confirmButtonColor: "#3498db",
        });
        return;
      }
      const classId = cleaned;
      if (!classId) {
        Swal.fire({
          icon: "error",
          title: "Invalid Link",
          text: "Could not extract a class ID from the link.",
          confirmButtonColor: "#3498db",
        });
        return;
      }

      // Profile picture check
      const studentDoc = await getDoc(doc(db, "students", studentId));
      if (!studentDoc.exists()) {
        Swal.fire({
          icon: "error",
          title: "Profile Not Found",
          text: "Your student record was not found in the system.",
          confirmButtonColor: "#3498db",
        });
        return;
      }
      const studentData = studentDoc.data() || {};
      const hasProfilePic =
        !!studentData.profilePicBinary || !!studentData.profilePicUrl;
      if (!hasProfilePic) {
        Swal.fire({
          icon: "warning",
          title: "Profile Picture Required",
          html: `
            <p>You must upload a profile picture first before joining a class.</p>
            <p style="margin-top:6px;">Go to <b>Settings → Profile</b> to upload your picture.</p>
          `,
          showCancelButton: true,
          confirmButtonText: "Upload Now",
          cancelButtonText: "Cancel",
          confirmButtonColor: "#3498db",
        }).then((result) => {
          if (result.isConfirmed) {
            navigate("/student/settings");
          }
        });
        return;
      }

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/student/join-class`,
        {
          studentId,
          classId,
        }
      );
      
      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: "Class Joined!",
          text: "You have successfully joined the class.",
          confirmButtonColor: "#3498db",
        });

        // try to get full class doc directly from Firestore (ensures time_start/time_end).
        let fullClass = null;
        const snap = await getDoc(doc(db, "classes", classId));
        if (snap.exists()) {
          fullClass = normalizeClassDoc(snap);
        } else if (res.data.class) {
          // fallback to server returned object (normalize legacy)
          const c = res.data.class;
          let { time_start, time_end } = c;
          if ((!time_start || !time_end) && c.time) {
            const [a, b] = String(c.time).split(" - ").map((s) => s?.trim());
            time_start = time_start || a || "";
            time_end = time_end || b || "";
          }
          fullClass = { ...c, time_start: time_start || "", time_end: time_end || "", id: c.id || classId };
        }

        if (fullClass) {
          setClasses((prev) => {
            if (prev.some((c) => c.id === classId)) return prev;
            return [...prev, fullClass];
          });
          if (fullClass?.gradeLevel && fullClass.gradeLevel !== "N/A") {
            setGradeLevel(fullClass.gradeLevel);
          }
        }

        setJoinLink("");
      } else {
        Swal.fire({
          icon: "error",
          title: "Join Failed",
          text: res.data.message || "Unable to join the class.",
          confirmButtonColor: "#3498db",
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to join class.",
        confirmButtonColor: "#3498db",
      });
    }
  };

  // Leave class
  const handleLeaveClass = async () => {
    const classId = leaveModal.classId;
    if (!classId) return;

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/student/leave-class`,
        {
          studentId,
          classId,
        }
      );
      

      if (res.data.success) {
        setClasses((prev) => prev.filter((cls) => cls.id !== classId));
      } else {
        Swal.fire({
          icon: "error",
          title: "Leave Failed",
          text: res.data.message || "Failed to leave class",
          confirmButtonColor: "#3498db",
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to leave class.",
        confirmButtonColor: "#3498db",
      });
    } finally {
      setLeaveModal({ open: false, classId: null });
    }
  };

  // 24h → 12h convert if needed
  const convertTo12Hour = (time24) => {
    if (!time24) return "";
    const [hour, minute] = time24.split(":");
    if (minute === undefined) return time24; // already maybe "2:30 PM"
    const hourNum = parseInt(hour, 10);
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  };

  return {
    joinLink,
    setJoinLink,
    classes,
    setClasses,
    teachers,
    selectedClass,
    setSelectedClass,
    dropdownOpenId,
    setDropdownOpenId,
    posts,
    leaveModal,
    setLeaveModal,
    gradeLevel,
    handleJoinLink,
    handleLeaveClass,
    convertTo12Hour,
  };
}