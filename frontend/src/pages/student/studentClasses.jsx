import { useState, useEffect } from "react";
import StudentLayout from "../../components/studentLayout";
import { MoreHorizontal } from "lucide-react";
import axios from "axios";
import { auth, db } from "../../firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

export default function StudentSchedules() {
  const [joinLink, setJoinLink] = useState("");
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState({});
  const [selectedClass, setSelectedClass] = useState(null);
  const [dropdownOpenId, setDropdownOpenId] = useState(null);
  const [posts, setPosts] = useState([]);
  const [leaveModal, setLeaveModal] = useState({ open: false, classId: null });
  const [gradeLevel, setGradeLevel] = useState(null);
  const studentId = auth.currentUser?.uid;

  // ✅ Fetch student's current classes & grade level
  useEffect(() => {
    if (!studentId) return;
    const fetchStudentData = async () => {
      try {
        const studentDoc = await getDoc(doc(db, "students", studentId));
        if (studentDoc.exists()) {
          const studentData = studentDoc.data();
          setClasses(studentData.classes || []);
          setGradeLevel(
            studentData.gradeLevel ||
              studentData.grade ||
              studentData.level ||
              "N/A"
          );
        }
      } catch (err) {
        console.error("Error fetching student classes:", err);
      }
    };
    fetchStudentData();
  }, [studentId]);

  // ✅ Fetch teacher names
  useEffect(() => {
    const fetchTeacherNames = async () => {
      const teacherIds = classes.map((cls) => cls.teacherId).filter(Boolean);
      const teacherData = {};

      await Promise.all(
        teacherIds.map(async (id) => {
          if (!teachers[id]) {
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
          }
        })
      );

      setTeachers((prev) => ({ ...prev, ...teacherData }));
    };

    if (classes.length > 0) fetchTeacherNames();
  }, [classes]);

  // ✅ Fetch posts for selected class
  useEffect(() => {
    if (!selectedClass || !selectedClass.teacherId || !selectedClass.id) {
      setPosts([]);
      return;
    }

    const fetchClassPosts = async () => {
      try {
        const postsRef = collection(
          db,
          "teachers",
          selectedClass.teacherId,
          "classes",
          selectedClass.id,
          "posts"
        );
        const postsSnap = await getDocs(postsRef);
        const postsData = postsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        postsData.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setPosts(postsData);
      } catch (err) {
        console.error("Error fetching posts:", err);
        setPosts([]);
      }
    };

    fetchClassPosts();
  }, [selectedClass]);

  // ✅ Join class
  const handleJoinLink = async () => {
    if (!joinLink.trim()) {
      alert("Please enter a valid class link.");
      return;
    }

    try {
      let classId = joinLink.trim();
      if (joinLink.includes("/join-class/"))
        classId = joinLink.split("/join-class/")[1];

      const res = await axios.post("http://localhost:3000/student/join-class", {
        studentId,
        classId,
      });

      if (res.data.success) {
        alert("Successfully joined the class!");

        // ✅ Add the new class and immediately show gradeLevel and section
        const joinedClass = res.data.class;
        setClasses((prev) => [...prev, joinedClass]);

        // ✅ Update grade level state if available
        if (joinedClass.gradeLevel && joinedClass.gradeLevel !== "N/A") {
          setGradeLevel(joinedClass.gradeLevel);
        }

        setJoinLink("");
      } else {
        alert(res.data.message || "Failed to join class");
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to join class.");
    }
  };

  // ✅ Leave class
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
        alert(res.data.message || "Failed to leave class");
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to leave class.");
    } finally {
      setLeaveModal({ open: false, classId: null });
    }
  };

  // ✅ Convert 24h to 12h format
  const convertTo12Hour = (time24) => {
    if (!time24) return "";
    const [hour, minute] = time24.split(":");
    const hourNum = parseInt(hour, 10);
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  };

  // ==================== CLASS DETAIL VIEW ====================
  if (selectedClass) {
    return (
      <StudentLayout title={`${selectedClass.subjectName} - ${selectedClass.section}`}>
        <div className="min-h-screen bg-gray-50 p-10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#3498db]">
                {selectedClass.subjectName} - {selectedClass.section}
              </h1>
              <p className="text-gray-500 text-sm">
                {selectedClass.days} | {selectedClass.time} |{" "}
                {selectedClass.roomNumber}
              </p>
              <p className="text-gray-600 text-sm">
                <strong>Grade Level:</strong> {selectedClass.gradeLevel || "N/A"}
              </p>
              <p className="text-gray-600 text-sm">
                <strong>Teacher:</strong>{" "}
                {teachers[selectedClass.teacherId] || "Loading..."}
              </p>
            </div>
            <button
              onClick={() => setSelectedClass(null)}
              className="px-5 py-2 bg-gray-200 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-300 transition"
            >
              Back to Classes
            </button>
          </div>

          {posts.length > 0 ? (
            <div className="space-y-5">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm p-5"
                >
                  <p className="text-gray-800 mb-2">{post.content}</p>
                  {post.imageUrl && (
                    <img
                      src={post.imageUrl}
                      alt="Post"
                      className="rounded-lg w-full max-h-80 object-cover mb-2"
                    />
                  )}
                  {post.fileUrl && (
                    <a
                      href={post.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#3498db] text-sm underline flex items-center gap-1"
                    >
                      📎 Attached File
                    </a>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {post.timestamp
                      ? new Date(post.timestamp).toLocaleString()
                      : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center">No posts yet.</p>
          )}
        </div>
      </StudentLayout>
    );
  }

  // ==================== DEFAULT MY CLASSES VIEW ====================
  return (
    <StudentLayout title="My Classes">
      <div className="min-h-screen bg-gray-50 p-10">
        {/* Join Class */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Join a Class</h2>
          <div className="flex gap-2 text-gray-800">
            <input
              type="text"
              placeholder="Enter class link"
              value={joinLink}
              onChange={(e) => setJoinLink(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 flex-1 text-sm focus:ring-2 focus:ring-[#3498db] outline-none"
            />
            <button
              onClick={handleJoinLink}
              className="bg-[#3498db] text-white px-4 py-2 rounded-lg hover:bg-[#2f89ca] transition"
            >
              Join
            </button>
          </div>
        </div>

        {/* Classes Grid */}
        <h2 className="text-xl text-gray-800 font-bold mb-4">My Classes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {classes.length === 0 ? (
            <p className="text-gray-400 text-center col-span-full">
              No classes yet.
            </p>
          ) : (
            classes.map((cls) => (
              <div
                key={cls.id}
                className="relative bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 p-6"
              >
                <div
                  className="rounded-xl px-5 py-3 mb-2 text-white font-semibold text-lg shadow-sm"
                  style={{ backgroundColor: "#3498db" }}
                >
                  {cls.subjectName} - {cls.roomNumber}
                </div>

                <div className="mb-3 space-y-1">
                  <span
                    className="font-medium px-4 py-1.5 rounded-full text-sm shadow-sm inline-block"
                    style={{ backgroundColor: "#eaf4fc", color: "#2176b8" }}
                  >
                    {cls.section}
                  </span>
                  <p className="text-gray-600 text-sm">
                    <strong>Grade Level:</strong>{" "}
                    {cls.gradeLevel || gradeLevel || "N/A"}
                  </p>
                  <p className="text-gray-600 text-sm">
                    <strong>Day:</strong> {cls.days}
                  </p>
                  <p className="text-gray-600 text-sm">
                    <strong>Time:</strong> {cls.time}
                  </p>
                  <p className="text-gray-600 text-sm">
                    <strong>Teacher:</strong>{" "}
                    {teachers[cls.teacherId] || "Loading..."}
                  </p>
                </div>

                <div className="flex justify-between items-center relative">
                  <div className="relative">
                    <button
                      onClick={() =>
                        setDropdownOpenId((prev) => (prev === cls.id ? null : cls.id))
                      }
                      className="p-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 transition-all duration-200"
                    >
                      <MoreHorizontal
                        size={18}
                        className="text-gray-600 hover:text-[#3498db] transition-colors duration-200"
                      />
                    </button>

                    {dropdownOpenId === cls.id && (
                      <div className="absolute top-10 left-0 bg-white border border-gray-200 shadow-lg rounded-lg w-40 z-50">
                        <button
                          onClick={() => setLeaveModal({ open: true, classId: cls.id })}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 text-sm"
                        >
                          Leave Class
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedClass(cls)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm transition-all"
                    style={{ backgroundColor: "#3498db" }}
                  >
                    View Class
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Blur overlay */}
        {leaveModal.open && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"></div>
        )}

        {/* Modal */}
        {leaveModal.open && (
          <div className="fixed inset-0 flex items-center justify-center z-60">
            <div className="bg-white rounded-xl p-6 w-80 shadow-lg">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Leave Class?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to leave this class? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setLeaveModal({ open: false, classId: null })}
                  className="px-4 py-2 rounded-lg border text-gray-800 border-gray-300 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLeaveClass}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
                >
                  Leave
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
