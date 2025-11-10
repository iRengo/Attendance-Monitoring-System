export default function ScheduleTable({ schedules }) {
    if (!schedules.length) {
      return <p className="text-gray-400 italic">No schedules yet.</p>;
    }
    return (
      <table className="min-w-full border border-gray-200 divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">Days</th>
            <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">Time</th>
            <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">Subject</th>
            <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">Room</th>
            <th className="py-2 px-4 text-left text-sm font-medium text-gray-700">Teacher</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {schedules.map((sched, idx) => (
            <tr key={idx}>
              <td className="py-2 px-4 text-gray-800">{sched.days || "N/A"}</td>
              <td className="py-2 px-4 text-gray-800">{sched.time || "N/A"}</td>
              <td className="py-2 px-4 text-gray-800">{sched.subjectName || "N/A"}</td>
              <td className="py-2 px-4 text-gray-800">{sched.roomNumber || "N/A"}</td>
              <td className="py-2 px-4 text-gray-800">{sched.teacherName || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }