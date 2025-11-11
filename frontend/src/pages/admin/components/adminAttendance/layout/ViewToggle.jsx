import { Users, GraduationCap } from "lucide-react";

export default function ViewToggle({ activeTab, setActiveTab }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 mb-1 block">View</label>
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("teachers")}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
            activeTab === "teachers"
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
          }`}
        >
          <GraduationCap size={16} />
          Teachers
        </button>
        <button
          onClick={() => setActiveTab("students")}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
            activeTab === "students"
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
          }`}
        >
          <Users size={16} />
          Students
        </button>
      </div>
    </div>
  );
}