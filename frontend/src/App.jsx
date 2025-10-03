import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Login from "./pages/login";

import StudentDashboard from "./pages/student/studentDashboard";
import StudentAttendance from "./pages/student/studentAttendance";
import StudentSchedules from "./pages/student/studentSchedules";
import StudentNotifications from "./pages/student/studentNotifications";
import StudentDataprivacy from "./pages/student/studentDataprivacy";
import StudentSettings from "./pages/student/studentSettings";

import TeacherDashboard from "./pages/teacher/teacherDashboard";
import TeacherClasses from "./pages/teacher/teacherClasses";
import TeacherAttendance from "./pages/teacher/teacherAttendance";
import TeacherSchedules from "./pages/teacher/teacherSchedules";
import TeacherSettings from "./pages/teacher/teacherSettings";  


import AdminDashboard from "./pages/admin/adminDashboard";
import AdminAnnouncement from "./pages/admin/adminAnnouncement";
import AdminAttendance from "./pages/admin/adminAttendance";
import AdminClasses from "./pages/admin/adminClasses";
import AdminManagement from "./pages/admin/adminManagement";
import AdminReports from "./pages/admin/adminReports";
import AdminSettings from "./pages/admin/adminSettings";

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
        <Route path="/" element={<Login />} />

        {/* Student routes */}
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/attendance" element={<StudentAttendance />} />
        <Route path="/student/schedules" element={<StudentSchedules />} />
        <Route path="/student/notifications" element={<StudentNotifications />} />
        <Route path="/student/dataprivacy" element={<StudentDataprivacy />} />
        <Route path="/student/settings" element={<StudentSettings />} />

        {/* Teacher routes */}
        <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
        <Route path="/teacher/classes" element={<TeacherClasses />} />
        <Route path="/teacher/attendance" element={<TeacherAttendance />} />
        <Route path="/teacher/schedules" element={<TeacherSchedules />} />
        <Route path="/teacher/settings" element={<TeacherSettings />} />



        {/* Admin routes */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/announcements" element={<AdminAnnouncement />} />
        <Route path="/admin/attendance" element={<AdminAttendance />} />
        <Route path="/admin/classes" element={<AdminClasses />} />
        <Route path="/admin/user" element={<AdminManagement />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/settings" element={<AdminSettings />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
