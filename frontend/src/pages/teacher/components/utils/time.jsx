// Utility time converters (timezone-agnostic)
// - Store and send "HH:mm" (24-hour) strings.
// - Use convertTo12Hour for display only.

export function convertTo12Hour(time24) {
  if (!time24 && time24 !== 0) return "";
  const t = String(time24).trim();
  // Accept "HH:mm" or "H:mm" or "HH:mm:ss"
  const m = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return t;
  const hourNum = parseInt(m[1], 10);
  const minute = m[2];
  if (Number.isNaN(hourNum) || hourNum < 0 || hourNum > 23 || parseInt(minute, 10) > 59) {
    return "";
  }
  const ampm = hourNum >= 12 ? "PM" : "AM";
  const hour12 = hourNum % 12 || 12;
  return `${hour12}:${minute} ${ampm}`;
}

export function convertTo24Hour(time12h) {
  if (!time12h && time12h !== 0) return "";
  const t = String(time12h).trim();

  // If already 24-hour "HH:mm" return normalized
  if (/^\d{1,2}:\d{2}$/.test(t)) {
    const [h, m] = t.split(":");
    return `${String(parseInt(h, 10)).padStart(2, "0")}:${m}`;
  }

  // Match "h:mm AM/PM" (space tolerant)
  const m = t.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (!m) return ""; // unknown format -> return empty (defensive)
  let [, hh, mm, ap] = m;
  let h = parseInt(hh, 10);
  const isPM = ap.toLowerCase() === "pm";
  if (isPM && h < 12) h += 12;
  if (!isPM && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${mm}`;
}