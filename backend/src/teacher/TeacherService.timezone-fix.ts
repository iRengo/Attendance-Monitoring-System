import { DateTime } from "luxon";
import { Timestamp } from "firebase-admin/firestore";

/** Parse a time string into a Firestore Timestamp anchored to a specific timezone.
 *  Accepts "HH:mm" or "h:mm AM/PM" or ISO datetimes. Defaults to Asia/Manila.
 */
export function parseTimeToTimestampZone(
  timeStr?: string,
  dateStr?: string,
  zone = process.env.SCHOOL_TIMEZONE ?? "Asia/Manila"
): Timestamp | null {
  if (!timeStr || typeof timeStr !== "string") return null;

  const anchorDate = dateStr ?? DateTime.now().setZone(zone).toFormat("yyyy-MM-dd");

  // Parse "HH:mm" or "h:mm a" explicitly in the target zone
  let dt = DateTime.fromFormat(`${anchorDate} ${timeStr}`, "yyyy-MM-dd H:mm", { zone });
  if (!dt.isValid) {
    dt = DateTime.fromFormat(`${anchorDate} ${timeStr}`, "yyyy-MM-dd h:mm a", { zone });
  }

  // Fallback: ISO time
  if (!dt.isValid) {
    const maybeTime = DateTime.fromISO(timeStr, { zone });
    if (maybeTime.isValid) {
      dt = DateTime.fromObject(
        {
          year: Number(anchorDate.slice(0, 4)),
          month: Number(anchorDate.slice(5, 7)),
          day: Number(anchorDate.slice(8, 10)),
          hour: maybeTime.hour,
          minute: maybeTime.minute,
        },
        { zone }
      );
    }
  }

  if (!dt.isValid) return null;

  // Make sure the JS Date we pass to Firestore is in **UTC**
  return Timestamp.fromDate(dt.toUTC().toJSDate());
}

export function buildClassDocWithZone(data: any, zone = process.env.SCHOOL_TIMEZONE ?? "Asia/Manila") {
  const subjectName = (data.subjectName ?? data.subject ?? "").trim();
  const section = (data.section ?? "").trim();
  const gradeLevel = (data.gradeLevel ?? "").toString().trim();
  const days = (data.days ?? "").trim();

  const time_start_raw = (data.time_start ?? "").trim();
  const time_end_raw = (data.time_end ?? "").trim();

  const time_start_ts = parseTimeToTimestampZone(time_start_raw, undefined, zone);
  const time_end_ts = parseTimeToTimestampZone(time_end_raw, undefined, zone);

  const computedName = `${subjectName} ${section}-${gradeLevel}`.trim();
  const nowIso = new Date().toISOString();

  return {
    name: computedName,
    subjectName,
    teacherId: data.teacherId,
    roomNumber: (data.roomNumber || data.roomId || "").trim(),
    section,
    gradeLevel,
    days,
    time_start: time_start_ts ?? null,
    time_end: time_end_ts ?? null,
    createdAt: data.createdAt ?? nowIso,
    updatedAt: nowIso,
  };
}