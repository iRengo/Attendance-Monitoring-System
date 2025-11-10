export function statusClass(status) {
    const s = String(status || "").toLowerCase();
    if (s === "present")
      return "bg-green-100 text-green-700 border border-green-200";
    if (s === "absent")
      return "bg-red-100 text-red-700 border border-red-200";
    if (s === "late") return "bg-yellow-100 text-yellow-700 border border-yellow-200";
    return "bg-gray-100 text-gray-600 border border-gray-200";
  }