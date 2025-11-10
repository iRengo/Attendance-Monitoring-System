// Build class label using section + subjectName (fallbacks if missing)
export function getClassLabel(cls) {
    const section = (cls.section || "").trim();
    const subject = (cls.subjectName || cls.name || "").trim();
    if (section && subject) return `${section} • ${subject}`;
    return section || subject || cls.id;
  }