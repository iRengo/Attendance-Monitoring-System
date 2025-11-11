import { Eye } from "lucide-react";

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function StudentRow({ student, alt, onView }) {
  return (
    <tr
      className={`${
        alt ? "bg-gray-50" : "bg-white"
      } hover:bg-indigo-50/60 transition-colors`}
    >
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          {student.profilePicUrl ? (
            <img
              src={student.profilePicUrl}
              alt={student.name}
              className="w-9 h-9 rounded-full object-cover ring-1 ring-gray-200 shadow-sm"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center text-xs font-semibold shadow-sm">
              {getInitials(student.name)}
            </div>
          )}
          <div className="text-gray-900 font-medium">{student.name}</div>
        </div>
      </td>
      <td className="px-5 py-3 text-gray-900">{student.studentId || "-"}</td>
      <td className="px-5 py-3">
        <button
          onClick={onView}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-sm"
        >
          <Eye size={14} /> View
        </button>
      </td>
    </tr>
  );
}