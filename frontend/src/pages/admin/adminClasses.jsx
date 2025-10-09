import { useState } from "react";
import { Search, Plus, Edit, Trash2, Users, UserCheck } from "lucide-react";
import AdminLayout from "../../components/adminLayout";

export default function adminClasses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [classes, setClasses] = useState([
    {
      id: 1,
      name: "Mathematics 10",
      section: "Section A",
      teacher: "Mr. Cruz",
      schedule: "Mon & Wed - 8:00AM to 9:30AM",
      students: 35,
    },
    {
      id: 2,
      name: "Science 9",
      section: "Section B",
      teacher: "Ms. Santos",
      schedule: "Tue & Thu - 9:30AM to 11:00AM",
      students: 32,
    },
    {
      id: 3,
      name: "English 8",
      section: "Section C",
      teacher: "Mr. Dela Cruz",
      schedule: "Mon & Thu - 1:00PM to 2:30PM",
      students: 30,
    },
  ]);

  const filteredClasses = classes.filter(
    (cls) =>
      cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.teacher.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.section.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout title="Class Management">
      <div className="p-10 bg-gray-50 min-h-screen">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
              Class Management
            </h1>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search class or teacher..."
              className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] bg-white shadow-sm placeholder-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Add Buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button className="flex items-center gap-2 px-5 py-2 bg-[#3498db] text-white rounded-lg text-sm font-medium hover:bg-[#2f89ca] transition shadow-md">
            <Plus size={18} /> Add New Class
          </button>
          <button className="flex items-center gap-2 px-5 py-2 bg-[#27ae60] text-white rounded-lg text-sm font-medium hover:bg-[#219150] transition shadow-md">
            <UserCheck size={18} /> Assign Teacher
          </button>
        </div>

        {/* Class Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredClasses.length > 0 ? (
            filteredClasses.map((cls) => (
              <div
                key={cls.id}
                className="relative bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 p-6"
              >
                {/* Blue Header */}
                <div
                  className="rounded-xl px-5 py-3 mb-5 text-white font-semibold text-lg shadow-sm"
                  style={{ backgroundColor: "rgb(52, 152, 219)" }}
                >
                  {cls.name}
                </div>

                {/* Section + Info */}
                <div className="mb-5 space-y-2">
                  <span
                    className="font-medium px-4 py-1.5 rounded-full text-sm shadow-sm inline-block"
                    style={{ backgroundColor: "#eaf4fc", color: "#2176b8" }}
                  >
                    {cls.section}
                  </span>
                  <p className="text-gray-600 text-sm">
                    <strong>Teacher:</strong> {cls.teacher}
                  </p>
                  <p className="text-gray-600 text-sm">
                    <strong>Schedule:</strong> {cls.schedule}
                  </p>
                  <p className="text-gray-600 text-sm">
                    <strong>Students:</strong> {cls.students}
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex justify-between items-center">
                  <div className="flex gap-3">
                    <button className="p-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 transition-all duration-200">
                      <Edit
                        size={18}
                        className="text-gray-600 hover:text-[#3498db] transition-colors duration-200"
                      />
                    </button>
                    <button className="p-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-red-50 transition-all duration-200">
                      <Trash2
                        size={18}
                        className="text-gray-600 hover:text-red-500 transition-colors duration-200"
                      />
                    </button>
                  </div>

                  <button className="px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm transition-all"
                    style={{ backgroundColor: "rgb(52, 152, 219)" }}>
                    View Students
                  </button>
                </div>

                {/* Hover glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-[#3498db]/10 opacity-0 hover:opacity-10 transition-all duration-300 pointer-events-none"></div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center col-span-full">
              No classes found.
            </p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
