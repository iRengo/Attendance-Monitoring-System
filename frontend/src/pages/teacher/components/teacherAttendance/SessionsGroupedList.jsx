import { Clock } from "lucide-react";
import { formatDateTime } from "./hooks/utils/date";
import { statusClass } from "./hooks/utils/status";

export default function SessionsGroupedList({
  groupedSessions,
  studentNameCache,
  studentIdFieldCache,
  loadingAttendance,
  selectedClassId,
}) {
  if (!selectedClassId) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 text-sm text-gray-500 italic">
        Select a class to view attendance.
      </div>
    );
  }

  if (loadingAttendance) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 text-sm text-gray-500">
        Loading attendance...
      </div>
    );
  }

  if (!groupedSessions?.length) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 text-sm text-gray-500 italic">
        No attendance sessions recorded for this class yet.
      </div>
    );
  }

  // Compute overall attendance percentage per student
  const attendanceSummary = {};
  groupedSessions.forEach((group) => {
    group.sessions.forEach((sess) => {
      sess.filteredEntries.forEach((entry) => {
        const sid = String(entry.student_id || "");
        if (!attendanceSummary[sid]) {
          attendanceSummary[sid] = { present: 0, total: 0, lateCount: 0 };
        }

        // Increment total attendance count
        attendanceSummary[sid].total += 1;

        // Handle late condition
        if (entry.status === "late") {
          // If the student already has 3 lates, treat further lates as absent
          if (attendanceSummary[sid].lateCount >= 3) {
            // Do NOT count as present
          } else {
            attendanceSummary[sid].present += 1;
            attendanceSummary[sid].lateCount += 1;
          }
        } 
        // Handle present normally
        else if (entry.status === "present") {
          attendanceSummary[sid].present += 1;
        }
        // Absent → nothing added to present count
      });
    });
  });

  // Helper to calculate % with 0 check
  const getAttendancePercent = (sid) => {
    const data = attendanceSummary[sid];
    if (!data || data.total === 0) return 0;
    return Math.round((data.present / data.total) * 100);
  };

  return (
    <div className="space-y-6">
      {groupedSessions.map((group) => (
        <div
          key={group.key}
          className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden"
        >
          <div className="px-6 py-3 bg-gray-50 border-b">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Clock size={14} className="text-indigo-500" />
              {group.label}
            </h3>
          </div>

          {group.sessions.map((sess, idx) => (
            <div
              key={sess.id}
              className={`px-6 py-4 ${idx !== group.sessions.length - 1 ? "border-b" : ""}`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="text-xs text-gray-600 flex gap-3">
                  <span>Started: {formatDateTime(sess.timeStarted)}</span>
                  <span>Ended: {formatDateTime(sess.timeEnded)}</span>
                  <span>
                    Students: <strong>{sess.filteredEntries.length}</strong>
                  </span>
                </div>
              </div>

              {sess.filteredEntries.length === 0 ? (
                <p className="text-xs text-gray-500 italic">
                  No matching students for this session.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border border-gray-200">
                  <table className="min-w-full w-full text-xs table-fixed">
                    <colgroup>
                      <col style={{ width: "20%" }} />
                      <col style={{ width: "25%" }} />
                      <col style={{ width: "20%" }} />
                      <col style={{ width: "20%" }} />
                      <col style={{ width: "10%" }} />
                    </colgroup>

                    <thead className="bg-gray-100">
                      <tr className="text-gray-700">
                        <th className="px-4 py-3 text-left font-medium align-middle whitespace-nowrap">
                          Student ID
                        </th>
                        <th className="px-4 py-3 text-left font-medium align-middle whitespace-nowrap">
                          Student Name
                        </th>
                        <th className="px-4 py-3 text-left font-medium align-middle whitespace-nowrap">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left font-medium align-middle whitespace-nowrap">
                          Time Logged
                        </th>
                        <th className="px-10 py-3 text-right font-medium align-middle whitespace-nowrap">
                          Attendance %
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {sess.filteredEntries.map((e, i) => {
                        const sid = String(e.student_id || "");
                        const sname = studentNameCache[sid] || sid;
                        const displayStudentId = studentIdFieldCache[sid] || sid;
                        return (
                          <tr key={`${sess.id}-${sid}-${i}`} className="hover:bg-blue-50/40 transition">
                            <td className="px-4 py-3 font-mono text-gray-700 align-middle whitespace-nowrap">
                              {displayStudentId}
                            </td>

                            <td className="px-4 py-3 text-gray-700 align-middle max-w-[36ch] truncate">
                              {sname}
                            </td>

                            <td className="px-4 py-3 align-middle">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[11px] font-medium inline-block ${statusClass(
                                  e.status
                                )}`}
                              >
                                {e.status || "unknown"}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-gray-700 align-middle whitespace-nowrap">
                              {formatDateTime(e.timeLogged) || "—"}
                            </td>

                            <td className="px-15 py-3 text-gray-700 font-semibold align-middle text-right">
                              {getAttendancePercent(sid)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
