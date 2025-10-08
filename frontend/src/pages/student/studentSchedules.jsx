import StudentLayout from "../../components/studentLayout";
import { Search, Filter } from "lucide-react";
import { useState } from "react";

export default function StudentSchedules() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDay, setFilterDay] = useState("All");
  const [showPast, setShowPast] = useState(false);

  const currentSchedules = [
    { day: "Monday", time: "08:00 - 09:00", subject: "Mathematics", instructor: "Mr. Santos", room: "Room 101" },
    { day: "Monday", time: "09:00 - 10:00", subject: "Science", instructor: "Ms. Dela Cruz", room: "Room 102" },
    { day: "Tuesday", time: "10:00 - 11:00", subject: "English", instructor: "Mr. Tan", room: "Room 103" },
    { day: "Wednesday", time: "08:00 - 09:30", subject: "History", instructor: "Ms. Reyes", room: "Room 104" },
    { day: "Thursday", time: "01:00 - 02:00", subject: "PE", instructor: "Coach Robles", room: "Gym" },
    { day: "Friday", time: "02:00 - 03:00", subject: "Computer", instructor: "Mr. Ong", room: "Lab 1" },
  ];

  const pastSchedules = [
    {
      schoolYear: "2023 - 2024",
      schedules: [
        { day: "Monday", time: "07:00 - 08:00", subject: "Biology", instructor: "Mr. Cruz", room: "Room 204" },
        { day: "Wednesday", time: "09:00 - 10:00", subject: "Economics", instructor: "Ms. Garcia", room: "Room 210" },
        { day: "Friday", time: "10:00 - 11:30", subject: "Art", instructor: "Mr. Ramos", room: "Room 112" },
      ],
    },
  ];

  const filteredSchedules = currentSchedules.filter(
    (sched) =>
      (filterDay === "All" || sched.day === filterDay) &&
      sched.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <StudentLayout title="Current Schedules">
      <div className="p-6 space-y-8">
        {/* Header with search & filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-gray-800 mb-4 sm:mb-0">
            Current Schedules
          </h1>
          <div className="flex gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white text-sm text-gray-700 placeholder-gray-500"
              />
            </div>

            {/* Filter */}
            <div className="relative">
              <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={filterDay}
                onChange={(e) => setFilterDay(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white text-sm text-gray-700"
              >
                <option value="All">All Days</option>
                <option>Monday</option>
                <option>Tuesday</option>
                <option>Wednesday</option>
                <option>Thursday</option>
                <option>Friday</option>
              </select>
            </div>
          </div>
        </div>

        {/* Current Schedule Table */}
        <div className="bg-white shadow-sm rounded-xl p-5 overflow-x-auto">
          <table className="min-w-full border border-gray-200 divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">Day</th>
                <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">Time</th>
                <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">Subject</th>
                <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">Instructor</th>
                <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">Room</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSchedules.length > 0 ? (
                filteredSchedules.map((sched, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition duration-150">
                    <td className="py-2 px-4 text-gray-800">{sched.day}</td>
                    <td className="py-2 px-4 text-gray-800">{sched.time}</td>
                    <td className="py-2 px-4 font-medium text-gray-900">{sched.subject}</td>
                    <td className="py-2 px-4 text-gray-700">{sched.instructor}</td>
                    <td className="py-2 px-4 text-gray-700">{sched.room}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-gray-500">
                    No schedules found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Toggle for Past Schedules */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">🕰️ Past Schedules</h2>
          <button
            onClick={() => setShowPast(!showPast)}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 transition"
          >
            {showPast ? "Hide Past Schedules" : "Show Past Schedules"}
          </button>
        </div>

        {/* Past Schedules Table */}
        {showPast && (
          <div className="space-y-6">
            {pastSchedules.map((yearData, idx) => (
              <div key={idx}>
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  School Year: {yearData.schoolYear}
                </h3>
                <div className="bg-white shadow-sm rounded-xl p-5 overflow-x-auto">
                  <table className="min-w-full border border-gray-200 divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">Day</th>
                        <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">Time</th>
                        <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">Subject</th>
                        <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">Instructor</th>
                        <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">Room</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {yearData.schedules.map((sched, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition duration-150">
                          <td className="py-2 px-4 text-gray-800">{sched.day}</td>
                          <td className="py-2 px-4 text-gray-800">{sched.time}</td>
                          <td className="py-2 px-4 font-medium text-gray-900">{sched.subject}</td>
                          <td className="py-2 px-4 text-gray-700">{sched.instructor}</td>
                          <td className="py-2 px-4 text-gray-700">{sched.room}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Note / Footer Info */}
        <div className="text-sm text-gray-600 text-center">
          Tip: You can filter by day or search a subject to quickly find your class.
        </div>
      </div>
    </StudentLayout>
  );
}
