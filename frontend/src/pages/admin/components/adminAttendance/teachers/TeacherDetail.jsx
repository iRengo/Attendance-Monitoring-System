import { useMemo, useState } from "react";
import { ArrowLeft, Calendar, Clock, Download } from "lucide-react";
import EmptyState from "../../shared/EmptyState";
import TeacherSessionGroup from "./TeacherSessionGroup";

export default function TeacherDetail({
  selectedSection,
  selectedTeacher,
  setSelectedTeacher,
  groupedSessions,
  loadingSessions,
  onExportCSV,
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

  const totalMinutes = useMemo(
    () =>
      allSessions.reduce((sum, s) => {
        const start = s.timeStarted ? new Date(s.timeStarted) : null;
        const end = s.timeEnded ? new Date(s.timeEnded) : null;
        if (!start || !end) return sum;
        return (
          sum + Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
        );
      }, 0),
    [allSessions]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedTeacher(null)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-medium"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h2 className="text-sm md:text-base font-semibold text-gray-900">
              {selectedTeacher.name}
            </h2>
            <div className="text-[11px] text-gray-600 mt-0.5">
              {selectedSection
                ? `Viewing sessions in Section ${selectedSection}`
                : "Viewing sessions across all sections"}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatChip icon={<Calendar size={14} />} label="Last session" value={lastDate} />
          <StatChip
            icon={<Clock size={14} />}
            label="Total minutes"
            value={totalMinutes}
          />
          <button
            onClick={onExportCSV}
            disabled={!allSessions.length}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-sm disabled:opacity-50"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {loadingSessions ? (
        <EmptyState message="Loading attendance..." />
      ) : !Object.keys(groupedSessions).length ? (
        <EmptyState message="No attendance sessions for this teacher." />
      ) : (
        Object.entries(groupedSessions).map(([subject, sessions]) => (
          <TeacherSessionGroup
            key={subject}
            subject={subject}
            sessions={sessions}
            isOpen={open[subject]}
            toggle={() => setOpen((prev) => ({ ...prev, [subject]: !prev[subject] }))}
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