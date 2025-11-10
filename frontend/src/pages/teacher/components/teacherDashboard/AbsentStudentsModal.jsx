import { X } from "lucide-react";

export default function AbsentStudentsModal({ open, dayLabel, loading, students, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-5 relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Absent Students ({dayLabel})
        </h3>

        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : !students || students.length === 0 ? (
          <p className="text-sm text-gray-500">No absent students recorded for {dayLabel}.</p>
        ) : (
          <ul className="space-y-1 max-h-64 overflow-y-auto text-sm">
            {students.map((s) => (
              <li
                key={s.studentId}
                className="px-3 py-2 rounded border flex justify-between items-center"
              >
                <span className="font-medium text-gray-700">{s.name}</span>
                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {s.section ? `Section ${s.section}` : "Section N/A"}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}