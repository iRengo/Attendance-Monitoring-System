import { FileDown, Filter, Calendar } from "lucide-react";

export default function FiltersBar({
  statusFilter,
  subjectFilter,
  schoolYearFilter,
  subjectOptions = [],       // ← default empty array
  schoolYearOptions = [],    // ← default empty array
  setStatusFilter,
  setSubjectFilter,
  setSchoolYearFilter,
  resetFilters,
  exportCSV,
  exportPDF,
  exporting,
  setPage,
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {/* Status Filter */}
          <div className="flex items-center gap-2 min-w-0">
            <label className="text-xs text-gray-600">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="border border-gray-300 px-2 py-1 rounded-lg text-sm text-gray-600 focus:ring-2 focus:ring-indigo-200 outline-none min-w-0"
            >
              <option value="">All</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
            </select>
          </div>

          {/* Subject Filter */}
          <div className="flex items-center gap-2 min-w-0">
            <label className="text-xs text-gray-600">Subject</label>
            <select
              value={subjectFilter}
              onChange={(e) => { setSubjectFilter(e.target.value); setPage(1); }}
              className="border border-gray-300 px-2 py-1 rounded-lg text-sm text-gray-600 focus:ring-2 focus:ring-indigo-200 outline-none min-w-0 w-40 sm:w-auto"
            >
              <option value="">All</option>
              {subjectOptions.map((subj) => (
                <option key={subj} value={subj}>{subj}</option>
              ))}
            </select>
          </div>

          {/* School Year Filter */}
          <div className="flex items-center gap-2 min-w-0">
            <label className="text-xs text-gray-600 flex items-center gap-1">
              <Calendar size={14} className="text-[#3498db]" /> School Year
            </label>
            <select
  value={schoolYearFilter}
  onChange={(e) => { setSchoolYearFilter(e.target.value); setPage(1); }}
  className="border border-gray-300 px-2 py-1 rounded-lg text-sm text-gray-600 focus:ring-2 focus:ring-indigo-200 outline-none min-w-0 w-40 sm:w-auto"
>
  <option value="">All</option>
  {schoolYearOptions.map((year) => (
    <option key={year} value={year}>
      {year}
    </option>
  ))}
</select>


          </div>

          {/* Reset Filters */}
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-sm text-[#415CA0] border-[#415CA0]/30 hover:bg-[#415CA0]/5 transition"
            title="Reset filters"
          >
            <Filter size={14} /> Clear
          </button>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportPDF}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-2 py-1 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition disabled:opacity-40 text-sm"
          >
            <FileDown size={16} />
            <span className="hidden sm:inline">PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-[#415CA0] text-white hover:bg-[#344c89] transition text-sm"
          >
            <FileDown size={16} />
            <span className="hidden sm:inline">CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
}

