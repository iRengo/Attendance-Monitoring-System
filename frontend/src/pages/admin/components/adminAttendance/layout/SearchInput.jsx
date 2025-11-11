import { Search } from "lucide-react";

export default function SearchInput({
  label,
  placeholder,
  value,
  onChange,
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 mb-1 block">
        {label}
      </label>
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
        />
      </div>
    </div>
  );
}