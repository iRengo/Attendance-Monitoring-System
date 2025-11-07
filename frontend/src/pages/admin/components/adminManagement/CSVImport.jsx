import React from "react";

export default function CSVImport({ importing, onFileChange, onImport }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        accept=".csv"
        onChange={onFileChange}
        className="border border-gray-400 rounded px-2 py-1 text-gray-800 bg-gray-100 w-60"
      />
      <button
        onClick={onImport}
        disabled={importing}
        className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 disabled:opacity-50"
      >
        {importing ? "Importing..." : "Import CSV"}
      </button>
    </div>
  );
}