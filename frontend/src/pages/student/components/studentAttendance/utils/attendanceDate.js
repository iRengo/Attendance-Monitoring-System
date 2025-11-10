// Date/time helpers for attendance feature

export function parseAttendanceDate(dateStr) {
    if (!dateStr) return null;
    let normalized = dateStr;
    const offsetMatch = /([+-]\d{2})(\d{2})$/.exec(dateStr);
    if (offsetMatch) {
      normalized = dateStr.replace(/([+-]\d{2})(\d{2})$/, (_, h, m) => `${h}:${m}`);
    }
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
  }
  
  export function formatDate(d) {
    if (!d) return "—";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  }
  
  export function formatTime(d) {
    if (!d) return "—";
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }