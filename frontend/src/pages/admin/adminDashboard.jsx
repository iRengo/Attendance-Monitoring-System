import AdminLayout from "../../components/adminLayout";
import { Users, BookOpen, CalendarDays, BarChart3, PlusCircle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

export default function AdminDashboard() {
  // --- Mock data for stats ---
  const totalStudents = 256;
  const totalTeachers = 18;
  const activeClasses = 12;
  const attendancePercent = 92;

  // --- Attendance trend data ---
  const attendanceTrends = [
    { name: "Mon", attendance: 90 },
    { name: "Tue", attendance: 95 },
    { name: "Wed", attendance: 88 },
    { name: "Thu", attendance: 92 },
    { name: "Fri", attendance: 94 },
  ];

  // --- Pie chart data (Presence vs Absence) ---
  const presenceData = [
    { name: "Present", value: 92 },
    { name: "Absent", value: 8 },
  ];
  const COLORS = ["#4CAF50", "#F87171"]; // green & red

  // --- Recent activities data ---
  const activities = [
    { time: "10:30 AM", activity: "Added new student: Juan Dela Cruz" },
    { time: "9:15 AM", activity: "Updated attendance records for Grade 10" },
    { time: "Yesterday", activity: "Created new class: Math 101" },
    { time: "2 days ago", activity: "Removed inactive teacher: Mr. Gomez" },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="p-6 space-y-8">
        {/* --- Stats Cards --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Students */}
          <div className="p-5 rounded-xl shadow-md border bg-white hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-gray-600 text-sm font-medium">
                  Total Students
                </h2>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {totalStudents}
                </p>
              </div>
              <Users className="text-blue-500" size={32} />
            </div>
          </div>

          {/* Total Teachers */}
          <div className="p-5 rounded-xl shadow-md border bg-white hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-gray-600 text-sm font-medium">
                  Total Teachers
                </h2>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {totalTeachers}
                </p>
              </div>
              <BookOpen className="text-yellow-500" size={32} />
            </div>
          </div>

          {/* Active Classes Today */}
          <div className="p-5 rounded-xl shadow-md border bg-white hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-gray-600 text-sm font-medium">
                  Active Classes Today
                </h2>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {activeClasses}
                </p>
              </div>
              <CalendarDays className="text-green-500" size={32} />
            </div>
          </div>

          {/* Attendance % Today */}
          <div className="p-5 rounded-xl shadow-md border bg-white hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-gray-600 text-sm font-medium">
                  Attendance % Today
                </h2>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {attendancePercent}%
                </p>
              </div>
              <BarChart3 className="text-purple-500" size={32} />
            </div>
          </div>
        </div>

        {/* --- Graphs Section --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attendance Trend Graph */}
          <div className="lg:col-span-2 bg-white border rounded-xl shadow-md p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              📈 Attendance Trends (This Week)
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={attendanceTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[80, 100]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  stroke="#2563EB"
                  strokeWidth={3}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Student Presence vs Absence */}
          <div className="bg-white border rounded-xl shadow-md p-5 flex flex-col items-center justify-center relative">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              🧍‍♂️ Presence vs Absence
            </h2>
            <div className="flex flex-col items-center relative">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={presenceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {presenceData.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Percentage Label */}
              <div className="absolute top-[105px] text-center">
                <p className="text-2xl font-bold text-gray-800">
                  {attendancePercent}%
                </p>
                <p className="text-sm text-gray-500">Present</p>
              </div>

              {/* Legend */}
              <div className="flex mt-4 gap-4 text-sm">
                <div className="flex items-center text-gray-500 gap-1">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  <p>Present</p>
                </div>
                <div className="flex items-center text-gray-500 gap-1">
                  <span className="w-3 h-3 bg-red-400 rounded-full"></span>
                  <p>Absent</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Recent Activities & Quick Actions --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activities */}
          <div className="lg:col-span-2 bg-white border rounded-xl shadow-md p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              🕒 Recent Activities
            </h2>
            <ul className="divide-y divide-gray-200">
              {activities.map((item, index) => (
                <li key={index} className="py-3 flex justify-between items-center">
                  <span className="text-gray-700 text-sm">{item.activity}</span>
                  <span className="text-gray-400 text-xs">{item.time}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Boxes */}
          <div className="flex flex-col gap-4">
            {/* Add Student Box */}
            <div className="flex-1 bg-white border rounded-xl shadow-md p-5 flex flex-col justify-center items-center hover:shadow-lg transition">
              <PlusCircle className="text-blue-500 mb-2" size={40} />
              <h3 className="text-md font-medium text-gray-700 mb-2">
                Add New Student
              </h3>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
                Add Student
              </button>
            </div>

            {/* Add Class Box */}
            <div className="flex-1 bg-white border rounded-xl shadow-md p-5 flex flex-col justify-center items-center hover:shadow-lg transition">
              <PlusCircle className="text-green-500 mb-2" size={40} />
              <h3 className="text-md font-medium text-gray-700 mb-2">
                Add New Class
              </h3>
              <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
                Add Class
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
