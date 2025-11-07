import React from "react";

export default function FiltersSearch({ filter, setFilter, search, setSearch }) {
  return (
    <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
      <div className="flex gap-2">
        {["all", "student", "teacher"].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-4 py-1 rounded ${
              filter === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border border-gray-300 rounded px-3 py-1 text-gray-800"
      />
    </div>
  );
}