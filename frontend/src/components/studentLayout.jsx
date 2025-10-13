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
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase"; // ✅ make sure your firebase.js path matches
import { collection, onSnapshot } from "firebase/firestore";

export default function StudentLayout({ title, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [announcements, setAnnouncements] = useState([]);

  const navItems = [
    { name: "Dashboard", path: "/student/dashboard", icon: <Home size={20} /> },
    { name: "Attendance", path: "/student/attendance", icon: <CalendarCheck size={20} /> },
    { name: "Current Schedules", path: "/student/schedules", icon: <CalendarDays size={20} /> },
    { name: "Data Privacy", path: "/student/dataprivacy", icon: <FileCheck size={20} /> },
    { name: "Settings", path: "/student/settings", icon: <Settings size={20} /> },
  ];

  const pathnames = location.pathname.split("/").filter((x) => x);

  // ✅ Real-time Firestore Announcements
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "announcements"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      const filtered = data.filter((a) => {
        const isExpired = new Date(a.expiration) < new Date();
        return !isExpired && (a.target === "students" || a.target === "all");
      });

      filtered.sort(
        (a, b) =>
          new Date(b.createdAt?.toDate?.() || 0) -
          new Date(a.createdAt?.toDate?.() || 0)
      );

      setAnnouncements(filtered);
    });

    return () => unsub();
  }, []);

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
              {!isCollapsed && (
                <span className="text-white text-lg">{item.name}</span>
              )}
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
            {/* 🔔 Announcements Dropdown */}
            <div className="relative">
              <button
                className="p-2 rounded-full hover:bg-gray-100 transition relative"
                onClick={() => setShowAnnouncements(!showAnnouncements)}
              >
                <Bell size={22} className="text-[#415CA0]" />
                {announcements.length > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1">
                    {announcements.length}
                  </span>
                )}
              </button>

              {/* Announcement Panel */}
              {showAnnouncements && (
                <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 animate-fadeIn">
                  <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                    <h3 className="font-semibold text-[#415CA0] flex items-center gap-2">
                      <Megaphone size={18} /> Announcements
                    </h3>
                    <button
                      onClick={() => setShowAnnouncements(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {announcements.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No announcements yet.
                    </p>
                  ) : (
                    <ul className="max-h-80 overflow-y-auto">
                      {announcements.map((a) => (
                        <li
                          key={a.id}
                          className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition"
                        >
                          <h4 className="font-semibold text-gray-800">
                            {a.title}
                          </h4>
                          <p className="text-gray-600 text-sm line-clamp-2">
                            {a.content}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Exp: {new Date(a.expiration).toLocaleDateString()}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
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
                  <span className="font-medium text-[#32487E]">
                    Juan Dela Cruz
                  </span>
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
          {/* Breadcrumbs */}
          <div className="w-full flex justify-end mb-4">
            <div className="text-sm text-gray-500 flex gap-1">
              <span className="hover:underline text-[#415CA0] cursor-pointer">
                Home
              </span>
              {pathnames.map((name, index) => {
                const isLast = index === pathnames.length - 1;
                return (
                  <span key={name} className="flex gap-1">
                    <span>/</span>
                    <span
                      className={`capitalize ${
                        isLast
                          ? "text-[#415CA0] font-medium"
                          : "text-gray-600"
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
