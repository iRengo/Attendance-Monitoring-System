import React from "react";
import { MoreHorizontal } from "lucide-react";

/**
 * ------------------------------------------------------------
 * CLASS CARD COMPONENT
 * Improved UI / Styling
 * ------------------------------------------------------------
 */

/* 🔵 Time Formatting Utility */
function formatTimeValue(value) {
  if (value == null) return null;

  if (typeof value === "string") {
    const s = value.trim();
    if (/^\d{1,2}:\d{2}$/.test(s)) return s;
    const tryDate = new Date(s);
    if (!Number.isNaN(tryDate.getTime())) {
      return tryDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    return s;
  }

  if (typeof value === "object") {
    let date = null;
    if (typeof value.toDate === "function") {
      try {
        date = value.toDate();
      } catch {
        date = null;
      }
    } else if (typeof value.seconds === "number") {
      date = new Date(value.seconds * 1000);
    }
    if (date && !Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
  }

  if (typeof value === "number") {
    const maybeMs = value > 1e12 ? value : value * 1000;
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
  onRequestLeave,
}) {
  const start = formatTimeValue(cls?.time_start);
  const end = formatTimeValue(cls?.time_end);

  const displayTime =
    (start && end && `${start} - ${end}`) ||
    (start && !end && start) ||
    cls.time ||
    "-";

  return (
    <div
      className="
        relative bg-white rounded-3xl border border-gray-100
        shadow-[0_2px_10px_rgba(0,0,0,0.05)]
        hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)]
        transition-all duration-300 p-6
      "
    >
      {/* HEADER */}
      <div
        className="
          rounded-xl px-5 py-3 mb-4 text-white font-semibold text-[1.1rem]
          shadow-md tracking-wide
        "
        style={{ backgroundColor: "#3498db" }}
      >
        {cls.subjectName} — {cls.roomNumber}
      </div>

      {/* DETAILS */}
      <div className="mb-4 space-y-2">
        <span
          className="
            inline-block px-4 py-1.5 rounded-full text-sm font-medium
            shadow-sm
          "
          style={{
            backgroundColor: "#eaf4fc",
            color: "#2176b8",
          }}
        >
          {cls.section}
        </span>

        <p className="text-gray-600 text-sm">
          <strong className="text-gray-800">Grade Level: </strong>
          {cls.gradeLevel || gradeLevel || "N/A"}
        </p>

        <p className="text-gray-600 text-sm">
          <strong className="text-gray-800">Day: </strong>
          {cls.days}
        </p>

        <p className="text-gray-600 text-sm">
          <strong className="text-gray-800">Time: </strong>
          {displayTime}
        </p>

        <p className="text-gray-600 text-sm">
          <strong className="text-gray-800">Teacher: </strong>
          {teachers[cls.teacherId] || "Loading..."}
        </p>
      </div>

      {/* ACTION MENU */}
      <div className="flex justify-end relative">
        <button
          onClick={() =>
            setDropdownOpenId((prev) => (prev === cls.id ? null : cls.id))
          }
          className="
            p-2 bg-gray-50 border border-gray-200 rounded-xl
            hover:bg-blue-50 transition-all duration-200
          "
        >
          <MoreHorizontal
            size={18}
            className="text-gray-600 hover:text-[#3498db] transition-colors"
          />
        </button>

        {/* DROPDOWN */}
        {dropdownOpenId === cls.id && (
          <div
            className="
              absolute top-11 right-0 w-40 bg-white rounded-xl
              border border-gray-200 shadow-lg overflow-hidden z-50
            "
          >
            <button
              onClick={onRequestLeave}
              className="
                w-full text-left px-4 py-2 text-sm text-gray-700
                hover:bg-gray-100 transition-colors
              "
            >
              Leave Class
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
