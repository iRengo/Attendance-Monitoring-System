import React from "react";
import { MoreHorizontal } from "lucide-react";

/**
 * Formats a 24-hour "HH:mm" string to "h:mm AM/PM" without touching timezones.
 */
function convert24To12(time24) {
  if (!time24) return "";
  const m = String(time24).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return time24;
  let hh = parseInt(m[1], 10);
  const mm = m[2];
  const ampm = hh >= 12 ? "PM" : "AM";
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour12}:${mm} ${ampm}`;
}

function formatTimeValue(value) {
  if (value == null) return null;

  // If it's already a string
  if (typeof value === "string") {
    const s = value.trim();

    // If it already contains AM/PM, normalize spacing and casing
    if (/[AaPp][Mm]\b/.test(s)) {
      return s.replace(/\s+/g, " ").replace(/([AaPp][Mm])\b/, (m) => m.toUpperCase());
    }

    // If it's "HH:MM" 24-hour format, convert to 12-hour display (no Date objects)
    if (/^\d{1,2}:\d{2}$/.test(s)) {
      return convert24To12(s);
    }

    // Try parsing as a date string — if valid, format to 12-hour using locale with hour12:true
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
    }

    // Unknown string, return as-is
    return s;
  }

  // Firestore Timestamp-like object with toDate()
  if (typeof value === "object") {
    try {
      if (typeof value.toDate === "function") {
        const d = value.toDate();
        if (!Number.isNaN(d.getTime())) {
          return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
        }
      } else if (typeof value.seconds === "number") {
        // plain object { seconds, nanoseconds }
        const ms = value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
        const d = new Date(ms);
        if (!Number.isNaN(d.getTime())) {
          return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
        }
      } else if (typeof value._seconds === "number") {
        const ms = value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1e6);
        const d = new Date(ms);
        if (!Number.isNaN(d.getTime())) {
          return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
        }
      }
    } catch (err) {
      // fallthrough to return null
    }
  }

  // If number (seconds or ms)
  if (typeof value === "number") {
    // Decide if value is seconds or ms
    const maybeMs = value > 1e12 ? value : value < 1e11 ? value * 1000 : value;
    const d = new Date(maybeMs);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
    }
  }

  return null;
}

export default function ClassCard({
  cls,
  studentCount,
  dropdownOpenId,
  setDropdownOpenId,
  handleEditClass,
  handleDeleteClass,
  handleCopyLink,
  setSelectedClass,
}) {
  const start = formatTimeValue(cls?.time_start);
  const end = formatTimeValue(cls?.time_end);

  const displayTime =
    (start && end && `${start} - ${end}`) ||
    (start && !end && start) ||
    (typeof cls?.time === "string" && cls.time.trim()) ||
    "-";

  return (
    <div className="relative bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 p-6">
      <div
        className="rounded-xl px-5 py-3 mb-5 text-white font-semibold text-lg shadow-sm"
        style={{ backgroundColor: "#3498db" }}
      >
        {cls.subjectName} - {cls.roomNumber}
      </div>

      <div className="mb-5 space-y-2">
        <span className="font-medium px-4 py-1.5 rounded-full text-sm shadow-sm inline-block bg-blue-50 text-blue-700">
          {cls.section}
        </span>
        <p className="text-gray-600 text-sm">
          <strong>Grade:</strong> {cls.gradeLevel}
        </p>
        <p className="text-gray-600 text-sm">
          <strong>Day:</strong> {cls.days}
        </p>
        <p className="text-gray-600 text-sm">
          <strong>Time:</strong> {displayTime}
        </p>
        <p className="text-gray-600 text-sm">
          <strong>Students:</strong> {studentCount}
        </p>
      </div>

      <div className="flex justify-between items-center">
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
                onClick={() => handleEditClass(cls)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteClass(cls.id)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500 text-sm"
              >
                Delete
              </button>
              <button
                onClick={() => handleCopyLink(cls.id)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 text-sm"
              >
                Copy Link
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setSelectedClass(cls)}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm transition-all"
          style={{ backgroundColor: "#3498db" }}
        >
          View Student List
        </button>
      </div>
    </div>
  );
}