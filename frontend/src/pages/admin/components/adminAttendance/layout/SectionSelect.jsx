import { ChevronDown } from "lucide-react";

export default function SectionSelect({ sections, value, onChange, loading }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 mb-1 block">
        Select Section
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          disabled={loading}
        >
          <option value="">-- All Sections --</option>
          {sections.map((sec) => (
            <option key={sec} value={sec}>
              {sec}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-0">
          <ChevronDown size={16} />
        </span>
      </div>
    </div>
  );
}