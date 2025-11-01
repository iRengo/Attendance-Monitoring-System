/**
 * Utility: convert 24-hour "HH:MM" string to "h:MM AM/PM"
 */
export function convertTo12Hour(time24) {
    if (!time24) return "";
    const [hour, minute] = time24.split(":");
    const hourNum = parseInt(hour, 10);
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  }