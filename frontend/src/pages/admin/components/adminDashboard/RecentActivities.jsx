import { useMemo, useState } from "react";

export default function RecentActivities({ activities }) {
  const itemsPerPage = 5;
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((activities?.length || 0) / itemsPerPage)),
    [activities]
  );

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return (activities || []).slice(start, start + itemsPerPage);
  }, [activities, currentPage]);

  const formatDate = (d) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleString();
    } catch {
      return "";
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent Activities</h2>

      {!activities?.length ? (
        <p className="text-gray-500 text-sm">No recent activities yet.</p>
      ) : (
        <>
          <ul className="divide-y divide-gray-100">
            {pageItems.map((item) => (
              <li key={item.id} className="py-2 flex justify-between items-center text-sm">
                <span className="text-gray-700">
                  {item.action}
                  {item.details ? `: ${item.details}` : ""}
                </span>
                <span className="text-gray-400 text-xs">
                  {item.parsedDate ? formatDate(item.parsedDate) : ""}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex justify-center items-center gap-2 mt-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className={`text-sm px-2 py-1 rounded transition ${
                currentPage === 1
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:text-blue-600"
              }`}
            >
              Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`text-sm px-2 py-1 rounded transition ${
                  currentPage === i + 1
                    ? "bg-blue-500 text-white"
                    : "text-gray-700 hover:text-blue-600"
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`text-sm px-2 py-1 rounded transition ${
                currentPage === totalPages
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:text-blue-600"
              }`}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}