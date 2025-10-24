import { useEffect, useState } from "react";
import AdminLayout from "../../components/adminLayout";
import { Users, BookOpen, BarChart3 } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  query,
  limit,
  onSnapshot,
} from "firebase/firestore";

export default function AdminDashboard() {
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [activities, setActivities] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(activities.length / itemsPerPage);
  const attendancePercent = 92;

  const attendanceTrends = [
    { name: "Mon", attendance: 90 },
    { name: "Tue", attendance: 95 },
    { name: "Wed", attendance: 88 },
    { name: "Thu", attendance: 92 },
    { name: "Fri", attendance: 94 },
  ];

  const presenceData = [
    { name: "Present", value: 92 },
    { name: "Absent", value: 8 },
  ];
  const COLORS = ["#4CAF50", "#F87171"];

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const studentSnap = await getDocs(collection(db, "students"));
        const teacherSnap = await getDocs(collection(db, "teachers"));
        setTotalStudents(studentSnap.size || 0);
        setTotalTeachers(teacherSnap.size || 0);
      } catch (err) {
        console.error("Failed to fetch counts:", err);
      }
    };
    fetchCounts();
  }, []);

  const parseToDate = (val) => {
    if (!val && val !== 0) return null;
    if (typeof val === "object" && val !== null && typeof val.toDate === "function") {
      try {
        return val.toDate();
      } catch {}
    }
    if (typeof val === "string") {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d;
      const num = Number(val);
      if (!isNaN(num)) {
        const d2 = new Date(num);
        if (!isNaN(d2.getTime())) return d2;
      }
      return null;
    }
    if (typeof val === "number") {
      if (val < 1e12) return new Date(val * 1000);
      return new Date(val);
    }
    return null;
  };

  useEffect(() => {
    const q = query(collection(db, "recent_activities"), limit(1000));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const list = snapshot.docs.map((d) => {
            const data = d.data();
            const raw = data.timestamp ?? data.createdAt ?? data.time ?? null;
            const parsedDate = parseToDate(raw);

            // Clean any "Admin" text or separator variations (—, -, :, etc.)
            const cleanText = (text = "") =>
              text.replace(/\s*[-—:]?\s*Admin\s*$/i, "").trim();

            const cleanedDetails =
              cleanText(data.details) ||
              cleanText(data.description) ||
              "";

            const cleanedAction =
              cleanText(data.action) ||
              cleanText(data.title) ||
              "Activity";


            return {
              id: d.id,
              action: cleanedAction.trim(),
              details: cleanedDetails.trim(),
              actor: data.actor ?? "Admin",
              parsedDate,
            };
          });

          list.sort((a, b) => {
            const ta = a.parsedDate ? a.parsedDate.getTime() : -Infinity;
            const tb = b.parsedDate ? b.parsedDate.getTime() : -Infinity;
            return tb - ta;
          });

          setActivities(list);
        } catch (err) {
          console.error("Failed to process activities:", err);
        }
      },
      (err) => console.error("Failed to listen to recent_activities:", err)
    );

    return () => unsubscribe();
  }, []);

  const formatDate = (d) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleString();
    } catch {
      return "";
    }
  };

  return (
    <AdminLayout title="Dashboard">
      <div className="p-6 space-y-8">
        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            title="Total Students"
            value={totalStudents}
            icon={<Users className="text-blue-500" size={32} />}
          />
          <Card
            title="Total Teachers"
            value={totalTeachers}
            icon={<BookOpen className="text-yellow-500" size={32} />}
          />
          <Card
            title="Attendance % Today"
            value={`${attendancePercent}%`}
            icon={<BarChart3 className="text-purple-500" size={32} />}
          />
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

        {/* Recent Activities (Minimalist with Pagination) */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent Activities</h2>

          {activities.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent activities yet.</p>
          ) : (
            <>
              {/* Activity List */}
              <ul className="divide-y divide-gray-100">
                {activities
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((item) => (
                    <li
                      key={item.id}
                      className="py-2 flex justify-between items-center text-sm"
                    >
                      <span className="text-gray-700">
                        {item.action}
                        {item.details ? `: ${item.details}` : ""}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {item.parsedDate ? formatDate(item.parsedDate) : ""}
                      </span>
                    </li>
                  ))}
              </ul>

              {/* Pagination Controls */}
              <div className="flex justify-center items-center gap-2 mt-4">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className={`text-sm px-2 py-1 rounded transition ${
                    currentPage === 1
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-gray-700 hover:text-blue-600"
                  }`}
                >
                  Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`text-sm px-2 py-1 rounded transition ${
                      currentPage === i + 1
                        ? "bg-blue-500 text-white"
                        : "text-gray-700 hover:text-blue-600"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`text-sm px-2 py-1 rounded transition ${
                    currentPage === totalPages
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-gray-700 hover:text-blue-600"
                  }`}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function Card({ title, value, icon }) {
  return (
    <div className="p-5 rounded-xl shadow-md border bg-white hover:shadow-lg transition">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-600 text-sm font-medium">{title}</h2>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        {icon}
      </div>
    </div>
  );
}
