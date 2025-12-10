import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Calendar, Clock, Download } from "lucide-react";
import EmptyState from "../../shared/EmptyState";
import StudentSessionGroup from "./StudentSessionGroup";
import { getStudentStatusForSession } from "../../shared/utils";

export default function StudentDetail({
  selectedSection,
  selectedStudent,
  setSelectedStudent,
  groupedSessions, // { schoolYear: { subject: [sessions] } }
  loadingSessions,
  activeSchoolYear, // optional filter
}) {
  const [openYears, setOpenYears] = useState({});
  const [openSubjects, setOpenSubjects] = useState({});

  // Initialize open state
  useEffect(() => {
    const yearsState = {};
    const subjectsState = {};

    Object.entries(groupedSessions).forEach(([year, subjects]) => {
      yearsState[year] = true; // keep school years expanded
      Object.keys(subjects).forEach(subject => {
        subjectsState[`${year}_${subject}`] = true; // subjects collapsed
      });
    });

    setOpenYears(yearsState);
    setOpenSubjects(subjectsState);
  }, [groupedSessions]);

  // Filter by activeSchoolYear if provided
  const filteredGroupedSessions = useMemo(() => {
    if (!activeSchoolYear) return groupedSessions;

    const obj = {};
    for (const [year, subjects] of Object.entries(groupedSessions)) {
      if (year !== activeSchoolYear) continue;
      obj[year] = subjects;
    }
    return obj;
  }, [groupedSessions, activeSchoolYear]);

  const allSessions = useMemo(
    () => Object.values(filteredGroupedSessions).flatMap(subjects => Object.values(subjects).flat()),
    [filteredGroupedSessions]
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
              {selectedSection
                ? `Sessions for Section ${selectedSection}`
                : "Sessions across all sections"}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatChip icon={<Calendar size={14} />} label="Last session" value={lastDate} />
          <StatChip icon={<Clock size={14} />} label="Total minutes" value={totalMinutes} />
        </div>
      </div>

      {/* SCHOOL YEAR → SUBJECTS */}
      {loadingSessions ? (
        <EmptyState message="Loading attendance..." />
      ) : !Object.keys(filteredGroupedSessions).length ? (
        <EmptyState message="No attendance records." />
      ) : (
        Object.entries(filteredGroupedSessions).map(([year, subjects]) => (
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
                      <StudentSessionGroup
                        subject={subject}
                        sessions={sessions}
                        studentId={selectedStudent.id}
                        getStatus={(sess) =>
                          getStudentStatusForSession(sess, selectedStudent.id)
                        }
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
