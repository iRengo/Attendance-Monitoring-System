import { FileDown } from "lucide-react";

export default function DownloadScheduleButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
    >
      <FileDown size={16} /> Download PDF
    </button>
  );
}