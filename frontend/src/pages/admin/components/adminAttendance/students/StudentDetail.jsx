import { useMemo, useState } from "react";
import { ArrowLeft, Calendar } from "lucide-react";
import EmptyState from "../../shared/EmptyState";
import StudentSessionGroup from "./StudentSessionGroup";
import { getStudentStatusForSession } from "../../shared/utils";

export default function StudentDetail({
  selectedSection,
  selectedStudent,
  setSelectedStudent,
  groupedSessions,
  loadingSessions,
}) {
  const [open, setOpen] = useState(() =>
    Object.keys(groupedSessions).reduce((acc, k) => {
      acc[k] = true;
      return acc;
    }, {})
  );

  const allSessions = useMemo(
    () => Object.values(groupedSessions).flat(),
    [groupedSessions]
  );

  const lastDate = useMemo(() => {
    if (!allSessions.length) return "-";
    const latest = allSessions
      .map((s) => new Date(s.timeStarted || s.timeEnded || 0).getTime())
      .sort((a, b) => b - a)[0];
    return latest && !Number.isNaN(latest)
      ? new Date(latest).toLocaleDateString()
      : "-";
  }, [allSessions]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedStudent(null)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-medium"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h2 className="text-sm md:text-base font-semibold text-gray-900">
              {selectedStudent.name}
            </h2>
            <div className="text-[11px] text-gray-600 mt-0.5">
              Viewing attendance in Section {selectedSection || "-"}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatChip icon={<Calendar size={14} />} label="Last session" value={lastDate} />
        </div>
      </div>

      {loadingSessions ? (
        <EmptyState message="Loading attendance..." />
      ) : !Object.keys(groupedSessions).length ? (
        <EmptyState message="No attendance records for this student in the section." />
      ) : (
        Object.entries(groupedSessions).map(([subject, sessions]) => (
          <StudentSessionGroup
            key={subject}
            subject={subject}
            sessions={sessions}
            studentId={selectedStudent.id}
            isOpen={open[subject]}
            toggle={() =>
              setOpen((prev) => ({ ...prev, [subject]: !prev[subject] }))
            }
            getStatus={(sess) => getStudentStatusForSession(sess, selectedStudent.id)}
          />
        ))
      )}
    </div>
  );
}

function StatChip({ icon, label, value }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-700">
      <span className="text-indigo-600">{icon}</span>
      {label}: <span className="font-medium">{value}</span>
    </div>
  );
}