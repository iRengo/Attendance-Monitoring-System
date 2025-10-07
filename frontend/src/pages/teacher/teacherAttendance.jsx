import TeacherLayout from "../../components/teacherLayout";
import { Search, Download } from "lucide-react";
import { useState } from "react";

export default function TeacherAttendance() {
  const [selectedClass, setSelectedClass] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const classes = [
    "Mathematics - Room 101",
    "Science - Room 202",
    "English - Room 303",
  ];

  const students = [
    { id: "2025-001", name: "John Santos", status: "Present" },
    { id: "2025-002", name: "Maria Lopez", status: "Absent" },
    { id: "2025-003", name: "Carlos Reyes", status: "Late" },
    { id: "2025-004", name: "Anna Cruz", status: "Present" },
  ];

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.id.includes(searchTerm)
  );

  // 🧾 Export to CSV function
  const exportToCSV = () => {
    const headers = ["Student ID", "Student Name", "Status"];
    const rows = filteredStudents.map((s) => [s.id, s.name, s.status]);

    let csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${selectedClass ? selectedClass.replace(/\s+/g, "_") : "attendance"}_records.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <TeacherLayout title="Attendance">
      <div className="min-h-screen bg-gray-50 p-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            Attendance Management
          </h1>
          <p className="text-gray-500 text-sm">
            Manage and validate student attendance by class.
          </p>
        </div>

        {/* Filters + Export */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          {/* Left Filters */}
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            {/* Class Filter */}
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] shadow-sm bg-white text-gray-700 w-full sm:w-64"
            >
              <option value="">Select Class</option>
              {classes.map((cls, index) => (
                <option key={index} value={cls}>
                  {cls}
                </option>
              ))}
            </select>

            {/* Search Bar */}
            <div className="relative w-full sm:w-72">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] bg-white text-gray-700 placeholder-gray-500 shadow-sm"
              />
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-[#3498db] hover:bg-[#2f89ca] text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm transition"
          >
            <Download size={18} /> Export as CSV
          </button>
        </div>

        {/* Attendance Table */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead style={{ backgroundColor: "#3498db" }} className="text-white">
              <tr>
                <th className="py-3 px-6 font-semibold">Student ID</th>
                <th className="py-3 px-6 font-semibold">Student Name</th>
                <th className="py-3 px-6 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, index) => (
                <tr
                  key={index}
                  className="border-b hover:bg-blue-50 transition-all duration-200"
                >
                  <td className="py-3 px-6 text-gray-700">{student.id}</td>
                  <td className="py-3 px-6 text-gray-700">{student.name}</td>
                  <td className="py-3 px-6">
                    <select
                      defaultValue={student.status}
                      className={`px-3 py-1 rounded-lg text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-[#3498db] ${
                        student.status === "Present"
                          ? "bg-green-100 text-green-700 border-green-200"
                          : student.status === "Absent"
                          ? "bg-red-100 text-red-700 border-red-200"
                          : "bg-yellow-100 text-yellow-700 border-yellow-200"
                      }`}
                    >
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="Late">Late</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </TeacherLayout>
  );
}
