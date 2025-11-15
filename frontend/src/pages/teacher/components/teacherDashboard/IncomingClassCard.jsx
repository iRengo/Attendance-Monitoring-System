import { Calendar } from "lucide-react";

// Accept Firestore Timestamp (.toDate()), Date, or ISO/other date string
function toDateFromPossible(val) {
  if (!val) return null;
  if (typeof val === "object" && typeof val.toDate === "function") return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// Format Date -> compact like "12pm" or "12:30pm"
function formatCompactTime(date) {
  if (!(date instanceof Date)) return "";
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  const minutePart = minutes ? `:${String(minutes).padStart(2, "0")}` : "";
  const ampm = hours >= 12 ? "pm" : "am";
  return `${h12}${minutePart}${ampm}`;
}

// Convert legacy strings like "8:00 AM" or "08:00 AM" -> "8am" or "8:30am"
function compactFromTimeString(timeStr) {
  if (!timeStr) return "";
  // try to parse segments like "8:00 AM", "8 AM", "08:30AM"
  const cleaned = timeStr.trim().replace(/\s+/g, " ");
  // split into parts; handle formats like "8:00 AM" or "8 AM" or "08:30AM"
  const m = cleaned.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/);
  if (!m) return timeStr.toLowerCase();
  let hour = Number(m[1]);
  const minute = Number(m[2] || 0);
  const meridian = (m[3] || "").toLowerCase();

  // If meridian not present, assume 24h and convert accordingly (best-effort)
  if (!meridian) {
    if (hour >= 0 && hour <= 23) {
      // treat as 24-hour
      const date = new Date();
      date.setHours(hour, minute, 0, 0);
      return formatCompactTime(date);
    }
    return timeStr.toLowerCase();
  }

  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const minutePart = minute ? `:${String(minute).padStart(2, "0")}` : "";
  return `${h12}${minutePart}${meridian.toLowerCase()}`;
}

export default function IncomingClassCard({ incomingClass }) {
  if (!incomingClass) {
    return (
      <div className="md:w-96 bg-white border rounded-xl shadow-md p-5 flex flex-col justify-center items-center hover:shadow-lg transition text-center">
        <Calendar size={40} className="text-amber-500 mb-3" />
        <h2 className="text-sm font-medium text-gray-700">Incoming Class</h2>
        <p className="text-sm text-gray-500 mt-2">No upcoming classes</p>
      </div>
    );
  }

  // Determine time display:
  // 1) If incomingClass.time is already a compact string, use it.
  // 2) Else try to format time_start/time_end (Timestamp, Date, or ISO string).
  // 3) Else try to compact legacy incomingClass.time (e.g. "12:00 PM - 2:00 PM").
  let timeDisplay = "";

  if (typeof incomingClass.time === "string" && incomingClass.time.trim()) {
    // If it already looks compact (no date text like "GMT" or long date), use it; otherwise compact parts
    const t = incomingClass.time.trim();
    // crude check: if contains "GMT" or a weekday or a full date string -> don't use raw t
    const hasLongDate = /\bGMT\b|[A-Za-z]{3,}\s+\d{1,2}\s+\d{4}|:\d{2}:\d{2}/.test(t);
    if (!hasLongDate && t.length <= 20) {
      timeDisplay = t;
    } else {
      // attempt to split "start - end" and compact each side
      const parts = t.split("-").map((s) => s.trim());
      if (parts.length === 2) {
        timeDisplay = `${compactFromTimeString(parts[0])} - ${compactFromTimeString(parts[1])}`;
      } else {
        // fallback: use compactFromTimeString on entire string
        timeDisplay = compactFromTimeString(t);
      }
    }
  }

  if (!timeDisplay) {
    const s = toDateFromPossible(incomingClass.time_start || incomingClass.timeStart || incomingClass.time_start_date);
    const e = toDateFromPossible(incomingClass.time_end || incomingClass.timeEnd || incomingClass.time_end_date);
    if (s && e) {
      timeDisplay = `${formatCompactTime(s)} - ${formatCompactTime(e)}`;
    }
  }

  // final fallback: if still empty, use any raw incomingClass.time or an empty string
  if (!timeDisplay && incomingClass.time) timeDisplay = String(incomingClass.time);

  return (
    <div className="md:w-96 bg-white border rounded-xl shadow-md p-5 flex flex-col justify-center items-center hover:shadow-lg transition text-center">
      <Calendar size={40} className="text-amber-500 mb-3" />
      <h2 className="text-sm font-medium text-gray-700">Incoming Class</h2>

      <p className="text-lg font-bold mt-1 text-gray-900">{incomingClass.subjectName}</p>
      <p className="mt-1 text-sm text-gray-600">
        {incomingClass.dayLabel} • {timeDisplay}
      </p>
      {incomingClass.roomNumber && (
        <p className="mt-1 text-xs text-gray-500">
          Room {incomingClass.roomNumber} • {incomingClass.section}
        </p>
      )}
    </div>
  );
}