import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Calendar, Clock, Download } from "lucide-react";
import EmptyState from "../../shared/EmptyState";
import TeacherSessionGroup from "./TeacherSessionGroup";

export default function TeacherDetail({
  selectedSection,
  selectedTeacher,
  setSelectedTeacher,
  groupedSessions, // now: { schoolYear: { subject: [sessions] } }
  loadingSessions,
  onExportCSV,
}) {
  // Track open/close state for school years and subjects
  const [openYears, setOpenYears] = useState({});
  const [openSubjects, setOpenSubjects] = useState({});

  // Whenever groupedSessions changes, set initial open state
  useEffect(() => {
    const yearsState = {};
    const subjectsState = {};

    Object.entries(groupedSessions).forEach(([year, subjects]) => {
      yearsState[year] = true; // open by default
      Object.keys(subjects).forEach(subject => {
        subjectsState[`${year}_${subject}`] = true; // open by default
      });
    });

    setOpenYears(yearsState);
    setOpenSubjects(subjectsState);
  }, [groupedSessions]);

  const allSessions = useMemo(
    () => Object.values(groupedSessions).flatMap(subjects => Object.values(subjects).flat()),
    [groupedSessions]
  );

  const lastDate = useMemo(() => {
    if (!allSessions.length) return "-";
    const latest = allSessions
      .map(s => new Date(s.timeStarted || s.timeEnded || 0).getTime())
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
        return sum + Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
      }, 0),
    [allSessions]
  );

  return (
    <div className="space-y-5">
      {/* HEADER */}
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
                ? `Sessions for Section ${selectedSection}`
                : "Sessions across all sections"}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatChip icon={<Calendar size={14} />} label="Last session" value={lastDate} />
          <StatChip icon={<Clock size={14} />} label="Total minutes" value={totalMinutes} />

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

      {/* GROUPS: School Year → Subjects */}
      {loadingSessions ? (
        <EmptyState message="Loading attendance..." />
      ) : !Object.keys(groupedSessions).length ? (
        <EmptyState message="No attendance sessions for this teacher." />
      ) : (
        Object.entries(groupedSessions).map(([year, subjects]) => (
          <div key={year} className="space-y-2">
            {/* School Year Header */}
            <div
              className="cursor-pointer px-5 py-5 bg-blue-500 text-white rounded-lg flex justify-between items-center"
              onClick={() => setOpenYears(prev => ({ ...prev, [year]: !prev[year] }))}
            >
              <span className="font-semibold">{year}</span>
              <span>{openYears[year] ? "▼" : "►"}</span>
            </div>

            {/* Subjects */}
            {openYears[year] && (
              <div className="pl-5 space-y-1">
                {Object.entries(subjects).map(([subject, sessions]) => (
                  <div key={subject} className="space-y-1">
                    <div
                      className="cursor-pointer px-3 py-1 bg-gray-50 rounded-lg flex justify-between items-center text-sm"
                      onClick={() =>
                        setOpenSubjects(prev => ({
                          ...prev,
                          [`${year}_${subject}`]: !prev[`${year}_${subject}`],
                        }))
                      }
                    >
                      <span>{subject}</span>
                      <span>{openSubjects[`${year}_${subject}`] ? "▼" : "►"}</span>
                    </div>

                    {openSubjects[`${year}_${subject}`] && (
                      <TeacherSessionGroup
                        subject={subject}
                        sessions={sessions}
                        isOpen={true}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
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
