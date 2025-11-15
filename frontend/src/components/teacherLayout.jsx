import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";

export default function TeacherLayout({ title, children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [teacher, setTeacher] = useState(null);
  const [hasUnreadAnnouncements, setHasUnreadAnnouncements] = useState(false);

  // ALERT STATES
  const [alertStudents, setAlertStudents] = useState([]);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);

  // READ ALERTS LOCALSTORAGE
  // Map keyed by "<studentId>_<classId>" -> { absent: number, late: number }
  const [readAlerts, setReadAlerts] = useState({});
  const readAlertsRef = useRef({});

  const getStorageKey = (uid) => `readAlerts_${uid}`;

  // Keep ref in sync
  useEffect(() => {
    readAlertsRef.current = readAlerts;
  }, [readAlerts]);

  // Load per-teacher readAlerts when teacher UID is available
  useEffect(() => {
    if (!teacher?.uid) return;
    const key = getStorageKey(teacher.uid);
    try {
      const saved = JSON.parse(localStorage.getItem(key)) || {};
      setReadAlerts(saved);
      readAlertsRef.current = saved;
    } catch (e) {
      console.error("Failed to read readAlerts from localStorage:", e);
      setReadAlerts({});
      readAlertsRef.current = {};
    }
  }, [teacher?.uid]);

  // Persist per-teacher readAlerts whenever it changes
  useEffect(() => {
    if (!teacher?.uid) return;
    const key = getStorageKey(teacher.uid);
    try {
      localStorage.setItem(key, JSON.stringify(readAlerts));
    } catch (e) {
      console.error("Failed to save readAlerts to localStorage:", e);
    }
  }, [readAlerts, teacher?.uid]);

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

  // 🟦 LOAD TEACHER DATA
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setTeacher(null);
        return;
      }
      try {
        const ref = doc(db, "teachers", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) setTeacher({ ...snap.data(), uid: user.uid });
      } catch (e) {
        console.error("Teacher load error:", e);
      }
    });

    return () => unsubscribe();
  }, []);

  // 🟦 LISTEN FOR UNREAD ANNOUNCEMENTS
  useEffect(() => {
    if (!teacher?.uid) return;

    const unsub = onSnapshot(collection(db, "announcements"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      const now = new Date();
      const filtered = data.filter(
        (a) =>
          (a.target === "teachers" || a.target === "all") &&
          new Date(a.expiration) >= now
      );

      const unread = filtered.some((a) => !a.readBy?.includes(teacher.uid));
      setHasUnreadAnnouncements(unread);
    });

    return () => unsub();
  }, [teacher?.uid]);

  // 🟥🟥🟥 ALERT SYSTEM — FILTERED PER CLASS ONLY
  // This listener computes counts per student+class and compares to stored last-seen counts.
  // If current counts are greater than last-seen, the alert is considered unread.
  useEffect(() => {
    if (!teacher?.uid) return;
    const storageKey = getStorageKey(teacher.uid);

    const unsub = onSnapshot(collection(db, "attendance_sessions"), async (snapshot) => {
      const sessions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Only sessions for this teacher
      const teacherSessions = sessions.filter((s) => s.teacherId === teacher.uid);

      // Build counts per class -> student -> {late, absent}
      const classStudentCounts = {};
      teacherSessions.forEach((session) => {
        const classId = session.classId;
        if (!classStudentCounts[classId]) classStudentCounts[classId] = {};
        if (!session.entries) return;
        session.entries.forEach((entry) => {
          const sid = entry.student_id;
          const status = entry.status;
          if (!classStudentCounts[classId][sid]) classStudentCounts[classId][sid] = { late: 0, absent: 0 };
          if (status === "late") classStudentCounts[classId][sid].late++;
          if (status === "absent") classStudentCounts[classId][sid].absent++;
        });
      });

      // Build flagged alerts (those with >=3 absent or >=3 late)
      let alerts = [];
      for (const [classId, students] of Object.entries(classStudentCounts)) {
        const flagged = Object.entries(students)
          .filter(([_, s]) => s.late >= 3 || s.absent >= 3)
          .map(([studentId, counts]) => ({ studentId, ...counts }));

        if (flagged.length === 0) continue;

        // Enrich with student/class info
        const enriched = await Promise.all(
          flagged.map(async (s) => {
            try {
              const stRef = doc(db, "students", s.studentId);
              const stSnap = await getDoc(stRef);
              let fullname = s.studentId;
              let guardianname = "";
              let guardiancontact = "";
              if (stSnap.exists()) {
                const { firstname, middlename, lastname, guardianname: gname, guardiancontact: gcontact } = stSnap.data();
                const mid = middlename ? `${middlename.charAt(0)}.` : "";
                fullname = `${lastname}, ${firstname} ${mid}`;
                guardianname = gname || "";
                guardiancontact = gcontact || "";
              }
              return { ...s, fullname, classId, guardianname, guardiancontact };
            } catch (err) {
              console.error("Error fetching student:", err);
              return { ...s, fullname: s.studentId, classId, guardianname: "", guardiancontact: "" };
            }
          })
        );

        alerts = alerts.concat(enriched);
      }

      // Defensive: read stored last-seen counts for this teacher directly from localStorage to avoid snapshot-before-load race.
      let savedRead = {};
      try {
        savedRead = JSON.parse(localStorage.getItem(storageKey)) || {};
      } catch (e) {
        savedRead = readAlertsRef.current || {};
      }

      // Determine read status: read if saved exists AND current counts are <= saved counts
      const alertsWithRead = alerts.map((a) => {
        const key = `${String(a.studentId)}_${String(a.classId)}`;
        const saved = savedRead[key];
        const currentAbsent = Number(a.absent || 0);
        const currentLate = Number(a.late || 0);
        const read = !!saved && currentAbsent <= Number(saved.absent || 0) && currentLate <= Number(saved.late || 0);
        return { ...a, read, _readKey: key, _currentAbsent: currentAbsent, _currentLate: currentLate };
      });

      setAlertStudents(alertsWithRead);
    });

    return () => unsub();
  }, [teacher?.uid]);

  // When readAlerts state changes (e.g., user clicked an alert), update existing alertStudents' read flags
  useEffect(() => {
    if (!alertStudents.length) return;
    setAlertStudents((prev) =>
      prev.map((a) => {
        const key = `${String(a.studentId)}_${String(a.classId)}`;
        const saved = readAlerts[key];
        const currentAbsent = Number(a.absent || 0);
        const currentLate = Number(a.late || 0);
        const read = !!saved && currentAbsent <= Number(saved.absent || 0) && currentLate <= Number(saved.late || 0);
        return { ...a, read };
      })
    );
  }, [readAlerts]); // eslint-disable-line react-hooks/exhaustive-deps

  // derived unread count for the badge
  const unreadCount = useMemo(() => alertStudents.filter((a) => !a.read).length, [alertStudents]);

  // LOGOUT
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
    const mid = middlename ? `${middlename.charAt(0)}.` : "";
    return `${firstname} ${mid} ${lastname}`;
  };

  return (
    <div className="flex h-screen w-screen">
      {/* SIDEBAR */}
      <div
        className={`fixed left-0 top-0 h-screen ${isCollapsed ? "w-26" : "w-74"} bg-[#415CA0] flex flex-col text-white transition-all duration-300 z-50`}
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/20">
          <img src="../src/assets/images/aics_logo.png" alt="AICS Logo" className="h-15 w-auto object-contain"/>
          {!isCollapsed && (
            <div className="font-bold leading-tight text-md">
              <p>Asian Institute of</p>
              <p>Computer Studies</p>
            </div>
          )}
        </div>

        <div className="px-2 py-3 text-xs uppercase tracking-wide text-gray-200 cursor-pointer" onClick={() => setIsCollapsed(c => !c)}>
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
              className={`flex items-center gap-3 pl-6 px-4 py-2 rounded-lg transition ${location.pathname === item.path ? "bg-[#32487E] text-white" : "text-white hover:bg-[#32487E] hover:text-white"}`}
            >
              <span className="text-white relative">
                {item.icon}
                {item.name === "Announcements" && hasUnreadAnnouncements && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs font-bold px-1 rounded-full">1</span>
                )}
              </span>
              {!isCollapsed && <span className="text-white text-lg">{item.name}</span>}
            </Link>
          ))}
        </nav>
      </div>

      {/* MAIN PANEL */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? "ml-26" : "ml-74"}`}>
        {/* TOP NAVBAR */}
        <div
          className="fixed top-0 h-16 bg-white shadow flex justify-between items-center px-6 z-40 transition-all duration-300"
          style={{ left: isCollapsed ? "6.5rem" : "18.5rem", right: 0 }}
        >
          <h2 className="text-lg font-bold text-[#415CA0] truncate">{title}</h2>

          <div className="flex items-center gap-6">
            {/* 🔔 ALERT BELL */}
            <div className="relative">
              <div className="cursor-pointer" onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}>
                <Bell size={23} className="text-[#415CA0]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                )}
              </div>

              {showAlertsDropdown && (
                <div className="absolute right-0 mt-3 w-96 bg-white rounded-md shadow-lg border z-50">
                  <div className="p-3 font-semibold text-[#415CA0] border-b">Attendance Alerts</div>
                  {alertStudents.length === 0 && (
                    <div className="p-3 text-sm text-gray-500">No attendance alerts.</div>
                  )}
                  {alertStudents.map((s) => {
                    const storageKey = teacher?.uid ? getStorageKey(teacher.uid) : null;
                    const key = `${String(s.studentId)}_${String(s.classId)}`;
                    return (
                      <div
                        key={key}
                        className={`p-3 border-b cursor-pointer ${s.read ? "bg-white" : "bg-blue-50"}`}
                        onClick={() => {
                          // Mark alert as read locally for immediate UI feedback
                          setAlertStudents((prev) =>
                            prev.map((a) =>
                              a.studentId === s.studentId && a.classId === s.classId
                                ? { ...a, read: true }
                                : a
                            )
                          );

                          // Save the current counts as last-seen so future increments will re-trigger unread
                          setReadAlerts((prev) => {
                            const updated = {
                              ...prev,
                              [key]: { absent: Number(s.absent || 0), late: Number(s.late || 0) },
                            };
                            // persist immediately
                            try {
                              if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated));
                            } catch (e) {
                              console.error("Failed to save readAlerts to localStorage:", e);
                            }
                            readAlertsRef.current = updated;
                            return updated;
                          });
                        }}
                      >
                        <p className="text-lg font-medium text-gray-900">{s.fullname}</p>

                        {s.subjectName && <p className="text-lg text-gray-500 mb-1">Subject: {s.subjectName}</p>}
                        {s.guardianname && <p className="text-lg text-gray-500 mb-1">Guardian: {s.guardianname} ({s.guardiancontact})</p>}

                        <p className="text-lg text-gray-600">• Absents: <strong>{s.absent}</strong></p>
                        <p className="text-lg text-gray-600">• Lates: <strong>{s.late}</strong></p>

                        <p className="mt-1 text-sm text-red-600 font-semibold">
                          {s.absent >= 3 ? "❗ Reached 3 Absences" : "⚠️ Reached 3 Lates"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PROFILE */}
            <div className="relative">
              <div className="flex items-center gap-4 cursor-pointer bg-white px-3 py-1 border hover:bg-[#F0F4FF] transition" onClick={() => setMenuOpen(o => !o)}>
                {teacher?.profilePicUrl ? (
                  <img src={teacher.profilePicUrl} alt="Profile" className="h-10 w-10 rounded-full object-cover border border-gray-300" />
                ) : (
                  <div className="h-10 w-10 flex items-center justify-center bg-[#415CA0] text-white font-bold rounded-full">{teacher?.firstname?.charAt(0) || "?"}</div>
                )}

                {!isCollapsed && (
                  <>
                    <div className="flex flex-col leading-tight">
                      <span className="font-medium text-[#32487E]">{getDisplayName()}</span>
                      <span className="text-xs text-gray-500">Teacher</span>
                    </div>
                    <ChevronDown size={16} className="text-[#415CA0]" />
                  </>
                )}
              </div>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-54 bg-white border border-gray-300 shadow-lg z-50">
                  <button onClick={handleLogout} className="flex items-center w-full gap-2 px-4 py-2 text-red-600 hover:bg-gray-200 transition-colors">
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto bg-gray-50 mt-16 p-6">
          {/* Temp password warning */}
          {isTempPassword && (
            <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              Your account is using a temporary password. Please update your password to secure your account.
            </div>
          )}

          {/* Breadcrumbs */}
          <div className="w-full flex justify-end mb-4">
            <div className="text-sm text-gray-500 flex gap-1">
              <span className="hover:underline text-[#415CA0] cursor-pointer" onClick={() => navigate("/teacher/dashboard")}>Home</span>
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