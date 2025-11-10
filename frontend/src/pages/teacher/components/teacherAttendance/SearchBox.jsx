import { Search } from "lucide-react";

export default function SearchBox({ searchTerm, onChange }) {
  return (
    <div className="flex flex-col w-full sm:w-72">
      <label className="text-xs font-semibold text-gray-600 mb-1">
        <span className="inline-flex items-center gap-1">
          <Search size={14} className="text-[#3498db]" /> Search
        </span>
      </label>
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search by name or ID..."
          value={searchTerm}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] bg-white text-gray-700 placeholder-gray-500 shadow-sm"
        />
      </div>
    </div>
  );
}