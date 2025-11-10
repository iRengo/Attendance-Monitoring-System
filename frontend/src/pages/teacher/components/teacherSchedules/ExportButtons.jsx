import { FileDown, RefreshCcw } from "lucide-react";

/**
 * ExportButtons
 * Props:
 *  - disabledForClass: boolean (if this set of buttons is NOT for the selected class)
 *  - hasSessions: boolean
 *  - onExportCSV: () => void
 *  - onExportPDF: () => void
 *  - onRefresh: () => void
 */
export default function ExportButtons({
  disabledForClass,
  hasSessions,
  onExportCSV,
  onExportPDF,
  onRefresh,
}) {
  const disableExport = disabledForClass || !hasSessions;

  return (
    <div className="flex gap-2">
      <button
        onClick={onExportPDF}
        disabled={disableExport}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 text-xs font-medium hover:bg-indigo-50 disabled:opacity-40"
        title="Export PDF for this class"
      >
        <FileDown size={14} /> PDF
      </button>
      <button
        onClick={onExportCSV}
        disabled={disableExport}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-40"
        title="Export CSV for this class"
      >
        <FileDown size={14} /> CSV
      </button>
      <button
        onClick={onRefresh}
        disabled={disabledForClass}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-100 disabled:opacity-40"
        title="Refresh"
      >
        <RefreshCcw size={14} />
      </button>
    </div>
  );
}