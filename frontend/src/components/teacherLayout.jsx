import React, { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

/**
 * TeacherLayout
 * Restores original design while adding a temp password banner.
 * Changes from previous damaged version:
 *  - Removed manual inline margin-left adjustments for banner and content.
 *  - Banner is rendered INSIDE the scrollable content area beneath the fixed top navbar.
 *  - No layout shift: sidebar width logic stays the same, top navbar positioning untouched.
 *  - Uses padding-top via mt-16 (height of navbar) for content; banner sits at top of content stack.
 */
export default function TeacherLayout({ title, children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [teacher, setTeacher] = useState(null);

  // Derived: show banner if temp_password is a non-empty string
  const isTempPassword = useMemo(
    () =>
      typeof teacher?.temp_password === "string" &&
      teacher.temp_password.trim() !== "",
    [teacher]
  );

  const navItems = [
    { name: "Dashboard", path: "/teacher/dashboard", icon: <Home size={20} /> },
    { name: "Current Classes", path: "/teacher/classes", icon: <FileCheck size={20} /> },
    { name: "Attendance Management", path: "/teacher/attendance", icon: <CalendarDays size={20} /> },
    { name: "Schedules", path: "/teacher/schedules", icon: <CalendarCheck size={20} /> },
    { name: "Announcements", path: "/teacher/announcements", icon: <Bell size={20} /> },
    { name: "Settings", path: "/teacher/settings", icon: <Settings size={20} /> },
  ];

  const pathnames = location.pathname.split("/").filter(Boolean);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setTeacher(null);
        return;
      }
      try {
        const teacherRef = doc(db, "teachers", user.uid);
        const snap = await getDoc(teacherRef);
        if (snap.exists()) setTeacher(snap.data());
      } catch (e) {
        console.error("Failed to load teacher data:", e);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      localStorage.setItem("manualLogout", "true");
      localStorage.removeItem("user");
      await signOut(auth);
      navigate("/");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const getDisplayName = () => {
    if (!teacher) return "";
    const { firstname, middlename, lastname } = teacher;
    const middleInitial = middlename ? `${middlename.charAt(0)}.` : "";
    return `${firstname || ""} ${middleInitial} ${lastname || ""}`.trim();
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
          onClick={() => setIsCollapsed((c) => !c)}
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
              className={`flex items-center gap-3 pl-6 px-4 py-2 rounded-lg transition ${
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

      {/* Main panel */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isCollapsed ? "ml-26" : "ml-74"
        }`}
      >
        {/* Top Navbar (fixed) */}
        <div
          className="fixed top-0 h-16 bg-white shadow flex justify-between items-center px-6 z-40 transition-all duration-300"
          style={{
            left: isCollapsed ? "6.5rem" : "18.5rem",
            right: 0,
          }}
        >
          <h2 className="text-lg font-bold text-[#415CA0] truncate">{title}</h2>

          <div className="flex items-center gap-6">
            {/* Notifications */}
            <div className="relative">
              <button
                className="p-2 rounded-full hover:bg-gray-100 transition"
                onClick={() => console.log("Open notifications")}
              >
                <Bell size={22} className="text-[#415CA0]" />
              </button>
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1">
                3
              </span>
            </div>

            {/* Profile dropdown */}
            <div className="relative">
              <div
                className="flex items-center gap-4 cursor-pointer bg-white px-3 py-1 border hover:bg-[#F0F4FF] transition"
                onClick={() => setMenuOpen((o) => !o)}
              >
                {teacher?.profilePicUrl ? (
                  <img
                    src={teacher.profilePicUrl}
                    alt="Profile"
                    className="h-10 w-10 rounded-full object-cover border border-gray-300"
                  />
                ) : (
                  <div className="h-10 w-10 flex items-center justify-center bg-[#415CA0] text-white font-bold rounded-full">
                    {teacher?.firstname?.charAt(0) || "?"}
                  </div>
                )}

                {!isCollapsed && (
                  <>
                    <div className="flex flex-col leading-tight">
                      <span className="font-medium text-[#32487E]">
                        {getDisplayName() || "Loading..."}
                      </span>
                      <span className="text-xs text-gray-500">Teacher</span>
                    </div>
                    <ChevronDown size={16} className="text-[#415CA0]" />
                  </>
                )}
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

        {/* Scrollable content area with top spacing equal to navbar height */}
        <div className="flex-1 overflow-y-auto bg-gray-50 mt-16 p-6">
          {/* Temp password banner (inside content; no layout shift of navbar/sidebar) */}
          {isTempPassword && (
            <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              Your account is using a temporary password. Please update your password to secure your account.
            </div>
          )}

          {/* Breadcrumbs */}
          <div className="w-full flex justify-end mb-4">
            <div className="text-sm text-gray-500 flex gap-1">
              <span
                className="hover:underline text-[#415CA0] cursor-pointer"
                onClick={() => navigate("/teacher/dashboard")}
              >
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

          {/* Page children */}
          {children}
        </div>
      </div>
    </div>
  );
}