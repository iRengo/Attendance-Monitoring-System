import { RefreshCcw, Download } from "lucide-react";

export default function Toolbar({ canRefresh, onRefresh, canExport, onExport }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onRefresh}
        disabled={!canRefresh}
        className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition disabled:opacity-40"
      >
        <RefreshCcw size={16} /> Refresh
      </button>
      <button
        onClick={onExport}
        disabled={!canExport}
        className="flex items-center gap-2 bg-[#3498db] hover:bg-[#2f89ca] disabled:opacity-40 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm transition"
      >
        <Download size={18} /> Export CSV
      </button>
    </div>
  );
}