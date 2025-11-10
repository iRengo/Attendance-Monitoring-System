import { CheckCircle2, XCircle, Clock } from "lucide-react";
import SkeletonRows from "./SkeletonRows";
import { parseAttendanceDate, formatDate, formatTime } from "./utils/attendanceDate";

export default function AttendanceTable({ loading, rows }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-[#1f376b]">
          <thead className="bg-gray-50 text-left sticky top-0 z-10">
            <tr className="text-gray-700">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Subject</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Teacher</th>
              <th className="px-4 py-3 font-semibold">Time Logged</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <SkeletonRows rows={8} />
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={5}>
                  No attendance records found.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const dateFormatted = formatDate(row.dateObj);
                const subject = row.classMeta?.subjectName || "N/A";
                const teacher = row.teacherName || "—";
                const timeLoggedDate = parseAttendanceDate(row.timeLogged);
                const timeLoggedStr = timeLoggedDate
                  ? `${formatDate(timeLoggedDate)} ${formatTime(timeLoggedDate)}`
                  : "—";
                const statusLabel = (row.status || "").toLowerCase();

                return (
                  <tr
                    key={row.id}
                    className="hover:bg-blue-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">{dateFormatted}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full bg-indigo-400" />
                        {subject}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          statusLabel === "present"
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : statusLabel === "absent"
                            ? "bg-red-100 text-red-700 border border-red-200"
                            : statusLabel === "late"
                            ? "bg-amber-100 text-amber-700 border border-amber-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {statusLabel === "present" && <CheckCircle2 size={14} />}
                        {statusLabel === "absent" && <XCircle size={14} />}
                        {statusLabel === "late" && <Clock size={14} />}
                        {row.status || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{teacher}</td>
                    <td className="px-4 py-3">{timeLoggedStr}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}