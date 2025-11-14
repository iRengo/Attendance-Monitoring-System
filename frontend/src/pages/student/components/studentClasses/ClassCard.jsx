import React from "react";
import { MoreHorizontal } from "lucide-react";

/**
 * ClassCard
 * Updated to display time_start / time_end (supports Firestore Timestamp, legacy string or numeric millis).
 */
function formatTimeValue(value) {
  if (value == null) return null;

  // If it's already a string like "HH:MM" — return as-is
  if (typeof value === "string") {
    const s = value.trim();
    if (/^\d{1,2}:\d{2}$/.test(s)) return s;
    // Try parsing ISO/date string as fallback
    const tryDate = new Date(s);
    if (!Number.isNaN(tryDate.getTime())) {
      return tryDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    return s;
  }

  // If it's a Firestore Timestamp-like (has toDate)
  if (typeof value === "object") {
    let date = null;
    if (typeof value.toDate === "function") {
      try {
        date = value.toDate();
      } catch (e) {
        date = null;
      }
    } else if (typeof value.seconds === "number") {
      // plain object shape { seconds, nanoseconds }
      date = new Date(value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6));
    } else if (typeof value._seconds === "number") {
      // possible alternative field names
      date = new Date(value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1e6));
    }

    if (date && !Number.isNaN(date.getTime())) {
      // Format to human friendly time (e.g. "2:05 PM")
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
  }

  // If it's a number (ms or seconds), try to interpret intelligently
  if (typeof value === "number") {
    // if looks like seconds (10 digits) convert to ms
    const maybeMs = value > 1e12 ? value : value < 1e11 ? value * 1000 : value;
    const date = new Date(maybeMs);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
  }

  return null;
}

export default function ClassCard({
  cls,
  teachers,
  gradeLevel,
  dropdownOpenId,
  setDropdownOpenId,
  onView,
  onRequestLeave,
}) {
  // Attempt to parse/format timestamps (Firestore Timestamp or similar),
  // fall back to the legacy string `cls.time`, and finally to "-".
  const start = formatTimeValue(cls?.time_start);
  const end = formatTimeValue(cls?.time_end);

  const displayTime =
    (start && end && `${start} - ${end}`) ||
    (start && !end && start) ||
    cls.time ||
    "-";

  return (
    <div className="relative bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 p-6">
      <div
        className="rounded-xl px-5 py-3 mb-2 text-white font-semibold text-lg shadow-sm"
        style={{ backgroundColor: "#3498db" }}
      >
        {cls.subjectName} - {cls.roomNumber}
      </div>

      <div className="mb-3 space-y-1">
        <span
          className="font-medium px-4 py-1.5 rounded-full text-sm shadow-sm inline-block"
          style={{ backgroundColor: "#eaf4fc", color: "#2176b8" }}
        >
          {cls.section}
        </span>
        <p className="text-gray-600 text-sm">
          <strong>Grade Level:</strong> {cls.gradeLevel || gradeLevel || "N/A"}
        </p>
        <p className="text-gray-600 text-sm">
          <strong>Day:</strong> {cls.days}
        </p>
        <p className="text-gray-600 text-sm">
          <strong>Time:</strong> {displayTime}
        </p>
        <p className="text-gray-600 text-sm">
          <strong>Teacher:</strong> {teachers[cls.teacherId] || "Loading..."}
        </p>
      </div>

      <div className="flex justify-between items-center relative">
        <div className="relative">
          <button
            onClick={() =>
              setDropdownOpenId((prev) => (prev === cls.id ? null : cls.id))
            }
            className="p-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 transition-all duration-200"
          >
            <MoreHorizontal
              size={18}
              className="text-gray-600 hover:text-[#3498db] transition-colors duration-200"
            />
          </button>

          {dropdownOpenId === cls.id && (
            <div className="absolute top-10 left-0 bg-white border border-gray-200 shadow-lg rounded-lg w-40 z-50">
              <button
                onClick={onRequestLeave}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 text-sm"
              >
                Leave Class
              </button>
            </div>
          )}
        </div>

        <button
          onClick={onView}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm transition-all"
          style={{ backgroundColor: "#3498db" }}
        >
          View Class
        </button>
      </div>
    </div>
  );
}