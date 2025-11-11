import { Calendar } from "lucide-react";

export default function EmptyState({ message }) {
  return (
    <div className="border-t border-gray-100">
      <div className="px-5 py-10 text-center bg-white">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-500 mb-3 shadow-sm">
          <Calendar size={18} />
        </div>
        <div className="text-sm text-gray-700 font-medium">{message}</div>
        <div className="text-xs text-gray-500 mt-1">
          Adjust filters or search query and try again.
        </div>
      </div>
    </div>
  );
}