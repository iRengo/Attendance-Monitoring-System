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
      <div className="space-y-6">
        <HeaderSummary
          studentName={studentName}
          stats={stats}
          filtered={!!statusFilter || !!subjectFilter}
        />

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

        <AttendanceTable
          loading={loading}
          rows={paginatedRows}
        />

        {filteredRows.length > 0 && (
          <PaginationFooter
            paginatedCount={paginatedRows.length}
            totalFiltered={filteredRows.length}
            page={page}
            totalPages={totalPages}
            setPage={setPage}
          />
        )}

        <TipFooter />
      </div>
    </StudentLayout>
  );
}