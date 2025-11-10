import { ChevronDown } from "lucide-react";

/**
 * ClassAccordion
 * Props:
 *  - cls: class object
 *  - isOpen: boolean
 *  - onToggle: () => void
 *  - children: expanded content
 */
export default function ClassAccordion({ cls, isOpen, onToggle, children }) {
  return (
    <li
      className="group border border-gray-200 rounded-xl overflow-hidden bg-white transition hover:shadow-md"
    >
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-start gap-3">
          <div className="h-10 w-1.5 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500 group-hover:from-indigo-500 group-hover:to-blue-500 transition" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-900">
                {cls.subjectName || cls.name || "Untitled Class"}
              </p>
              {cls.section && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                  Section: {cls.section}
                </span>
              )}
              {cls.gradeLevel && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                  Grade: {cls.gradeLevel}
                </span>
              )}
              {cls.roomNumber && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
                  Room: {cls.roomNumber}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {cls.days || "—"} {cls.time ? `• ${cls.time}` : ""}
            </p>
          </div>
        </div>
        <span
          className={`text-gray-500 transition-transform ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        >
          <ChevronDown size={18} />
        </span>
      </button>

      {isOpen && children}
    </li>
  );
}