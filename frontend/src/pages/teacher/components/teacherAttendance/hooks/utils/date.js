// Utility: normalize ISO strings that end with +0800 (no colon) and parse
export function parseDate(str) {
    if (!str || typeof str !== "string") return null;
    let normalized = str;
    const offsetMatch = /([+-]\d{2})(\d{2})$/.exec(str);
    if (offsetMatch) {
      normalized = str.replace(/([+-]\d{2})(\d{2})$/, (_, h, m) => `${h}:${m}`);
    }
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
  }
  
  export function formatDateTime(str) {
    const d = parseDate(str);
    return d ? d.toLocaleString() : "—";
  }
  
  export function toDateKeyAndLabel(str) {
    const d = parseDate(str);
    if (!d) return { key: "unknown", label: "Unknown date" };
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    const key = `${y}-${m}-${day}`;
    const label = d.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    return { key, label };
  }