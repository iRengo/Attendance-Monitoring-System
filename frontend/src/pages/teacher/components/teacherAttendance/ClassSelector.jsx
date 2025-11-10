import { Users } from "lucide-react";
import { getClassLabel } from "./hooks/utils/classLabel";

export default function ClassSelector({ classes, selectedClassId, onChange }) {
  return (
    <div className="flex flex-col w-full sm:w-64">
      <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
        <Users size={14} className="text-[#3498db]" /> Class (Section • Subject)
      </label>
      <select
        value={selectedClassId}
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] shadow-sm bg-white text-gray-700"
      >
        <option value="">Select Class</option>
        {classes.map((cls) => (
          <option key={cls.id} value={cls.id}>
            {getClassLabel(cls)}
          </option>
        ))}
      </select>
    </div>
  );
}