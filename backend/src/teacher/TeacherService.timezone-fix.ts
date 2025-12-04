import { DateTime } from "luxon";
import { Timestamp } from "firebase-admin/firestore";

export function parseTimeToTimestampZone(
  timeStr?: string,
  dateStr?: string,
  zone = process.env.SCHOOL_TIMEZONE ?? "Asia/Manila"
): Timestamp | null {
  if (!timeStr) return null;

  const anchorDate = dateStr ?? DateTime.now().setZone(zone).toFormat("yyyy-MM-dd");

  // Try multiple time formats
  const formats = ["H:mm", "HH:mm", "h:mm a", "hh:mm a"];
  let dt: DateTime | null = null;

  for (const fmt of formats) {
    const parsed = DateTime.fromFormat(`${anchorDate} ${timeStr}`, `yyyy-MM-dd ${fmt}`, { zone });
    if (parsed.isValid) {
      dt = parsed;
      break;
    }
  }

  // Fallback to ISO if plain time formats fail
  if (!dt || !dt.isValid) {
    const maybeTime = DateTime.fromISO(timeStr, { zone });
    if (maybeTime.isValid) {
      const [year, month, day] = anchorDate.split("-").map(Number);
      dt = DateTime.fromObject(
        {
          year,
          month,
          day,
          hour: maybeTime.hour,
          minute: maybeTime.minute,
        },
        { zone }
      );
    }
  }

  if (!dt || !dt.isValid) return null;

  // ✅ Store the time directly without converting to UTC
  return Timestamp.fromDate(dt.toJSDate());
}

export function buildClassDocWithZone(
  data: any,
  zone = process.env.SCHOOL_TIMEZONE ?? "Asia/Manila"
) {
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
