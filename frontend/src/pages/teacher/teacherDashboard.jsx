import TeacherLayout from "../../components/teacherLayout";
import { BookOpen, Users, Layers, Calendar } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function TeacherDashboard() {
  const attendanceData = [
    { day: "Mon", Present: 28, Absent: 2 },
    { day: "Tue", Present: 30, Absent: 0 },
    { day: "Wed", Present: 27, Absent: 3 },
    { day: "Thu", Present: 29, Absent: 1 },
    { day: "Fri", Present: 30, Absent: 0 },
  ];

  return (
    <TeacherLayout title="Dashboard">
      <div className="p-6 space-y-8">
        {/* Header */}
        <h1 className="text-3xl font-semibold text-gray-800">
          Welcome back, Teacher 👋
        </h1>

        {/* Top Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Total Classes */}
          <div className="bg-blue-50 text-blue-800 rounded-xl p-5 flex flex-col items-center shadow-sm hover:shadow-md transition duration-200">
            <Layers size={32} className="mb-2" />
            <h2 className="text-sm font-medium mb-1">Total Classes</h2>
            <p className="text-2xl font-bold">12</p>
          </div>

          {/* Total Students */}
          <div className="bg-green-50 text-green-800 rounded-xl p-5 flex flex-col items-center shadow-sm hover:shadow-md transition duration-200">
            <Users size={32} className="mb-2" />
            <h2 className="text-sm font-medium mb-1">Total Students</h2>
            <p className="text-2xl font-bold">240</p>
          </div>

          {/* Total Subjects */}
          <div className="bg-purple-50 text-purple-800 rounded-xl p-5 flex flex-col items-center shadow-sm hover:shadow-md transition duration-200">
            <BookOpen size={32} className="mb-2" />
            <h2 className="text-sm font-medium mb-1">Total Subjects</h2>
            <p className="text-2xl font-bold">8</p>
          </div>
        </div>

        {/* Attendance Graph + Incoming Class */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Attendance Graph */}
          <div className="flex-1 bg-white shadow-sm rounded-xl p-5">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Attendance Overview
            </h2>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={attendanceData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="Present"
                    fill="#60a5fa"
                    barSize={18}
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="Absent"
                    fill="#f87171"
                    barSize={18}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Incoming Class */}
          <div className="md:w-96 bg-amber-40 text-gray-800 rounded-xl p-5 flex flex-col justify-center items-center shadow-sm hover:shadow-md transition duration-200">
            <Calendar size={38} className="mb-3" />
            <h2 className="text-sm font-medium">Incoming Class</h2>
            <p className="text-lg font-bold mt-1">Math 101</p>
            <p className="mt-1 text-xs text-gray-600">Starts at 10:00 AM</p>
          </div>
        </div>

       {/* Post Announcement */}
        <div className="bg-white shadow-sm rounded-xl p-5">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Post Announcement
          </h2>
          <textarea
            className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none bg-gray-50 text-gray-800"
            placeholder="Write your announcement here..."
          ></textarea>
          <div className="mt-3 text-right">
            <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-200">
              Post
            </button>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
