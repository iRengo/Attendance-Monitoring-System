import StudentLayout from "../../components/studentLayout";
import useStudentAttendanceData from "./components/studentAttendance/hooks/useStudentAttendanceData";
import HeaderSummary from "./components/studentAttendance/HeaderSummary";
import FiltersBar from "./components/studentAttendance/FiltersBar";
import AttendanceTable from "./components/studentAttendance/AttendanceTable";
import PaginationFooter from "./components/studentAttendance/PaginationFooter";
import TipFooter from "./components/studentAttendance/TipFooter";

export default function StudentAttendance() {
  const {
    studentName,
    loading,
    stats,
    subjectOptions,
    paginatedRows,
    filteredRows,
    totalPages,
    page,
    statusFilter,
    subjectFilter,
    setStatusFilter,
    setSubjectFilter,
    setPage,
    resetFilters,
    exportCSV,
    exportPDF,
    exporting,
  } = useStudentAttendanceData(10);

  return (
    <StudentLayout title="Attendance">
      {/*
        - Use negative horizontal margins to cancel parent padding (so content reaches left edge on mobile).
        - Inner padding is kept small (px-2 / sm:px-4) to make the UI tight but still comfortable.
        - The table is placed inside an overflow-x-auto wrapper (handled in AttendanceTable) so long content won't push the entire page.
      */}
      <div className="-mx-4 sm:-mx-6">
        <div className="px-2 sm:px-4 w-full max-w-full overflow-x-hidden">
          <div className="space-y-5 max-w-full">
            <div className="min-w-0">
              <HeaderSummary
                studentName={studentName}
                stats={stats}
                filtered={!!statusFilter || !!subjectFilter}
              />
            </div>

            <div className="min-w-0">
              <FiltersBar
                statusFilter={statusFilter}
                subjectFilter={subjectFilter}
                subjectOptions={subjectOptions}
                setStatusFilter={setStatusFilter}
                setSubjectFilter={setSubjectFilter}
                resetFilters={resetFilters}
                exportCSV={exportCSV}
                exportPDF={exportPDF}
                exporting={exporting}
                setPage={setPage}
              />
            </div>

            <div className="min-w-0">
              <AttendanceTable loading={loading} rows={paginatedRows} />
            </div>

            {filteredRows.length > 0 && (
              <div className="min-w-0">
                <PaginationFooter
                  paginatedCount={paginatedRows.length}
                  totalFiltered={filteredRows.length}
                  page={page}
                  totalPages={totalPages}
                  setPage={setPage}
                />
              </div>
            )}

            <div className="min-w-0">
              <TipFooter />
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}