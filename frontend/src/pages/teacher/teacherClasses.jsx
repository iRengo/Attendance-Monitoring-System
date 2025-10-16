import { useState, useEffect } from "react";
import TeacherLayout from "../../components/teacherLayout";
import {
  Star,
  MoreHorizontal,
  Plus,
  X,
  Paperclip,
  Image as ImageIcon,
  Send,
} from "lucide-react";
import axios from "axios";
import { auth } from "../../firebase";

export default function CurrentClasses() {
  const [selectedClass, setSelectedClass] = useState(null);
  const [studentCounts, setStudentCounts] = useState({});
  const [classes, setClasses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDaysDropdown, setShowDaysDropdown] = useState(false);
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({ text: "", file: null, image: null });
  const [dropdownOpenId, setDropdownOpenId] = useState(null); // Dropdown state
  const [activeTab, setActiveTab] = useState("posts"); // Tab state
  const [students, setStudents] = useState([]); // Students for people tab
  const teacherId = auth.currentUser?.uid;

  const [classForm, setClassForm] = useState({
    id: null,
    subject: "",
    room: "",
    section: "",
    days: [],
    startTime: "",
    endTime: "",
  });

  const [isEditMode, setIsEditMode] = useState(false);

  // ------------------- FETCH CLASSES -------------------
  useEffect(() => {
    const fetchClasses = async () => {
      if (!teacherId) return;
      try {
        const res = await axios.get("http://localhost:3000/teacher/classes", {
          params: { teacherId },
        });
        if (res.data.success) setClasses(res.data.classes);
      } catch (err) {
        console.error("Error fetching classes:", err);
      }
    };
    fetchClasses();
  }, [teacherId]);

  // ------------------- FETCH POSTS FOR SELECTED CLASS -------------------
  useEffect(() => {
    const fetchPosts = async () => {
      if (!selectedClass || !teacherId) return;
      try {
        const res = await axios.get("http://localhost:3000/teacher/class-posts", {
          params: { teacherId, classId: selectedClass.id },
        });
        if (res.data.success) setPosts(res.data.posts);
      } catch (err) {
        console.error("Error fetching posts:", err);
      }
    };
    fetchPosts();
  }, [selectedClass, teacherId]);


  useEffect(() => {
    const fetchStudentCounts = async () => {
      if (!teacherId || classes.length === 0) return;
  
      try {
        const counts = {};
        for (const cls of classes) {
          const res = await axios.get("http://localhost:3000/teacher/class-students", {
            params: { teacherId, classId: cls.id },
          });
          if (res.data.success) {
            counts[cls.id] = res.data.students.length;
          } else {
            counts[cls.id] = 0;
          }
        }
        setStudentCounts(counts);
      } catch (err) {
        console.error("Error fetching student counts:", err);
      }
    };
  
    fetchStudentCounts();
  }, [classes, teacherId]);  

  // ------------------- FETCH STUDENTS FOR SELECTED CLASS -------------------
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass || !teacherId) return;
      try {
        const res = await axios.get("http://localhost:3000/teacher/class-students", {
          params: { teacherId, classId: selectedClass.id },
        });
        if (res.data.success) {
          // Map full name
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

  // ------------------- HELPER FUNCTIONS -------------------
  const convertTo12Hour = (time24) => {
    if (!time24) return "";
    const [hour, minute] = time24.split(":");
    const hourNum = parseInt(hour, 10);
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  };

  // ------------------- ADD OR EDIT CLASS -------------------
  const handleSaveClass = async () => {
    if (
      !classForm.subject.trim() ||
      !classForm.room.trim() ||
      !classForm.section.trim() ||
      classForm.days.length === 0 ||
      !classForm.startTime ||
      !classForm.endTime
    ) {
      alert("Please fill in all fields.");
      return;
    }

    const startTime12 = convertTo12Hour(classForm.startTime);
    const endTime12 = convertTo12Hour(classForm.endTime);
    const fullTime = `${startTime12} - ${endTime12}`;
    const daysString = classForm.days.join(", ");

    setLoading(true);

    try {
      if (isEditMode) {
        // EDIT CLASS
        const res = await axios.put(
          `http://localhost:3000/teacher/update-class/${classForm.id}`,
          {
            teacherId,
            subjectName: classForm.subject,
            roomNumber: classForm.room,
            section: classForm.section,
            days: daysString,
            time: fullTime,
          }
        );

        if (res.data.success) {
          setClasses((prev) =>
            prev.map((cls) =>
              cls.id === classForm.id
                ? {
                    ...cls,
                    subjectName: classForm.subject,
                    roomNumber: classForm.room,
                    section: classForm.section,
                    days: daysString,
                    time: fullTime,
                  }
                : cls
            )
          );
          alert("Class updated successfully!");
        }
      } else {
        // ADD CLASS
        const res = await axios.post("http://localhost:3000/teacher/add-class", {
          teacherId,
          subjectName: classForm.subject,
          roomNumber: classForm.room,
          section: classForm.section,
          days: daysString,
          time: fullTime,
        });

        if (res.data.success) {
          setClasses((prev) => [
            ...prev,
            {
              id: res.data.id,
              subjectName: classForm.subject,
              roomNumber: classForm.room,
              section: classForm.section,
              days: daysString,
              time: fullTime,
            },
          ]);
          alert("Class added successfully!");
        }
      }

      setShowModal(false);
      setClassForm({
        id: null,
        subject: "",
        room: "",
        section: "",
        days: [],
        startTime: "",
        endTime: "",
      });
      setIsEditMode(false);
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------- DELETE CLASS -------------------
  const handleDeleteClass = async (classId) => {
    if (!window.confirm("Are you sure you want to delete this class?")) return;

    try {
      const res = await axios.delete(
        `http://localhost:3000/teacher/delete-class/${classId}?teacherId=${teacherId}`
      );

      if (res.data.success) {
        setClasses((prev) => prev.filter((cls) => cls.id !== classId));
        alert("Class deleted successfully!");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete class.");
    }
  };

  // ------------------- EDIT CLASS -------------------
  const handleEditClass = (cls) => {
    const [start, end] = cls.time.split(" - ").map((t) => {
      const [h, m] = t.split(":");
      return h.length === 1 ? `0${h}:${m}` : `${h}:${m}`;
    });

    setClassForm({
      id: cls.id,
      subject: cls.subjectName,
      room: cls.roomNumber,
      section: cls.section,
      days: cls.days.split(", "),
      startTime: cls.startTime || start,
      endTime: cls.endTime || end,
    });

    setIsEditMode(true);
    setShowModal(true);
  };

  // ------------------- COPY CLASS LINK -------------------
  const handleCopyLink = (classId) => {
    const link = `${window.location.origin}/join-class/${classId}`;
    navigator.clipboard.writeText(link);
    alert("Class link copied!");
  };

  // ------------------- POST TO CLASS -------------------
  const handlePostSubmit = async () => {
    if (!newPost.text && !newPost.file && !newPost.image) {
      alert("Please write something or attach a file/image.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("teacherId", teacherId);
      formData.append("classId", selectedClass.id);
      formData.append("content", newPost.text);
      if (newPost.image) formData.append("image", newPost.image);
      if (newPost.file) formData.append("file", newPost.file);

      const res = await axios.post("http://localhost:3000/teacher/add-post", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        setPosts((prev) => [res.data.post, ...prev]);
        setNewPost({ text: "", file: null, image: null });
      }
    } catch (err) {
      console.error("Error posting:", err);
      alert("Failed to post.");
    }
  };

  // ------------------- SELECTED CLASS VIEW -------------------
  if (selectedClass) {
    return (
      <TeacherLayout title={`${selectedClass.subjectName} - ${selectedClass.section}`}>
        <div className="min-h-screen bg-gray-50 p-10">
          {/* Class Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#3498db]">
                {selectedClass.subjectName} - {selectedClass.section}
              </h1>
              <p className="text-gray-500 text-sm">
                {selectedClass.days} | {selectedClass.time} | {selectedClass.roomNumber}
              </p>
            </div>
            <button
              onClick={() => setSelectedClass(null)}
              className="px-5 py-2 bg-gray-200 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-300 transition"
            >
              Back to Classes
            </button>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex gap-4">
              <button
                onClick={() => setActiveTab("posts")}
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === "posts"
                    ? "border-b-2 border-[#3498db] text-[#3498db]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Posts
              </button>
              <button
                onClick={() => setActiveTab("people")}
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === "people"
                    ? "border-b-2 border-[#3498db] text-[#3498db]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                People
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === "posts" ? (
            <>
              {/* Post Input Box */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
                <textarea
                  rows="3"
                  placeholder="Write something for your class..."
                  value={newPost.text}
                  onChange={(e) => setNewPost({ ...newPost, text: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-800 focus:ring-2 focus:ring-[#3498db] outline-none resize-none"
                ></textarea>

                {(newPost.image || newPost.file) && (
                  <div className="mt-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
                    {newPost.image && (
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <img
                            src={URL.createObjectURL(newPost.image)}
                            alt="Preview"
                            className="w-20 h-20 object-cover rounded-md border"
                          />
                          <span className="text-sm text-gray-700 font-medium">
                            {newPost.image.name}
                          </span>
                        </div>
                        <button
                          onClick={() => setNewPost({ ...newPost, image: null })}
                          className="text-red-500 text-sm font-semibold hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    {newPost.file && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          📎 <span>{newPost.file.name}</span>
                        </div>
                        <button
                          onClick={() => setNewPost({ ...newPost, file: null })}
                          className="text-red-500 text-sm font-semibold hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center mt-3">
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-[#3498db]">
                      <ImageIcon size={18} />
                      <span className="text-sm">Add Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setNewPost({ ...newPost, image: e.target.files[0] })}
                        className="hidden"
                      />
                    </label>

                    <label className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-[#3498db]">
                      <Paperclip size={18} />
                      <span className="text-sm">Attach File</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                        onChange={(e) => setNewPost({ ...newPost, file: e.target.files[0] })}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <button
                    onClick={handlePostSubmit}
                    className="flex items-center gap-2 px-4 py-2 bg-[#3498db] text-white rounded-lg text-sm font-medium hover:bg-[#2f89ca] transition"
                  >
                    <Send size={16} /> Post
                  </button>
                </div>
              </div>

              {/* Post Feed */}
              <div className="space-y-5">
                {posts.length === 0 ? (
                  <p className="text-gray-400 text-center">
                    No posts yet. Start by sharing something!
                  </p>
                ) : (
                  posts.map((post) => (
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
                          <Paperclip size={14} /> Attached File
                        </a>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(post.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            // ---------------- PEOPLE TAB ----------------
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              {students.length === 0 ? (
                <p className="text-gray-400 text-center">No students have joined yet.</p>
              ) : (
                <ul className="space-y-3">
                  {students.map((student) => (
                    <li key={student.id} className="flex justify-between items-center">
                      <span className="text-gray-800">{student.fullName}</span>
                      <span className="text-gray-500 text-sm">{student.email}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </TeacherLayout>
    );
  }

  // ------------------- DEFAULT VIEW -------------------
  return (
    <TeacherLayout title="Current Classes">
      <div className="min-h-screen bg-gray-50 p-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
              Current Classes
            </h1>
            <p className="text-gray-500 text-sm">
              Manage your active classes and view enrolled students.
            </p>
          </div>

          <button
            onClick={() => {
              setClassForm({
                id: null,
                subject: "",
                room: "",
                section: "",
                days: [],
                startTime: "",
                endTime: "",
              });
              setIsEditMode(false);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2 bg-[#3498db] text-white rounded-lg text-sm font-medium hover:bg-[#2f89ca] transition"
          >
            <Plus size={18} /> Add Class
          </button>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {classes.length === 0 ? (
            <p className="text-gray-400 text-center col-span-full">No classes yet.</p>
          ) : (
            classes.map((cls) => (
              <div
                key={cls.id}
                className="relative bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 p-6"
              >
                <div
                  className="rounded-xl px-5 py-3 mb-5 text-white font-semibold text-lg shadow-sm"
                  style={{ backgroundColor: "#3498db" }}
                >
                  {cls.subjectName} - {cls.roomNumber}
                </div>

                <div className="mb-5 space-y-2">
                  <span
                    className="font-medium px-4 py-1.5 rounded-full text-sm shadow-sm inline-block"
                    style={{ backgroundColor: "#eaf4fc", color: "#2176b8" }}
                  >
                    {cls.section}
                  </span>
                  <p className="text-gray-600 text-sm">
                    <strong>Day:</strong> {cls.days}
                  </p>
                  <p className="text-gray-600 text-sm">
                    <strong>Time:</strong> {cls.time}
                  </p>
                  <p className="text-gray-600 text-sm">
                    <strong>Students:</strong> {studentCounts[cls.id] ?? 0}
                  </p>
                </div>


                <div className="flex justify-between items-center relative">
                  {/* Dropdown */}
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
                          onClick={() => handleEditClass(cls)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClass(cls.id)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500 text-sm"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => handleCopyLink(cls.id)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 text-sm"
                        >
                          Copy Link
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
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center text-gray-800 bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-white rounded-2xl shadow-xl w-11/12 max-w-md p-8 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition"
            >
              <X size={22} />
            </button>
            <h2 className="text-xl font-semibold text-[#3498db] mb-6">
              {isEditMode ? "Edit Class" : "Add New Class"}
            </h2>

            <div className="space-y-4">
              {/* Subject, Room, Section */}
              <input
                type="text"
                placeholder="Subject"
                value={classForm.subject}
                onChange={(e) =>
                  setClassForm({ ...classForm, subject: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#3498db] outline-none"
              />
              <input
                type="text"
                placeholder="Room Number"
                value={classForm.room}
                onChange={(e) =>
                  setClassForm({ ...classForm, room: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#3498db] outline-none"
              />
              <input
                type="text"
                placeholder="Section"
                value={classForm.section}
                onChange={(e) =>
                  setClassForm({ ...classForm, section: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#3498db] outline-none"
              />

              {/* Days */}
              <div className="relative">
                <button
                  onClick={() => setShowDaysDropdown((prev) => !prev)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-left focus:ring-2 focus:ring-[#3498db] outline-none"
                >
                  {classForm.days.length > 0
                    ? classForm.days.join(", ")
                    : "Select Days"}
                </button>
                {showDaysDropdown && (
                  <div className="absolute mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-sm z-50">
                    {[
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                      "Sunday",
                    ].map((day) => (
                      <div key={day}>
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={classForm.days.includes(day)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setClassForm({
                                  ...classForm,
                                  days: [...classForm.days, day],
                                });
                              } else {
                                setClassForm({
                                  ...classForm,
                                  days: classForm.days.filter((d) => d !== day),
                                });
                              }
                            }}
                          />
                          {day}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Time */}
              <div className="flex gap-4">
                <input
                  type="time"
                  value={classForm.startTime}
                  onChange={(e) =>
                    setClassForm({ ...classForm, startTime: e.target.value })
                  }
                  className="w-1/2 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#3498db] outline-none"
                />
                <input
                  type="time"
                  value={classForm.endTime}
                  onChange={(e) =>
                    setClassForm({ ...classForm, endTime: e.target.value })
                  }
                  className="w-1/2 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#3498db] outline-none"
                />
              </div>

              <button
                onClick={handleSaveClass}
                disabled={loading}
                className="w-full bg-[#3498db] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2f89ca] transition"
              >
                {loading ? "Saving..." : isEditMode ? "Update Class" : "Add Class"}
              </button>
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
