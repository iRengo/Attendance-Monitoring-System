import { useState } from "react";
import TeacherLayout from "../../components/teacherLayout";
import { Star, MoreHorizontal, Search, X, Plus } from "lucide-react";

export default function CurrentClasses() {
  const [selectedClass, setSelectedClass] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const classes = [
    {
      subject: "Mathematics",
      room: "Room 101",
      section: "Section A",
      day: "Monday, Wednesday, Friday",
      time: "8:00 AM - 9:30 AM",
      students: [
        { name: "Fred Galit sa Bading", email: "fred@example.com", status: "Present" },
        { name: "Martin Bading", email: "martin@example.com", status: "Absent" },
        { name: "Reymart Lalaki", email: "reymart@example.com", status: "Late" },
      ],
    },
    {
      subject: "Science",
      room: "Room 202",
      section: "Section B",
      day: "Tuesday, Thursday",
      time: "10:00 AM - 11:30 AM",
      students: [
        { name: "Angela Rivera", email: "angela@example.com", status: "Present" },
        { name: "Patrick Tan", email: "patrick@example.com", status: "Late" },
        { name: "Liza Gonzales", email: "liza@example.com", status: "Present" },
      ],
    },
  ];

  const openModal = (cls) => setSelectedClass(cls);
  const closeModal = () => setSelectedClass(null);

  const filteredStudents =
    selectedClass?.students.filter((s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  return (
    <TeacherLayout title="Current Classes">
      <div className="min-h-screen bg-gray-50 p-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
              Current Classes
            </h1>
            <p className="text-gray-500 text-sm">
              Manage your active classes and view enrolled students.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search class..."
              className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] bg-white shadow-sm placeholder-gray-500"
            />
          </div>
        </div>

        {/* Class Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {classes.map((cls, index) => (
            <div
              key={index}
              className="relative bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 p-6"
            >
              {/* Header */}
              <div
                className="rounded-xl px-5 py-3 mb-5 text-white font-semibold text-lg shadow-sm"
                style={{ backgroundColor: "#3498db" }}
              >
                {cls.subject} - {cls.room}
              </div>

              {/* Section, Day, Time */}
              <div className="mb-5 space-y-2">
                <span
                  className="font-medium px-4 py-1.5 rounded-full text-sm shadow-sm inline-block"
                  style={{ backgroundColor: "#eaf4fc", color: "#2176b8" }}
                >
                  {cls.section}
                </span>
                <p className="text-gray-600 text-sm">
                  <strong>Day:</strong> {cls.day}
                </p>
                <p className="text-gray-600 text-sm">
                  <strong>Time:</strong> {cls.time}
                </p>
              </div>

              {/* Buttons */}
              <div className="flex justify-between items-center">
                <div className="flex gap-3">
                  <button className="p-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 transition-all duration-200">
                    <Star
                      size={18}
                      className="text-gray-600 hover:text-[#3498db] transition-colors duration-200"
                    />
                  </button>
                  <button className="p-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 transition-all duration-200">
                    <MoreHorizontal
                      size={18}
                      className="text-gray-600 hover:text-[#3498db] transition-colors duration-200"
                    />
                  </button>
                </div>

                <button
                  onClick={() => openModal(cls)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm transition-all"
                  style={{ backgroundColor: "#3498db" }}
                >
                  View Class List
                </button>
              </div>

              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl bg-[#3498db]/10 opacity-0 hover:opacity-10 transition-all duration-300 pointer-events-none"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {selectedClass && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-white rounded-2xl shadow-xl w-11/12 max-w-4xl p-8 transition-all duration-300">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-semibold text-[#3498db]">
                  {selectedClass.subject} - {selectedClass.section}
                </h2>
                <p className="text-sm text-gray-500">Room: {selectedClass.room}</p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-red-500 transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Search + Add Student */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
              <div className="relative w-full sm:w-72">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search student..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] bg-white placeholder-gray-500"
                />
              </div>
              <button
                className="flex items-center gap-2 px-5 py-2 bg-[#3498db] text-white rounded-lg text-sm font-medium hover:bg-[#2f89ca] transition"
              >
                <Plus size={18} /> Add Student
              </button>
            </div>

            {/* Student Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 rounded-lg">
                <thead>
                  <tr className="bg-[#3498db] text-white text-sm">
                    <th className="py-3 px-4 text-left">Name</th>
                    <th className="py-3 px-4 text-left">Email</th>
                    <th className="py-3 px-4 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((s, i) => (
                      <tr
                        key={i}
                        className="border-t hover:bg-blue-50 transition text-sm"
                      >
                        <td className="py-3 px-4 text-gray-700">{s.name}</td>
                        <td className="py-3 px-4 text-gray-600">{s.email}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              s.status === "Present"
                                ? "bg-green-100 text-green-700"
                                : s.status === "Absent"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="text-center text-gray-500 py-6">
                        No students found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-8 text-right">
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-[#3498db] text-white rounded-lg font-medium text-sm hover:bg-[#2f89ca] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
