export default function Pagination({ page, totalPages, setPage, pageSize, totalItems }) {
    return (
      <div className="px-5 py-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-700 bg-white">
        <div>
          Showing{" "}
          {totalItems === 0 ? 0 : Math.min((page - 1) * pageSize + 1, totalItems)} -{" "}
          {Math.min(page * pageSize, totalItems)} of {totalItems}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
          >
            Prev
          </button>
          {Array.from({ length: totalPages }).map((_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1.5 rounded-lg ${
                  p === page ? "bg-gray-200" : "bg-white hover:bg-gray-100"
                } border border-gray-200`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    );
  }