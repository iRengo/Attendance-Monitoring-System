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

  return (
    <div className="space-y-6">
      {groupedSessions.map((group) => (
        <div key={group.key} className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
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
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr className="text-gray-700">
                        <th className="px-3 py-2 text-left font-medium">Student ID</th>
                        <th className="px-3 py-2 text-left font-medium">Student Name</th>
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                        <th className="px-3 py-2 text-left font-medium">Time Logged</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sess.filteredEntries.map((e, i) => {
                        const sid = String(e.student_id || "");
                        const sname = studentNameCache[sid] || sid;
                        const displayStudentId = studentIdFieldCache[sid] || sid;
                        return (
                          <tr key={`${sess.id}-${sid}-${i}`} className="hover:bg-blue-50/40 transition">
                            <td className="px-3 py-2 font-mono text-gray-700">{displayStudentId}</td>
                            <td className="px-3 py-2 text-gray-700">{sname}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[11px] font-medium inline-block ${statusClass(
                                  e.status
                                )}`}
                              >
                                {e.status || "unknown"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-700">
                              {formatDateTime(e.timeLogged)}
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