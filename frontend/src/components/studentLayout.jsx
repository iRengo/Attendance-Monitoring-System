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
  X,
  Megaphone,
  FileText,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";

export default function StudentLayout({ title, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]); // unified notifications array with {_notifId, type, read, ...}
  const [studentId, setStudentId] = useState(null);
  const [studentData, setStudentData] = useState(null);

  // Mobile sidebar open state
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { name: "Dashboard", path: "/student/dashboard", icon: <Home size={20} /> },
    { name: "Attendance", path: "/student/attendance", icon: <CalendarCheck size={20} /> },
    { name: "Current Classes", path: "/student/classes", icon: <CalendarDays size={20} /> },
    { name: "Data Privacy", path: "/student/dataprivacy", icon: <FileCheck size={20} /> },
    { name: "Settings", path: "/student/settings", icon: <Settings size={20} /> },
  ];

  const pathnames = location.pathname.split("/").filter((x) => x);

  // Helper: normalize various timestamp shapes to milliseconds since epoch
  function toMillis(value) {
    if (!value && value !== 0) return 0;
    if (typeof value === "object") {
      if (typeof value.toDate === "function") {
        const d = value.toDate();
        return d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
      }
      if (typeof value.seconds === "number") {
        return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
      }
      if (typeof value._seconds === "number") {
        return value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1e6);
      }
    }
    if (typeof value === "number") {
      if (value < 1e11) return value * 1000;
      return value;
    }
    if (typeof value === "string") {
      const t = Date.parse(value);
      return Number.isNaN(t) ? 0 : t;
    }
    return 0;
  }

  // Fetch current student data once (we still rely on snapshots for classes/posts)
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setStudentId(user.uid);
        const studentRef = doc(db, "students", user.uid);
        const snap = await getDoc(studentRef);
        if (snap.exists()) {
          setStudentData(snap.data());
        }
      } else {
        setStudentId(null);
        setStudentData(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Keep notifications' read flags in sync when studentData.readNotifications changes
  useEffect(() => {
    if (!studentData) return;
    const readSet = new Set(Array.isArray(studentData.readNotifications) ? studentData.readNotifications : []);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: readSet.has(n._notifId) })));
  }, [studentData?.readNotifications]);

  // Announcements listener: add announcements into unified notifications
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "announcements"), (snapshot) => {
      const newNotifications = snapshot.docs
        .map((d) => {
          const data = d.data() || {};
          const _notifId = `ann:${d.id}`;
          return {
            _notifId,
            id: d.id,
            type: "announcement",
            title: data.title || "Announcement",
            content: data.content || "",
            createdAt: data.createdAt || data.timestamp || null,
            raw: data,
          };
        })
        .filter((a) => {
          const isExpired = a.raw?.expiration ? new Date(a.raw.expiration) < new Date() : false;
          const target = a.raw?.target;
          return !isExpired && (target === "students" || target === "all");
        });

      setNotifications((prev) => {
        const map = new Map(prev.map((n) => [n._notifId, n]));
        newNotifications.forEach((n) => {
          const prevEntry = map.get(n._notifId);
          const isRead =
            (prevEntry && prevEntry.read) ||
            Boolean(studentData?.readNotifications?.includes(n._notifId));
          map.set(n._notifId, { ...n, read: !!isRead });
        });
        return Array.from(map.values()).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      });
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentData?.readNotifications]);

  // Class posts per enrolled classes: subscribe to posts collections for classes listed in student doc.
  useEffect(() => {
    if (!studentId) return;
    const unsubStudent = onSnapshot(doc(db, "students", studentId), (snap) => {
      if (!snap.exists()) return;
      const sData = snap.data();
      setStudentData((prev) => ({ ...prev, ...sData }));

      const classes = sData.classes || [];
      if (!Array.isArray(classes) || classes.length === 0) {
        setNotifications((prev) => prev.filter((n) => n.type !== "post"));
        return;
      }

      const normalized = classes
        .map((c) => {
          if (!c) return null;
          if (typeof c === "string") return { classId: c, teacherId: null, subjectName: null };
          return {
            classId: c.id || c.classId || null,
            teacherId: c.teacherId || c.teacher || null,
            subjectName: c.subjectName || c.name || null,
          };
        })
        .filter(Boolean);

      const unsubArr = [];

      normalized.forEach(({ classId, teacherId, subjectName }) => {
        if (!classId) return;

        // subscribe to both places: top-level classes/{classId}/posts AND legacy teacher subcollection (if teacherId is present)
        const postPaths = [collection(db, "classes", classId, "posts")];
        if (teacherId) postPaths.push(collection(db, "teachers", teacherId, "classes", classId, "posts"));

        postPaths.forEach((postsRef) => {
          const unsub = onSnapshot(postsRef, async (postSnap) => {
            // Determine teacherName & subjectName
            let teacherName = "Unknown Teacher";
            let subjName = subjectName || null;

            if (!teacherId) {
              try {
                const clsSnap = await getDoc(doc(db, "classes", classId));
                if (clsSnap.exists()) {
                  const clsData = clsSnap.data() || {};
                  if (!subjName) subjName = clsData.subjectName || clsData.name || subjName;
                  const foundTeacherId = clsData.teacherId || clsData.teacher || null;
                  if (foundTeacherId) {
                    const tSnap = await getDoc(doc(db, "teachers", foundTeacherId));
                    if (tSnap.exists()) {
                      const tData = tSnap.data() || {};
                      teacherName = `${tData.firstname || tData.firstName || ""} ${tData.lastname || tData.lastName || ""}`.trim() || teacherName;
                    }
                  }
                }
              } catch (err) {
                // ignore
              }
            } else {
              try {
                const tSnap = await getDoc(doc(db, "teachers", teacherId));
                if (tSnap.exists()) {
                  const tData = tSnap.data() || {};
                  teacherName = `${tData.firstname || tData.firstName || ""} ${tData.lastname || tData.lastName || ""}`.trim() || teacherName;
                }
              } catch (err) {
                // ignore
              }
            }

            // Read the latest student readNotifications directly from server to avoid stale closure data
            let serverReadSet = new Set();
            try {
              if (studentId) {
                const sSnap = await getDoc(doc(db, "students", studentId));
                if (sSnap.exists()) {
                  const sRaw = sSnap.data() || {};
                  const arr = Array.isArray(sRaw.readNotifications) ? sRaw.readNotifications : [];
                  serverReadSet = new Set(arr);
                }
              }
            } catch (err) {
              // ignore — fallback to local studentData
              serverReadSet = new Set(Array.isArray(studentData?.readNotifications) ? studentData.readNotifications : []);
            }

            const newPosts = postSnap.docs.map((d) => {
              const data = d.data() || {};
              const _notifId = `post:${d.id}`;
              return {
                _notifId,
                id: d.id,
                type: "post",
                classId,
                title: `${subjName || "Untitled"} — ${teacherName}`,
                content: data.content || "No content",
                createdAt: data.timestamp || data.createdAt || null,
                raw: data,
              };
            });

            setNotifications((prev) => {
              const map = new Map(prev.map((n) => [n._notifId, n]));
              // remove old posts for this class
              for (const [k, v] of map) {
                if (v.type === "post" && v.classId === classId) map.delete(k);
              }
              newPosts.forEach((p) => {
                const prevEntry = map.get(p._notifId);
                const isRead = (prevEntry && prevEntry.read) || serverReadSet.has(p._notifId);
                map.set(p._notifId, { ...p, read: !!isRead });
              });
              return Array.from(map.values()).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
            });
          });
          unsubArr.push(unsub);
        });
      });

      return () => unsubArr.forEach((u) => u && u());
    });

    return () => unsubStudent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  // Count unread
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  // Mark single notification read (persist to student doc and update local state)
  const markNotificationRead = async (_notifId) => {
    if (!studentId || !_notifId) return;
    try {
      const studentRef = doc(db, "students", studentId);
      await updateDoc(studentRef, { readNotifications: arrayUnion(_notifId) });
      // update local state immediately for snappy UI
      setNotifications((prev) => prev.map((n) => (n._notifId === _notifId ? { ...n, read: true } : n)));
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  // Toggle notifications panel (do NOT auto-mark all read here; mark on click)
  const handleToggleNotifications = async () => {
    setShowNotifications((v) => !v);
  };

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

  const fullName = studentData
    ? `${studentData.firstname || ""} ${
        studentData.middlename?.charAt(0) ? studentData.middlename.charAt(0) + "." : ""
      } ${studentData.lastname || ""}`.trim()
    : "Student";

  const profileInitial = studentData?.firstname?.charAt(0)?.toUpperCase() || "S";
  const profilePicUrl = studentData?.profilePicUrl || studentData?.profilePic || null;

  const isTempPassword = useMemo(
    () =>
      typeof studentData?.temp_password === "string" &&
      studentData.temp_password.trim() !== "",
    [studentData]
  );

  // Sidebar class handling:
  // - On md+ screens keep existing desktop widths (md:w-26 / md:w-74 based on isCollapsed)
  // - On small screens the sidebar is hidden by default and when mobileOpen is true we show an overlay (w-64)
  const sidebarClass = `${mobileOpen ? "w-64 flex" : "w-0 hidden"} md:flex fixed left-0 top-0 h-screen bg-[#415CA0] flex-col text-white transition-all duration-300 z-50 ${isCollapsed ? "md:w-26" : "md:w-74"}`;

  // Main content margin: 0 on mobile, and md:ml-26 or md:ml-74 on desktop depending on collapsed state
  const mainWrapperClass = `flex-1 flex flex-col transition-all duration-300 ml-0 ${isCollapsed ? "md:ml-26" : "md:ml-74"}`;

  // Header left offset on desktop keeps previous behavior; on mobile it stays left-0
  const headerLeftClass = `${isCollapsed ? "md:left-[6.5rem]" : "md:left-[18.5rem]"} left-0 right-0`;

  return (
    <div className="flex h-screen w-screen">
      {/* MOBILE BACKDROP shown when mobile sidebar is open */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={sidebarClass}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/20">
          <img
            src="/aics_logo.png"
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
          onClick={() => {
            // On mobile, toggle the off-canvas; on desktop toggle collapse
            if (window.innerWidth < 768) {
              setMobileOpen((s) => !s);
            } else {
              setIsCollapsed((c) => !c);
            }
          }}
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
              onClick={() => {
                // Close mobile sidebar when navigating on mobile
                if (window.innerWidth < 768) setMobileOpen(false);
              }}
              className={`flex items-center gap-3 pl-6 px-4 py-2 rounded-lg transition ${location.pathname === item.path ? "bg-[#32487E] text-white" : "text-white hover:bg-[#32487E] hover:text-white"}`}
            >
              <span className="text-white">{item.icon}</span>
              {!isCollapsed && <span className="text-white text-lg">{item.name}</span>}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main Content Wrapper */}
      <div className={mainWrapperClass}>
        {/* Top Bar */}
        <div
  className={`fixed top-0 h-12 md:h-16 bg-white shadow flex justify-between items-center pl-0 pr-10 md:px-6 z-40 transition-all duration-300 ${headerLeftClass}`}
>

  {/* Left section */}
  <div className="flex items-center gap-0 relative w-full md:w-auto">
    {/* Mobile burger - sticks to the left edge */}
    <button
      className="p-1 md:hidden absolute left-0 rounded-md hover:bg-gray-100 transition"
      onClick={() => setMobileOpen((s) => !s)}
      aria-label="Toggle menu"
    >
      <Menu size={18} className="text-[#415CA0]" />
    </button>

    <h2 className="ml-12 md:ml-0 text-base md:text-lg font-bold text-[#415CA0] truncate">
      {title}
    </h2>
  </div>


  {/* Right section */}
  <div className="flex items-center gap-4 md:gap-6 relative flex-none">
    {/* Profile menu container */}
    <div className="relative flex-none">
  <div
    className="flex items-center gap-1 md:gap-4 cursor-pointer bg-white px-1 md:px-3 py-1 border hover:bg-[#F0F4FF] transition"
    onClick={() => setMenuOpen((o) => !o)}
  >
    {/* Profile Image */}
    {profilePicUrl ? (
      <img
        src={profilePicUrl}
        alt="Profile"
        className="h-8 w-8 md:h-10 md:w-10 rounded-full object-cover"
      />
    ) : (
      <div className="h-8 w-8 md:h-10 md:w-10 flex items-center justify-center bg-[#415CA0] text-white font-bold rounded-full">
        {profileInitial}
      </div>
    )}

    {/* DESKTOP ONLY — do NOT show on mobile */}
    <div className="hidden md:flex flex-col leading-tight">
      <span className="font-medium text-[#32487E] text-sm md:text-base">{fullName}</span>
      <span className="text-xs text-gray-500">Student</span>
    </div>

    {/* DESKTOP ONLY CHEVRON */}
    <ChevronDown size={16} className="hidden md:block text-[#415CA0]" />
  </div>

  {/* MOBILE DROPDOWN — only visible on mobile */}
  {menuOpen && (
    <div
      className="absolute right-0 w-52 bg-white border border-gray-300 shadow-lg z-50 md:hidden"
      style={{ top: "100%" }}
    >
      {/* MOBILE NAME DISPLAY */}
      <div className="px-4 py-2 border-b">
        <span className="font-medium text-[#32487E]">{fullName}</span>
        <p className="text-xs text-gray-500">Student</p>
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center w-full gap-2 px-4 py-2 text-red-600 hover:bg-gray-200 transition-colors"
      >
        <LogOut size={18} />
        <span>Logout</span>
      </button>
    </div>
  )}

  {/* DESKTOP DROPDOWN — unchanged */}
  {menuOpen && (
    <div
      className="absolute right-0 w-54 bg-white border border-gray-300 shadow-lg z-50 hidden md:block"
      style={{ top: "100%" }}
    >
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

  

            {/* NOTIFICATIONS DROPDOWN (fixed so it won't get clipped by sidebars/parents) */}
            {showNotifications && (
              <div
                className="fixed top-12 md:top-16 right-4 md:right-6 lg:right-8 w-96 bg-white border border-gray-200 rounded-xl shadow-lg z-[60] max-h-96 overflow-y-auto"
                style={{ transform: "translateY(4px)" }}
              >
                <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-[#415CA0] flex items-center gap-2">
                    <Bell size={18} /> Notifications
                  </h3>
                  <button onClick={() => setShowNotifications(false)} className="text-gray-500 hover:text-gray-700">
                    <X size={16} />
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-[#415CA0] flex items-center gap-2">
                    <Megaphone size={16} /> Announcements
                  </div>

                  {notifications.filter((n) => n.type === "announcement").length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-3">No announcements yet.</p>
                  ) : (
                    notifications
                      .filter((n) => n.type === "announcement")
                      .map((n) => (
                        <div key={n._notifId} onClick={() => markNotificationRead(n._notifId)} className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer ${!n.read ? "bg-blue-50" : "bg-white"}`}>
                          <h4 className="font-semibold text-gray-800">{n.title}</h4>
                          <p className="text-gray-600 text-sm line-clamp-2">{n.content}</p>
                          <p className="text-xs text-gray-400 mt-1">{n.createdAt ? new Date(n.createdAt?.toDate?.() || n.createdAt).toLocaleString() : "No date"}</p>
                        </div>
                      ))
                  )}

                  <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-[#415CA0] flex items-center gap-2">
                    <FileText size={16} /> Class Posts
                  </div>

                  {notifications.filter((n) => n.type === "post").length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-3">No class posts yet.</p>
                  ) : (
                    notifications
                      .filter((n) => n.type === "post")
                      .map((n) => (
                        <div key={n._notifId} onClick={() => markNotificationRead(n._notifId)} className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer ${!n.read ? "bg-blue-50" : "bg-white"}`}>
                          <h4 className="font-semibold text-gray-800">{n.title}</h4>
                          <p className="text-gray-600 text-sm line-clamp-2">{n.content}</p>
                          <p className="text-xs text-gray-400 mt-1">{n.createdAt ? new Date(n.createdAt?.toDate?.() || n.createdAt).toLocaleString() : "No date"}</p>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 p-4 md:p-6 bg-gray-50 mt-12 md:mt-16 overflow-y-auto">
          {/* Temp password banner */}
          {isTempPassword && (
            <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              Your account is using a temporary password. Please update your password to secure your account.
            </div>
          )}

          {/* Breadcrumbs */}
          <div className="w-full flex justify-end mb-4">
            <div className="text-sm text-gray-500 flex gap-1">
              <span className="hover:underline text-[#415CA0] cursor-pointer" onClick={() => navigate("/student/dashboard")}>Home</span>
              {pathnames.map((name, index) => {
                const isLast = index === pathnames.length - 1;
                return (
                  <span key={name} className="flex gap-1">
                    <span>/</span>
                    <span className={`capitalize ${isLast ? "text-[#415CA0] font-medium" : "text-gray-600"}`}>{name}</span>
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