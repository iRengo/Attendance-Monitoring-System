import { ChevronLeft, ChevronRight } from "lucide-react";

export default function PaginationFooter({
  paginatedCount,
  totalFiltered,
  page,
  totalPages,
  setPage,
}) {
  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 text-sm px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
      <p className="text-[#415CA0]">
        Showing {paginatedCount} of {totalFiltered} record
        {totalFiltered === 1 ? "" : "s"}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-[#415CA0] disabled:opacity-40 hover:bg-white transition"
        >
          <ChevronLeft size={16} />
          Previous
        </button>
        <span className="px-2 py-1 text-[#415CA0]">
          Page <span className="font-semibold">{page}</span> / {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-[#415CA0] disabled:opacity-40 hover:bg-white transition"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}