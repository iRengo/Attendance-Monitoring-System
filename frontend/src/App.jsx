import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import "react-toastify/dist/ReactToastify.css";
import Login from "./pages/Login";

import StudentDashboard from "./pages/student/studentDashboard";
import StudentAttendance from "./pages/student/studentAttendance";
import StudentClasses from "./pages/student/studentClasses";
import StudentNotifications from "./pages/student/studentNotifications";
import StudentDataprivacy from "./pages/student/studentDataprivacy";
import StudentSettings from "./pages/student/studentSettings";

import TeacherDashboard from "./pages/teacher/teacherDashboard";
import TeacherClasses from "./pages/teacher/teacherClasses";
import TeacherAttendance from "./pages/teacher/teacherAttendance";
import TeacherSchedules from "./pages/teacher/teacherSchedules";
import TeacherAnnouncement from "./pages/teacher/teacherAnnouncement";
import TeacherSettings from "./pages/teacher/teacherSettings";

import AdminDashboard from "./pages/admin/adminDashboard";
import AdminAnnouncement from "./pages/admin/adminAnnouncement";
import AdminAttendance from "./pages/admin/adminAttendance";
import AdminManagement from "./pages/admin/adminManagement";
import AdminReports from "./pages/admin/adminReports";
import AdminSettings from "./pages/admin/adminSettings";
import AdminRoom from "./pages/admin/adminRoom";

// ✅ Custom Protected Route
function ProtectedRoute({ children, role }) {
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentRole, setCurrentRole] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const localUser = JSON.parse(localStorage.getItem("user"));
      const manualLogout = localStorage.getItem("manualLogout");

      if (user && localUser) {
        setIsLoggedIn(true);
        setCurrentRole(localUser.role);
      } else {
        setIsLoggedIn(false);
        localStorage.removeItem("user");
      }

      // ⚡ delay clearing manualLogout so it doesn’t trigger immediately after signOut
      if (manualLogout === "true") {
        setTimeout(() => {
          localStorage.removeItem("manualLogout");
        }, 1500);
      }

      setIsAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  if (!isAuthChecked) return null;

  // 🚫 Not logged in
  if (!isLoggedIn) {
    const manualLogout = localStorage.getItem("manualLogout");
    if (manualLogout === "true") {
      // 😌 Just logged out manually — don’t show alert
      return <Navigate to="/" replace />;
    }

    // ⚠️ Tried accessing protected route after logging out
    Swal.fire({
      icon: "warning",
      title: "You need to log in",
      text: "Please log in to access this page.",
      confirmButtonColor: "#3085d6",
    });
    return <Navigate to="/" replace />;
  }

  // 🚫 Wrong role
  if (role && currentRole !== role) {
    Swal.fire({
      icon: "error",
      title: "Access Denied",
      text: "You do not have permission to view this page.",
      confirmButtonColor: "#d33",
    });
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />
      <Routes>
        {/* Public route */}
        <Route path="/" element={<Login />} />

        {/* Student routes */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute role="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/attendance"
          element={
            <ProtectedRoute role="student">
              <StudentAttendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/classes"
          element={
            <ProtectedRoute role="student">
              <StudentClasses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/notifications"
          element={
            <ProtectedRoute role="student">
              <StudentNotifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/dataprivacy"
          element={
            <ProtectedRoute role="student">
              <StudentDataprivacy />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/settings"
          element={
            <ProtectedRoute role="student">
              <StudentSettings />
            </ProtectedRoute>
          }
        />

        {/* Teacher routes */}
        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute role="teacher">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/classes"
          element={
            <ProtectedRoute role="teacher">
              <TeacherClasses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/attendance"
          element={
            <ProtectedRoute role="teacher">
              <TeacherAttendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/schedules"
          element={
            <ProtectedRoute role="teacher">
              <TeacherSchedules />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/announcements"
          element={
            <ProtectedRoute role="teacher">
              <TeacherAnnouncement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/settings"
          element={
            <ProtectedRoute role="teacher">
              <TeacherSettings />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/announcements"
          element={
            <ProtectedRoute role="admin">
              <AdminAnnouncement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/attendance"
          element={
            <ProtectedRoute role="admin">
              <AdminAttendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/user"
          element={
            <ProtectedRoute role="admin">
              <AdminManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/rooms"
          element={
            <ProtectedRoute role="admin">
              <AdminRoom />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute role="admin">
              <AdminReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute role="admin">
              <AdminSettings />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
