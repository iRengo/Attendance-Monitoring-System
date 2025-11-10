import { BookOpen } from "lucide-react";

export default function TipFooter() {
  return (
    <div className="text-xs text-gray-500 flex items-center gap-2 mt-2">
      <BookOpen size={14} className="text-indigo-500" />
      Tip: Use the filters to focus on a specific subject or status. Exports respect your current filters.
    </div>
  );
}