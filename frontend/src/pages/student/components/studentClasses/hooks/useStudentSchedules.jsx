import { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { auth, db } from "../../../../../firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

/**
 * useStudentSchedules (updated for top-level classes collection and student.classes as array of IDs)
 */
export default function useStudentSchedules() {
  const navigate = useNavigate();
  const studentId = auth.currentUser?.uid;

  const [joinLink, setJoinLink] = useState("");
  const [classes, setClasses] = useState([]); // array of full class objects { id, subjectName, ... }
  const [teachers, setTeachers] = useState({});
  const [selectedClass, setSelectedClass] = useState(null);
  const [dropdownOpenId, setDropdownOpenId] = useState(null);
  const [posts, setPosts] = useState([]);
  const [leaveModal, setLeaveModal] = useState({ open: false, classId: null });
  const [gradeLevel, setGradeLevel] = useState(null);

  // Fetch student's class IDs and expand to class documents
  useEffect(() => {
    if (!studentId) return;

    const fetchStudentData = async () => {
      try {
        const studentDoc = await getDoc(doc(db, "students", studentId));
        if (!studentDoc.exists()) return;

        const studentData = studentDoc.data() || {};
        const classIds = Array.isArray(studentData.classes) ? studentData.classes : [];
        setGradeLevel(
          studentData.gradeLevel || studentData.grade || studentData.level || "N/A"
        );

        if (!classIds.length) {
          setClasses([]);
          return;
        }

        const classDocs = await Promise.all(
          classIds.map(async (id) => {
            const snap = await getDoc(doc(db, "classes", id));
            return snap.exists() ? { id: snap.id, ...snap.data() } : null;
          })
        );

        setClasses(classDocs.filter(Boolean));
      } catch (err) {
        console.error("Error fetching student classes:", err);
      }
    };

    fetchStudentData();
  }, [studentId]);

  // Fetch teacher names for classes
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

  // Fetch posts for selected class from top-level classes/{classId}/posts
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
            new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
        );
        setPosts(postsData);
      } catch (err) {
        console.error("Error fetching posts:", err);
        setPosts([]);
      }
    };

    fetchClassPosts();
  }, [selectedClass]);

  // Join class (checks profile picture)
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
      // 1. Extract classId regardless of format
      // Remove protocol + domain if present
      let cleaned = raw.replace(/^https?:\/\/[^/]+/i, "");
      // Remove leading slashes
      cleaned = cleaned.replace(/^\/+/, "");
      // Remove 'join-class/' or 'joinclass/' prefix
      cleaned = cleaned.replace(/^join-class\//i, "").replace(/^joinclass\//i, "");

      // If anything after cleaning still contains '/', it's malformed
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

      // 2. Ensure student has profile picture
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

      // 3. Make request
      const res = await axios.post("http://localhost:3000/student/join-class", {
        studentId,
        classId,
      });

      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: "Class Joined!",
            text: "You have successfully joined the class.",
          confirmButtonColor: "#3498db",
        });

        let fullClass = res.data.class;
        if (!fullClass?.subjectName) {
          const snap = await getDoc(doc(db, "classes", classId));
          if (snap.exists()) {
            fullClass = { id: snap.id, ...snap.data() };
          }
        }

        setClasses((prev) => {
          // Prevent duplicate if join pressed twice quickly
          if (prev.some((c) => c.id === classId)) return prev;
          return [...prev, fullClass];
        });

        if (fullClass?.gradeLevel && fullClass.gradeLevel !== "N/A") {
          setGradeLevel(fullClass.gradeLevel);
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
      const res = await axios.post("http://localhost:3000/student/leave-class", {
        studentId,
        classId,
      });

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

  // Convert 24h to 12h helper (kept)
  const convertTo12Hour = (time24) => {
    if (!time24) return "";
    const [hour, minute] = time24.split(":");
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