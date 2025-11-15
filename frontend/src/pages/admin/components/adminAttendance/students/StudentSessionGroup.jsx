import React from "react";
import { getStudentStatusForSession } from "../../shared/utils";

/**
 * StudentSessionGroup
 * - Shows three columns: Date | Time In | Status
 * - Time In is taken from per-student entry's timeLogged (preferred) or created_at (fallback).
 * - Date prefer entry.created_at, fallback to session.timeStarted/timeEnded.
 * - Handles many shapes for entries (array of objects, keyed maps, nested raw).
 */
export default function StudentSessionGroup({
  subject,
  sessions,
  studentId,
  isOpen,
  toggle,
  getStatus, // optional override
}) {
  // parse date string that might end with +0800 (insert colon to be safe)
  function parseDateString(s) {
    if (!s || typeof s !== "string") return null;
    // convert +0800 to +08:00 for reliable parsing
    const fixed = s.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
    const d = new Date(fixed);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatTimeValue(value) {
    if (value == null) return null;
    try {
      // Firestore Timestamp-like
      if (typeof value === "object" && typeof value.toDate === "function") {
        const d = value.toDate();
        return isNaN(d.getTime()) ? null : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      // seconds/nanos shape
      if (typeof value === "object" && typeof value.seconds === "number") {
        const ms = value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
        const d = new Date(ms);
        return isNaN(d.getTime()) ? null : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      // number (ms or seconds)
      if (typeof value === "number") {
        const ms = value < 1e11 ? value * 1000 : value;
        const d = new Date(ms);
        return isNaN(d.getTime()) ? null : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      // string (ISO or other)
      if (typeof value === "string") {
        const d = parseDateString(value);
        if (!d) return null;
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
    } catch {
      return null;
    }
    return null;
  }

  // find student's entry in session entries (or nested raw entries)
  function findStudentEntry(session) {
    const arr = session.entries || session.attendance_entries || [];
    if (!Array.isArray(arr)) return null;

    const sid = String(studentId);

    for (const item of arr) {
      if (!item) continue;

      const id = String(
        item.student_id ??
        item.studentId ??
        item.uid ??
        item.id ??
        ""
      ).trim();

      if (id === sid) {
        return {
          student_id: sid,
          status: item.status ?? "absent",
          timeLogged: item.timeLogged ?? item.logged_at ?? null,
          created_at: item.created_at ?? null,
          raw: item,
        };
      }
    }

    return {
      student_id: sid,
      status: "absent",
      timeLogged: null,
      created_at: null
    };
  }


  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center px-5 py-3.5 bg-gradient-to-r from-indigo-50 to-sky-50 hover:from-indigo-100 hover:to-sky-100 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-gray-800">{subject}</span>
      </button>

      {isOpen && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="text-gray-700">
                <th className="px-5 py-3 text-left font-medium">Date</th>
                <th className="px-5 py-3 text-left font-medium">TimeLogged</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, idx) => {
                // session-level fallback date
                const sessionDate = s.timeStarted ? new Date(s.timeStarted) : (s.timeEnded ? new Date(s.timeEnded) : null);

                const entry = findStudentEntry(s);

                // getStatus may return object {status, timeLogged} or string (legacy)
                const statusLabel = entry ? entry.status || "absent" : "absent";


                // Determine student-specific timeLogged:
                // prefer resolved.timeLogged (from util), else entry.timeLogged, else entry.created_at
                let timeLoggedVal = entry ? (entry.timeLogged || entry.created_at || null) : null;

                if (statusLabel.toLowerCase() === "absent") {
                  timeLoggedVal = null;
                }

                // For Date column prefer entry.created_at (if present) else session.timeStarted
                let dateForRow = null;
                if (entry) {
                  const created = entry.created_at ?? entry.createdAt ?? entry.created ?? null;
                  if (created) {
                    const parsed = typeof created === "string" ? parseDateString(created) : (typeof created === "object" && typeof created.toDate === "function" ? created.toDate() : null);
                    if (parsed) dateForRow = parsed;
                  }
                }
                if (!dateForRow && sessionDate) dateForRow = sessionDate;

                const dateDisplay = dateForRow ? dateForRow.toLocaleDateString() : "-";
                const timeInDisplay = formatTimeValue(timeLoggedVal) ?? "-";

                return (
                  <tr
                    key={s.id || `${s.timeStarted}-${idx}`}
                    className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-indigo-50/60 transition-colors`}
                  >
                    <td className="px-5 py-3 text-gray-900">{dateDisplay}</td>
                    <td className="px-5 py-3 text-gray-900">{timeInDisplay}</td>
                    <td className="px-5 py-3 text-gray-900 capitalize">{statusLabel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}