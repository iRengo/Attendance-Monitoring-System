import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/login";
import StudentDashboard from "./pages/student/studentDashboard";
import TeacherDashboard from "./pages/teacher/teacherDashboard";

function App() {
  return (
    <Router>
      <Routes>

        <Route path="/" element={<Login />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
        <Route path="*" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;
