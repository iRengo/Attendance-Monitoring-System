import { useEffect, useMemo, useState, useCallback } from "react";
import AdminLayout from "../../components/adminLayout";
import {
  Search,
  Loader2,
  ArrowLeft,
  Eye,
  Download,
  ChevronDown,
  ChevronRight,
  Calendar,
  Clock,
} from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";

/**
 * Teachers-only Attendance (Refined UI):
 * - Removed top header (title/description/"All Sections" pill)
 * - Shows all teachers by default; filters to section teachers when a section is chosen
 * - Uses teachers.profilePicUrl as avatar (fallback to initials if missing)
 * - Hides teacherId in list; shows name only
 * - Per-teacher "View" opens grouped-by-subject sessions
 */

const TEACHERS_PAGE_SIZE = 15;

export default function AdminAttendance() {
  // Classes + Sections
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");

  // Teachers
  const [allTeachers, setAllTeachers] = useState([]);
  const [teachersInSection, setTeachersInSection] = useState([]);
  const [teachersPage, setTeachersPage] = useState(1);
  const [teacherQuery, setTeacherQuery] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Teacher sessions
  const [teacherSessions, setTeacherSessions] = useState([]); // section-wide sessions
  const [selectedTeacherSessions, setSelectedTeacherSessions] = useState([]); // when no section
  const [loadingTeacherSessions, setLoadingTeacherSessions] = useState(false);

  // Loading
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Fetch all classes and all teachers once
  useEffect(() => {
    async function fetchBase() {
      setLoadingClasses(true);
      try {
        // classes
        const clsSnap = await getDocs(collection(db, "classes"));
        const cls = clsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setClasses(cls);
        const uniqueSections = Array.from(
          new Set(
            cls
              .map((c) => (c.section || "").trim())
              .filter((s) => s && s.length > 0)
          )
        ).sort((a, b) => a.localeCompare(b));
        setSections(uniqueSections);

        // all teachers with profilePicUrl
        const tSnap = await getDocs(collection(db, "teachers"));
        const all = tSnap.docs.map((d) => {
          const td = d.data() || {};
          const fn = td.firstName || td.firstname || "";
          const mn = td.middleName || td.middlename || "";
          const ln = td.lastName || td.lastname || "";
          const name =
            [fn, mn, ln].map((s) => (s || "").trim()).filter(Boolean).join(" ") ||
            d.id;
          const profilePicUrl = td.profilePicUrl || td.photoURL || "";
          return { teacherId: d.id, name, profilePicUrl };
        });
        all.sort((a, b) => a.name.localeCompare(b.name));
        setAllTeachers(all);
      } catch (e) {
        console.error("Error fetching base data:", e);
      } finally {
        setLoadingClasses(false);
      }
    }
    fetchBase();
  }, []);

  // When section changes: reset selection and load teachers (filtered) and section sessions
  useEffect(() => {
    setTeacherSessions([]);
    setSelectedTeacher(null);
    setSelectedTeacherSessions([]);
    setTeachersInSection([]);

    if (!selectedSection) return;

    async function loadTeachersForSection() {
      try {
        const sectionClasses = classes.filter(
          (c) => (c.section || "").trim() === selectedSection
        );
        const teacherIds = Array.from(
          new Set(sectionClasses.map((c) => c.teacherId).filter(Boolean))
        );

        if (teacherIds.length === 0) {
          setTeachersInSection([]);
          return;
        }

        // Filter from already fetched allTeachers
        const inSection = allTeachers.filter((t) =>
          teacherIds.includes(t.teacherId)
        );
        setTeachersInSection(inSection.sort((a, b) => a.name.localeCompare(b.name)));
        setTeachersPage(1);
      } catch (e) {
        console.error("Error loading teachers for section:", e);
      }
    }

    async function loadSectionTeacherSessions() {
      setLoadingTeacherSessions(true);
      try {
        const sectionClasses = classes.filter(
          (c) => (c.section || "").trim() === selectedSection
        );
        const classIds = sectionClasses.map((c) => c.id);

        // Firestore 'in' has max 10 elements -> chunk queries
        const chunks = [];
        for (let i = 0; i < classIds.length; i += 10) {
          chunks.push(classIds.slice(i, i + 10));
        }

        const gathered = [];
        for (const chunk of chunks) {
          if (chunk.length === 0) continue;
          const qSessions = query(
            collection(db, "attendance_sessions"),
            where("classId", "in", chunk)
          );
          const snap = await getDocs(qSessions);
          snap.docs.forEach((d) => gathered.push({ id: d.id, ...d.data() }));
        }

        gathered.sort(
          (a, b) =>
            new Date(b.timeStarted || 0).getTime() -
            new Date(a.timeStarted || 0).getTime()
        );
        setTeacherSessions(gathered);
      } catch (e) {
        console.error("Error loading section teacher sessions:", e);
      } finally {
        setLoadingTeacherSessions(false);
      }
    }

    loadTeachersForSection();
    loadSectionTeacherSessions();
  }, [selectedSection, classes, allTeachers]);

  // If no section is selected and a teacher is chosen, fetch that teacher's sessions directly by teacherId
  useEffect(() => {
    if (!selectedTeacher) {
      setSelectedTeacherSessions([]);
      return;
    }
    if (selectedSection) {
      // When section is chosen, we already loaded section-wide sessions; detail view will filter from teacherSessions
      setSelectedTeacherSessions([]);
      return;
    }

    async function loadSessionsByTeacher() {
      setLoadingTeacherSessions(true);
      try {
        const qSess = query(
          collection(db, "attendance_sessions"),
          where("teacherId", "==", selectedTeacher.teacherId)
        );
        const snap = await getDocs(qSess);
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort(
            (a, b) =>
              new Date(b.timeStarted || 0).getTime() -
              new Date(a.timeStarted || 0).getTime()
          );
        setSelectedTeacherSessions(list);
      } catch (e) {
        console.error("Error loading sessions by teacher:", e);
      } finally {
        setLoadingTeacherSessions(false);
      }
    }

    loadSessionsByTeacher();
  }, [selectedTeacher, selectedSection]);

  // Map classId -> class doc
  const classMap = useMemo(() => {
    const m = new Map();
    classes.forEach((c) => m.set(c.id, c));
    return m;
  }, [classes]);

  // Decide which teacher list to show
  const teachersToShow = useMemo(
    () => (selectedSection ? teachersInSection : allTeachers),
    [selectedSection, teachersInSection, allTeachers]
  );

  // Filter + paginate teachers
  const filteredTeachers = useMemo(() => {
    const q = teacherQuery.trim().toLowerCase();
    const base = teachersToShow;
    if (!q) return base;
    return base.filter(
      (t) =>
        (t.name || "").toLowerCase().includes(q) ||
        (t.teacherId || "").toLowerCase().includes(q)
    );
  }, [teachersToShow, teacherQuery]);

  const totalTeacherPages = Math.max(
    1,
    Math.ceil(filteredTeachers.length / TEACHERS_PAGE_SIZE)
  );

  const teachersPageData = useMemo(() => {
    const start = (teachersPage - 1) * TEACHERS_PAGE_SIZE;
    return filteredTeachers.slice(start, start + TEACHERS_PAGE_SIZE);
  }, [filteredTeachers, teachersPage]);

  const goToTeachersPage = useCallback(
    (newPage) => {
      if (newPage < 1) newPage = 1;
      if (newPage > totalTeacherPages) newPage = totalTeacherPages;
      setTeachersPage(newPage);
    },
    [totalTeacherPages]
  );

  // Detail: sessions for the selected teacher depending on section state
  const sessionsForDetail = useMemo(() => {
    if (!selectedTeacher) return [];
    if (selectedSection) {
      return teacherSessions.filter(
        (s) => (s.teacherId || "") === selectedTeacher.teacherId
      );
    }
    return selectedTeacherSessions;
  }, [selectedTeacher, selectedSection, teacherSessions, selectedTeacherSessions]);

  const groupedTeacherSessions = useMemo(() => {
    if (!selectedTeacher) return {};
    const groups = {};
    for (const sess of sessionsForDetail) {
      const cls = classMap.get(sess.classId) || {};
      const subject = (cls.subjectName || cls.name || "Unknown Subject").trim();
      if (!groups[subject]) groups[subject] = [];
      groups[subject].push(sess);
    }
    Object.values(groups).forEach((arr) =>
      arr.sort(
        (a, b) =>
          new Date(b.timeStarted || 0).getTime() -
          new Date(a.timeStarted || 0).getTime()
      )
    );
    return groups;
  }, [sessionsForDetail, classMap, selectedTeacher]);

  function exportTeacherSessionsCSV() {
    if (!selectedTeacher) return;
    const headers = [
      "Subject",
      "SessionID",
      "ClassID",
      "TimeStarted",
      "TimeEnded",
      "DurationMinutes",
      "Date",
    ];
    const rows = [];
    Object.entries(groupedTeacherSessions).forEach(([subject, sessions]) => {
      sessions.forEach((s) => {
        const start = s.timeStarted ? new Date(s.timeStarted) : null;
        const end = s.timeEnded ? new Date(s.timeEnded) : null;
        const duration =
          start && end
            ? Math.max(
                0,
                Math.round((end.getTime() - start.getTime()) / 60000)
              )
            : "";
        rows.push([
          subject,
          s.id,
          s.classId || "",
          s.timeStarted || "",
          s.timeEnded || "",
          duration,
          start
            ? start.toLocaleDateString()
            : end
            ? end.toLocaleDateString()
            : "",
        ]);
      });
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `TeacherSessions_${selectedTeacher.teacherId}_${
        selectedSection || "AllSections"
      }.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <AdminLayout title="Attendance">
      {/* Filters only (header removed as requested) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              Select Section
            </label>
            <div className="relative">
              <select
                value={selectedSection}
                onChange={(e) => {
                  setSelectedSection(e.target.value);
                  setSelectedTeacher(null);
                  setTeachersPage(1);
                }}
                className="w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="">-- All Sections --</option>
                {sections.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-0">
                <ChevronDown size={16} />
              </span>
            </div>
          </div>

          {!selectedTeacher && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Search Teacher
              </label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={teacherQuery}
                  onChange={(e) => {
                    setTeacherQuery(e.target.value);
                    setTeachersPage(1);
                  }}
                  placeholder="Search by teacher name or ID..."
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Teachers list */}
      {!selectedTeacher && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">
              {selectedSection ? (
                <>
                  Teachers in section{" "}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {selectedSection}
                  </span>
                </>
              ) : (
                "All Teachers"
              )}
            </h2>
            <div className="text-xs text-gray-600">
              Showing {Math.min((teachersPage - 1) * TEACHERS_PAGE_SIZE + 1, filteredTeachers.length) || 0}
              {" - "}
              {Math.min(teachersPage * TEACHERS_PAGE_SIZE, filteredTeachers.length)} of{" "}
              {filteredTeachers.length}
            </div>
          </div>

          {loadingTeacherSessions && teachersToShow.length === 0 ? (
            <div className="px-5 pb-5">
              <div className="flex items-center gap-2 text-gray-700 text-sm">
                <Loader2 size={16} className="animate-spin" />
                Loading teachers...
              </div>
            </div>
          ) : teachersToShow.length === 0 ? (
            <EmptyTable message="No teachers found." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="text-gray-700">
                      <th className="px-5 py-3 text-left font-medium">Teacher</th>
                      <th className="px-5 py-3 text-left font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachersPageData.map((t, idx) => (
                      <tr
                        key={t.teacherId}
                        className={`${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } hover:bg-indigo-50/60 transition-colors`}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {t.profilePicUrl ? (
                              <img
                                src={t.profilePicUrl}
                                alt={t.name}
                                className="w-9 h-9 rounded-full object-cover ring-1 ring-gray-200 shadow-sm"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center text-xs font-semibold shadow-sm">
                                {getInitials(t.name)}
                              </div>
                            )}
                            <div className="text-gray-900 font-medium">{t.name}</div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => setSelectedTeacher(t)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          >
                            <Eye size={14} />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Teachers Pagination */}
              <div className="px-5 py-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-700 bg-white">
                <div>
                  Showing{" "}
                  {filteredTeachers.length === 0
                    ? 0
                    : Math.min((teachersPage - 1) * TEACHERS_PAGE_SIZE + 1, filteredTeachers.length)}{" "}
                  -{" "}
                  {Math.min(
                    teachersPage * TEACHERS_PAGE_SIZE,
                    filteredTeachers.length
                  )}{" "}
                  of {filteredTeachers.length}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => goToTeachersPage(teachersPage - 1)}
                    disabled={teachersPage <= 1}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalTeacherPages }).map((_, i) => {
                    const p = i + 1;
                    return (
                      <button
                        key={p}
                        onClick={() => goToTeachersPage(p)}
                        className={`px-3 py-1.5 rounded-lg ${
                          p === teachersPage ? "bg-gray-200" : "bg-white hover:bg-gray-100"
                        } border border-gray-200`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => goToTeachersPage(teachersPage + 1)}
                    disabled={teachersPage >= totalTeacherPages}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Teacher Attendance Detail */}
      {selectedTeacher && (
        <TeacherAttendanceDetail
          selectedSection={selectedSection}
          selectedTeacher={selectedTeacher}
          setSelectedTeacher={setSelectedTeacher}
          groupedTeacherSessions={groupedTeacherSessions}
          exportTeacherSessionsCSV={exportTeacherSessionsCSV}
          loadingTeacherSessions={loadingTeacherSessions}
        />
      )}
    </AdminLayout>
  );
}

/* ---------- Subcomponents ---------- */

function TeacherAttendanceDetail({
  selectedSection,
  selectedTeacher,
  setSelectedTeacher,
  groupedTeacherSessions,
  exportTeacherSessionsCSV,
  loadingTeacherSessions,
}) {
  const [open, setOpen] = useState(() => {
    const map = {};
    Object.keys(groupedTeacherSessions).forEach((k) => (map[k] = true));
    return map;
  });

  const allSessions = useMemo(
    () => Object.values(groupedTeacherSessions).flat(),
    [groupedTeacherSessions]
  );

  const lastSessionDate = useMemo(() => {
    if (!allSessions.length) return "-";
    const latest = allSessions
      .map((s) => new Date(s.timeStarted || s.timeEnded || 0).getTime())
      .sort((a, b) => b - a)[0];
    if (!latest || Number.isNaN(latest)) return "-";
    return new Date(latest).toLocaleDateString();
  }, [allSessions]);

  const totalMinutes = useMemo(() => {
    return allSessions.reduce((sum, s) => {
      const start = s.timeStarted ? new Date(s.timeStarted) : null;
      const end = s.timeEnded ? new Date(s.timeEnded) : null;
      if (!start || !end) return sum;
      const mins = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
      return sum + mins;
    }, 0);
  }, [allSessions]);

  return (
    <div className="space-y-5">
      {/* Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedTeacher(null);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-medium"
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <div>
            <h2 className="text-sm md:text-base font-semibold text-gray-900">
              {selectedTeacher.name}
            </h2>
            <div className="text-[11px] text-gray-600 mt-0.5">
              {selectedSection ? (
                <>
                  Viewing sessions in{" "}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Section {selectedSection}
                  </span>
                </>
              ) : (
                "Viewing sessions across all sections"
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-700">
            <Calendar size={14} className="text-indigo-600" />
            Last session: <span className="font-medium">{lastSessionDate}</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-700">
            <Clock size={14} className="text-indigo-600" />
            Total minutes: <span className="font-medium">{totalMinutes}</span>
          </div>
          <button
            onClick={exportTeacherSessionsCSV}
            disabled={Object.keys(groupedTeacherSessions).length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-sm disabled:opacity-50"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Content */}
      {loadingTeacherSessions ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-700 flex items-center gap-2">
          <Loader2 size={18} className="animate-spin text-indigo-600" />
          Loading attendance...
        </div>
      ) : Object.keys(groupedTeacherSessions).length === 0 ? (
        <EmptyTable message="No attendance sessions for this teacher." />
      ) : (
        Object.entries(groupedTeacherSessions).map(([subject, sessions]) => {
          const isOpen = open[subject] ?? true;
          return (
            <div
              key={subject}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
                <button
                onClick={() =>
                    setOpen((p) => ({
                    ...p,
                    [subject]: !isOpen,
                    }))
                }
                className="w-full flex items-center px-5 py-3.5 bg-gradient-to-r from-indigo-50 to-sky-50 hover:from-indigo-100 hover:to-sky-100 transition-colors text-left"
                >
                <span className="text-sm font-semibold text-gray-800">
                    {subject}
                </span>
                </button>

              {/* Table */}
              {isOpen && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr className="text-gray-700">
                        <th className="px-5 py-3 text-left font-medium">Date</th>
                        <th className="px-5 py-3 text-left font-medium">Time In</th>
                        <th className="px-5 py-3 text-left font-medium">
                          Time Out
                        </th>
                        <th className="px-5 py-3 text-left font-medium">
                          Duration (min)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s, idx) => {
                        const start = s.timeStarted ? new Date(s.timeStarted) : null;
                        const end = s.timeEnded ? new Date(s.timeEnded) : null;
                        const duration =
                          start && end
                            ? Math.max(
                                0,
                                Math.round((end.getTime() - start.getTime()) / 60000)
                              )
                            : "";
                        return (
                          <tr
                            key={s.id}
                            className={`${
                              idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                            } hover:bg-indigo-50/60 transition-colors`}
                          >
                            <td className="px-5 py-3 text-gray-900">
                              {start
                                ? start.toLocaleDateString()
                                : end
                                ? end.toLocaleDateString()
                                : "-"}
                            </td>
                            <td className="px-5 py-3 text-gray-900">
                              {start
                                ? start.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "-"}
                            </td>
                            <td className="px-5 py-3 text-gray-900">
                              {end
                                ? end.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "-"}
                            </td>
                            <td className="px-5 py-3 text-gray-900">
                              {duration !== "" ? duration : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function EmptyTable({ message }) {
  return (
    <div className="border-t border-gray-100">
      <div className="px-5 py-10 text-center bg-white">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-500 mb-3 shadow-sm">
          <Calendar size={18} />
        </div>
        <div className="text-sm text-gray-700 font-medium">{message}</div>
        <div className="text-xs text-gray-500 mt-1">
          Try adjusting the section filter or search query.
        </div>
      </div>
    </div>
  );
}

/* ---------- Utils ---------- */

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}