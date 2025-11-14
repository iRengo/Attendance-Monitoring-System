import React, { useState } from "react";
import StudentPostsList from "../StudentPostsList";
import PreviewModal from "../PreviewModal";

/**
 * ClassDetail
 * Updated to format and display time_start / time_end (supports Firestore Timestamp-like values,
 * numeric seconds/ms, or legacy string/formats). Falls back to legacy selectedClass.time when needed.
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
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
  }

  // If it's a number (ms or seconds), try to interpret intelligently
  if (typeof value === "number") {
    // if looks like seconds (10 digits) convert to ms; >1e12 likely already ms
    const maybeMs = value > 1e12 ? value : value < 1e11 ? value * 1000 : value;
    const date = new Date(maybeMs);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
  }

  return null;
}

export default function ClassDetail({ selectedClass, posts, teachers, onBack }) {
  const [preview, setPreview] = useState(null);

  const start = formatTimeValue(selectedClass?.time_start);
  const end = formatTimeValue(selectedClass?.time_end);

  const displayTime =
    (start && end && `${start} - ${end}`) ||
    (start && !end && start) ||
    selectedClass.time ||
    "-";

  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#3498db]">
            {selectedClass.subjectName} - {selectedClass.section}
          </h1>
          <p className="text-gray-500 text-sm">
            {selectedClass.days} | {displayTime} | {selectedClass.roomNumber}
          </p>
          <p className="text-gray-600 text-sm">
            <strong>Grade Level:</strong>{" "}
            {selectedClass.gradeLevel || "N/A"}
          </p>
          <p className="text-gray-600 text-sm">
            <strong>Teacher:</strong>{" "}
            {teachers[selectedClass.teacherId] || "Loading..."}
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-5 py-2 bg-gray-200 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-300 transition"
        >
          Back to Classes
        </button>
      </div>

      {posts.length > 0 ? (
        <div className="space-y-5">
          <StudentPostsList posts={posts} setPreview={setPreview} />
        </div>
      ) : (
        <p className="text-gray-400 text-center">No posts yet.</p>
      )}

      <PreviewModal preview={preview} setPreview={setPreview} />
    </div>
  );
}