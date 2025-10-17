import { useState, useEffect } from "react";
import {
  Home,
  CalendarCheck,
  Settings,
  Menu,
  ChevronDown,
  CalendarDays,
  FileCheck,
  LogOut,
  Bell,
  X,
  Megaphone,
  FileText,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";

export default function StudentLayout({ title, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [posts, setPosts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [studentId, setStudentId] = useState(null);

  const navItems = [
    { name: "Dashboard", path: "/student/dashboard", icon: <Home size={20} /> },
    { name: "Attendance", path: "/student/attendance", icon: <CalendarCheck size={20} /> },
    { name: "Current Classes", path: "/student/classes", icon: <CalendarDays size={20} /> },
    { name: "Data Privacy", path: "/student/dataprivacy", icon: <FileCheck size={20} /> },
    { name: "Settings", path: "/student/settings", icon: <Settings size={20} /> },
  ];

  const pathnames = location.pathname.split("/").filter((x) => x);

  // ✅ Get current student's ID
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) setStudentId(user.uid);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Listen to announcements
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "announcements"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const filtered = data.filter((a) => {
        const isExpired = new Date(a.expiration) < new Date();
        return !isExpired && (a.target === "students" || a.target === "all");
      });

      filtered.sort(
        (a, b) =>
          new Date(b.createdAt?.toDate?.() || b.createdAt || 0) -
          new Date(a.createdAt?.toDate?.() || a.createdAt || 0)
      );

      setAnnouncements(filtered);
      setUnreadCount((count) => count + filtered.length);
    });

    return () => unsub();
  }, []);

  // ✅ Listen to posts from teacher classes
  useEffect(() => {
    if (!studentId) return;

    const unsubStudent = onSnapshot(doc(db, "students", studentId), (snap) => {
      if (!snap.exists()) return;

      const studentData = snap.data();
      const studentClasses = studentData.classes || [];
      if (studentClasses.length === 0) return;

      const unsubs = [];
      let allPosts = [];

      studentClasses.forEach((cls) => {
        const { teacherId, id: classId, subjectName } = cls;
        if (!teacherId || !classId) return;

        const postsRef = collection(db, "teachers", teacherId, "classes", classId, "posts");

        const unsubPosts = onSnapshot(postsRef, async (postSnap) => {
          const teacherSnap = await getDoc(doc(db, "teachers", teacherId));
          const teacherData = teacherSnap.exists() ? teacherSnap.data() : {};
          const teacherName = `${teacherData.firstname || teacherData.firstName || ""} ${
            teacherData.lastname || teacherData.lastName || ""
          }`.trim();

          const newPosts = postSnap.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              classId,
              teacherId,
              ...data,
              title: `${subjectName || "Untitled Subject"} — ${teacherName || "Unknown Teacher"}`,
              createdAt: data.timestamp || data.createdAt || null,
            };
          });

          // ✅ Merge and sort (newest first)
          allPosts = [...allPosts.filter((p) => p.classId !== classId), ...newPosts];
          allPosts.sort(
            (a, b) =>
              new Date(b.createdAt?.toDate?.() || b.createdAt || 0) -
              new Date(a.createdAt?.toDate?.() || a.createdAt || 0)
          );

          setPosts([...allPosts]);
          setUnreadCount((count) => count + newPosts.length);
        });

        unsubs.push(unsubPosts);
      });

      return () => unsubs.forEach((u) => u());
    });

    return () => unsubStudent();
  }, [studentId]);

  // ✅ Reset notification count when opened
  const handleToggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) setUnreadCount(0);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <div className="flex h-screen w-screen">
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen ${
          isCollapsed ? "w-26" : "w-74"
        } bg-[#415CA0] flex flex-col text-white transition-all duration-300 z-50`}
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/20">
          <img
            src="../src/assets/images/aics_logo.png"
            alt="AICS Logo"
            className="h-15 w-auto object-contain"
          />
          {!isCollapsed && (
            <div className="font-bold leading-tight text-md">
              <p>Asian Institute of</p>
              <p>Computer Studies</p>
            </div>
          )}
        </div>

        <div
          className="px-2 py-3 text-xs uppercase tracking-wide text-gray-200 cursor-pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center gap-2 px-6 py-6">
            <Menu size={16} />
            {!isCollapsed && <span>Menu</span>}
          </div>
        </div>

        <nav className="flex-1 px-2 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 pl-6 px-4 py-2 rounded-lg transition
                ${
                  location.pathname === item.path
                    ? "bg-[#32487E] text-white"
                    : "text-white hover:bg-[#32487E] hover:text-white"
                }`}
            >
              <span className="text-white">{item.icon}</span>
              {!isCollapsed && <span className="text-white text-lg">{item.name}</span>}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isCollapsed ? "ml-26" : "ml-74"
        }`}
      >
        {/* Top Bar */}
        <div
          className={`fixed top-0 h-16 bg-white shadow flex justify-between items-center px-6 z-40 transition-all duration-300`}
          style={{
            left: isCollapsed ? "6.5rem" : "18.5rem",
            right: 0,
          }}
        >
          <h2 className="text-lg font-bold text-[#415CA0]">{title}</h2>

          <div className="flex items-center gap-6">
            {/* 🔔 Notifications */}
            <div className="relative">
              <button
                className="p-2 rounded-full hover:bg-gray-100 transition relative"
                onClick={handleToggleNotifications}
              >
                <Bell size={22} className="text-[#415CA0]" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-96 bg-white border border-gray-200 rounded-xl shadow-lg z-50 animate-fadeIn">
                  <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                    <h3 className="font-semibold text-[#415CA0] flex items-center gap-2">
                      <Bell size={18} /> Notifications
                    </h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {/* Announcements */}
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-[#415CA0] flex items-center gap-2">
                      <Megaphone size={16} /> Announcements
                    </div>
                    {announcements.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-3">
                        No announcements yet.
                      </p>
                    ) : (
                      announcements.map((a) => (
                        <div
                          key={a.id}
                          className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition"
                        >
                          <h4 className="font-semibold text-gray-800">{a.title}</h4>
                          <p className="text-gray-600 text-sm line-clamp-2">{a.content}</p>
                        </div>
                      ))
                    )}

                    {/* Posts */}
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-[#415CA0] flex items-center gap-2">
                      <FileText size={16} /> Class Posts
                    </div>
                    {posts.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-3">
                        No class posts yet.
                      </p>
                    ) : (
                      posts.map((p) => (
                        <div
                          key={p.id}
                          className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition"
                        >
                          <h4 className="font-semibold text-gray-800">{p.title}</h4>
                          <p className="text-gray-600 text-sm line-clamp-2">
                            {p.content || "No content"}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {p.createdAt
                              ? new Date(
                                  p.createdAt?.toDate?.() || p.createdAt
                                ).toLocaleString()
                              : "No date"}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu */}
            <div className="relative">
              <div
                className="flex items-center gap-4 cursor-pointer bg-white px-3 py-1 border hover:bg-[#F0F4FF] transition"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <div className="h-10 w-10 flex items-center justify-center bg-[#415CA0] text-white font-bold ">
                  J
                </div>

                <div className="flex flex-col leading-tight">
                  <span className="font-medium text-[#32487E]">Juan Dela Cruz</span>
                  <span className="text-xs text-gray-500">Student</span>
                </div>

                <ChevronDown size={16} className="text-[#415CA0]" />
              </div>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-54 bg-white border border-gray-300 shadow-lg z-50">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full gap-2 px-4 py-2 text-red-600 hover:bg-gray-200 transition-colors"
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 bg-gray-50 mt-16 overflow-y-auto">
          <div className="w-full flex justify-end mb-4">
            <div className="text-sm text-gray-500 flex gap-1">
              <span className="hover:underline text-[#415CA0] cursor-pointer">Home</span>
              {pathnames.map((name, index) => {
                const isLast = index === pathnames.length - 1;
                return (
                  <span key={name} className="flex gap-1">
                    <span>/</span>
                    <span
                      className={`capitalize ${
                        isLast ? "text-[#415CA0] font-medium" : "text-gray-600"
                      }`}
                    >
                      {name}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
