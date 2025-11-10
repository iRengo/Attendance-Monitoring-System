import { FileDown, Filter } from "lucide-react";

export default function FiltersBar({
  statusFilter,
  subjectFilter,
  subjectOptions,
  setStatusFilter,
  setSubjectFilter,
  resetFilters,
  exportCSV,
  exportPDF,
  exporting,
  setPage,
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 md:p-5">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div className="flex flex-wrap text-gray-600 gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 px-3 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
            >
              <option value="">All</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Subject</label>
            <select
              value={subjectFilter}
              onChange={(e) => {
                setSubjectFilter(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 px-3 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none min-w-[160px]"
            >
              <option value="">All</option>
              {subjectOptions.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm text-[#415CA0] border-[#415CA0]/30 hover:bg-[#415CA0]/5 transition"
            title="Reset filters"
          >
            <Filter size={14} /> Clear
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportPDF}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition disabled:opacity-40"
          >
            <FileDown size={16} />
            PDF
          </button>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#415CA0] text-white hover:bg-[#344c89] transition"
          >
            <FileDown size={16} />
            CSV
          </button>
        </div>
      </div>
    </div>
  );
}