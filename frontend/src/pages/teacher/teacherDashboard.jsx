import { useState, useEffect } from "react";
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
import { auth, db } from "../../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export default function TeacherDashboard() {
  const [teacherId, setTeacherId] = useState(null);
  const [totalClasses, setTotalClasses] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalSubjects, setTotalSubjects] = useState(0);
  const [loading, setLoading] = useState(true);
  const [incomingClass, setIncomingClass] = useState(null);

  const attendanceData = [
    { day: "Mon", Present: 28, Absent: 2 },
    { day: "Tue", Present: 30, Absent: 0 },
    { day: "Wed", Present: 27, Absent: 3 },
    { day: "Thu", Present: 29, Absent: 1 },
    { day: "Fri", Present: 30, Absent: 0 },
  ];

  // ✅ Get current teacher ID
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) setTeacherId(user.uid);
      else setTeacherId(null);
    });
    return unsubscribe;
  }, []);

  // ✅ Fetch teacher stats + upcoming class (from top-level classes collection)
  useEffect(() => {
    if (!teacherId) return;

    let isActive = true;
    const fetchTeacherData = async () => {
      setLoading(true);
      try {
        // Read classes from top-level "classes" collection filtered by teacherId
        const classesQ = query(collection(db, "classes"), where("teacherId", "==", teacherId));
        const classSnap = await getDocs(classesQ);

        const subjectSet = new Set();
        const studentSet = new Set();
        const classList = [];

        for (const classDoc of classSnap.docs) {
          const classData = classDoc.data() || {};
          const cls = { id: classDoc.id, ...classData };
          classList.push(cls);

          // Unique subjects (case-insensitive)
          if (classData.subjectName) {
            subjectSet.add(String(classData.subjectName).trim().toLowerCase());
          }

          // Count unique students across all classes via subcollection classes/{classId}/students
          const studentsRef = collection(db, "classes", classDoc.id, "students");
          const studentsSnap = await getDocs(studentsRef);
          studentsSnap.docs.forEach((s) => studentSet.add(s.id));
        }

        if (!isActive) return;

        setTotalClasses(classSnap.size);
        setTotalSubjects(subjectSet.size);
        setTotalStudents(studentSet.size);

        const nextClass = getNextUpcomingClass(classList);
        setIncomingClass(nextClass);
      } catch (err) {
        console.error("Error fetching teacher dashboard data:", err);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    fetchTeacherData();
    return () => {
      isActive = false;
    };
  }, [teacherId]);

  // ✅ Helper: find the next upcoming class based on today/time
  function getNextUpcomingClass(classes) {
    if (!classes || classes.length === 0) return null;

    const now = new Date();
    const currentDay = now.toLocaleString("en-US", { weekday: "long" });
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const parseTime = (timeStr) => {
      if (!timeStr) return null;
      const [time, meridian] = timeStr.split(" ");
      if (!time || !meridian) return null;
      let [hourStr, minuteStr] = time.split(":");
      let hour = Number(hourStr);
      const minute = Number(minuteStr || 0);
      if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
      if (meridian.toUpperCase() === "PM" && hour !== 12) hour += 12;
      if (meridian.toUpperCase() === "AM" && hour === 12) hour = 0;
      return hour * 60 + minute;
    };

    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const todayIndex = daysOfWeek.indexOf(currentDay);

    let nearestClass = null;
    let nearestDiff = Infinity;

    for (const cls of classes) {
      if (!cls?.days || !cls?.time || !cls.time.includes(" - ")) continue;

      const classDays = String(cls.days)
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);

      const [startStr, endStr] = cls.time.split(" - ").map((t) => t.trim());
      const start = parseTime(startStr);
      let end = parseTime(endStr);
      if (start == null || end == null) continue;
      if (end <= start) end += 24 * 60; // handle ranges that pass midnight

      for (const day of classDays) {
        const dayIndex = daysOfWeek.indexOf(day);
        if (dayIndex === -1) continue;

        let diffDays = dayIndex - todayIndex;
        if (diffDays < 0) diffDays += 7;

        const totalMinutesDiff = diffDays * 24 * 60 + start - currentTime;
        const classEndDiff = diffDays * 24 * 60 + end - currentTime;

        // If class is ongoing now
        if (totalMinutesDiff <= 0 && classEndDiff > 0) {
          return { ...cls, dayLabel: "Today" };
        }

        if (totalMinutesDiff > 0 && totalMinutesDiff < nearestDiff) {
          nearestDiff = totalMinutesDiff;
          nearestClass = {
            ...cls,
            dayLabel: diffDays === 0 ? "Today" : day,
          };
        }
      }
    }

    return nearestClass;
  }

  return (
    <TeacherLayout title="Dashboard">
      <div className="p-6 space-y-8">
        {/* Header */}
        <h1 className="text-3xl font-semibold text-gray-800">
          Welcome back, Teacher 👋
        </h1>

        {/* --- Top Cards --- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl shadow-md border bg-white hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-gray-600 text-sm font-medium">Total Classes</h2>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {loading ? "..." : totalClasses}
                </p>
              </div>
              <Layers className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="p-5 rounded-xl shadow-md border bg-white hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-gray-600 text-sm font-medium">Total Students</h2>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {loading ? "..." : totalStudents}
                </p>
              </div>
              <Users className="text-green-500" size={32} />
            </div>
          </div>

          <div className="p-5 rounded-xl shadow-md border bg-white hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-gray-600 text-sm font-medium">Total Subjects</h2>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {loading ? "..." : totalSubjects}
                </p>
              </div>
              <BookOpen className="text-purple-500" size={32} />
            </div>
          </div>
        </div>

        {/* --- Attendance Graph + Incoming Class --- */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Attendance Graph */}
          <div className="flex-1 bg-white border rounded-xl shadow-md p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              📊 Attendance Overview
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
                  <Bar dataKey="Present" fill="#60a5fa" barSize={18} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Absent" fill="#f87171" barSize={18} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Incoming Class */}
          <div className="md:w-96 bg-white border rounded-xl shadow-md p-5 flex flex-col justify-center items-center hover:shadow-lg transition text-center">
            <Calendar size={40} className="text-amber-500 mb-3" />
            <h2 className="text-sm font-medium text-gray-700">Incoming Class</h2>

            {incomingClass ? (
              <>
                <p className="text-lg font-bold mt-1 text-gray-900">
                  {incomingClass.subjectName}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {incomingClass.dayLabel} • {incomingClass.time}
                </p>
                {incomingClass.roomNumber && (
                  <p className="mt-1 text-xs text-gray-500">
                    Room {incomingClass.roomNumber} • {incomingClass.section}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 mt-2">No upcoming classes</p>
            )}
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}