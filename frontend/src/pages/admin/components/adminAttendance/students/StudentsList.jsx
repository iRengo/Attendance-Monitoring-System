import StudentRow from "./StudentRow";
import Pagination from "../../shared/Pagination";
import EmptyState from "../../shared/EmptyState";

export default function StudentsList({
  filteredStudents,
  pageData,
  page,
  totalPages,
  setPage,
  setSelectedStudent,
  pageSize,
  totalItems,
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">Students in Section</h2>
        <div className="text-xs text-gray-600">
          Showing {Math.min((page - 1) * pageSize + 1, totalItems) || 0} -{" "}
          {Math.min(page * pageSize, totalItems)} of {totalItems}
        </div>
      </div>
      {filteredStudents.length === 0 ? (
        <EmptyState message="No students found." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="text-gray-700">
                  <th className="px-5 py-3 text-left font-medium">Student</th>
                  <th className="px-5 py-3 text-left font-medium">Student ID</th>
                  <th className="px-5 py-3 text-left font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((s, i) => (
                  <StudentRow
                    key={s.id}
                    student={s}
                    alt={i % 2 === 1}
                    onView={() => setSelectedStudent(s)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            pageSize={pageSize}
            totalItems={totalItems}
          />
        </>
      )}
    </div>
  );
}