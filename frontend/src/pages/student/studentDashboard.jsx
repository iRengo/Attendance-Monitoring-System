import StudentLayout from "../../components/studentLayout";
import { UserCheck, UserX, Clock, Activity } from "lucide-react";

export default function StudentDashboard() {
  const attendance = {
    present: 18,
    absent: 2,
    late: 1,
    rate: "90%",
  };

  return (
    <StudentLayout title="Dashboard">
      <div className="p-6 space-y-6">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: UserCheck, label: "Present", value: attendance.present },
            { icon: UserX, label: "Absent", value: attendance.absent },
            { icon: Clock, label: "Late", value: attendance.late },
            { icon: Activity, label: "Attendance Rate", value: attendance.rate },
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="border border-gray-200 rounded-xl p-5 flex flex-col items-center shadow-sm hover:shadow-lg transition duration-200"
              >
                <Icon size={32} className="mb-2 text-gray-600" />
                <h2 className="text-sm font-medium mb-1 text-gray-700">{card.label}</h2>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            );
          })}
        </div>

        {/* Announcements */}
        <div className="bg-white shadow-sm rounded-xl p-5">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Announcements</h2>
          <ul className="list-disc list-inside text-gray-700">
            <li>No classes on October 15</li>
            <li>Submit assignments by Friday</li>
          </ul>
        </div>

       {/* Schedule */}
        <div className="bg-white shadow-sm rounded-xl p-5 overflow-x-auto">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Schedule</h2>
          <table className="min-w-full border border-gray-200 divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">Time</th>
                <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">Subject</th>
                <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">Room</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="py-2 px-4 text-gray-800">08:00 - 09:00</td>
                <td className="py-2 px-4 text-gray-800">Math</td>
                <td className="py-2 px-4 text-gray-800">Room 101</td>
              </tr>
              <tr>
                <td className="py-2 px-4 text-gray-800">09:00 - 10:00</td>
                <td className="py-2 px-4 text-gray-800">Science</td>
                <td className="py-2 px-4 text-gray-800">Room 102</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </StudentLayout>
  );
}
