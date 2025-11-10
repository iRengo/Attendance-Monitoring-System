export const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function normalizeArrayOrNumericMap(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") {
    return Object.keys(value)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => value[k]);
  }
  return [];
}

export function normalizeItem(it) {
  if (!it || typeof it !== "object") return null;
  const subjectName = it.Subject ?? it.subjectName ?? it.subject ?? it.section ?? "N/A";
  const days = it.days ?? it.Days ?? it.day ?? it.Day ?? "N/A";
  const time = it.time ?? it.Time ?? "N/A";
  const roomNumber = it.roomNumber ?? it.room ?? it.Room ?? "N/A";
  const teacherName = it.Teacher ?? it.teacherName ?? it.teacher ?? null;
  const teacherId = it.teacherId ?? null;
  return { subjectName, days, time, roomNumber, teacherName, teacherId };
}

export function sortByDay(a, b) {
  const ai = DAY_ORDER.indexOf(a.days);
  const bi = DAY_ORDER.indexOf(b.days);
  if (ai === -1 && bi === -1) return 0;
  if (ai === -1) return 1;
  if (bi === -1) return -1;
  return ai - bi;
}

export function buildSectionKey(gradeLevelRaw, sectionRaw) {
  const gl = String(gradeLevelRaw ?? "").trim();
  const sec = String(sectionRaw ?? "").trim();
  if (gl && sec) return `${gl}-${sec}`;
  return gl || sec || "";
}