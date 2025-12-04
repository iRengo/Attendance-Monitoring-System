import { DateTime } from "luxon";
import { Timestamp } from "firebase-admin/firestore";

/**
 * Timezone-aware helpers for TeacherService.
 *
 * Usage:
 * 1) npm install luxon
 * 2) Put this file next to your teacher.service.ts (or in a shared utils folder).
 * 3) In teacher.service.ts import:
 *      import { parseTimeToTimestampZone, buildClassDocWithZone } from './TeacherService.timezone-fix';
 *    Then use parseTimeToTimestampZone when converting incoming time strings to Firestore Timestamps,
 *    or call buildClassDocWithZone(data, zone) instead of the previous buildClassDoc.
 *
 * Notes:
 * - Default zone is "Asia/Manila". You can override by passing a different zone or by setting
 *   process.env.SCHOOL_TIMEZONE and passing it through from your service constructor.
 * - If you prefer to keep storing only "HH:mm" strings (recommended), skip timestamp conversion
 *   and store the string instead. This helper is for the case you need absolute instants.
 */

/** Parse a time string into a Firestore Timestamp anchored to a specific timezone.
 *  - timeStr: accepts "HH:mm" (24h) or "h:mm AM/PM" (12h) (also tries some ISO parsing)
 *  - dateStr: optional "YYYY-MM-DD" to anchor the time to a specific date; if omitted uses "today" in the zone.
 *  - zone: IANA timezone string (default "Asia/Manila")
 *
 *  Returns firebase-admin Timestamp or null on failure.
 */
export function parseTimeToTimestampZone(
  timeStr?: string,
  dateStr?: string,
  zone = process.env.SCHOOL_TIMEZONE ?? "Asia/Manila"
): Timestamp | null {
  if (!timeStr || typeof timeStr !== "string") return null;

  const anchorDate = dateStr ?? DateTime.now().setZone(zone).toFormat("yyyy-MM-dd");

  // Try common formats: "H:mm" (24h) then "h:mm a" (12h)
  let dt = DateTime.fromFormat(`${anchorDate} ${timeStr}`, "yyyy-MM-dd H:mm", { zone });
  if (!dt.isValid) {
    dt = DateTime.fromFormat(`${anchorDate} ${timeStr}`, "yyyy-MM-dd h:mm a", { zone });
  }

  // Fallback: try parsing the time portion or an ISO string
  if (!dt.isValid) {
    const maybeTime = DateTime.fromISO(timeStr, { zone });
    if (maybeTime.isValid) {
      // If timeStr is a time-only ISO (rare), anchor to anchorDate with its hour/minute
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
  return Timestamp.fromDate(dt.toJSDate());
}

/**
 * Build a class document object similar to your existing buildClassDoc,
 * but producing time_start/time_end as Timestamps anchored to the provided zone.
 *
 * If you prefer storing the schedule as "HH:mm", don't use this—store strings instead.
 */
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