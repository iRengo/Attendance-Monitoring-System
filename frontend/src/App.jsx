import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import StudentDashboard from "./pages/student/studentDashboard";
import StudentAttendance from "./pages/student/studentAttendance";
import StudentSchedules from "./pages/student/studentSchedules";
import StudentNotifications from "./pages/student/studentNotifications";
import StudentSettings from "./pages/student/studentSettings";

import TeacherDashboard from "./pages/teacher/teacherDashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* Student routes */}
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/attendance" element={<StudentAttendance />} />
        <Route path="/student/schedules" element={<StudentSchedules />} />
        <Route path="/student/notifications" element={<StudentNotifications />} />
        <Route path="/student/settings" element={<StudentSettings />} />

        {/* Teacher routes */}
        <Route path="/teacher/dashboard" element={<TeacherDashboard />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
