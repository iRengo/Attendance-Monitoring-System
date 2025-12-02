import { CheckCircle2, XCircle, Clock } from "lucide-react";
import SkeletonRows from "./SkeletonRows";
import { parseAttendanceDate, formatDate, formatTime } from "./utils/attendanceDate";

export default function AttendanceTable({ loading, rows = [] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* internal scroller only if needed; table itself is table-fixed with controlled column widths */}
      <div className="w-full overflow-x-auto">
        <table className="min-w-full w-full table-fixed text-sm text-[#1f376b]">
          {/* Column width tuning to keep layout tight and use left space better */}
          <colgroup>
            <col style={{ width: "16%" }} /> {/* Date */}
            <col style={{ width: "44%" }} /> {/* Subject */}
            <col style={{ width: "16%" }} /> {/* Status */}
            <col style={{ width: "16%" }} /> {/* Teacher */}
            <col style={{ width: "8%" }} />  {/* Time (just time, not date) */}
          </colgroup>

          <thead className="bg-gray-50 text-left sticky top-0 z-10">
            <tr className="text-gray-700">
              <th className="px-3 py-2 font-semibold text-xs">Date</th>
              <th className="px-3 py-2 font-semibold text-xs">Subject</th>
              <th className="px-3 py-2 font-semibold text-xs">Status</th>
              <th className="px-3 py-2 font-semibold text-xs">Teacher</th>
              <th className="px-3 py-2 font-semibold text-xs text-right">Time</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <SkeletonRows rows={8} />
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>
                  No attendance records found.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const dateFormatted = formatDate(row.dateObj);
                const subject = row.classMeta?.subjectName || "N/A";
                const teacher = row.teacherName || "—";

                const timeLoggedDate = parseAttendanceDate(row.timeLogged);
                // show only time here (date shown in Date column)
                const timeOnly = timeLoggedDate ? formatTime(timeLoggedDate) : "—";

                const statusLabel = (row.status || "").toLowerCase();

                return (
                  <tr key={row.id} className="hover:bg-blue-50/50 transition-colors align-top">
                    <td className="px-3 py-2 align-top whitespace-normal break-words text-xs text-[#415CA0]">
                      {dateFormatted}
                    </td>

                    <td className="px-3 py-2 align-top whitespace-normal break-words text-sm">
                      <div className="flex items-start gap-2">
                        <span className="inline-block mt-1 h-2 w-2 rounded-full bg-indigo-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm leading-tight break-words">{subject}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-2 align-top">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
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
                        <span className="whitespace-normal break-words">{row.status || "N/A"}</span>
                      </span>
                    </td>

                    <td className="px-3 py-2 align-top whitespace-normal break-words text-sm">
                      <div className="max-w-full break-words">{teacher}</div>
                    </td>

                    <td className="px-3 py-2 align-top text-right whitespace-nowrap text-sm text-gray-600">
                      {timeOnly}
                    </td>
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