import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login";
import StudentDashboard from "./pages/student/studentDashboard";
import TeacherDashboard from "./pages/teacher/teacherDashboard";

function App() {
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/student/dashboard"
          element={
            user?.role === "student" ? (
              <StudentDashboard />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/teacher/dashboard"
          element={
            user?.role === "teacher" ? (
              <TeacherDashboard />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
